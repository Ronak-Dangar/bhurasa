import { AlertTriangle, ClipboardCheck, Factory, Truck, Wallet } from "lucide-react";
import type { ComponentType } from "react";
import { MetricCard } from "@/components/ui/metric-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TH, TD } from "@/components/ui/table";
import { buildPipelineAlerts } from "@/lib/analytics";
import type { PipelineAlert } from "@/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  // Fetch all required data in parallel
  const [
    { data: customers },
    { data: orders },
    { data: inventoryItems },
    { data: deliveryAssignments },
    { data: expenses },
    { data: productionBatches },
    { count: leadsToNurtureCount },
    { count: ordersInFlightCount },
    { data: upcomingRefillsData },
  ] = await Promise.all([
    supabase.from("customers").select("*"),
    supabase.from("orders").select("*"),
    supabase.from("inventory_items").select("*"),
    supabase.from("delivery_assignments").select("*"),
    supabase.from("expenses").select("*").gte("expense_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("production_batches").select("*").order("batch_date", { ascending: false }),
    // Command Center Widget Queries
    supabase.from("customers").select("*", { count: "exact", head: true }).in("status", ["inquiry", "education", "price_sent", "trust_process"]),
    supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["pending", "processing", "out_for_delivery"]),
    supabase.from("customers").select("name, phone, status, next_refill_date").or(`status.eq.refill_due,next_refill_date.lte.${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`).order("next_refill_date", { ascending: true }).limit(5),
  ]);

  // Calculate financials
  const deliveredOrders = orders?.filter((o) => o.status === "delivered") ?? [];
  const totalIncome = deliveredOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const netProfit = totalIncome - totalExpenses;

  const alerts = buildPipelineAlerts({
    customers: customers ?? [],
    orders: orders ?? [],
    inventory: inventoryItems ?? [],
    assignments: deliveryAssignments ?? [],
  });

  const nurtureAlerts = alerts.filter((alert) => alert.type === "nurture");
  const retentionAlerts = alerts.filter((alert) => alert.type === "retention");
  const inventoryAlerts = alerts.filter((alert) => alert.type === "inventory");
  const deliveryAlerts = alerts.filter((alert) => alert.type === "delivery");

  const lowStockItems = inventoryItems?.filter((item) => item.stock_level < item.low_stock_threshold) ?? [];
  const upcomingRefills = upcomingRefillsData ?? [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Net Profit (30d)"
          value={`₹${netProfit.toLocaleString("en-IN")}`}
          caption="Income minus expenses"
          trend="↑ 12.4% vs last cycle"
          icon={Wallet}
          tone={netProfit > 0 ? "success" : "danger"}
        />
        <MetricCard
          label="Orders in Flight"
          value={`${ordersInFlightCount ?? 0}`}
          caption="Pending fulfilment"
          icon={Truck}
        />
        <MetricCard
          label="Leads to Nurture"
          value={`${leadsToNurtureCount ?? 0}`}
          caption="Still waiting for follow-up"
          icon={ClipboardCheck}
          tone={(leadsToNurtureCount ?? 0) > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Low Stock Items"
          value={`${lowStockItems.length}`}
          caption="Below safety threshold"
          icon={Factory}
          tone={lowStockItems.length > 0 ? "warning" : "default"}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Pipeline Alerts" description="Prioritise these tasks to retain trust." actions={<Badge variant="info">Live</Badge>}>
          <div className="space-y-6">
            <AlertColumn title="Nurture" alerts={nurtureAlerts} />
            <AlertColumn title="Retention" alerts={retentionAlerts} />
            <AlertColumn title="Inventory" alerts={inventoryAlerts} />
            <AlertColumn title="Delivery" alerts={deliveryAlerts} />
          </div>
        </Card>

        <Card
          className="lg:col-span-2"
          title="Next Actions"
          description="Focus for the next 4 hours"
        >
          <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300">
            <ActionRow icon={AlertTriangle} message="Send health benefits deck to 2 inquiry leads." />
            <ActionRow icon={Truck} message="Confirm COD payment for Order 2102 after delivery." />
            <ActionRow icon={Factory} message="Prepare labels for Batch 24A bottling completion." />
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Production Timeline"
          description="Track batches from groundnut to bottle."
        >
          <Table>
            <THead>
              <tr>
                <TH>Batch</TH>
                <TH>Phase</TH>
                <TH>Input</TH>
                <TH>Output</TH>
              </tr>
            </THead>
            <TBody>
              {productionBatches?.map((batch) => (
                <tr key={batch.id}>
                  <TD className="font-medium text-zinc-900 dark:text-zinc-100">
                    <div>{batch.batch_code.toUpperCase()}</div>
                    <div className="text-xs text-zinc-500">{new Date(batch.batch_date).toLocaleDateString()}</div>
                  </TD>
                  <TD>
                    <Badge variant="neutral" className="uppercase">
                      {batch.phase}
                    </Badge>
                    {batch.farmer_name && (
                      <div className="text-xs text-zinc-500">{batch.farmer_name}</div>
                    )}
                  </TD>
                  <TD>{batch.input_groundnuts_kg} kg</TD>
                  <TD>
                    {batch.output_oil_liters ? `${batch.output_oil_liters} L Oil` : "Pending"}
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card title="Upcoming Refills" description="Stay ahead of customer consumption cycles.">
          <Table>
            <THead>
              <tr>
                <TH>Customer</TH>
                <TH>Status</TH>
                <TH>Next Refill</TH>
              </tr>
            </THead>
            <TBody>
              {upcomingRefills.map((customer, index) => (
                <tr key={index}>
                  <TD className="font-medium text-zinc-900 dark:text-zinc-100">
                    <div>{customer.name}</div>
                    <div className="text-xs text-zinc-500">{customer.phone}</div>
                  </TD>
                  <TD>
                    <Badge variant="info">{formatStatus(customer.status)}</Badge>
                  </TD>
                  <TD>
                    {customer.next_refill_date
                      ? new Date(customer.next_refill_date).toLocaleDateString()
                      : "Calculate"}
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}

interface AlertColumnProps {
  title: string;
  alerts: PipelineAlert[];
}

function AlertColumn({ title, alerts }: AlertColumnProps) {
  if (alerts.length === 0) {
    return (
      <div>
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">All clear.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
      <ul className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
        {alerts.map((alert) => (
          <li key={alert.id} className="flex items-start justify-between rounded-lg bg-emerald-50/60 px-3 py-2 dark:bg-emerald-950/40">
            <span>{alert.message}</span>
            <Badge variant={alert.severity === "critical" ? "danger" : alert.severity === "warning" ? "warning" : "info"}>
              {alert.severity.toUpperCase()}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ActionRowProps {
  icon: ComponentType<{ size?: number }>;
  message: string;
}

function ActionRow({ icon: Icon, message }: ActionRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="rounded-full bg-emerald-500/15 p-2 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200">
        <Icon size={16} />
      </span>
      <span>{message}</span>
    </div>
  );
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
