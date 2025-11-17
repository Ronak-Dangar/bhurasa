"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createStockMovement, getAllInventoryItems } from "@/app/actions/inventory";

interface StockMovementModalProps {
  onClose: () => void;
}

export function StockMovementModal({ onClose }: StockMovementModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    async function fetchItems() {
      const result = await getAllInventoryItems();
      if (result.success) {
        setInventoryItems(result.data);
      }
    }
    fetchItems();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await createStockMovement(formData);

    if (result.success) {
      alert(result.message || "Stock updated successfully");
      onClose();
    } else {
      alert(`Error: ${result.error}`);
    }

    setIsSubmitting(false);
  }

  function handleItemChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const itemId = e.target.value;
    const item = inventoryItems.find((i) => i.id === itemId);
    setSelectedItem(item || null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              New Stock Movement
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Record procurement, wastage, or stock adjustments
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
              Item
            </label>
            <select
              name="item_id"
              onChange={handleItemChange}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">Select an item...</option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.item_name} (Current: {item.stock_level} {item.unit})
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-200">
                Current Stock
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                {selectedItem.stock_level} {selectedItem.unit}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Quantity Change
            </label>
            <input
              type="number"
              name="quantity"
              step="0.1"
              required
              placeholder="Use + for addition, - for subtraction"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Examples: +500 (procurement), -20 (wastage), +10 (audit correction)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Reason
            </label>
            <textarea
              name="reason"
              rows={3}
              required
              placeholder="e.g., Procurement from Gowda Farms, Wastage during bottling, Stock audit correction"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
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
              {isSubmitting ? "Processing..." : "Record Movement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
