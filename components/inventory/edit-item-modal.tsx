"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { updateInventoryItem } from "@/app/actions/inventory";

interface EditItemModalProps {
  item: {
    id: string;
    item_name: string;
    item_type: string;
    stock_level: number;
    unit: string;
    avg_cost: number;
    low_stock_threshold: number;
  };
  onClose: () => void;
}

export function EditItemModal({ item, onClose }: EditItemModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.append("item_id", item.id);

    const result = await updateInventoryItem(formData);

    if (result.success) {
      onClose();
    } else {
      alert(`Error: ${result.error}`);
    }

    setIsSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Edit Inventory Item
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Update item details and pricing
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Item Name
            </label>
            <input
              type="text"
              name="item_name"
              defaultValue={item.item_name}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Type
              </label>
              <input
                type="text"
                value={item.item_type}
                disabled
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Unit
              </label>
              <input
                type="text"
                value={item.unit}
                disabled
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Current Stock
              </label>
              <input
                type="number"
                value={item.stock_level}
                disabled
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Use Stock Movement to adjust quantity
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Avg Cost (₹)
              </label>
              <input
                type="number"
                name="avg_cost"
                step="0.01"
                min="0"
                defaultValue={item.avg_cost}
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Low Stock Threshold
            </label>
            <input
              type="number"
              name="low_stock_threshold"
              step="0.1"
              min="0"
              defaultValue={item.low_stock_threshold}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Alert when stock falls below this level
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
