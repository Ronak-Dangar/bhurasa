import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown } from "lucide-react";

type StockMovement = {
  id: string;
  item_id: string;
  quantity_change: number;
  reason: string | null;
  created_at: string;
  inventory_items: {
    item_name: string;
    unit: string;
  } | null;
};

export default async function StockMovementsLogPage() {
  const supabase = await createSupabaseServerClient();

  const { data: movements, error } = await supabase
    .from("stock_movements")
    .select(`
      id,
      item_id,
      quantity_change,
      reason,
      created_at,
      inventory_items!inner (
        item_name,
        unit
      )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-rose-600">Error loading stock movements: {error.message}</p>
      </div>
    );
  }

  // Transform the data to have the correct shape
  const transformedMovements = (movements || []).map((m: any) => ({
    ...m,
    inventory_items: Array.isArray(m.inventory_items) ? m.inventory_items[0] : m.inventory_items,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Stock Movements Log
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Complete audit trail of all inventory changes
          </p>
        </div>
        <Badge variant="info">
          {movements?.length || 0} {movements?.length === 1 ? "record" : "records"}
        </Badge>
      </div>

      <Card title="Inventory Ledger">
        {!transformedMovements || transformedMovements.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            No stock movements recorded yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="pb-3 text-left font-semibold text-zinc-900 dark:text-zinc-100">
                    Date & Time
                  </th>
                  <th className="pb-3 text-left font-semibold text-zinc-900 dark:text-zinc-100">
                    Item
                  </th>
                  <th className="pb-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                    Change
                  </th>
                  <th className="pb-3 text-left font-semibold text-zinc-900 dark:text-zinc-100">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {transformedMovements.map((movement: StockMovement) => {
                  const isIncrease = movement.quantity_change > 0;
                  const date = new Date(movement.created_at);
                  const formattedDate = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const formattedTime = date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={movement.id}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/50"
                    >
                      <td className="py-3 text-zinc-700 dark:text-zinc-300">
                        <div className="flex flex-col">
                          <span className="font-medium">{formattedDate}</span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formattedTime}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {movement.inventory_items?.item_name || "Unknown Item"}
                      </td>
                      <td className="py-3 text-right">
                        <div
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isIncrease
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          }`}
                        >
                          {isIncrease ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          )}
                          {isIncrease ? "+" : ""}
                          {movement.quantity_change} {movement.inventory_items?.unit || ""}
                        </div>
                      </td>
                      <td className="py-3 text-zinc-600 dark:text-zinc-400">
                        {movement.reason || (
                          <span className="italic text-zinc-400 dark:text-zinc-500">
                            No reason provided
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-sm dark:border-blue-900/40 dark:bg-blue-950/30">
        <p className="font-medium text-blue-800 dark:text-blue-200">
          💡 Audit Trail Information
        </p>
        <p className="mt-1 text-blue-700 dark:text-blue-300">
          This ledger shows the last 200 stock movements. Each entry represents a transaction
          that modified inventory levels. All changes are automatically logged with timestamps
          and reasons for complete traceability.
        </p>
      </div>
    </div>
  );
}
