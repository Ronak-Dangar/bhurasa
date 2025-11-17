# Inventory Module v2: Activation & ERP Integration

## Overview
Transformed the static inventory page into a live, interactive dashboard with full CRUD capabilities and a **Finance-Inventory Bridge** for procurement tracking.

## What Changed

### Before (Static)
- Data imported from `lib/sample-data.ts`
- Read-only display
- No way to update stock when procurement happens
- Disconnected from Production module's inventory changes

### After (Live + Interactive)
- Real-time data from `inventory_items` Supabase table
- Edit item details (name, cost, thresholds)
- **Stock Movement System** - The bridge between Finance and Inventory
- Automatically reflects Production module's inventory transactions

## Architecture

### Database Schema
```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (
    item_type IN ('raw_material', 'packaging', 'intermediate', 'finished_good', 'byproduct')
  ),
  stock_level NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  avg_cost NUMERIC NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Item Types
1. **raw_material** - Groundnuts
2. **packaging** - Bottles, tins, labels
3. **intermediate** - Peanuts, bulk oil
4. **finished_good** - Packaged oil (1L, 5L, 15L)
5. **byproduct** - Oilcake, husk

## Features Implemented

### Task 1: Live Supabase Data (✅ Completed)

**File Modified:** `app/inventory/page.tsx`

**Changes:**
```typescript
// BEFORE (Static)
import { inventoryItems } from "@/lib/sample-data";

export default function InventoryPage() {
  const grouped = groupByType();
  // ...
}

// AFTER (Live)
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function InventoryPage() {
  const supabase = await createSupabaseServerClient();
  
  const { data: inventoryItems } = await supabase
    .from("inventory_items")
    .select("*")
    .order("item_name", { ascending: true });

  const items = inventoryItems ?? [];
  const grouped = groupByType(items); // Now accepts items as argument
  // ...
}
```

**Schema Mapping:**
| Old (sample-data) | New (Supabase) |
|-------------------|----------------|
| `itemName` | `item_name` |
| `itemType` | `item_type` |
| `stockLevel` | `stock_level` |
| `lowStockThreshold` | `low_stock_threshold` |
| `avgCost` | `avg_cost` |

**Result:**
- Page now displays real-time inventory
- Low stock alerts update automatically
- Reflects Production module's inventory changes instantly

### Task 2: Edit Inventory Item (✅ Completed)

**Files Created:**
1. `components/inventory/edit-item-modal.tsx` - Modal component
2. `app/actions/inventory.ts` - Server actions
3. `components/inventory/inventory-client-wrappers.tsx` - Client boundary

**UI Addition:**
- New "Actions" column in Detailed View table
- "Edit" button per row

**Editable Fields:**
- **Item Name** - Update product naming
- **Avg Cost** (₹) - Critical for COGS calculation in Finance module
- **Low Stock Threshold** - Adjust safety stock levels

**Read-Only Fields:**
- Type (item_type) - Prevents category confusion
- Unit - Maintains consistency (kg, L, pcs)
- Stock Level - Use Stock Movement instead

**Server Action:**
```typescript
// app/actions/inventory.ts
export async function updateInventoryItem(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  
  const itemId = formData.get("item_id");
  const updates = {
    item_name: formData.get("item_name"),
    low_stock_threshold: parseFloat(formData.get("low_stock_threshold")),
    avg_cost: parseFloat(formData.get("avg_cost"))
  };
  
  await supabase
    .from("inventory_items")
    .update(updates)
    .eq("id", itemId);
    
  revalidatePath("/inventory");
}
```

**Why avg_cost is Critical:**
The Finance module uses `inventory_items.avg_cost` to calculate COGS:
```typescript
// Finance COGS calculation
const cogs1L = bulkOilCostPerLiter * 1 
             + getPackagingCost("Empty 1L Bottle")  // ← From avg_cost
             + getPackagingCost("Labels");           // ← From avg_cost
