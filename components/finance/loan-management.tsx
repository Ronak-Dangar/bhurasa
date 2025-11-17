"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TH, TD } from "@/components/ui/table";
import { addLoanTransaction } from "@/app/actions/finance";

interface Loan {
  id: string;
  lender_name: string;
  initial_amount: number;
  current_balance: number;
  interest_rate_pa: number | null;
  created_at: string;
}

interface LoanManagementProps {
  loans: Loan[];
}

export function LoanManagement({ loans }: LoanManagementProps) {
  const [activeModal, setActiveModal] = useState<{
    loanId: string;
    type: "payment" | "interest";
  } | null>(null);

  return (
    <>
      <Card
        title="Loan Management"
        description="Track outstanding loans and record transactions"
      >
        {loans.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No active loans recorded.
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Lender</TH>
                <TH>Initial Amount</TH>
                <TH>Current Balance</TH>
                <TH>Interest Rate</TH>
                <TH>Actions</TH>
              </tr>
            </THead>
            <TBody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <TD className="font-medium text-zinc-900 dark:text-zinc-100">
                    {loan.lender_name}
                  </TD>
                  <TD>₹{loan.initial_amount.toLocaleString("en-IN")}</TD>
                  <TD>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      ₹{loan.current_balance.toLocaleString("en-IN")}
                    </span>
                  </TD>
                  <TD>
                    {loan.interest_rate_pa ? `${loan.interest_rate_pa}% p.a.` : "—"}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setActiveModal({ loanId: loan.id, type: "interest" })
                        }
                        className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
                      >
                        Log Interest
                      </button>
                      <button
                        onClick={() =>
                          setActiveModal({ loanId: loan.id, type: "payment" })
                        }
                        className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                      >
                        Log Payment
                      </button>
                    </div>
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {activeModal && (
        <LoanTransactionModal
          loanId={activeModal.loanId}
          type={activeModal.type}
          loanName={
            loans.find((l) => l.id === activeModal.loanId)?.lender_name ?? ""
          }
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}

interface LoanTransactionModalProps {
  loanId: string;
  type: "payment" | "interest";
  loanName: string;
  onClose: () => void;
}

function LoanTransactionModal({
  loanId,
  type,
  loanName,
  onClose,
}: LoanTransactionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.append("loan_id", loanId);
    formData.append("type", type);

    const result = await addLoanTransaction(formData);

    if (result.success) {
      onClose();
    } else {
      alert(`Error: ${result.error}`);
    }

    setIsSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {type === "payment" ? "Log Payment" : "Log Interest"}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {loanName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoFocus
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
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
              {isSubmitting ? "Saving..." : "Record Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
