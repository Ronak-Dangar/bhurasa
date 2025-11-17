"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createOrder(formData: {
  customerId: string;
  paymentStatus: "cod" | "prepaid";
  deliveryAgentId?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
}) {
  const supabase = await createSupabaseServerClient();

  // Calculate totals
  const totalAmount = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  // Calculate total liters (assuming product names contain size info)
  const totalLiters = formData.items.reduce((sum, item) => {
    // Extract liters from product name (e.g., "1L Bottle Oil" -> 1)
    const literMatch = item.productName.match(/(\d+)L/i);
    const liters = literMatch ? parseInt(literMatch[1]) : 1;
    return sum + liters * item.quantity;
  }, 0);

  // Create the order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert([
      {
        customer_id: formData.customerId,
        status: "pending",
        payment_status: formData.paymentStatus,
        total_amount: totalAmount,
        total_liters: totalLiters,
        assigned_agent: formData.deliveryAgentId || null,
      },
    ])
    .select()
    .single();

  if (orderError) {
    return { success: false, error: orderError.message };
  }

  // Create order items
  const orderItems = formData.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    // Rollback order if items fail
    await supabase.from("orders").delete().eq("id", order.id);
    return { success: false, error: itemsError.message };
  }

  // Create delivery assignment if agent is assigned
  if (formData.deliveryAgentId) {
    await supabase.from("delivery_assignments").insert([
      {
        order_id: order.id,
        delivery_agent_id: formData.deliveryAgentId,
        scheduled_for: new Date().toISOString(),
      },
    ]);
  }

  revalidatePath("/orders/new");
  revalidatePath("/");
  return { success: true, data: order };
}

export async function getAllCustomersForDropdown() {
  const supabase = await createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, address, family_size, status")
    .order("name", { ascending: true });

  if (error) {
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data };
}

export async function getAllInventoryItems() {
  const supabase = await createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("item_type", "finished_good")
    .gt("stock_level", 0)
    .order("item_name", { ascending: true });

  if (error) {
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data };
}

export async function getDeliveryAgents() {
  const supabase = await createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "delivery_agent")
    .order("full_name", { ascending: true });

  if (error) {
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data };
}
