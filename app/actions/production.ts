"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProductionBatch(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const batch = {
    batch_code: formData.get("batch_code") as string,
    farmer_name: formData.get("farmer_name") as string,
    batch_date: formData.get("batch_date") as string,
    phase: "dehusking", // Default to Phase 1
  };

  const { data, error } = await supabase
    .from("production_batches")
    .insert([batch])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/production");
  return { success: true, data };
}

export async function updateProductionPhase(
  batchId: string,
  phaseData: {
    phase: "dehusking" | "pressing";
    input_groundnuts_kg?: number;
    output_peanuts_kg?: number;
    output_oil_liters?: number;
    output_oilcake_kg?: number;
    output_husk_kg?: number;
    notes?: string;
  },
  nextPhase: "pressing" | "completed"
) {
  const supabase = await createSupabaseServerClient();

  // Get current batch data
  const { data: batch, error: fetchError } = await supabase
    .from("production_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (fetchError || !batch) {
    return { success: false, error: "Batch not found" };
  }

  // Update the batch with phase data
  const updateData: any = {
    ...phaseData,
    phase: nextPhase,
  };

  const { error: updateError } = await supabase
    .from("production_batches")
    .update(updateData)
    .eq("id", batchId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Run phased inventory transactions
  const inventoryResult = await updatePhasedInventory(
    supabase,
    batch.phase,
    phaseData,
    batch
  );

  if (!inventoryResult.success) {
    return inventoryResult;
  }

  revalidatePath("/production");
  revalidatePath("/inventory");
  return { success: true };
}

async function updatePhasedInventory(
  supabase: any,
  completedPhase: "dehusking" | "pressing",
  phaseData: any,
  batch: any
) {
  // Get inventory item IDs
  const { data: inventoryItems } = await supabase
    .from("inventory_items")
    .select("id, item_name, stock_level");

  if (!inventoryItems) {
    return { success: false, error: "Failed to fetch inventory" };
  }

  const findItem = (name: string) =>
    inventoryItems.find((item: any) =>
      item.item_name.toLowerCase().includes(name.toLowerCase())
    );

  const groundnuts = findItem("groundnut");
  const peanuts = findItem("peanut");
  const bulkOil = findItem("bulk oil") || findItem("oil");
  const oilcake = findItem("oilcake");
  const husk = findItem("husk");

  try {
    if (completedPhase === "dehusking") {
      // Phase 1: Groundnuts → Peanuts
      // Use stock_movements audit trail instead of direct updates
      
      if (phaseData.input_groundnuts_kg && groundnuts) {
        await supabase
          .from("stock_movements")
          .insert({
            item_id: groundnuts.id,
            quantity_change: -phaseData.input_groundnuts_kg,
            reason: `Production: Batch ${batch.batch_code} - Dehusking (consumed)`,
          });
      }

      if (phaseData.output_peanuts_kg && peanuts) {
        await supabase
          .from("stock_movements")
          .insert({
            item_id: peanuts.id,
            quantity_change: phaseData.output_peanuts_kg,
            reason: `Production: Batch ${batch.batch_code} - Dehusking (produced)`,
          });
      }
    } else if (completedPhase === "pressing") {
      // Phase 2: Peanuts → Bulk Oil + Oilcake + Husk
      // Use stock_movements audit trail instead of direct updates
      
      // Increment outputs
      if (phaseData.output_oil_liters && bulkOil) {
        await supabase
          .from("stock_movements")
          .insert({
            item_id: bulkOil.id,
            quantity_change: phaseData.output_oil_liters,
            reason: `Production: Batch ${batch.batch_code} - Pressing (bulk oil produced)`,
          });
      }

      if (phaseData.output_oilcake_kg && oilcake) {
        await supabase
          .from("stock_movements")
          .insert({
            item_id: oilcake.id,
            quantity_change: phaseData.output_oilcake_kg,
            reason: `Production: Batch ${batch.batch_code} - Pressing (oilcake byproduct)`,
          });
      }

      if (phaseData.output_husk_kg && husk) {
        await supabase
          .from("stock_movements")
          .insert({
            item_id: husk.id,
            quantity_change: phaseData.output_husk_kg,
            reason: `Production: Batch ${batch.batch_code} - Pressing (husk byproduct)`,
          });
      }

      // Decrement peanuts used (from Phase 1 output)
      if (batch.output_peanuts_kg && peanuts) {
        await supabase
          .from("stock_movements")
          .insert({
            item_id: peanuts.id,
            quantity_change: -batch.output_peanuts_kg,
            reason: `Production: Batch ${batch.batch_code} - Pressing (consumed)`,
          });
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProductionBatch(batchId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("production_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  return { success: true, data };
}
