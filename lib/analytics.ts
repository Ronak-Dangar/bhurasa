import {
  addDays,
  differenceInDays,
  differenceInHours,
  isAfter,
  isBefore,
  isWithinInterval,
  subDays,
} from "date-fns";
import type {
  Customer,
  DeliveryAssignment,
  InventoryItem,
  Order,
  PipelineAlert,
} from "@/types";

const PRODUCT_LITERS: Record<string, number> = {
  "inv-oil-1l": 1,
  "inv-oil-5l": 5,
  "inv-oil-15l": 15,
};

export function calculateNextRefillDate(totalLiters: number, familySize: Customer["familySize"], fromDate: Date) {
  const monthlyConsumption = familySize === "small" ? 1 : familySize === "large" ? 3 : 2;
  if (totalLiters <= 0 || monthlyConsumption <= 0) return null;

  const monthsOfSupply = totalLiters / monthlyConsumption;
  const daysOfSupply = Math.max(Math.round(monthsOfSupply * 30), 7);
  return addDays(fromDate, daysOfSupply);
}

export function litersFromOrder(order: Order) {
  return order.items.reduce((acc, item) => acc + (PRODUCT_LITERS[item.productId] ?? 0) * item.quantity, 0);
}

export function getLatestDeliveredOrder(orderHistory: Order[], customerId: string) {
  const delivered = orderHistory
    .filter((order) => order.customerId === customerId && order.status === "delivered" && order.deliveredAt)
    .sort((a, b) => (a.deliveredAt! < b.deliveredAt! ? 1 : -1));
  return delivered[0] ?? null;
}

export function buildPipelineAlerts(params: {
  customers: Customer[];
  orders: Order[];
  inventory: InventoryItem[];
  assignments: DeliveryAssignment[];
}): PipelineAlert[] {
  const { customers, orders, inventory, assignments } = params;
  const alerts: PipelineAlert[] = [];
  const now = new Date();

  customers.forEach((customer) => {
    const statusAgeHours = differenceInHours(now, new Date(customer.lastInteractionAt));

    if (customer.status === "inquiry" && statusAgeHours > 2) {
      alerts.push({
        id: `alert-nurture-${customer.id}`,
        type: "nurture",
        severity: "warning",
        message: `${customer.name} has been waiting since inquiry. Send Health Benefits info now.`,
        relatedCustomerId: customer.id,
        dueAt: customer.lastInteractionAt,
      });
    }

    if (customer.status === "price_sent" && statusAgeHours > 24) {
      alerts.push({
        id: `alert-trust-${customer.id}`,
        type: "nurture",
        severity: "warning",
        message: `${customer.name} hasn\'t moved after price. Share process video to build trust.`,
        relatedCustomerId: customer.id,
        dueAt: customer.lastInteractionAt,
      });
    }

    const latestDelivery = getLatestDeliveredOrder(orders, customer.id);
    if (customer.status === "feedback_pending" && latestDelivery?.deliveredAt) {
      const deliveredAt = new Date(latestDelivery.deliveredAt);
      if (differenceInDays(now, deliveredAt) >= 5) {
        alerts.push({
          id: `alert-feedback-${customer.id}`,
          type: "retention",
          severity: "info",
          message: `Collect taste feedback from ${customer.name}.`,
          relatedCustomerId: customer.id,
          dueAt: latestDelivery.deliveredAt,
        });
      }
    }

    if (customer.nextRefillDate) {
      const refillDate = new Date(customer.nextRefillDate);
      const dueSoon = isWithinInterval(refillDate, { start: now, end: addDays(now, 3) });
      if (dueSoon || isBefore(refillDate, now) || customer.status === "refill_due") {
        alerts.push({
          id: `alert-refill-${customer.id}`,
          type: "retention",
          severity: dueSoon ? "warning" : "info",
          message: `Refill reminder for ${customer.name}.` ,
          relatedCustomerId: customer.id,
          dueAt: customer.nextRefillDate,
        });
      }
    }
  });

  inventory.forEach((item) => {
    if (item.stockLevel < item.lowStockThreshold) {
      alerts.push({
        id: `alert-inventory-${item.id}`,
        type: "inventory",
        severity: "critical",
        message: `${item.itemName} is below safety stock.`,
        dueAt: new Date().toISOString(),
      });
    }
  });

  assignments.forEach((assignment) => {
    const order = orders.find((o) => o.id === assignment.orderId);
    if (!order) return;

    if (order.status === "out_for_delivery" && order.deliveryAgentId) {
      const scheduled = new Date(assignment.scheduledFor);
      if (isBefore(scheduled, subDays(now, 1))) {
        alerts.push({
          id: `alert-delivery-${order.id}`,
          type: "delivery",
          severity: "warning",
          message: `Follow up with ${assignment.agentName} for Order ${order.id}.`,
          relatedOrderId: order.id,
          dueAt: assignment.scheduledFor,
        });
      }
    }
  });

  return alerts;
}

export function summarizeFinancials(orders: Order[], expenses: { amount: number }[]) {
  const income = orders
    .filter((order) => order.status === "delivered")
    .reduce((acc, order) => acc + order.totalAmount, 0);

  const expenseTotal = expenses.reduce((acc, expense) => acc + expense.amount, 0);

  return {
    income,
    expenses: expenseTotal,
    net: income - expenseTotal,
  };
}

export function summarizeOrderPipeline(orders: Order[]) {
  const openOrders = orders.filter((order) => order.status !== "delivered");
  const deliveredToday = orders.filter((order) => {
    if (!order.deliveredAt) return false;
    const delivered = new Date(order.deliveredAt);
    return isAfter(delivered, subDays(new Date(), 1));
  });

  return {
    openCount: openOrders.length,
    deliveredToday: deliveredToday.length,
    pendingCodCollections: orders.filter((order) => order.paymentStatus === "cod" && order.status === "delivered").length,
  };
}

export function ordersByDeliveryAgent(orders: Order[], agentId: string) {
  return orders
    .filter((order) => order.deliveryAgentId === agentId && order.status !== "delivered")
    .sort((a, b) => (a.orderedAt > b.orderedAt ? -1 : 1));
}
