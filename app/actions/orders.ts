"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function saveOrder(formData: {
  orderId?: string;
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

  // Step 1: Fetch product details to determine order_type
  const productIds = formData.items.map(item => item.productId);
  const { data: products } = await supabase
    .from("inventory_items")
    .select("id, item_type")
    .in("id", productIds);

  // Determine order_type based on items
  const hasFinishedGood = products?.some(p => p.item_type === "finished_good");
  const orderType = hasFinishedGood ? "oil" : "byproduct";

  // Auto-delivery logic: prepaid byproducts are delivered immediately
  const isAutoDelivered = orderType === "byproduct" && formData.paymentStatus === "prepaid";
  const orderStatus = isAutoDelivered ? "delivered" : "pending";
  const deliveredAt = isAutoDelivered ? new Date().toISOString() : null;

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

  let order: any;

  if (formData.orderId) {
    // UPDATE MODE: Edit existing order
    
    // Step 1: Delete existing order items
    const { error: deleteItemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", formData.orderId);

    if (deleteItemsError) {
      return { success: false, error: `Failed to delete old items: ${deleteItemsError.message}` };
    }

    // Step 2: Update the order
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        customer_id: formData.customerId,
        payment_status: formData.paymentStatus,
        total_amount: totalAmount,
        total_liters: totalLiters,
        assigned_agent: formData.deliveryAgentId || null,
        order_type: orderType,
        status: orderStatus,
        delivered_at: deliveredAt,
      })
      .eq("id", formData.orderId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    order = updatedOrder;

    // Step 3: Insert new order items
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
      return { success: false, error: itemsError.message };
    }

    // Step 4: Update delivery assignment
    if (formData.deliveryAgentId) {
      // Delete old assignment
      await supabase
        .from("delivery_assignments")
        .delete()
        .eq("order_id", order.id);

      // Create new assignment
      await supabase.from("delivery_assignments").insert([
        {
          order_id: order.id,
          delivery_agent_id: formData.deliveryAgentId,
          scheduled_for: new Date().toISOString(),
        },
      ]);
    } else {
      // Remove assignment if agent was unassigned
      await supabase
        .from("delivery_assignments")
        .delete()
        .eq("order_id", order.id);
    }
  } else {
    // CREATE MODE: New order
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          customer_id: formData.customerId,
          status: orderStatus,
          payment_status: formData.paymentStatus,
          total_amount: totalAmount,
          total_liters: totalLiters,
          assigned_agent: formData.deliveryAgentId || null,
          order_type: orderType,
          delivered_at: deliveredAt,
        },
      ])
      .select()
      .single();

    if (orderError) {
      return { success: false, error: orderError.message };
    }

    order = newOrder;

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
    .select("id, item_name, item_type, unit, avg_cost, selling_price, stock_level")
    .in("item_type", ["finished_good", "byproduct"])
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

/**
 * Create a new delivery agent with auth.users entry + profile
 * Auto-generates a temporary password (agent can reset later)
 * Uses Service Role Key to bypass RLS and user restrictions
 */
export async function createDeliveryAgent(formData: {
  name: string;
  email: string;
  phone: string;
}) {
  // Create admin client with Service Role Key (bypasses all RLS and auth restrictions)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Generate a temporary password (8 chars random)
  const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";

  // Step 1: Create auth user using admin client
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email,
    password: tempPassword,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: formData.name,
      phone: formData.phone,
    },
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message || "Failed to create auth user",
    };
  }

  // Step 2: Insert profile with delivery_agent role (using admin client to bypass RLS)
  const { error: profileError } = await supabaseAdmin.from("profiles").insert([
    {
      id: authData.user.id,
      full_name: formData.name,
      phone: formData.phone,
      role: "delivery_agent",
    },
  ]);

  if (profileError) {
    // Cleanup: delete the auth user if profile creation fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return {
      success: false,
      error: `Profile creation failed: ${profileError.message}`,
    };
  }

  revalidatePath("/orders/new");
  return {
    success: true,
    data: {
      id: authData.user.id,
      full_name: formData.name,
      tempPassword, // Return for display (optional)
    },
  };
}

