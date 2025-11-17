"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateInventoryItem(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const itemId = formData.get("item_id") as string;
  const updates = {
    item_name: formData.get("item_name") as string,
    low_stock_threshold: parseFloat(formData.get("low_stock_threshold") as string),
    avg_cost: parseFloat(formData.get("avg_cost") as string),
  };

  const { error } = await supabase
    .from("inventory_items")
    .update(updates)
    .eq("id", itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/inventory");
  return { success: true };
}

export async function createStockMovement(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const itemId = formData.get("item_id") as string;
  const quantity = parseFloat(formData.get("quantity") as string);
  const reason = formData.get("reason") as string;

  // Get current stock level to validate
  const { data: item, error: fetchError } = await supabase
    .from("inventory_items")
    .select("stock_level, item_name")
    .eq("id", itemId)
    .single();

  if (fetchError || !item) {
    return { success: false, error: "Item not found" };
  }

  const newStockLevel = item.stock_level + quantity;

  // Prevent negative stock
  if (newStockLevel < 0) {
    return { 
      success: false, 
      error: `Cannot reduce stock below zero. Current: ${item.stock_level}, Requested change: ${quantity}` 
    };
  }

  // **REFACTORED:** Use stock_movements audit trail instead of direct update
  // The trigger will automatically update inventory_items.stock_level
  const { error: insertError } = await supabase
    .from("stock_movements")
    .insert({
      item_id: itemId,
      quantity_change: quantity,
      reason: reason || "Manual adjustment",
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/log"); // Also revalidate the log page
  
  return { 
    success: true, 
    message: `${item.item_name}: ${item.stock_level} → ${newStockLevel} (${quantity > 0 ? '+' : ''}${quantity})` 
  };
}

export async function getAllInventoryItems() {
  const supabase = await createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, item_name, stock_level, unit")
    .order("item_name", { ascending: true });

  if (error) {
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: data ?? [] };
}
