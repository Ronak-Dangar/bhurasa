"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Weighted Average Cost (WAC) Calculation for ERP Integration
 * 
 * Updates inventory stock level and avg_cost when procurement expenses are logged.
 * 
 * Formula:
 * new_avg_cost = (current_value + purchase_amount) / (current_stock + purchased_quantity)
 * 
 * Example:
 * - Current: 1500 kg @ ₹78/kg = ₹117,000
 * - Purchase: 1000 kg for ₹80,000
 * - New: 2500 kg @ ₹78.8/kg = ₹197,000
 */
async function updateInventoryFromPurchase(
  itemId: string,
  quantity: number,
  purchaseAmount: number
) {
  const supabase = await createSupabaseServerClient();

  // Step 1: Fetch current inventory state
  const { data: item, error: fetchError } = await supabase
    .from("inventory_items")
    .select("stock_level, avg_cost, item_name")
    .eq("id", itemId)
    .single();

  if (fetchError || !item) {
    throw new Error("Inventory item not found");
  }

  const currentStock = item.stock_level;
  const currentAvgCost = item.avg_cost;

  // Step 2: Calculate new stock level
  const newStock = currentStock + quantity;

  // Step 3: Calculate weighted average cost
  const currentValue = currentStock * currentAvgCost;
  const newTotalValue = currentValue + purchaseAmount;
  const newAvgCost = newStock > 0 ? newTotalValue / newStock : 0;

  // Step 4: Update inventory_items table
  const { error: updateError } = await supabase
    .from("inventory_items")
    .update({
      stock_level: newStock,
      avg_cost: newAvgCost,
    })
    .eq("id", itemId);

  if (updateError) {
    throw new Error(`Failed to update inventory: ${updateError.message}`);
  }

  return {
    itemName: item.item_name,
    oldStock: currentStock,
    newStock,
    oldAvgCost: currentAvgCost,
    newAvgCost,
  };
}

export async function addExpense(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const expenseType = formData.get("expense_type") as string;
  const amount = parseFloat(formData.get("amount") as string);
  let inventoryItemId = formData.get("inventory_item_id") as string | null;
  const procurementQuantity = formData.get("procurement_quantity")
    ? parseFloat(formData.get("procurement_quantity") as string)
    : null;

  // ──────────────────────────────────────────────────────────
  // AUTO-LOOKUP: For purchase_groundnuts, find groundnut item
  // ──────────────────────────────────────────────────────────
  if (expenseType === "purchase_groundnuts") {
    const { data: groundnutItem } = await supabase
      .from("inventory_items")
      .select("id")
      .or("item_name.ilike.%groundnut%,item_name.ilike.%groundnuts%")
      .limit(1)
      .single();

    if (groundnutItem) {
      inventoryItemId = groundnutItem.id;
    } else {
      return {
        success: false,
        error: "Groundnut inventory item not found. Please add it to inventory first.",
      };
    }
  }

  const expense = {
    expense_type: expenseType,
    amount,
    expense_date: formData.get("expense_date") as string,
    status: (formData.get("status") as string) || "paid",
    description: formData.get("description") as string,
  };

  // Step 1: Insert expense record
  const { error: expenseError } = await supabase.from("expenses").insert([expense]);

  if (expenseError) {
    return { success: false, error: expenseError.message };
  }

  // Step 2: ERP Bridge - Update inventory if procurement
  let inventoryUpdate = null;
  const isProcurement = expenseType === "purchase_groundnuts" || expenseType === "purchase_packaging";
  
  if (isProcurement && inventoryItemId && procurementQuantity && procurementQuantity > 0) {
    try {
      inventoryUpdate = await updateInventoryFromPurchase(
        inventoryItemId,
        procurementQuantity,
        amount
      );
    } catch (error: any) {
      return {
        success: false,
        error: `Expense logged but inventory update failed: ${error.message}`,
      };
    }
  }

  // Step 3: Revalidate both pages
  revalidatePath("/finance");
  revalidatePath("/inventory");

  return {
    success: true,
    message: inventoryUpdate
      ? `Expense logged. Inventory updated: ${inventoryUpdate.itemName} ${inventoryUpdate.oldStock} → ${inventoryUpdate.newStock} (Avg: ₹${inventoryUpdate.oldAvgCost.toFixed(2)} → ₹${inventoryUpdate.newAvgCost.toFixed(2)})`
      : "Expense logged successfully",
  };
}

export async function addLoanTransaction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const loanId = formData.get("loan_id") as string;
  const type = formData.get("type") as "payment" | "interest";
  const amount = parseFloat(formData.get("amount") as string);

  const transaction = {
    loan_id: loanId,
    type,
    amount,
    date: new Date().toISOString(),
  };

  const { error: transactionError } = await supabase
    .from("loan_transactions")
    .insert([transaction]);

  if (transactionError) {
    return { success: false, error: transactionError.message };
  }

  const { data: loan } = await supabase
    .from("loans")
    .select("current_balance")
    .eq("id", loanId)
    .single();

  if (!loan) {
    return { success: false, error: "Loan not found" };
  }

  const newBalance =
    type === "payment"
      ? loan.current_balance - amount
      : loan.current_balance + amount;

  const { error: updateError } = await supabase
    .from("loans")
    .update({ current_balance: newBalance })
    .eq("id", loanId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/finance");
  return { success: true };
}
