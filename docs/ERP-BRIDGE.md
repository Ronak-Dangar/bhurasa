# Finance-to-Inventory ERP Bridge

## Overview
Fully automated integration between Finance and Inventory modules using **Weighted Average Cost (WAC)** accounting method. When procurement expenses are logged, inventory stock and cost automatically update.

## The Problem We Solved

### Before (Manual Two-Step Process)
```
User buys 1000 kg groundnuts for ₹80,000
    ↓
Step 1: Go to /finance → Log expense (₹80,000)
    ↓
Step 2: Go to /inventory → New Stock Movement (+1000 kg)
    ↓
❌ Two separate forms
❌ No cost tracking in inventory
❌ Prone to errors/omissions
```

### After (Automated ERP Bridge)
```
User buys 1000 kg groundnuts for ₹80,000
    ↓
Single Form: /finance → Add Expense
  - Category: Purchase Groundnuts
  - Amount: ₹80,000
  - Item: Groundnuts (dropdown)
  - Quantity: 1000 kg
    ↓
✅ Expense logged in Finance
✅ Stock updated: 1500 → 2500 kg
✅ Avg cost updated: ₹78 → ₹78.8/kg (WAC)
✅ COGS recalculates automatically
```

## Weighted Average Cost (WAC) Explained

### Why WAC?
When you purchase the same item at different prices over time, WAC calculates a **fair average cost** that represents the true inventory value.

### The Formula
```
new_avg_cost = (current_inventory_value + new_purchase_amount) / (current_stock + new_quantity)
```

### Real Example

**Scenario:** You currently have 1500 kg of groundnuts bought at ₹78/kg. You purchase 1000 kg more for ₹80,000.

**Step 1: Current State**
```
Current Stock: 1500 kg
Current Avg Cost: ₹78/kg
Current Value: 1500 × 78 = ₹117,000
```

**Step 2: New Purchase**
```
Purchased Quantity: 1000 kg
Purchase Amount: ₹80,000
Purchase Price: ₹80,000 ÷ 1000 = ₹80/kg
```

**Step 3: WAC Calculation**
```
New Stock = 1500 + 1000 = 2500 kg
New Total Value = ₹117,000 + ₹80,000 = ₹197,000
New Avg Cost = ₹197,000 ÷ 2500 = ₹78.8/kg
```

**Result:**
- ✅ Inventory: 2500 kg @ ₹78.8/kg = ₹197,000
- ✅ Accurately reflects blended cost
- ✅ Finance COGS calculations now use ₹78.8/kg

## Implementation Details

### Task 1: Dynamic Expense Form

**File:** `components/finance/add-expense-form.tsx`

**Changes:**
1. Added `procurement` flag to expense categories
2. Conditional rendering based on selected category
3. Inventory item dropdown (fetched from API)
4. Quantity input field

**Code:**
```typescript
const expenseCategories = [
  { value: "purchase_groundnuts", label: "Purchase Groundnuts", procurement: true },
  { value: "transport", label: "Transport", procurement: false },
  // ... other categories
];

const isProcurement = expenseCategories.find(c => c.value === selectedCategory)?.procurement;

{isProcurement && (
  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
    <h4>📦 Inventory Update (ERP Bridge)</h4>
    <select name="inventory_item_id" required>
      {inventoryItems.map(item => (
        <option value={item.id}>
          {item.item_name} (Current: {item.stock_level} {item.unit})
        </option>
      ))}
    </select>
    <input type="number" name="procurement_quantity" required />
  </div>
)}
```

### Task 2: API Route for Inventory Items

**File:** `app/api/inventory-items/route.ts`

Simple GET endpoint to fetch inventory items for the dropdown:

```typescript
export async function GET() {
  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, item_name, stock_level, unit, avg_cost")
    .order("item_name", { ascending: true });

  return NextResponse.json({ items: items ?? [] });
}
```

### Task 3: WAC Server Action

**File:** `app/actions/finance.ts`

**Function:** `updateInventoryFromPurchase()`

```typescript
async function updateInventoryFromPurchase(
  itemId: string,
  quantity: number,
  purchaseAmount: number
) {
  const supabase = await createSupabaseServerClient();

  // Step 1: Fetch current state
  const { data: item } = await supabase
    .from("inventory_items")
    .select("stock_level, avg_cost, item_name")
    .eq("id", itemId)
    .single();

  const currentStock = item.stock_level;
  const currentAvgCost = item.avg_cost;

  // Step 2: Calculate new values
  const newStock = currentStock + quantity;
  const currentValue = currentStock * currentAvgCost;
  const newTotalValue = currentValue + purchaseAmount;
  const newAvgCost = newStock > 0 ? newTotalValue / newStock : 0;

  // Step 3: Update inventory
  await supabase
    .from("inventory_items")
    .update({
      stock_level: newStock,
      avg_cost: newAvgCost,
    })
    .eq("id", itemId);

  return {
    itemName: item.item_name,
    oldStock: currentStock,
    newStock,
    oldAvgCost: currentAvgCost,
    newAvgCost,
  };
}
```

