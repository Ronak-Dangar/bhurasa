export type InventoryType =
  | "raw_material"
  | "packaging"
  | "intermediate"
  | "finished_good"
  | "byproduct";

export interface InventoryItem {
  id: string;
  itemName: string;
  itemType: InventoryType;
  stockLevel: number;
  unit: string;
  avgCost: number;
  lowStockThreshold: number;
}

export type LeadStatus =
  | "inquiry"
  | "education"
  | "price_sent"
  | "trust_process"
  | "closed_won"
  | "feedback_pending"
  | "refill_due";

export type FamilySize = "small" | "medium" | "large";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  familySize: FamilySize;
  status: LeadStatus;
  lastInteractionAt: string;
  nextRefillDate: string | null;
}

export type OrderStatus = "pending" | "processing" | "out_for_delivery" | "delivered";
export type PaymentStatus = "cod" | "prepaid";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  orderedAt: string;
  deliveredAt?: string;
  items: OrderItem[];
  deliveryAgentId?: string;
}

export interface ProductionBatch {
  id: string;
  phase: "dehusking" | "pressing" | "bottling";
  date: string;
  farmerName: string;
  inputQuantityKg: number;
  outputPeanutsKg?: number;
  outputOilLiters?: number;
  outputOilcakeKg?: number;
  outputHuskKg?: number;
  bottledUnits?: number;
  notes?: string;
}

export interface Expense {
  id: string;
  type: "purchase_groundnuts" | "transport" | "labor" | "maintenance" | "utilities";
  amount: number;
  date: string;
  description?: string;
}

export interface DeliveryAssignment {
  orderId: string;
  deliveryAgentId: string;
  agentName: string;
  scheduledFor: string;
}

export interface PipelineAlert {
  id: string;
  type: "nurture" | "retention" | "inventory" | "delivery";
  message: string;
  severity: "info" | "warning" | "critical";
  relatedCustomerId?: string;
  relatedOrderId?: string;
  dueAt: string;
}
