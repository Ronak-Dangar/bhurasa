"use client";

import { useMemo, useState, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createOrder, getAllCustomersForDropdown, getAllInventoryItems, getDeliveryAgents } from "@/app/actions/orders";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { PlusCircle } from "lucide-react";

const orderSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  paymentStatus: z.enum(["cod", "prepaid"]),
  deliveryAgentId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Choose a product"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
      }),
    )
    .min(1, "Add at least one product"),
  notes: z.string().optional(),
});

export type OrderFormValues = z.infer<typeof orderSchema>;

export function CreateOrderForm() {
  const [submitted, setSubmitted] = useState<OrderFormValues | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [deliveryAgents, setDeliveryAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [customersResult, productsResult, agentsResult] = await Promise.all([
      getAllCustomersForDropdown(),
      getAllInventoryItems(),
      getDeliveryAgents(),
    ]);

    if (customersResult.success) setCustomers(customersResult.data);
    if (productsResult.success) setProducts(productsResult.data);
    if (agentsResult.success) setDeliveryAgents(agentsResult.data);
    setLoading(false);
  };

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: "",
      paymentStatus: "prepaid",
      deliveryAgentId: "",
      items: [
        {
          productId: "",
          quantity: 1,
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
  
  const totalAmount = useMemo(() => {
    return items.reduce((acc, item) => {
      const product = products.find((product) => product.id === item.productId);
      if (!product) return acc;
      return acc + product.avg_cost * item.quantity;
    }, 0);
  }, [items, products]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const search = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.phone.toLowerCase().includes(search)
    );
  }, [customers, searchTerm]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);

    // Build order data with product details
    const orderData = {
      customerId: values.customerId,
      paymentStatus: values.paymentStatus,
      deliveryAgentId: values.deliveryAgentId || undefined,
      items: values.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.item_name || "Unknown Product",
          quantity: item.quantity,
          unitPrice: product?.avg_cost || 0,
        };
      }),
    };

    const result = await createOrder(orderData);

    if (result.success) {
      setSubmitted(values);
      form.reset();
      // Reload data to refresh inventory
      loadData();
    } else {
      setError(result.error || "Failed to create order");
    }
    setSubmitting(false);
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <Card
        title="Raise New Order"
        description="Capture customer request and reserve inventory."
        actions={<Badge variant="info">Draft</Badge>}
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
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <select
                  id="customerId"
                  {...form.register("customerId")}
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Select customer</option>
                  {filteredCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} · {customer.phone}
                    </option>
                  ))}
                </select>
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
                    })
                  }
                >
                  + Add product
                </button>
              </header>

              <div className="space-y-3">
                {fields.map((field, index) => {
                    const currentItem = items[index];
                    const price = products.find((product: any) => product.id === currentItem?.productId)?.avg_cost ?? 0;
                    const quantity = currentItem?.quantity ?? 0;
                  return (
                    <div
                      key={field.id}
                      className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[2fr_1fr_auto]"
                    >
                      <div>
                        <label className="text-xs font-medium uppercase text-zinc-500">Product</label>
                        <select
                          {...form.register(`items.${index}.productId` as const)}
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        >
                          {products.map((product: any) => (
                            <option key={product.id} value={product.id}>
                              {product.item_name} · ₹{product.avg_cost}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium uppercase text-zinc-500">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          {...form.register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div className="flex flex-col items-end justify-between text-xs text-zinc-500">
                        <span>Line Total</span>
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            ₹{(price * quantity).toLocaleString("en-IN")}
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
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Payment Status</label>
                <select
                  {...form.register("paymentStatus")}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="prepaid">Prepaid</option>
                  <option value="cod">Cash on Delivery</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Assign Delivery Agent</label>
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
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? "Creating Order..." : "Raise Order"}
              </button>
            </div>
          </form>
        )}
      </Card>

      <Card title="Preview" description="This is what will be synced to Supabase.">
        {submitted ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                ✓ Order created successfully!
              </p>
            </div>
            <pre className="max-h-[460px] overflow-auto rounded-lg bg-zinc-900 p-4 text-xs text-emerald-200">
{JSON.stringify(submitted, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Fill the order form to preview payload details before pushing to the database.
          </p>
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
    </div>
  );
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
