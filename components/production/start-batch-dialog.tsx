"use client";

import { useState } from "react";
import { createProductionBatch } from "@/app/actions/production";

interface StartBatchDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function StartBatchDialog({ onClose, onSuccess }: StartBatchDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createProductionBatch(formData);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "Failed to create batch");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Start New Production Batch
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Create a new batch that will start in Phase 1 (De-husking).
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="batch_code"
              className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Batch Code *
            </label>
            <input
              type="text"
              id="batch_code"
              name="batch_code"
              required
              placeholder="e.g., batch-25a"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="farmer_name"
              className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Farmer Name
            </label>
            <input
              type="text"
              id="farmer_name"
              name="farmer_name"
              placeholder="e.g., Aravind Farms"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="batch_date"
              className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Batch Date *
            </label>
            <input
              type="date"
              id="batch_date"
              name="batch_date"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Start Batch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