```

### Task 3: Stock Movement System (✅ Completed - The Finance Bridge)

**Files Created:**
- `components/inventory/stock-movement-modal.tsx` - Stock adjustment form

**UI:**
- **"+ New Stock Movement"** button at top of page
- Modal with three fields:
  1. **Item** (dropdown) - Shows current stock
  2. **Quantity Change** (number) - Supports +/- values
  3. **Reason** (textarea) - Audit trail description

**Use Cases:**

| Scenario | Quantity | Reason Example |
|----------|----------|----------------|
| **Procurement** | `+500` | "Procurement from Gowda Farms - Invoice #GF-2025-045" |
| **Wastage** | `-20` | "Spillage during bottling - Batch #BATCH-24D" |
| **Audit Correction** | `+10` | "Stock count adjustment - Physical inventory Nov 17" |
| **Production Consumption** | `-280` | "Used in Batch #BATCH-24E pressing phase" |

**Server Action:**
```typescript
export async function createStockMovement(formData: FormData) {
  const itemId = formData.get("item_id");
  const quantity = parseFloat(formData.get("quantity"));
  const reason = formData.get("reason");
  
  // Fetch current stock
  const { data: item } = await supabase
    .from("inventory_items")
    .select("stock_level, item_name")
    .eq("id", itemId)
    .single();
  
  const newStock = item.stock_level + quantity;
  
  // Prevent negative stock
  if (newStock < 0) {
    return { 
      success: false, 
      error: `Cannot reduce stock below zero. Current: ${item.stock_level}` 
    };
  }
  
  // Update inventory
  await supabase
    .from("inventory_items")
    .update({ stock_level: newStock })
    .eq("id", itemId);
  
  // Revalidate both inventory and finance pages
  revalidatePath("/inventory");
  revalidatePath("/finance");
  
  return { 
    success: true, 
    message: `${item.item_name}: ${item.stock_level} → ${newStock}` 
  };
}
```

**Safety Features:**
- ✅ Negative stock prevention
- ✅ Current stock display before submission
- ✅ Confirmation message with before/after values
- ✅ Dual revalidation (inventory + finance pages)

## User Workflows

### Workflow 1: View Live Inventory
1. Navigate to `/inventory`
2. Dashboard shows 4 category cards:
   - Raw Material (e.g., 1 item, ₹140,000 value)
   - Packaging (e.g., 4 items, ₹32,500 value)
   - Intermediate (e.g., 2 items, ₹89,200 value)
   - Finished Good (e.g., 3 items, ₹156,000 value)
3. "Detailed View" table lists all items with real-time stock
4. Low stock items highlighted in red

### Workflow 2: Update Item Cost (Affects Finance COGS)
1. Locate item in "Detailed View" table
2. Click **"Edit"** button in Actions column
3. Update **Avg Cost**: ₹15 → ₹18 (bottle price increase)
4. Click **"Save Changes"**
5. Finance module's COGS automatically recalculates:
   - Old: `COGS(1L) = ₹178 + ₹15 + ₹2 = ₹195`
   - New: `COGS(1L) = ₹178 + ₹18 + ₹2 = ₹198`

### Workflow 3: Record Procurement (The Finance Bridge)
**Scenario:** You just bought 500 kg of groundnuts from Gowda Farms for ₹70,000.

**Step 1: Log Expense in Finance**
1. Go to `/finance`
2. Click **"+ Log New Expense"**
3. Fill form:
   - Date: 2025-11-17
   - Amount: ₹70,000
   - Category: Purchase Groundnuts
   - Status: Paid
   - Notes: "Gowda Farms - Invoice #GF-2025-045"
4. Click **"Add Expense"**

**Step 2: Update Inventory Stock**
1. Go to `/inventory`
2. Click **"+ New Stock Movement"**
3. Fill form:
   - Item: Groundnuts (Current: 120 kg)
   - Quantity Change: `+500`
   - Reason: "Procurement from Gowda Farms - Invoice #GF-2025-045"
4. Click **"Record Movement"**
5. System confirms: `Groundnuts: 120 → 620 (+500)`

**Result:**
- ✅ Finance ledger shows ₹70,000 expense
- ✅ Inventory shows 620 kg groundnuts
- ✅ Total Expenses metric increases
- ✅ Bulk Oil Cost recalculates for COGS

### Workflow 4: Handle Wastage
**Scenario:** 20 liters of oil spilled during bottling.

1. Navigate to `/inventory`
2. Click **"+ New Stock Movement"**
3. Select Item: Bulk Oil (Current: 550 L)
4. Enter Quantity: `-20`
5. Reason: "Spillage during bottling - Batch #BATCH-24D"
6. Click **"Record Movement"**
7. Stock updates: 550 L → 530 L

### Workflow 5: Adjust Low Stock Threshold
**Scenario:** Empty bottles need higher safety stock.

1. Find "Empty 1L Bottle" in Detailed View
2. Click **"Edit"**
3. Change Low Stock Threshold: 50 → 100
4. Save Changes
5. Item may now appear in "Reorder Suggestions" if stock < 100

## Integration with Other Modules

### Production Module → Inventory (Automated)
When a production batch completes a phase, inventory auto-updates:

**Phase 1 (Dehusking):**
```typescript
await updatePhasedInventory('groundnuts', -280);  // Raw material consumed
await updatePhasedInventory('peanuts', +245);     // Intermediate created
```

**Phase 2 (Pressing):**
```typescript
await updatePhasedInventory('peanuts', -245);
await updatePhasedInventory('oil', +152);
await updatePhasedInventory('oilcake', +68);
await updatePhasedInventory('husk', +25);
```

**Phase 3 (Bottling):**
```typescript
await updatePhasedInventory('oil', -150);
await updatePhasedInventory('bottles_1l', -50);
await updatePhasedInventory('bottles_5l', -20);
await updatePhasedInventory('finished_oil_1l', +50);
await updatePhasedInventory('finished_oil_5l', +20);
```

### Finance Module ← Inventory (Read)
Finance queries `inventory_items.avg_cost` for COGS:
```typescript
const packagingCosts = await supabase
  .from("inventory_items")
  .select("item_name, avg_cost");

