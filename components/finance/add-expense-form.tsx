"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { addExpense } from "@/app/actions/finance";

const expenseCategories = [
  { value: "purchase_groundnuts", label: "Purchase Groundnuts", procurement: true },
  { value: "transport", label: "Transport", procurement: false },
  { value: "labor", label: "Labor", procurement: false },
  { value: "maintenance", label: "Maintenance", procurement: false },
  { value: "utilities", label: "Utilities", procurement: false },
];

export function AddExpenseForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("purchase_groundnuts");
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  const isProcurement = expenseCategories.find(c => c.value === selectedCategory)?.procurement || false;

  useEffect(() => {
    if (isProcurement && isOpen) {
      // Fetch inventory items for procurement categories
      fetch('/api/inventory-items')
        .then(res => res.json())
        .then(data => setInventoryItems(data.items || []))
        .catch(() => setInventoryItems([]));
    }
  }, [isProcurement, isOpen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await addExpense(formData);

    if (result.success) {
      setIsOpen(false);
      (event.target as HTMLFormElement).reset();
      setSelectedCategory("purchase_groundnuts");
      if (result.message) {
        alert(result.message);
      }
    } else {
      alert(`Error: ${result.error}`);
    }

    setIsSubmitting(false);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500"
      >
        + Log New Expense
      </button>
    );
  }

  return (
    <Card title="Add Expense" description="Record a new business expense">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Date
            </label>
            <input
              type="date"
              name="expense_date"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Amount (₹)
            </label>
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Category
            </label>
            <select
              name="expense_type"
              required
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {expenseCategories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Status
            </label>
            <select
              name="status"
              defaultValue="paid"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {isProcurement && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <h4 className="mb-3 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              📦 Inventory Update (ERP Bridge)
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  Inventory Item
                </label>
                <select
                  name="inventory_item_id"
                  required={isProcurement}
                  className="mt-1 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-emerald-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Select item...</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_name} (Current: {item.stock_level} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  Quantity Purchased
                </label>
                <input
                  type="number"
                  name="procurement_quantity"
                  step="0.1"
                  min="0"
                  required={isProcurement}
                  placeholder="e.g., 1000 kg"
                  className="mt-1 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-emerald-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
              ℹ️ Stock level and weighted average cost will be automatically updated
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Notes
          </label>
          <textarea
            name="description"
            rows={2}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="Optional description or vendor details"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Add Expense"}
          </button>
        </div>
      </form>
    </Card>
  );
}