/**
 * Get order queue with filters
 * Returns orders with full details (customer, items, agent, etc.)
 */
export async function getOrderQueue(statusFilter: "pending" | "delivered", typeFilter?: "oil" | "byproduct") {
  const supabase = await createSupabaseServerClient();

  // Build status filter
  const statuses = statusFilter === "pending" ? ["pending", "processing"] : ["delivered"];

  // Build query with order_type filter
  let query = supabase
    .from("orders")
    .select(`
      id,
      customer_id,
      status,
      payment_status,
      total_amount,
      total_liters,
      assigned_agent,
      created_at,
      order_type,
      customers!inner(id, name, phone, address),
      profiles(id, full_name)
    `)
    .in("status", statuses);

  // Apply type filter if specified
  if (typeFilter) {
    query = query.eq("order_type", typeFilter);
  }

  const { data: orders, error: ordersError } = await query.order("created_at", { ascending: false });

  if (ordersError) {
    return { success: false, error: ordersError.message };
  }

  // Fetch order items (no JOIN needed, filtering by order_type above)
  const orderIds = orders?.map((o) => o.id) || [];
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("order_id, product_id, product_name, quantity, unit_price")
    .in("order_id", orderIds);

  // Map items to orders
  const ordersWithItems = orders?.map((order: any) => {
    const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
    const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
    
    return {
      id: order.id,
      customerId: order.customer_id,
      customerName: customer?.name || "Unknown",
      customerPhone: customer?.phone || "",
      customerAddress: customer?.address || "",
      status: order.status,
      paymentStatus: order.payment_status,
      totalAmount: order.total_amount,
      totalLiters: order.total_liters,
      agentId: order.assigned_agent,
      agentName: profile?.full_name || "Unassigned",
      createdAt: order.created_at,
      orderType: order.order_type,
      items: orderItems?.filter((item) => item.order_id === order.id) || [],
    };
  });

  return { success: true, data: ordersWithItems };
}

/**
 * Get real-time order statistics and production requirements
 * Returns order counts by status/payment and inventory gaps for pending orders
 */
export async function getOrderStats() {
  const supabase = await createSupabaseServerClient();

  // Step 1: Get order counts
  const [pendingPrepaidResult, pendingCODResult, deliveredResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("payment_status", "prepaid"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("payment_status", "cod"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "delivered"),
  ]);

  const orderCounts = {
    pendingPrepaid: pendingPrepaidResult.count || 0,
    pendingCOD: pendingCODResult.count || 0,
    delivered: deliveredResult.count || 0,
  };

  // Step 2: Get production requirements for pending orders
  // Fetch all pending order IDs
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "pending");

  if (!pendingOrders || pendingOrders.length === 0) {
    return {
      success: true,
      data: {
        orderCounts,
        productionRequirements: [],
      },
    };
  }

  const pendingOrderIds = pendingOrders.map((o) => o.id);

  // Fetch all order items for pending orders
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, product_name, quantity")
    .in("order_id", pendingOrderIds);

  if (itemsError) {
    return { success: false, error: itemsError.message };
  }

  // Aggregate quantities by product
  const productRequirements = new Map<string, { productName: string; required: number }>();
  
  orderItems?.forEach((item) => {
    const existing = productRequirements.get(item.product_id);
    if (existing) {
      existing.required += item.quantity;
    } else {
      productRequirements.set(item.product_id, {
        productName: item.product_name,
        required: item.quantity,
      });
    }
  });

  // Fetch current stock levels
  const productIds = Array.from(productRequirements.keys());
  const { data: inventoryItems } = await supabase
    .from("inventory_items")
    .select("id, stock_level")
    .in("id", productIds);

  // Build final requirements array with deficit calculation
  const productionRequirements = Array.from(productRequirements.entries()).map(([productId, data]) => {
    const inventoryItem = inventoryItems?.find((i) => i.id === productId);
    const onHand = inventoryItem?.stock_level || 0;
    const deficit = Math.max(0, data.required - onHand);

    return {
      productId,
      productName: data.productName,
      required: data.required,
      onHand,
      deficit,
    };
  });

  return {
    success: true,
    data: {
      orderCounts,
      productionRequirements,
    },
  };
}