const cogs1L = bulkOilCostPerLiter * 1
             + packagingCosts.find(i => i.item_name === "Empty 1L Bottle").avg_cost
             + packagingCosts.find(i => i.item_name === "Labels").avg_cost;
```

### Orders Module → Inventory (Future)
When an order is fulfilled, inventory should decrement:
```typescript
// Future enhancement: Order fulfillment triggers inventory update
const orderItems = await supabase
  .from("order_items")
  .select("product_id, quantity")
  .eq("order_id", orderId);

for (const item of orderItems) {
  await createStockMovement({
    item_id: item.product_id,
    quantity: -item.quantity,
    reason: `Order fulfillment - Order #${orderId}`
  });
}
```

## Technical Implementation

### Server-Side Rendering
The inventory page uses async server components for optimal performance:

```typescript
// app/inventory/page.tsx
export default async function InventoryPage() {
  const supabase = await createSupabaseServerClient();
  
  // Single database query fetches all items
  const { data: inventoryItems } = await supabase
    .from("inventory_items")
    .select("*")
    .order("item_name", { ascending: true });
  
  // Server-side calculations (no client JS needed)
  const grouped = groupByType(items);
  const lowStock = items.filter(item => item.stock_level < item.low_stock_threshold);
  
  return <InventoryClientWrappers>{/* Static content */}</InventoryClientWrappers>;
}
```

### Client Component Boundaries
Only interactive elements are client components:

```typescript
// components/inventory/inventory-client-wrappers.tsx
"use client";

export function InventoryClientWrappers({ children }) {
  const [stockMovementOpen, setStockMovementOpen] = useState(false);
  
  return (
    <>
      <div>
        <button onClick={() => setStockMovementOpen(true)}>
          + New Stock Movement
        </button>
        {children} {/* Server-rendered content */}
      </div>
      
      {stockMovementOpen && <StockMovementModal />}
    </>
  );
}
```

### Revalidation Strategy
After mutations, both pages refresh:

```typescript
// app/actions/inventory.ts
export async function createStockMovement(formData) {
  // ... update stock
  
  revalidatePath("/inventory");  // Show new stock levels
  revalidatePath("/finance");    // Update COGS if avg_cost changed
}
```

## Files Modified/Created

**Created:**
- `app/actions/inventory.ts` - Server actions (updateInventoryItem, createStockMovement, getAllInventoryItems)
- `components/inventory/edit-item-modal.tsx` - Edit item form
- `components/inventory/stock-movement-modal.tsx` - Stock adjustment form
- `components/inventory/inventory-client-wrappers.tsx` - Client boundaries
- `docs/INVENTORY-IMPLEMENTATION.md` - This documentation

**Modified:**
- `app/inventory/page.tsx` - Converted to async, added Supabase queries, added Actions column
- `docs/FINANCE-WORKFLOW.md` - Added "Finance-Inventory Bridge" section

## Testing Checklist

- [ ] Navigate to `/inventory`, verify live data loads
- [ ] Check category cards show correct totals
- [ ] Verify low stock items highlighted in red
- [ ] Click "Edit" on an item, update avg_cost
- [ ] Save changes, verify Finance COGS updates
- [ ] Click "+ New Stock Movement"
- [ ] Select item, enter +100 quantity
- [ ] Save, verify stock increases
- [ ] Try negative quantity greater than current stock
- [ ] Verify error: "Cannot reduce stock below zero"
- [ ] Complete production batch Phase 1
- [ ] Refresh inventory page, verify groundnuts decreased, peanuts increased
- [ ] Update "Empty 1L Bottle" avg_cost from ₹15 to ₹18
- [ ] Go to Finance page, verify COGS(1L) increased by ₹3

## Future Enhancements

### 1. Stock Movement Audit Table
Create `stock_movements` table to track all inventory changes:
```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES inventory_items ON DELETE CASCADE,
  quantity_change NUMERIC NOT NULL,
  stock_before NUMERIC NOT NULL,
  stock_after NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES profiles ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Auto-Update from Finance Expense
