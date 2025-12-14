import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TH, TD } from "@/components/ui/table";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InventoryClientWrappers, InventoryTableActions } from "@/components/inventory/inventory-client-wrappers";
import Link from "next/link";
import { FileText } from "lucide-react";

export default async function InventoryPage() {
  const supabase = await createSupabaseServerClient();
  
  const { data: inventoryItems, error } = await supabase
    .from("inventory_items")
    .select("*")
    .order("item_name", { ascending: true });

  if (error) {
    console.error("Error fetching inventory:", error);
  }

  const items = inventoryItems ?? [];
  const grouped = groupByType(items);
  const lowStock = items.filter((item) => item.stock_level < item.low_stock_threshold);

  return (
    <InventoryClientWrappers>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Inventory Management
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Track stock levels and manage reorder points
          </p>
        </div>
        <Link
          href="/inventory/log"
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <FileText size={18} />
          View Full Log
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(grouped).map(([type, items]) => {
          const totalValue = items.reduce((acc, item) => acc + item.avg_cost * item.stock_level, 0);
          const lowCount = items.filter((item) => item.stock_level < item.low_stock_threshold).length;
          const hasRisk = lowCount > 0;
          return (
            <Card
              key={type}
              title={
                <div className="flex items-center gap-2">
                  <span>{formatType(type)} ({items.length})</span>
                  {hasRisk && (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      {lowCount} at risk
                    </span>
                  )}
                </div>
              }
              description={`₹${Math.round(totalValue).toLocaleString("en-IN")} total value`}
              className={hasRisk ? "border-l-4 border-l-rose-500 bg-white/80 dark:bg-zinc-900/80" : "border-l-4 border-l-emerald-500 bg-white/80 dark:bg-zinc-900/80"}
            >
              <div className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                {items.map((item) => {
                  const itemLow = item.stock_level < item.low_stock_threshold;
                  return (
                    <div key={item.id} className="flex items-center justify-between">
                      <span className={itemLow ? "text-rose-600 dark:text-rose-400" : ""}>{item.item_name}</span>
                      <span className={`font-medium ${itemLow ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                        {item.stock_level} {item.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <Card title="Detailed View" description="Review stock thresholds and reorder actions.">
        <div className="w-full overflow-x-auto">
          <Table>
            <THead>
            <tr>
              <TH>Item</TH>
              <TH>Type</TH>
              <TH>On Hand</TH>
              <TH>Avg Cost</TH>
              <TH>Low Stock Threshold</TH>
              <TH>Actions</TH>
            </tr>
          </THead>
          <TBody>
            {items.map((item) => {
              const stockPercentage = (item.stock_level / item.low_stock_threshold) * 100;
              const isLow = stockPercentage < 100;
              const isMedium = stockPercentage >= 100 && stockPercentage < 150;
              const isHealthy = stockPercentage >= 150;
              
              return (
                <tr key={item.id} className={isLow ? "bg-rose-50/70 dark:bg-rose-950/40" : undefined}>
                  <TD className="font-medium text-zinc-900 dark:text-zinc-100">{item.item_name}</TD>
                  <TD>
                    <Badge variant="neutral">{formatType(item.item_type)}</Badge>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        isLow ? "text-rose-700 dark:text-rose-300" :
                        isMedium ? "text-amber-700 dark:text-amber-300" :
                        "text-emerald-700 dark:text-emerald-300"
                      }`}>
                        {item.stock_level}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">{item.unit}</span>
                      {isLow && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                          Low
                        </span>
                      )}
                      {isHealthy && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Healthy
                        </span>
                      )}
                    </div>
                  </TD>
                  <TD>₹{item.avg_cost.toLocaleString("en-IN")}</TD>
                  <TD>
                    <span className="text-zinc-600 dark:text-zinc-400">{item.low_stock_threshold}</span>
                  </TD>
                  <TD>
                    <InventoryTableActions item={item} />
                  </TD>
                </tr>
              );
            })}
          </TBody>
          </Table>
        </div>
      </Card>

      <Card title="Reorder Suggestions" description="Trigger procurement before operations stall.">
        {lowStock.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">All inventory within safe levels</p>
          </div>
        ) : (
          <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
            {lowStock.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-lg border border-rose-200/60 bg-white p-3 dark:border-rose-800/40 dark:bg-zinc-900">
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.item_name}</p>
                  <p className="text-xs text-zinc-500">Safety stock {item.low_stock_threshold} {item.unit}</p>
                </div>
                <Badge variant="danger">{item.stock_level} {item.unit}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </InventoryClientWrappers>
  );
}

function groupByType(items: any[]) {
  // ─────────────────────────────────────────────────────────────
  // BUSINESS CATEGORY MAPPING (3 groups from 5 database types)
  // ─────────────────────────────────────────────────────────────
  // "Purchased": raw_material (Groundnuts) + packaging (Bottles, Tins, Labels)
  // "In Processing": intermediate (Pressed Oil - not yet filtered)
  // "Ready to Sell": finished_good (Bottled Oil) + byproduct (Oil Cake)
  // ─────────────────────────────────────────────────────────────
  
  const purchased: any[] = [];
  const inProcessing: any[] = [];
  const readyToSell: any[] = [];

  items.forEach((item) => {
    if (item.item_type === "raw_material" || item.item_type === "packaging") {
      purchased.push(item);
    } else if (item.item_type === "intermediate") {
      inProcessing.push(item);
    } else if (item.item_type === "finished_good" || item.item_type === "byproduct") {
      readyToSell.push(item);
    }
  });

  return {
    purchased,
    in_processing: inProcessing,
    ready_to_sell: readyToSell,
  };
}

function formatType(type: string) {
  const typeMap: Record<string, string> = {
    // Business categories (used in cards)
    purchased: "Purchased",
    in_processing: "In Processing",
    ready_to_sell: "Ready to Sell",
    // Database types (used in table badge)
    raw_material: "Raw Material",
    packaging: "Packaging",
    intermediate: "Intermediate",
    finished_good: "Finished Good",
    byproduct: "Byproduct",
  };

  return typeMap[type] || type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
