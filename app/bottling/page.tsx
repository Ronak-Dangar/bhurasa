"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { createBottlingRun } from "@/app/actions/bottling";
import { createSupabaseClient } from "@/lib/supabase/client";

type BottlingLine = {
  id: number;
  sku: string;
  quantity: number;
};

export default function BottlingPage() {
  const [lines, setLines] = useState<BottlingLine[]>([
    { id: 1, sku: "1L Bottle", quantity: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nextId, setNextId] = useState(2);
  const [availableBulkOil, setAvailableBulkOil] = useState<number | null>(null);
  const [loadingStock, setLoadingStock] = useState(true);

  const supabase = createSupabaseClient();
  const skuOptions = ["1L Bottle", "5L Tin", "15L Tin"];

  // Fetch available bulk oil stock
  useEffect(() => {
    const fetchBulkOilStock = async () => {
      setLoadingStock(true);
      const { data: inventoryItems } = await supabase
        .from("inventory_items")
        .select("id, item_name, stock_level");

      if (inventoryItems) {
        const bulkOil = inventoryItems.find((item: any) =>
          item.item_name.toLowerCase().includes("bulk oil") ||
          (item.item_name.toLowerCase().includes("oil") && !item.item_name.toLowerCase().includes("bottle"))
        );

        if (bulkOil) {
          setAvailableBulkOil(bulkOil.stock_level);
        }
      }
      setLoadingStock(false);
    };

    fetchBulkOilStock();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("bulk-oil-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items" },
        () => {
          fetchBulkOilStock();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addLine = () => {
    setLines([...lines, { id: nextId, sku: "1L Bottle", quantity: 0 }]);
    setNextId(nextId + 1);
  };

  const removeLine = (id: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((line) => line.id !== id));
    }
  };

  const updateLine = (id: number, field: "sku" | "quantity", value: string | number) => {
    setLines(
      lines.map((line) =>
        line.id === id ? { ...line, [field]: value } : line
      )
    );
  };

  const calculateTotalLiters = () => {
    return lines.reduce((total, line) => {
      const litersPerUnit = parseFloat(line.sku.split("L")[0]) || 0;
      return total + litersPerUnit * line.quantity;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate that all quantities are positive
    const hasInvalidQuantity = lines.some((line) => line.quantity <= 0);
    if (hasInvalidQuantity) {
      setError("All quantities must be greater than 0");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("bottling_lines", JSON.stringify(lines));

    const result = await createBottlingRun(formData);

    if (result.success) {
      setSuccess(result.message || "Bottling run completed successfully!");
      // Reset form
      setLines([{ id: nextId, sku: "1L Bottle", quantity: 0 }]);
      setNextId(nextId + 1);
    } else {
      setError(result.error || "Failed to create bottling run");
    }

    setLoading(false);
  };

  const totalLiters = calculateTotalLiters();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Bottling Module
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Convert bulk oil into finished goods across multiple SKUs.
        </p>
      </div>

      {/* Available Bulk Oil Display */}
      <Card title="Available Inventory">
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Available Bulk Oil
            </p>
            {loadingStock ? (
              <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-200/70">
                Loading...
              </p>
            ) : (
              <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-200/70">
                Real-time stock level from inventory
              </p>
            )}
          </div>
          <div className="text-right">
            {loadingStock ? (
              <div className="h-8 w-24 animate-pulse rounded bg-emerald-200 dark:bg-emerald-900"></div>
            ) : (
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-100">
                {availableBulkOil !== null ? availableBulkOil.toFixed(1) : "---"} L
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card title="Start New Bottling Run">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Message */}
          {success && (
            <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Bottling Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Bottling Lines
              </label>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <Plus size={14} />
                Add Line
              </button>
            </div>

            {lines.map((line, index) => (
              <div
                key={line.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {index + 1}.
                </span>

                {/* SKU Dropdown */}
                <select
                  value={line.sku}
                  onChange={(e) => updateLine(line.id, "sku", e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  {skuOptions.map((sku) => (
                    <option key={sku} value={sku}>
                      {sku}
                    </option>
                  ))}
                </select>

                {/* Quantity Input */}
                <input
                  type="number"
                  min="0"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(line.id, "quantity", parseInt(e.target.value) || 0)
                  }
                  placeholder="Qty"
                  className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />

                {/* Liters Calculation */}
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  = {(parseFloat(line.sku.split("L")[0]) || 0) * line.quantity} L
                </span>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  disabled={lines.length === 1}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-200 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-zinc-800"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Total Summary */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Total Bulk Oil Required
              </span>
              <span className="text-2xl font-semibold text-blue-700 dark:text-blue-100">
                {totalLiters.toFixed(1)} L
              </span>
            </div>
            <p className="mt-1 text-xs text-blue-600/80 dark:text-blue-200/70">
              This amount will be deducted from your bulk oil inventory
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || totalLiters === 0}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Start Bottling Run"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
