"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type BottlingLine = {
  id: number;
  sku: string;
  quantity: number;
};

/**
 * Creates a new bottling run that converts bulk oil into finished goods
 * across multiple SKUs (1L Bottle, 5L Tin, 15L Tin).
 * 
 * This implements the "commingled bulk oil" model where bottling is
 * decoupled from production batches.
 * 
 * **REFACTORED:** Now uses stock_movements audit trail instead of direct updates.
 * This fixes the bug where empty containers and finished goods weren't updating correctly.
 */
export async function createBottlingRun(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  try {
    // Parse bottling lines from form data
    const linesJson = formData.get("bottling_lines") as string;
    const lines: BottlingLine[] = JSON.parse(linesJson);

    if (!lines || lines.length === 0) {
      return { success: false, error: "No bottling lines provided" };
    }

    // Get inventory items
    const { data: inventoryItems, error: fetchError } = await supabase
      .from("inventory_items")
      .select("id, item_name, stock_level");

    if (fetchError || !inventoryItems) {
      return { success: false, error: "Failed to fetch inventory items" };
    }

    const findItem = (name: string) =>
      inventoryItems.find((item: any) =>
        item.item_name.toLowerCase().includes(name.toLowerCase())
      );

    // Find bulk oil inventory item
    const bulkOil = findItem("bulk oil") || findItem("oil");
    if (!bulkOil) {
      return { success: false, error: "Bulk oil inventory item not found" };
    }

    // Initialize total liters consumed
    let totalLitersConsumed = 0;
    
    // Generate bottling run ID for audit trail
    const bottlingRunId = `BR-${Date.now()}`;

    // Process each bottling line
    for (const line of lines) {
      if (line.quantity <= 0) continue;

      // Extract liters per unit from SKU (e.g., "1L Bottle" -> 1)
      const litersPerUnit = parseFloat(line.sku.split("L")[0]) || 0;
      const totalLiters = litersPerUnit * line.quantity;
      totalLitersConsumed += totalLiters;

      // Find empty container inventory item
      let emptyContainer = null;
      let finishedGood = null;

      if (line.sku === "1L Bottle") {
        emptyContainer = findItem("1l bottle") || findItem("empty 1l");
        finishedGood = findItem("1l bottle oil") || findItem("finished 1l");
      } else if (line.sku === "5L Tin") {
        emptyContainer = findItem("5l tin") || findItem("empty 5l");
        finishedGood = inventoryItems.find((item: any) => item.item_name === "5L Tin Oil") || findItem("5l tin oil") || findItem("finished 5l");
      } else if (line.sku === "15L Tin") {
        emptyContainer = findItem("15l tin") || findItem("empty 15l");
        finishedGood = inventoryItems.find((item: any) => item.item_name === "15L Tin Oil") || findItem("15l tin oil") || findItem("finished 15l");
      }

      // Validate inventory items exist
      if (!emptyContainer) {
        return {
          success: false,
          error: `Empty container inventory item not found for ${line.sku}`,
        };
      }
      if (!finishedGood) {
        return {
          success: false,
          error: `Finished good inventory item not found for ${line.sku}`,
        };
      }

      // Check if sufficient empty containers available
      if (emptyContainer.stock_level < line.quantity) {
        return {
          success: false,
          error: `Insufficient empty containers for ${line.sku}. Available: ${emptyContainer.stock_level}, Required: ${line.quantity}`,
        };
      }

      // **BUG FIX:** Use stock_movements instead of direct updates
      // Insert stock movement for empty containers (decrement)
      const { error: emptyError } = await supabase
        .from("stock_movements")
        .insert({
          item_id: emptyContainer.id,
          quantity_change: -line.quantity,
          reason: `Bottling Run ${bottlingRunId}: ${line.sku} (${line.quantity} units)`,
        });

      if (emptyError) {
        return {
          success: false,
          error: `Failed to update empty containers for ${line.sku}: ${emptyError.message}`,
        };
      }

      // Insert stock movement for finished goods (increment)
      const { error: finishedError } = await supabase
        .from("stock_movements")
        .insert({
          item_id: finishedGood.id,
          quantity_change: line.quantity,
          reason: `Bottling Run ${bottlingRunId}: ${line.sku} (${line.quantity} units)`,
        });

      if (finishedError) {
        return {
          success: false,
          error: `Failed to update finished goods for ${line.sku}: ${finishedError.message}`,
        };
      }
    }

    // Check if sufficient bulk oil available
    if (bulkOil.stock_level < totalLitersConsumed) {
      return {
        success: false,
        error: `Insufficient bulk oil. Available: ${bulkOil.stock_level}L, Required: ${totalLitersConsumed}L`,
      };
    }

    // Final transaction: Decrement bulk oil using stock_movements
    const { error: bulkOilError } = await supabase
      .from("stock_movements")
      .insert({
        item_id: bulkOil.id,
        quantity_change: -totalLitersConsumed,
        reason: `Bottling Run ${bottlingRunId}: Total bulk oil consumed`,
      });

    if (bulkOilError) {
      return {
        success: false,
        error: `Failed to update bulk oil: ${bulkOilError.message}`,
      };
    }

    // Revalidate paths
    revalidatePath("/inventory");
    revalidatePath("/bottling");

    return {
      success: true,
      message: `Bottling run completed! Consumed ${totalLitersConsumed.toFixed(1)}L of bulk oil.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}
