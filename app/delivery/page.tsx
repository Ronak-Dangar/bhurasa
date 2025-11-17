import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TH, TD } from "@/components/ui/table";
import { deliveryAgents, customers, orders } from "@/lib/sample-data";
import { ordersByDeliveryAgent } from "@/lib/analytics";

export default function DeliveryPage() {
  const agentId = "agent-01";
  const agent = deliveryAgents.find((item) => item.id === agentId);
  const assignedOrders = ordersByDeliveryAgent(orders, agentId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Delivery Agent View</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Orders visible here are restricted to assigned deliveries only.
        </p>
      </div>

      <Card
        title={agent ? `${agent.name}` : "Delivery Agent"}
        description={agent?.phone ?? "Contact dispatch for assignments."}
        actions={<Badge variant="info">Shift · 6am - 2pm</Badge>}
      >
        <Table>
          <THead>
            <tr>
              <TH>Order</TH>
              <TH>Customer</TH>
              <TH>Quantity</TH>
              <TH>Payment</TH>
              <TH>Actions</TH>
            </tr>
          </THead>
          <TBody>
            {assignedOrders.length === 0 ? (
              <tr>
                <TD colSpan={5}>No orders assigned.</TD>
              </tr>
            ) : (
              assignedOrders.map((order) => {
                const customer = customers.find((item) => item.id === order.customerId);
                return (
                  <tr key={order.id}>
                    <TD className="font-medium text-zinc-900 dark:text-zinc-100">{order.id.toUpperCase()}</TD>
                    <TD>
                      <div>{customer?.name}</div>
                      <div className="text-xs text-zinc-500">{customer?.address}</div>
                    </TD>
                    <TD>
                      {order.items.map((item) => (
                        <div key={item.productId} className="text-xs">
                          {item.quantity} × {item.productName}
                        </div>
                      ))}
                    </TD>
                    <TD>
                      <Badge variant={order.paymentStatus === "prepaid" ? "success" : "warning"}>
                        {order.paymentStatus.toUpperCase()}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2 text-xs">
                        <Link
                          href={`https://maps.google.com/?q=${encodeURIComponent(customer?.address ?? "")}`}
                          className="rounded-lg border border-zinc-200 px-3 py-1 font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          target="_blank"
                        >
                          Map
                        </Link>
                        <a
                          href={`tel:${customer?.phone ?? ""}`}
                          className="rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-500"
                        >
                          Call
                        </a>
                      </div>
                    </TD>
                  </tr>
                );
              })
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