Add checkbox to expense form:
```typescript
// components/finance/add-expense-form.tsx
<label>
  <input type="checkbox" name="update_inventory" />
  Update inventory stock
</label>

{showInventoryFields && (
  <>
    <select name="inventory_item_id">{/* items */}</select>
    <input type="number" name="procurement_quantity" />
  </>
)}
```

### 3. Order Fulfillment Integration
When order status changes to "delivered", auto-decrement inventory:
```typescript
// app/actions/orders.ts
export async function markOrderDelivered(orderId: string) {
  // 1. Update order status
  await supabase.from("orders").update({ status: "delivered" }).eq("id", orderId);
  
  // 2. Decrement inventory for each order item
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);
  
  for (const item of orderItems) {
    await createStockMovement({
      item_id: item.product_id,
      quantity: -item.quantity,
      reason: `Order fulfillment - Order #${orderId}`
    });
  }
}
```

### 4. Batch Import/Export
CSV import for bulk stock updates:
- Upload CSV with columns: `item_name, quantity_change, reason`
- Parse and validate
- Batch create stock movements

### 5. Real-Time Stock Alerts
WebSocket notifications when stock falls below threshold:
```typescript
// Subscribe to low stock alerts
const channel = supabase
  .channel('stock-alerts')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'inventory_items',
    filter: 'stock_level.lt.low_stock_threshold'
  }, (payload) => {
    showNotification(`Low stock: ${payload.new.item_name}`);
  })
  .subscribe();
```

### 6. Inventory Valuation Report
Calculate total inventory value by category:
```typescript
const valuationReport = Object.entries(grouped).map(([type, items]) => ({
  category: formatType(type),
  totalValue: items.reduce((acc, item) => acc + (item.stock_level * item.avg_cost), 0),
  itemCount: items.length
}));
```

## The Finance Bridge (In Detail)

### Current Manual Process
```
User Buys Groundnuts
    ↓
[Finance Module] Log expense (₹70,000, Purchase Groundnuts)
    ↓
[Inventory Module] New Stock Movement (+500 kg, "Procurement from Gowda Farms")
    ↓
✅ Finance shows expense
✅ Inventory shows updated stock
```

### Future Automated Process
```
User Fills Enhanced Expense Form
    ↓
[Finance Form] Expense details + ☑ Update Inventory
    ↓
[Server Action] Single transaction:
  1. Insert expense
  2. Call createStockMovement()
    ↓
✅ Finance shows expense
✅ Inventory auto-updated
✅ Single form submission
```

**Implementation Roadmap:**
1. ✅ Build Stock Movement system (Task 3 - Complete)
2. ⏳ Add inventory fields to Finance expense form
3. ⏳ Modify `addExpense()` to conditionally call `createStockMovement()`
4. ⏳ Add item dropdown to expense form (only for procurement categories)

## Related Documentation
- [Finance Module Workflow](./FINANCE-WORKFLOW.md) - How COGS uses inventory data
- [Production Workflow](./PRODUCTION-WORKFLOW.md) - How production updates inventory
- [CRM Implementation](./CRM-IMPLEMENTATION.md) - Order management
- [Quick Start Guide](./QUICK-START-GUIDE.md) - Initial setup
- [Database Schema](../supabase/schema.sql) - Full schema reference
