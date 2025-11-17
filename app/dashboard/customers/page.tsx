"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TH, TD } from "@/components/ui/table";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { CustomerDetailsModal } from "@/components/customers/customer-details-modal";
import type { Customer, LeadStatus } from "@/types";
import { Trash2 } from "lucide-react";
import { deleteCustomer } from "@/app/actions/customers";

const STATUS_FILTERS: { label: string; value: LeadStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Inquiry", value: "inquiry" },
  { label: "Education", value: "education" },
  { label: "Price Sent", value: "price_sent" },
  { label: "Trust Process", value: "trust_process" },
  { label: "Closed Won", value: "closed_won" },
  { label: "Feedback Pending", value: "feedback_pending" },
  { label: "Refill Due", value: "refill_due" },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<LeadStatus | "all">("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const supabase = createSupabaseClient();

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCustomers(data);
      setFilteredCustomers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("customers-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        () => {
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedFilter === "all") {
      setFilteredCustomers(customers);
    } else {
      setFilteredCustomers(customers.filter((c) => c.status === selectedFilter));
    }
  }, [selectedFilter, customers]);

  const handleDelete = async (customerId: string) => {
    const result = await deleteCustomer(customerId);
    if (result.success) {
      setDeleteConfirm(null);
      fetchCustomers();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const getStatusBadgeVariant = (status: LeadStatus): "default" | "info" | "success" | "warning" | "danger" => {
    switch (status) {
      case "inquiry":
      case "education":
        return "info";
      case "price_sent":
      case "trust_process":
        return "warning";
      case "closed_won":
        return "success";
      case "feedback_pending":
        return "default";
      case "refill_due":
        return "danger";
      default:
        return "default";
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Customers</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your customer pipeline from inquiry to refill.
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500"
        >
          + Add New Customer
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setSelectedFilter(filter.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedFilter === filter.value
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <Card title={`${filteredCustomers.length} Customers`} description="Click a row to view details">
        {loading ? (
          <div className="py-8 text-center text-sm text-zinc-500">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">No customers found.</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Phone</TH>
                <TH>Status</TH>
                <TH>Family Size</TH>
                <TH>Next Refill</TH>
                <TH>Actions</TH>
              </tr>
            </THead>
            <TBody>
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <TD className="font-medium text-zinc-900 dark:text-zinc-100">
                    <div>{customer.name}</div>
                    <div className="text-xs text-zinc-500">{customer.address}</div>
                  </TD>
                  <TD>{customer.phone}</TD>
                  <TD>
                    <Badge variant={getStatusBadgeVariant(customer.status)}>
                      {formatStatus(customer.status)}
                    </Badge>
                  </TD>
                  <TD className="capitalize">{customer.familySize}</TD>
                  <TD>
                    {customer.nextRefillDate
                      ? new Date(customer.nextRefillDate).toLocaleDateString()
                      : "—"}
                  </TD>
                  <TD>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(customer.id);
                      }}
                      className="rounded p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      title="Delete customer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Add Customer Dialog */}
      {showAddDialog && (
        <AddCustomerDialog
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            fetchCustomers();
          }}
        />
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onSuccess={() => {
            setSelectedCustomer(null);
            fetchCustomers();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Delete Customer?
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              This action cannot be undone. All orders and history will also be deleted.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
