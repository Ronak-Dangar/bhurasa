import { addDays, addMonths, subDays, subHours } from "date-fns";
import type {
  Customer,
  DeliveryAssignment,
  Expense,
  InventoryItem,
  Order,
  ProductionBatch,
} from "@/types";

const now = new Date();

function iso(date: Date) {
  return date.toISOString();
}

export const inventoryItems: InventoryItem[] = [
  {
    id: "inv-groundnuts",
    itemName: "Groundnuts",
    itemType: "raw_material",
    stockLevel: 920,
    unit: "kg",
    avgCost: 78,
    lowStockThreshold: 600,
  },
  {
    id: "inv-peanuts",
    itemName: "Peanuts",
    itemType: "intermediate",
    stockLevel: 180,
    unit: "kg",
    avgCost: 0,
    lowStockThreshold: 120,
  },
  {
    id: "inv-oil-1l",
    itemName: "1L Bottle Oil",
    itemType: "finished_good",
    stockLevel: 140,
    unit: "units",
    avgCost: 260,
    lowStockThreshold: 100,
  },
  {
    id: "inv-oil-5l",
    itemName: "5L Tin Oil",
    itemType: "finished_good",
    stockLevel: 35,
    unit: "units",
    avgCost: 1150,
    lowStockThreshold: 30,
  },
  {
    id: "inv-oil-15l",
    itemName: "15L Tin Oil",
    itemType: "finished_good",
    stockLevel: 12,
    unit: "units",
    avgCost: 3200,
    lowStockThreshold: 10,
  },
  {
    id: "inv-oilcake",
    itemName: "Oilcake",
    itemType: "byproduct",
    stockLevel: 240,
    unit: "kg",
    avgCost: 32,
    lowStockThreshold: 100,
  },
  {
    id: "inv-husk",
    itemName: "Husk",
    itemType: "byproduct",
    stockLevel: 110,
    unit: "kg",
    avgCost: 12,
    lowStockThreshold: 80,
  },
  {
    id: "inv-bottle-1l",
    itemName: "Empty 1L Bottle",
    itemType: "packaging",
    stockLevel: 260,
    unit: "units",
    avgCost: 18,
    lowStockThreshold: 200,
  },
  {
    id: "inv-label",
    itemName: "Labels",
    itemType: "packaging",
    stockLevel: 520,
    unit: "units",
    avgCost: 4,
    lowStockThreshold: 400,
  },
];

export const customers: Customer[] = [
  {
    id: "cust-001",
    name: "Anita Rao",
    phone: "+91 99001 11223",
    address: "HSR Layout, Bengaluru",
    familySize: "medium",
    status: "price_sent",
    lastInteractionAt: iso(subHours(now, 26)),
    nextRefillDate: iso(addDays(now, 12)),
  },
  {
    id: "cust-002",
    name: "Vishal Sharma",
    phone: "+91 98450 22334",
    address: "Whitefield, Bengaluru",
    familySize: "large",
    status: "inquiry",
    lastInteractionAt: iso(subHours(now, 3)),
    nextRefillDate: null,
  },
  {
    id: "cust-003",
    name: "Deepa Natarajan",
    phone: "+91 99867 44556",
    address: "Koramangala, Bengaluru",
    familySize: "small",
    status: "refill_due",
    lastInteractionAt: iso(subDays(now, 18)),
    nextRefillDate: iso(addDays(now, 2)),
  },
  {
    id: "cust-004",
    name: "Suresh Patel",
    phone: "+91 97315 88990",
    address: "Indiranagar, Bengaluru",
    familySize: "large",
    status: "feedback_pending",
    lastInteractionAt: iso(subDays(now, 5)),
    nextRefillDate: iso(addMonths(now, 1)),
  },
  {
    id: "cust-005",
    name: "Priya Menon",
    phone: "+91 91080 66778",
    address: "Jayanagar, Bengaluru",
    familySize: "medium",
    status: "trust_process",
    lastInteractionAt: iso(subHours(now, 30)),
    nextRefillDate: null,
  },
];