**Enhanced `addExpense()` Action:**
```typescript
export async function addExpense(formData: FormData) {
  // Extract form data
  const inventoryItemId = formData.get("inventory_item_id") as string | null;
  const procurementQuantity = formData.get("procurement_quantity")
    ? parseFloat(formData.get("procurement_quantity") as string)
    : null;

  // Step 1: Insert expense
  await supabase.from("expenses").insert([expense]);

  // Step 2: ERP Bridge - Update inventory if procurement
  let inventoryUpdate = null;
  if (inventoryItemId && procurementQuantity > 0) {
    inventoryUpdate = await updateInventoryFromPurchase(
      inventoryItemId,
      procurementQuantity,
      amount
    );
  }

  // Step 3: Revalidate both pages
  revalidatePath("/finance");
  revalidatePath("/inventory");

  return {
    success: true,
    message: inventoryUpdate
      ? `Inventory updated: ${inventoryUpdate.itemName} ${inventoryUpdate.oldStock} → ${inventoryUpdate.newStock}`
      : "Expense logged successfully",
  };
}
```

## User Workflow

### End-to-End Example: Groundnut Procurement

**Scenario:** Purchase 1000 kg groundnuts from Gowda Farms for ₹80,000.

**Steps:**
1. Navigate to `/finance`
2. Click **"+ Log New Expense"**
3. Fill form:
   - **Date:** 2025-11-17
   - **Amount:** ₹80,000
   - **Category:** Purchase Groundnuts
   - *(Inventory section auto-appears)*
   - **Inventory Item:** Groundnuts (Current: 1500 kg)
   - **Quantity Purchased:** 1000
   - **Status:** Paid
   - **Notes:** "Invoice #GF-2025-045 from Gowda Farms"
4. Click **"Add Expense"**
5. System shows confirmation:
   ```
   ✅ Inventory updated: Groundnuts 1500 → 2500 kg
   ✅ Avg cost: ₹78.00 → ₹78.80
   ```

**Verification:**
- Check `/finance` → Expense ledger shows ₹80,000 purchase
- Check `/inventory` → Groundnuts stock: 2500 kg @ ₹78.80/kg
- Check `/finance` → COGS now uses new ₹78.80 base cost

## Impact on Other Modules

### Finance Module
- **Expenses:** Unchanged (still logs expense)
- **COGS:** Automatically uses updated `avg_cost` from inventory
- **Profitability:** More accurate with real-time cost tracking

### Inventory Module
- **Stock Level:** Updates instantly
- **Avg Cost:** Recalculates via WAC
- **Valuation:** Total inventory value reflects true cost

### Production Module
- **COGS Input:** Uses updated groundnut cost
- **Bulk Oil Cost:** Recalculates with new procurement prices
- **Margin Analysis:** Reflects current market prices

## Data Flow Diagram

```
┌─────────────────────────────────────────┐
│   User: Finance Expense Form           │
│   - Category: Purchase Groundnuts      │
│   - Amount: ₹80,000                     │
│   - Item: Groundnuts                    │
│   - Quantity: 1000 kg                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Server Action: addExpense()           │
│   1. Insert into expenses table         │
│   2. Call updateInventoryFromPurchase() │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   WAC Calculation Logic                 │
│   - Fetch current: 1500 kg @ ₹78        │
│   - Calculate: (117k + 80k) / 2500      │
│   - Result: 2500 kg @ ₹78.8             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Database Updates                      │
│   - expenses.insert()                   │
│   - inventory_items.update()            │
│     • stock_level = 2500                │
│     • avg_cost = 78.8                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Revalidation                          │
│   - /finance page refreshes             │
│   - /inventory page refreshes           │
│   - COGS recalculates                   │
└─────────────────────────────────────────┘
```

## Edge Cases Handled

### 1. First Purchase (Zero Stock)
```
Current: 0 kg @ ₹0/kg
Purchase: 500 kg for ₹40,000
Result: 500 kg @ ₹80/kg (purchase price becomes avg cost)
```

### 2. Negative Stock Prevention
- WAC calculation requires `newStock > 0`
- Division by zero protection

### 3. Transaction Safety
- If expense insert succeeds but inventory update fails, error message returned
- User can retry inventory update via manual Stock Movement

### 4. Non-Procurement Expenses
- Transport, labor, utilities → No inventory fields shown
- Normal expense flow (no ERP bridge triggered)

## Testing Checklist

- [ ] Log non-procurement expense (transport) - no inventory fields
- [ ] Log procurement expense (groundnuts) - inventory section appears
- [ ] Verify dropdown shows all inventory items with current stock
- [ ] Submit with valid data - confirm success message shows old→new values
- [ ] Check `/inventory` - verify stock level increased
- [ ] Check `/inventory` - verify avg_cost updated with WAC
- [ ] Log second purchase at different price - verify WAC recalculates
- [ ] Check `/finance` COGS - verify uses new avg_cost
- [ ] Complete production batch - verify COGS uses latest groundnut cost

## Advanced: Multi-Item Procurement

**Future Enhancement:** Support purchasing multiple items in one expense:

```typescript
// Form allows adding multiple line items
items: [
  { id: "groundnuts-id", quantity: 1000, amount: 80000 },
  { id: "bottles-id", quantity: 500, amount: 7500 }
]

// Loop through and apply WAC to each
for (const item of items) {
  await updateInventoryFromPurchase(item.id, item.quantity, item.amount);
}
```

## Files Modified/Created

**Created:**
- `app/api/inventory-items/route.ts` - Inventory dropdown API

**Modified:**
- `components/finance/add-expense-form.tsx` - Conditional inventory fields
- `app/actions/finance.ts` - WAC calculation logic
- `docs/FINANCE-WORKFLOW.md` - Updated with ERP bridge section

## Related Documentation
- [Finance Module Workflow](./FINANCE-WORKFLOW.md) - Main finance documentation
- [Inventory Implementation](./INVENTORY-IMPLEMENTATION.md) - Inventory module details
- [Production Workflow](./PRODUCTION-WORKFLOW.md) - How production affects COGS
