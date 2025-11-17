"use client";

import { useState, useEffect } from "react";
import { updateCustomer, getCustomerStatusHistory } from "@/app/actions/customers";
import type { Customer, LeadStatus, FamilySize } from "@/types";
import { Badge } from "@/components/ui/badge";

interface CustomerDetailsModalProps {
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

const LEAD_STATUSES: LeadStatus[] = [
  "inquiry",
  "education",
  "price_sent",
  "trust_process",
  "closed_won",
  "feedback_pending",
  "refill_due",
];

export function CustomerDetailsModal({ customer, onClose, onSuccess }: CustomerDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "timeline">("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (activeTab === "timeline") {
      loadStatusHistory();
    }
  }, [activeTab]);

  const loadStatusHistory = async () => {
    setLoadingHistory(true);
    const result = await getCustomerStatusHistory(customer.id);
    if (result.success) {
      setStatusHistory(result.data);
    }
    setLoadingHistory(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateCustomer(customer.id, formData);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "Failed to update customer");
    }
    setLoading(false);
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-zinc-900">
        {/* Header */}
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Customer 360: {customer.name}
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {customer.phone}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("details")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "details"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "timeline"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Activity Timeline
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto p-6">
          {activeTab === "details" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Name *
                </label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  required
                  defaultValue={customer.name}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label htmlFor="edit-phone" className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Phone *
                </label>
                <input
                  type="tel"
                  id="edit-phone"
                  name="phone"
                  required
                  defaultValue={customer.phone}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label htmlFor="edit-address" className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Address *
                </label>
                <textarea
                  id="edit-address"
                  name="address"
                  required
                  rows={3}
                  defaultValue={customer.address}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label htmlFor="edit-family_size" className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Family Size *
                </label>
                <select
                  id="edit-family_size"
                  name="family_size"
                  required
                  defaultValue={customer.familySize}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="small">Small (1L/month)</option>
                  <option value="medium">Medium (2L/month)</option>
                  <option value="large">Large (3L/month)</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-status" className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Status (Manual Override)
                </label>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Manually move customer through the nurture funnel
                </p>
                <select
                  id="edit-status"
                  name="status"
                  defaultValue={customer.status}
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
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
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {loadingHistory ? (
                <div className="py-8 text-center text-sm text-zinc-500">Loading history...</div>
              ) : statusHistory.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-500">No activity recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {statusHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="info">{formatStatus(entry.status)}</Badge>
                            <span className="text-xs text-zinc-500">
                              {new Date(entry.changed_at).toLocaleString()}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer for Timeline tab */}
        {activeTab === "timeline" && (
          <div className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