export const orders: Order[] = [
  {
    id: "order-2101",
    customerId: "cust-001",
    status: "out_for_delivery",
    paymentStatus: "prepaid",
    totalAmount: 520,
    orderedAt: iso(subHours(now, 5)),
    items: [
      { productId: "inv-oil-1l", productName: "1L Bottle Oil", quantity: 2, unitPrice: 260 },
    ],
    deliveryAgentId: "agent-01",
  },
  {
    id: "order-2102",
    customerId: "cust-003",
    status: "delivered",
    paymentStatus: "cod",
    totalAmount: 1150,
    orderedAt: iso(subDays(now, 7)),
    deliveredAt: iso(subDays(now, 5)),
    items: [
      { productId: "inv-oil-5l", productName: "5L Tin Oil", quantity: 1, unitPrice: 1150 },
    ],
    deliveryAgentId: "agent-02",
  },
  {
    id: "order-2103",
    customerId: "cust-004",
    status: "delivered",
    paymentStatus: "prepaid",
    totalAmount: 520,
    orderedAt: iso(subDays(now, 6)),
    deliveredAt: iso(subDays(now, 5)),
    items: [
      { productId: "inv-oil-1l", productName: "1L Bottle Oil", quantity: 2, unitPrice: 260 },
    ],
    deliveryAgentId: "agent-01",
  },
  {
    id: "order-2104",
    customerId: "cust-005",
    status: "pending",
    paymentStatus: "cod",
    totalAmount: 260,
    orderedAt: iso(subHours(now, 2)),
    items: [
      { productId: "inv-oil-1l", productName: "1L Bottle Oil", quantity: 1, unitPrice: 260 },
    ],
  },
];

export const deliveryAssignments: DeliveryAssignment[] = [
  {
    orderId: "order-2101",
    deliveryAgentId: "agent-01",
    agentName: "Aditya Shetty",
    scheduledFor: iso(addDays(now, 0)),
  },
  {
    orderId: "order-2102",
    deliveryAgentId: "agent-02",
    agentName: "Meera Iyer",
    scheduledFor: iso(subDays(now, 5)),
  },
];

export const productionBatches: ProductionBatch[] = [
  {
    id: "batch-24a",
    phase: "bottling",
    date: iso(subDays(now, 1)),
    farmerName: "Gowda Farms",
    inputQuantityKg: 210,
    outputOilLiters: 162,
    outputOilcakeKg: 48,
    bottledUnits: 140,
    notes: "Labels pending for last 20 bottles",
  },
  {
    id: "batch-24b",
    phase: "pressing",
    date: iso(now),
    farmerName: "Ramesh Cooperative",
    inputQuantityKg: 260,
    outputOilLiters: 0,
    outputPeanutsKg: 0,
    outputOilcakeKg: 0,
  },
  {
    id: "batch-24c",
    phase: "dehusking",
    date: iso(addDays(now, 1)),
    farmerName: "Lakshmi Farms",
    inputQuantityKg: 300,
  },
];

export const expenses: Expense[] = [
  {
    id: "exp-1001",
    type: "purchase_groundnuts",
    amount: 102000,
    date: iso(subDays(now, 2)),
    description: "Bulk procurement from Gowda Farms (1.2T)",
  },
  {
    id: "exp-1002",
    type: "transport",
    amount: 8500,
    date: iso(subDays(now, 2)),
  },
  {
    id: "exp-1003",
    type: "labor",
    amount: 6200,
    date: iso(subDays(now, 1)),
  },
  {
    id: "exp-1004",
    type: "utilities",
    amount: 4200,
    date: iso(subDays(now, 6)),
  },
];

export const deliveryAgents = [
  { id: "agent-01", name: "Aditya Shetty", phone: "+91 90080 11002" },
  { id: "agent-02", name: "Meera Iyer", phone: "+91 90350 22789" },
];

export const productCatalog = [
  { id: "inv-oil-1l", name: "1L Bottle Oil", unitPrice: 260 },
  { id: "inv-oil-5l", name: "5L Tin Oil", unitPrice: 1150 },
  { id: "inv-oil-15l", name: "15L Tin Oil", unitPrice: 3200 },
  { id: "inv-oilcake", name: "Oilcake", unitPrice: 38 },
];
