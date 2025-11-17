"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Customer, LeadStatus, FamilySize } from "@/types";

export async function createCustomer(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const customer = {
    name: formData.get("name") as string,
    phone: formData.get("phone") as string,
    address: formData.get("address") as string,
    family_size: formData.get("family_size") as FamilySize,
    status: "inquiry" as LeadStatus, // Default status
  };

  const { data, error } = await supabase
    .from("customers")
    .insert([customer])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Log the initial status in history
  if (data) {
    await supabase.from("customer_status_history").insert([
      {
        customer_id: data.id,
        status: "inquiry",
        notes: "Customer created",
      },
    ]);
  }

  revalidatePath("/dashboard/customers");
  return { success: true, data };
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const updates: any = {
    name: formData.get("name") as string,
    phone: formData.get("phone") as string,
    address: formData.get("address") as string,
    family_size: formData.get("family_size") as FamilySize,
  };

  const newStatus = formData.get("status") as LeadStatus | null;
  
  // Get current customer to check status change
  const { data: currentCustomer } = await supabase
    .from("customers")
    .select("status")
    .eq("id", customerId)
    .single();

  if (newStatus && currentCustomer && newStatus !== currentCustomer.status) {
    updates.status = newStatus;
  }

  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", customerId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Log status change if it occurred
  if (newStatus && currentCustomer && newStatus !== currentCustomer.status) {
    await supabase.from("customer_status_history").insert([
      {
        customer_id: customerId,
        status: newStatus,
        notes: `Status manually updated from ${currentCustomer.status} to ${newStatus}`,
      },
    ]);
  }

  revalidatePath("/dashboard/customers");
  return { success: true, data };
}

export async function deleteCustomer(customerId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/customers");
  return { success: true };
}

export async function getCustomerStatusHistory(customerId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("customer_status_history")
    .select("*")
    .eq("customer_id", customerId)
    .order("changed_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data };
}
