"use client";

import { useMemo, useState, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveOrder, getAllCustomersForDropdown, getAllInventoryItems, getDeliveryAgents, createDeliveryAgent, getOrderStats, getOrderQueue } from "@/app/actions/orders";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { PlusCircle, UserPlus, AlertCircle, TrendingUp, Package, CheckCircle, Edit, X } from "lucide-react";

const orderSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  paymentStatus: z.enum(["cod", "prepaid"]),
  deliveryAgentId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Choose a product"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        unitPrice: z.number().min(0, "Price must be positive"),
      }),
    )
    .min(1, "Add at least one product"),
  notes: z.string().optional(),
});

export type OrderFormValues = z.infer<typeof orderSchema>;

export function CreateOrderForm() {
  const [submitted, setSubmitted] = useState<OrderFormValues | null>(null);
  const [lastOrderSnapshot, setLastOrderSnapshot] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [deliveryAgents, setDeliveryAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchFocused, setCustomerSearchFocused] = useState(false);
  const [inventoryErrors, setInventoryErrors] = useState<Record<number, string>>({});
  const [orderStats, setOrderStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<"pending" | "delivered">("pending");
  const [typeFilter, setTypeFilter] = useState<"oil" | "byproduct">("oil");
  const [orderQueue, setOrderQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setStatsLoading(true);
    setQueueLoading(true);
    const [customersResult, productsResult, agentsResult, statsResult, queueResult] = await Promise.all([
      getAllCustomersForDropdown(),
      getAllInventoryItems(),
      getDeliveryAgents(),
      getOrderStats(),
      getOrderQueue(queueFilter, typeFilter),
    ]);

    if (customersResult.success) setCustomers(customersResult.data);
    if (productsResult.success) setProducts(productsResult.data);
    if (agentsResult.success) setDeliveryAgents(agentsResult.data);
    if (statsResult.success) setOrderStats(statsResult.data);
    if (queueResult.success) setOrderQueue(queueResult.data || []);
    setLoading(false);
    setStatsLoading(false);
    setQueueLoading(false);
  };

  // Reload queue when filter or type changes
  useEffect(() => {
    const loadQueue = async () => {
      setQueueLoading(true);
      const queueResult = await getOrderQueue(queueFilter, typeFilter);
      if (queueResult.success) setOrderQueue(queueResult.data || []);
      setQueueLoading(false);
    };
    loadQueue();
  }, [queueFilter, typeFilter]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: "",
      paymentStatus: "prepaid",
      deliveryAgentId: "",
      items: [
        {
          productId: products[0]?.id || "",
          quantity: 1,
          unitPrice: products[0]?.selling_price || 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  const customerId = useWatch({ control: form.control, name: "customerId" }) ?? "";
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId),
    [customerId, customers],
  );

  const watchedItems = useWatch({ control: form.control, name: "items" }) as OrderFormValues["items"] | undefined;
  const items = watchedItems ?? form.getValues("items");
  
  // Validate inventory in real-time
  useEffect(() => {
    const errors: Record<number, string> = {};
    items.forEach((item, index) => {
      const product = products.find((p) => p.id === item.productId);
      if (product && item.quantity > product.stock_level) {
        errors[index] = `Cannot exceed available stock (${product.stock_level})`;
      }
    });
    setInventoryErrors(errors);
  }, [items, products]);

  const hasInventoryErrors = Object.keys(inventoryErrors).length > 0;
  
  // Detect if any selected products are byproducts
  const hasByproduct = useMemo(() => {
    return items.some((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product?.item_type === "byproduct";
    });
  }, [items, products]);
  
  const totalAmount = useMemo(() => {
    return items.reduce((acc, item) => {
      // Use the editable unitPrice from the form, not avg_cost
      const unitPrice = item.unitPrice || 0;
      return acc + unitPrice * item.quantity;
    }, 0);
  }, [items]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm) return customers;
    const search = customerSearchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.phone.toLowerCase().includes(search)
    );
  }, [customers, customerSearchTerm]);

  const showAddNewCustomerButton = customerSearchTerm.length > 0 && filteredCustomers.length === 0;

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);

    // Detect if all items are byproducts
    const allByproducts = values.items.every((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product?.item_type === "byproduct";
    });

    // Auto-set delivered for prepaid byproducts (immediate cash pickup)
    const shouldAutoDeliver = allByproducts && values.paymentStatus === "prepaid" && !editingOrderId;

    // Build order data with product details
    const orderData = {
      orderId: editingOrderId || undefined,
      customerId: values.customerId,
      paymentStatus: values.paymentStatus,
      deliveryAgentId: values.deliveryAgentId || undefined,
      items: values.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.item_name || "Unknown Product",
          quantity: item.quantity,
          unitPrice: item.unitPrice, // Use the editable price from form
        };
      }),
    };

    // TODO: Backend needs to support status parameter for auto-delivery
    // For now, byproducts will still go to pending queue

    const result = await saveOrder(orderData);

    if (result.success) {
      // Save snapshot before resetting form
      const customer = customers.find((c) => c.id === values.customerId);
      const agent = deliveryAgents.find((a: any) => a.id === values.deliveryAgentId);
      
      setLastOrderSnapshot({
        customerName: customer?.name || "Unknown",
        customerPhone: customer?.phone || "",
        customerAddress: customer?.address || "",
        paymentStatus: values.paymentStatus,
        agentName: agent?.full_name || "Unassigned",
        items: values.items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          return {
            productName: product?.item_name || "Unknown Product",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unit: product?.unit || "units",
          };
        }),
        totalAmount: values.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0),
      });
      
      setSubmitted(values);
      setEditingOrderId(null);
      form.reset();
      setCustomerSearchTerm("");
      // Reload data to refresh inventory and queue
      loadData();
    } else {
      setError(result.error || "Failed to save order");
    }
    setSubmitting(false);
  });

  const handleEditOrder = (order: any) => {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Set editing mode
    setEditingOrderId(order.id);

    // Find customer and set search term
    const customer = customers.find((c) => c.id === order.customerId);
    if (customer) {
      setCustomerSearchTerm(customer.name);
    }

    // Reset form with order data
    form.reset({
      customerId: order.customerId,
      paymentStatus: order.paymentStatus,
      deliveryAgentId: order.agentId || "",
      items: order.items.map((item: any) => ({
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })),
    });
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
    setCustomerSearchTerm("");
    form.reset({
      customerId: "",
      paymentStatus: "prepaid",
      deliveryAgentId: "",
      items: [
        {
          productId: products[0]?.id || "",
          quantity: 1,
          unitPrice: products[0]?.selling_price || 0,
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Form + Operations Pulse */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card
          title={editingOrderId ? "Edit Order" : "Raise New Order"}
          description={editingOrderId ? "Update order details and save changes." : "Capture customer request and reserve inventory."}
          actions={
            editingOrderId ? (
              <Badge variant="warning">Editing</Badge>
            ) : (
              <Badge variant="info">Draft</Badge>
            )
          }
        >
        {loading ? (
          <div className="py-8 text-center text-sm text-zinc-500">Loading form data...</div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
                {error}
              </div>
            )}

            <section className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="customerId" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Customer
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(true)}
                    className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-500"
                  >
                    <PlusCircle size={16} />
                    Add New
                  </button>
                </div>
                
                {/* Searchable Customer Combobox */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setCustomerSearchFocused(true);
                    }}
                    onFocus={() => setCustomerSearchFocused(true)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  
                  {/* Dropdown results */}
                  {customerSearchFocused && (customerSearchTerm.length > 0 || customerId === "") && (
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => {
                              form.setValue("customerId", customer.id);
                              setCustomerSearchTerm(customer.name);
                              setCustomerSearchFocused(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          >
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{customer.name}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{customer.phone}</div>
                          </button>
                        ))
                      ) : showAddNewCustomerButton ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddCustomer(true);
                            setCustomerSearchFocused(false);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        >
                          <PlusCircle size={16} />
                          <span>Add new customer &quot;{customerSearchTerm}&quot;</span>
                        </button>
                      ) : (
                        <div className="px-4 py-3 text-sm text-zinc-500">Type to search customers...</div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Hidden select for form validation */}
                <input type="hidden" {...form.register("customerId")} />
                
                {form.formState.errors.customerId && (
                  <p className="mt-1 text-xs text-rose-500">{form.formState.errors.customerId.message}</p>
                )}
              </div>

              {selectedCustomer && (
                <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200">Delivery Address</p>
                  <p className="mt-1 text-emerald-700 dark:text-emerald-200/80">{selectedCustomer.address}</p>
                  <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-200/60">
                    Family size: {selectedCustomer.family_size?.toUpperCase()} · Status: {formatStatus(selectedCustomer.status)}
                  </p>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Products</h3>
                <button
                  type="button"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                  onClick={() =>
                    append({
                      productId: products[0]?.id ?? "",
                      quantity: 1,
                      unitPrice: products[0]?.selling_price ?? 0,
                    })
                  }
                >
                  + Add product
                </button>
              </header>

              <div className="space-y-3">
                {fields.map((field, index) => {
                    const currentItem = items[index];
                    const product = products.find((p: any) => p.id === currentItem?.productId);
                    const unitPrice = currentItem?.unitPrice ?? 0;
                    const quantity = currentItem?.quantity ?? 0;
                    const stockLevel = product?.stock_level ?? 0;
                    const hasError = !!inventoryErrors[index];
                  return (
                    <div
                      key={field.id}
                      className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[2fr_1fr_1fr_auto]"
                    >
                      <div>
                        <label className="text-xs font-medium uppercase text-zinc-500">Product</label>
                        <select
                          {...form.register(`items.${index}.productId` as const, {
                            onChange: (e) => {
                              // Auto-fill unit price when product changes
                              const selectedProduct = products.find((p: any) => p.id === e.target.value);
                              if (selectedProduct) {
                                form.setValue(`items.${index}.unitPrice`, selectedProduct.selling_price || 0);
                              }
                            }
                          })}
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        >
                          {products.map((product: any) => (
                            <option key={product.id} value={product.id}>
                              {product.item_name}
                            </option>
                          ))}
                        </select>
                        {product && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium">Available:</span>
                            <Badge variant={stockLevel < 10 ? "danger" : "success"}>
                              {stockLevel} {product.unit}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase text-zinc-500">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          {...form.register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 dark:bg-zinc-900 dark:text-zinc-100 ${
                            hasError
                              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                              : "border-zinc-300 focus:border-emerald-500 focus:ring-emerald-200 dark:border-zinc-700"
                          }`}
                        />
                        {hasError && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                            <AlertCircle size={12} />
                            {inventoryErrors[index]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase text-zinc-500">Unit Price (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          {...form.register(`items.${index}.unitPrice` as const, { valueAsNumber: true })}
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                        <p className="mt-1 text-xs text-zinc-500">Editable for discounts</p>
                      </div>
                      <div className="flex flex-col items-end justify-between text-xs text-zinc-500">
                        <span>Line Total</span>
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            ₹{(unitPrice * quantity).toLocaleString("en-IN")}
                        </span>
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(index)} className="text-xs text-rose-500">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {form.formState.errors.items && (
                <p className="text-xs text-rose-500">{form.formState.errors.items.message as string}</p>
              )}
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {hasByproduct ? "Payment Status (Byproduct)" : "Payment Status"}
                </label>
                <select
                  {...form.register("paymentStatus")}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {hasByproduct ? (
                    <>
                      <option value="prepaid">Cash Received</option>
                      <option value="cod">Payment Pending</option>
                    </>
                  ) : (
                    <>
                      <option value="prepaid">Prepaid (Online)</option>
                      <option value="cod">Cash on Delivery</option>
                    </>
                  )}
                </select>
              </div>
              {!hasByproduct && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Assign Delivery Agent</label>
                    <button
                      type="button"
                      onClick={() => setShowAddAgent(true)}
                      className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-500"
                    >
                      <UserPlus size={14} />
                      New
                    </button>
                  </div>
                  <select
                    {...form.register("deliveryAgentId")}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                  <option value="">Unassigned</option>
                  {deliveryAgents.map((agent: any) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.full_name}
                    </option>
                  ))}
                  </select>
                </div>
              )}
            </section>

            <div>
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Internal Notes</label>
              <textarea
                {...form.register("notes")}
                rows={3}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="Delivery preference, packaging instructions, etc."
              />
            </div>

            <div className="flex items-center justify-between border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Total
                <span className="ml-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex gap-2">
                {editingOrderId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting || hasInventoryErrors}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
                    editingOrderId ? "bg-blue-600" : "bg-emerald-600"
                  }`}
                >
                  {submitting ? (editingOrderId ? "Updating..." : "Creating...") : editingOrderId ? "Update Order" : "Raise Order"}
                </button>
              </div>
            </div>
          </form>
        )}
      </Card>

      <Card title="Operations Pulse" description="Real-time fulfillment status">
        {statsLoading ? (
          <div className="py-8 text-center text-sm text-zinc-500">Loading stats...</div>
        ) : (
          <div className="space-y-6">
            {/* Success Banner with Order Summary */}
            {submitted && lastOrderSnapshot && (
              <div className="space-y-3">
                <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    ✓ Order created successfully!
                  </p>
                </div>
                
                {/* Order Confirmation Summary */}
                <div className="rounded-lg border border-emerald-200 bg-white p-4 dark:border-emerald-800 dark:bg-zinc-900">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Order Confirmation
                  </h4>
                  
                  {/* Customer Info */}
                  <div className="mt-3 space-y-1">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {lastOrderSnapshot.customerName}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {lastOrderSnapshot.customerPhone}
                    </p>
                  </div>

                  {/* Items */}
                  <div className="mt-3 space-y-2">
                    {lastOrderSnapshot.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {item.quantity}× {item.productName}
                        </span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          ₹{(item.quantity * item.unitPrice).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
                    <div className="space-y-1">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        Payment: <Badge variant={lastOrderSnapshot.paymentStatus === "prepaid" ? "success" : "warning"}>
                          {lastOrderSnapshot.paymentStatus === "prepaid" ? "Prepaid" : "COD"}
                        </Badge>
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        Agent: {lastOrderSnapshot.agentName}
                      </p>
                    </div>
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{lastOrderSnapshot.totalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Order Summary Cards */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Order Backlog
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                {/* Prepaid Pending */}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Prepaid</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                    {orderStats?.orderCounts?.pendingPrepaid || 0}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Pending</p>
                </div>

                {/* COD Pending */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2">
                    <Package size={18} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">COD</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">
                    {orderStats?.orderCounts?.pendingCOD || 0}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Pending</p>
                </div>

                {/* Delivered */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-zinc-600 dark:text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Delivered</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {orderStats?.orderCounts?.delivered || 0}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">Complete</p>
                </div>
              </div>
            </div>

            {/* Production Requirements */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Stock Requirements (Pending Orders)
              </h4>
              {orderStats?.productionRequirements?.length > 0 ? (
                <div className="space-y-2">
                  {orderStats.productionRequirements.map((item: any, index: number) => {
                    const hasDeficit = item.deficit > 0;
                    return (
                      <div
                        key={index}
                        className={`rounded-lg border p-3 ${
                          hasDeficit
                            ? "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20"
                            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              hasDeficit 
                                ? "text-rose-900 dark:text-rose-100" 
                                : "text-zinc-900 dark:text-zinc-100"
                            }`}>
                              {item.productName}
                            </p>
                            <div className="mt-1 flex items-center gap-3 text-xs">
                              <span className={hasDeficit ? "text-rose-600 dark:text-rose-400" : "text-zinc-600 dark:text-zinc-400"}>
                                Required: <span className="font-semibold">{item.required}</span>
                              </span>
                              <span className={hasDeficit ? "text-rose-600 dark:text-rose-400" : "text-zinc-600 dark:text-zinc-400"}>
                                On Hand: <span className="font-semibold">{item.onHand}</span>
                              </span>
                            </div>
                          </div>
                          {hasDeficit && (
                            <div className="ml-2 text-right">
                              <Badge variant="danger">
                                Produce +{item.deficit}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    No pending orders. All stock levels sufficient.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
      </div>

      {/* Bottom Section: Live Queue */}
      <Card 
        title="Live Order Queue" 
        description="Real-time order management and editing"
        actions={
          <div className="flex gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setTypeFilter("oil")}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  typeFilter === "oil"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                🛢️ Oil Orders
              </button>
              <button
                onClick={() => setTypeFilter("byproduct")}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  typeFilter === "byproduct"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                🍂 Byproduct Orders
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setQueueFilter("pending")}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  queueFilter === "pending"
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setQueueFilter("delivered")}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  queueFilter === "delivered"
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                Delivered
              </button>
            </div>
          </div>
        }
      >
        {queueLoading ? (
          <div className="py-8 text-center text-sm text-zinc-500">Loading orders...</div>
        ) : orderQueue.length > 0 ? (
          <div className="space-y-3">
            {orderQueue.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {order.customerName}
                      </h4>
                      <Badge variant={order.paymentStatus === "prepaid" ? "success" : "warning"}>
                        {typeFilter === "byproduct" 
                          ? (order.paymentStatus === "prepaid" ? "Cash Received" : "Payment Pending")
                          : (order.paymentStatus === "prepaid" ? "Prepaid" : "COD")
                        }
                      </Badge>
                      <Badge variant={order.status === "delivered" ? "success" : "info"}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {order.customerPhone} • {order.customerAddress}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      {typeFilter === "oil" && (
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Agent: <span className="font-medium text-zinc-900 dark:text-zinc-100">{order.agentName}</span>
                        </span>
                      )}
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Total: <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{order.totalAmount.toLocaleString("en-IN")}</span>
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Items: {order.items.map((item: any) => `${item.quantity}× ${item.product_name}`).join(", ")}
                    </div>
                  </div>
                  {queueFilter === "pending" && (
                    <button
                      onClick={() => handleEditOrder(order)}
                      className="ml-4 flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No {queueFilter} orders found
            </p>
          </div>
        )}
      </Card>

      {/* Add Customer Dialog */}
      {showAddCustomer && (
        <AddCustomerDialog
          onClose={() => setShowAddCustomer(false)}
          onSuccess={() => {
            setShowAddCustomer(false);
            loadData();
          }}
        />
      )}

      {/* Add Delivery Agent Dialog */}
      {showAddAgent && (
        <AddDeliveryAgentDialog
          onClose={() => setShowAddAgent(false)}
          onSuccess={(newAgentId) => {
            setShowAddAgent(false);
            loadData();
            // Auto-select the new agent
            form.setValue("deliveryAgentId", newAgentId);
          }}
        />
      )}
    </div>
  );
}

function AddDeliveryAgentDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (agentId: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createDeliveryAgent({ name, email, phone });

    if (result.success && result.data) {
      setTempPassword(result.data.tempPassword);
      // Show password for 3 seconds, then auto-close
      setTimeout(() => {
        onSuccess(result.data.id);
      }, 3000);
    } else {
      setError(result.error || "Failed to create delivery agent");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Add Delivery Agent
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Create a new delivery agent account
        </p>

        {tempPassword ? (
          <div className="mt-4 rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              ✓ Agent created successfully!
            </p>
            <div className="mt-2 rounded border border-emerald-200 bg-white p-2 dark:border-emerald-800 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500">Temporary Password:</p>
              <p className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {tempPassword}
              </p>
            </div>
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
              Share this password with the agent. They can change it after first login.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Phone
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Agent"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
