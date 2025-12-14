import { PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TH, TD } from "@/components/ui/table";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AddExpenseForm } from "@/components/finance/add-expense-form";
import { LoanManagement } from "@/components/finance/loan-management";

const expenseLabels: Record<string, string> = {
  purchase_groundnuts: "Purchase Groundnuts",
  transport: "Transport",
  labor: "Labor",
  maintenance: "Maintenance",
  utilities: "Utilities",
};

export default async function FinancePage() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: expenses },
    { data: orders },
    { data: loans },
    { data: inventoryItems },
    bulkOilCostResult,
  ] = await Promise.all([
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    supabase.from("orders").select("*"),
    supabase.from("loans").select("*"),
    supabase.from("inventory_items").select("item_name, avg_cost"),
    supabase.rpc("get_bulk_oil_cost_per_liter"),
  ]);

  const allExpenses = expenses ?? [];
  const allOrders = orders ?? [];
  const allLoans = loans ?? [];
  const packagingCosts = inventoryItems ?? [];
  const bulkOilCostPerLiter = (bulkOilCostResult.data as number) ?? 0;

  const totalIncome = allOrders
    .filter((order) => order.status === "delivered")
    .reduce((acc, order) => acc + (order.total_amount ?? 0), 0);

  const totalExpenses = allExpenses.reduce((acc, expense) => acc + (expense.amount ?? 0), 0);
  const netProfit = totalIncome - totalExpenses;

  const codReceivables = allOrders
    .filter((order) => order.payment_status === "cod" && order.status !== "delivered")
    .reduce((acc, order) => acc + (order.total_amount ?? 0), 0);

  const totalPayables = allExpenses
    .filter((expense) => expense.status === "unpaid")
    .reduce((acc, expense) => acc + (expense.amount ?? 0), 0);

  const getPackagingCost = (itemName: string) => {
    const item = packagingCosts.find((i) => i.item_name === itemName);
    return item?.avg_cost ?? 0;
  };

  const cogs1L = bulkOilCostPerLiter * 1 + getPackagingCost("Empty 1L Bottle") + getPackagingCost("Labels");
  const cogs5L = bulkOilCostPerLiter * 5 + getPackagingCost("Empty 5L Tin") + getPackagingCost("Labels");
  const cogs15L = bulkOilCostPerLiter * 15 + getPackagingCost("Empty 15L Tin") + getPackagingCost("Labels");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Finance Snapshot</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            High-level profitability and cost levers across the oil lifecycle.
          </p>
        </div>
        <AddExpenseForm />
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <MetricCard
          label="Income (Delivered)"
          value={`₹${totalIncome.toLocaleString("en-IN")}`}
          caption="Collected from prepaid + COD"
          trend="↑ 8.2%"
          icon={TrendingUp}
          tone="success"
        />
        <MetricCard
          label="Expenses (30d)"
          value={`₹${totalExpenses.toLocaleString("en-IN")}`}
          caption="Procurement + Ops"
          icon={PiggyBank}
        />
        <MetricCard
          label="Net Profit"
          value={`₹${netProfit.toLocaleString("en-IN")}`}
          caption={`COD pending ₹${codReceivables.toLocaleString("en-IN")}`}
          icon={Wallet}
          tone={netProfit > 0 ? "success" : "danger"}
        />
      </section>

      <Card title="Payables & Receivables" description="Track outstanding obligations and expected cash.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/40 dark:bg-rose-950/30">
            <p className="text-sm font-medium text-rose-700 dark:text-rose-200">Total Payables</p>
            <p className="mt-2 text-2xl font-semibold text-rose-900 dark:text-rose-100">
              ₹{totalPayables.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">Unpaid expenses</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-200">Total Receivables</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-900 dark:text-emerald-100">
              ₹{codReceivables.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-300">Pending COD collections</p>
          </div>
        </div>
      </Card>

      <LoanManagement loans={allLoans} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Expense Ledger" description="Where every rupee went this week.">
          <div className="w-full overflow-x-auto">
            <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>Category</TH>
                <TH>Amount</TH>
                <TH>Status</TH>
                <TH>Notes</TH>
              </tr>
            </THead>
            <TBody>
              {allExpenses.map((expense) => (
                <tr key={expense.id}>
                  <TD className="font-medium text-zinc-900 dark:text-zinc-100">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </TD>
                  <TD>{expenseLabels[expense.expense_type] ?? expense.expense_type}</TD>
                  <TD>₹{expense.amount.toLocaleString("en-IN")}</TD>
                  <TD>
                    <Badge variant={expense.status === "paid" ? "success" : "warning"}>
                      {expense.status.toUpperCase()}
                    </Badge>
                  </TD>
                  <TD className="text-xs text-zinc-500">{expense.description ?? "-"}</TD>
                </tr>
              ))}
            </TBody>
            </Table>
          </div>
        </Card>

        <Card title="Cost of Goods Sold (COGS)" description="Dynamic profitability breakdown per SKU.">
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">Bulk Oil Cost</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-200">
                ₹{bulkOilCostPerLiter.toFixed(2)} / Liter
              </p>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-300">
                Based on production expenses + groundnut costs
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">COGS (1L Bottle)</span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    ₹{cogs1L.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Oil: ₹{bulkOilCostPerLiter.toFixed(2)} + Bottle: ₹{getPackagingCost("Empty 1L Bottle")} + Label: ₹{getPackagingCost("Labels")}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">COGS (5L Tin)</span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    ₹{cogs5L.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Oil: ₹{(bulkOilCostPerLiter * 5).toFixed(2)} + Tin: ₹{getPackagingCost("Empty 5L Tin")} + Label: ₹{getPackagingCost("Labels")}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">COGS (15L Tin)</span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    ₹{cogs15L.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Oil: ₹{(bulkOilCostPerLiter * 15).toFixed(2)} + Tin: ₹{getPackagingCost("Empty 15L Tin")} + Label: ₹{getPackagingCost("Labels")}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
