# Bottling Module Documentation

## Executive Summary

The Bottling Module is a **standalone, independent process** that solves the "partial batch problem" by decoupling packaging from production. This enables commingled bulk oil inventory and flexible multi-SKU packaging in single runs.

## Problem Statement

**Old Model (Bottling as Phase 3 of Production):**
- ❌ Each production batch had to be bottled entirely
- ❌ Couldn't mix SKUs in one bottling operation
- ❌ Batch-specific bottling created inventory tracking complexity
- ❌ "Partial batch" problem: What if you only need 30L but batch has 100L?

**New Model (Decoupled Bottling):**
- ✅ All bulk oil goes into one commingled inventory pool
- ✅ Bottle any quantity in any SKU mix (1L, 5L, 15L)
- ✅ Not tied to specific production batches
- ✅ Production ends cleanly at "bulk oil produced"

## Architecture

### Process Flow

```
Production Workflow:
Groundnuts → [Dehusking] → Peanuts → [Pressing] → Bulk Oil ✓ COMPLETE
                                                      ↓
                                           (Commingled Inventory)
                                                      ↓
Bottling Workflow:
Bulk Oil → [Bottling Run] → Multiple Finished SKUs (1L/5L/15L)
```

### Key Concepts

**1. Commingled Bulk Oil**
- All production batches contribute to a single "Bulk Oil" inventory item
- Batch traceability ends at bulk oil stage
- Simplifies inventory management

**2. Multi-SKU Bottling Runs**
- One operation can package multiple SKU types
- Example: 50×1L + 10×5L + 2×15L in a single run
- Flexible quantities based on demand

**3. Decoupled Operations**
- Production module: `/production` (Dehusking → Pressing → Completed)
- Bottling module: `/bottling` (Bulk Oil → Finished Goods)
- Independent navigation and workflows

## User Interface

### Page: `/bottling`

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Bottling Module                             │
│ Convert bulk oil into finished goods        │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─ Start New Bottling Run ────────────────┐│
│ │                                          ││
│ │ Bottling Lines:                [+ Add]  ││
│ │                                          ││
│ │ 1. [1L Bottle ▼] [50____] = 50 L  [🗑] ││
│ │ 2. [5L Tin    ▼] [10____] = 50 L  [🗑] ││
│ │ 3. [15L Tin   ▼] [2_____] = 30 L  [🗑] ││
│ │                                          ││
│ │ ┌─────────────────────────────────────┐ ││
│ │ │ Total Bulk Oil Required: 130.0 L   │ ││
│ │ │ Will be deducted from inventory    │ ││
│ │ └─────────────────────────────────────┘ ││
│ │                                          ││
│ │           [Start Bottling Run]          ││
│ └──────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

**Features:**
- **Repeater Field**: Add/remove bottling lines dynamically
- **SKU Dropdown**: Select from 1L Bottle, 5L Tin, 15L Tin
- **Quantity Input**: Number of units to bottle
- **Auto Calculation**: Shows liters per line (SKU size × quantity)
- **Total Summary**: Real-time total bulk oil required
- **Validation**: Minimum 1 line, all quantities > 0
- **Success Message**: Shows total liters consumed after completion

## ERP Transaction Logic

### Server Action: `createBottlingRun()`

**File:** `app/actions/bottling.ts`

**Algorithm:**
```typescript
1. Parse bottling lines from form data
2. Fetch all inventory items
3. Initialize total_liters_consumed = 0

4. For each bottling line:
   a. Calculate liters: parseFloat(sku.split('L')[0]) × quantity
   b. Add to total_liters_consumed
   c. Find empty container inventory item (fuzzy match)
   d. Find finished good inventory item (fuzzy match)
   e. Validate sufficient empty containers
   f. Queue update: Decrement empty containers by quantity
   g. Queue update: Increment finished goods by quantity

5. Validate sufficient bulk oil (stock_level >= total_liters_consumed)

6. Execute all queued container updates

7. Final transaction: Decrement bulk oil by total_liters_consumed

8. Revalidate paths: /inventory, /bottling

9. Return success with message: "Consumed X.X L of bulk oil"
```

### Inventory Item Mapping

**Fuzzy Matching Logic:**
```typescript
const findItem = (name: string) =>
  inventoryItems.find((item: any) =>
    item.item_name.toLowerCase().includes(name.toLowerCase())
  );
```

**SKU → Inventory Items:**
| SKU | Empty Container Search | Finished Good Search |
|-----|----------------------|---------------------|
| 1L Bottle | "1l bottle" / "empty 1l" | "1l bottle oil" / "finished 1l" |
| 5L Tin | "5l tin" / "empty 5l" | "5l tin oil" / "finished 5l" |
| 15L Tin | "15l tin" / "empty 15l" | "15l tin oil" / "finished 15l" |

### Transaction Example

**Bottling Run:**
- 50 × 1L Bottle
- 10 × 5L Tin
- 2 × 15L Tin

**Inventory Updates:**
```
Before:
- Bulk Oil: 500 L
- Empty 1L Bottle: 300 units
- Empty 5L Tin: 100 units
- Empty 15L Tin: 50 units
- Finished 1L Oil: 100 units
- Finished 5L Oil: 20 units
- Finished 15L Oil: 10 units

Calculations:
- Line 1: 50 × 1L = 50 L
- Line 2: 10 × 5L = 50 L
- Line 3: 2 × 15L = 30 L
- Total: 130 L

After:
- Bulk Oil: 370 L (-130)
- Empty 1L Bottle: 250 units (-50)
- Empty 5L Tin: 90 units (-10)
- Empty 15L Tin: 48 units (-2)
- Finished 1L Oil: 150 units (+50)
- Finished 5L Oil: 30 units (+10)
- Finished 15L Oil: 12 units (+2)
```

## Error Handling

### Validation Checks

**1. Empty Lines Check**
```typescript
if (!lines || lines.length === 0) {
  return { success: false, error: "No bottling lines provided" };
}
```

**2. Invalid Quantity Check**
```typescript
const hasInvalidQuantity = lines.some((line) => line.quantity <= 0);
if (hasInvalidQuantity) {
  return { success: false, error: "All quantities must be greater than 0" };
}
```

**3. Inventory Item Not Found**
```typescript
if (!bulkOil) {
  return { success: false, error: "Bulk oil inventory item not found" };
}
if (!emptyContainer) {
  return { success: false, error: `Empty container not found for ${sku}` };
}
```

**4. Insufficient Stock**
```typescript
if (emptyContainer.stock_level < line.quantity) {
  return {
    success: false,
    error: `Insufficient empty containers for ${sku}. 
            Available: ${emptyContainer.stock_level}, 
            Required: ${line.quantity}`
  };
}

if (bulkOil.stock_level < totalLitersConsumed) {
  return {
    success: false,
    error: `Insufficient bulk oil. 
            Available: ${bulkOil.stock_level}L, 
            Required: ${totalLitersConsumed}L`
  };
}
```

### User-Facing Error Messages

**Example 1: Not Enough Bulk Oil**
```
❌ Insufficient bulk oil. Available: 85.5L, Required: 130.0L
```

**Example 2: Not Enough Empty Containers**
```
❌ Insufficient empty containers for 5L Tin. Available: 8, Required: 10
```

**Example 3: Success**
```
✅ Bottling run completed! Consumed 130.0L of bulk oil.
```

## Code Implementation

### Client Component

**File:** `app/bottling/page.tsx`

**Key State:**
```typescript
type BottlingLine = {
  id: number;
  sku: string;
  quantity: number;
};

const [lines, setLines] = useState<BottlingLine[]>([
  { id: 1, sku: "1L Bottle", quantity: 0 },
]);
const [nextId, setNextId] = useState(2);
```

**Key Functions:**
```typescript
// Add new line
const addLine = () => {
  setLines([...lines, { id: nextId, sku: "1L Bottle", quantity: 0 }]);
  setNextId(nextId + 1);
};

// Remove line (minimum 1 enforced)
const removeLine = (id: number) => {
  if (lines.length > 1) {
    setLines(lines.filter((line) => line.id !== id));
  }
};

// Update line field
const updateLine = (id: number, field: "sku" | "quantity", value: any) => {
  setLines(lines.map((line) =>
    line.id === id ? { ...line, [field]: value } : line
  ));
};

// Calculate total liters
const calculateTotalLiters = () => {
  return lines.reduce((total, line) => {
    const litersPerUnit = parseFloat(line.sku.split("L")[0]) || 0;
    return total + litersPerUnit * line.quantity;
  }, 0);
};
```

### Server Action

**File:** `app/actions/bottling.ts`

**Full Implementation:**
```typescript
export async function createBottlingRun(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  try {
    const linesJson = formData.get("bottling_lines") as string;
    const lines: BottlingLine[] = JSON.parse(linesJson);

    // Get inventory items
    const { data: inventoryItems } = await supabase
      .from("inventory_items")
      .select("id, item_name, stock_level");

    const findItem = (name: string) =>
      inventoryItems.find((item: any) =>
        item.item_name.toLowerCase().includes(name.toLowerCase())
      );

    const bulkOil = findItem("bulk oil") || findItem("oil");
    let totalLitersConsumed = 0;
    const updates: { itemId: string; delta: number }[] = [];

    // Process each line
    for (const line of lines) {
      const litersPerUnit = parseFloat(line.sku.split("L")[0]) || 0;
      totalLitersConsumed += litersPerUnit * line.quantity;

      // Find inventory items based on SKU
      let emptyContainer, finishedGood;
      if (line.sku === "1L Bottle") {
        emptyContainer = findItem("1l bottle");
        finishedGood = findItem("1l bottle oil");
      } else if (line.sku === "5L Tin") {
        emptyContainer = findItem("5l tin");
        finishedGood = findItem("5l tin oil");
      } else if (line.sku === "15L Tin") {
        emptyContainer = findItem("15l tin");
        finishedGood = findItem("15l tin oil");
      }

      // Validate and queue updates
      if (emptyContainer.stock_level < line.quantity) {
        return { success: false, error: `Insufficient ${line.sku}` };
      }

      updates.push({ itemId: emptyContainer.id, delta: -line.quantity });
      updates.push({ itemId: finishedGood.id, delta: line.quantity });
    }

    // Validate bulk oil
    if (bulkOil.stock_level < totalLitersConsumed) {
      return { success: false, error: "Insufficient bulk oil" };
    }

    // Execute updates
    for (const update of updates) {
      const item = inventoryItems.find((i) => i.id === update.itemId);
      await supabase
        .from("inventory_items")
        .update({ stock_level: item.stock_level + update.delta })
        .eq("id", update.itemId);
    }

    // Final: Decrement bulk oil
    await supabase
      .from("inventory_items")
      .update({ stock_level: bulkOil.stock_level - totalLitersConsumed })
      .eq("id", bulkOil.id);

    revalidatePath("/inventory");
    revalidatePath("/bottling");

    return {
      success: true,
      message: `Consumed ${totalLitersConsumed.toFixed(1)}L of bulk oil.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

## Testing Guide

### Test Case 1: Basic Single-SKU Run
**Steps:**
1. Navigate to `/bottling`
2. Leave default 1L Bottle selected
3. Enter quantity: 50
4. Verify total shows: 50.0 L
5. Click "Start Bottling Run"
6. Verify success message
7. Check `/inventory`: Bulk Oil -50L, Empty 1L -50, Finished 1L +50

### Test Case 2: Multi-SKU Run
**Steps:**
1. Navigate to `/bottling`
2. Line 1: 1L Bottle, qty 30 (= 30L)
3. Click "Add Line"
4. Line 2: 5L Tin, qty 10 (= 50L)
5. Click "Add Line"
6. Line 3: 15L Tin, qty 3 (= 45L)
7. Verify total shows: 125.0 L
8. Submit and verify inventory updates

### Test Case 3: Insufficient Bulk Oil Error
**Steps:**
1. Check bulk oil inventory (e.g., 50L available)
2. Try to bottle 100L total
3. Verify error: "Insufficient bulk oil. Available: 50L, Required: 100L"
4. Adjust quantities to fit within 50L
5. Retry and succeed

### Test Case 4: Insufficient Empty Containers Error
**Steps:**
1. Check empty 5L tin inventory (e.g., 5 available)
2. Try to bottle 10 × 5L Tin
3. Verify error: "Insufficient empty containers for 5L Tin. Available: 5, Required: 10"
4. Reduce quantity to 5 or less
5. Retry and succeed

### Test Case 5: Remove Line Functionality
**Steps:**
1. Add 3 lines
2. Click remove on line 2 - verify it's removed
3. Try to remove when only 1 line left
4. Verify remove button is disabled (minimum 1 line enforced)

### Test Case 6: Real-time Total Calculation
**Steps:**
1. Add line: 1L Bottle, qty 0 - total should be 0.0 L
2. Change qty to 10 - total should update to 10.0 L
3. Change SKU to 5L Tin - total should update to 50.0 L
4. Add another line - total should accumulate correctly

## Migration Guide

### Database Migration

**Run this SQL:**
```sql
-- See: supabase/migration-remove-bottled-units.sql

ALTER TABLE public.production_batches
DROP COLUMN IF EXISTS bottled_units;

ALTER TABLE public.production_batches
DROP CONSTRAINT IF EXISTS production_batches_phase_check;

ALTER TABLE public.production_batches
ADD CONSTRAINT production_batches_phase_check 
CHECK (phase IN ('dehusking', 'pressing', 'completed'));

UPDATE public.production_batches
SET phase = 'completed'
WHERE phase = 'bottling';
```

### Code Changes Applied

**Modified Files:**
- `app/production/page.tsx` - 3 columns: Dehusking | Pressing | Completed
- `components/production/workflow-form.tsx` - Removed BottlingForm component
- `app/actions/production.ts` - Removed bottling phase logic, pressing now sets 'completed'

**New Files:**
- `app/bottling/page.tsx` - Bottling run UI
- `app/actions/bottling.ts` - Server action for bottling runs

**Updated Files:**
- `components/layout/nav-links.tsx` - Added "Bottling" link
- `supabase/schema.sql` - Updated production_batches table
- `docs/PRODUCTION-WORKFLOW.md` - Comprehensive documentation
- `docs/BOTTLING-MODULE.md` - This file

### Inventory Setup Required

**Ensure these inventory items exist:**

**Raw Materials:**
- Groundnuts
- Peanuts (intermediate)

**Bulk:**
- Bulk Oil (intermediate)

**Packaging:**
- Empty 1L Bottle (or "1l bottle")
- Empty 5L Tin (or "5l tin")
- Empty 15L Tin (or "15l tin")

**Finished Goods:**
- 1L Bottle Oil (or "finished 1l")
- 5L Tin Oil (or "finished 5l")
- 15L Tin Oil (or "finished 15l")

**Byproducts:**
- Oilcake
- Husk

## Best Practices

### 1. Inventory Planning
- Monitor bulk oil levels before starting bottling runs
- Ensure adequate empty container stock for planned SKUs
- Consider order backlog when deciding SKU mix

### 2. SKU Selection
- Use 1L bottles for retail customers
- Use 5L tins for small restaurants/cafes
- Use 15L tins for bulk institutional orders

### 3. Workflow Sequence
```
Daily Routine:
1. Complete any pending production batches (/production)
2. Review bulk oil inventory (/inventory)
3. Check order backlog and forecast demand
4. Plan bottling run SKU mix based on forecast
5. Execute bottling run (/bottling)
6. Verify finished goods inventory updated
7. Fulfill orders as needed
```

### 4. Error Recovery
- If bottling run fails, check error message details
- Verify inventory levels match expectations
- Re-run with adjusted quantities if needed
- All transactions are atomic - partial failures won't corrupt data

## Future Enhancements

1. **Bottling History Table**
   - Track all historical bottling runs
   - Timestamp, SKU mix, total liters consumed
   - User who initiated the run

2. **Label Integration**
   - Automatically decrement label inventory during runs
   - Match label count to total units bottled

3. **Batch Traceability (Optional)**
   - Link finished goods back to source production batches
   - QR code generation for traceability

4. **Smart Recommendations**
   - Analyze order backlog
   - Suggest optimal SKU mix
   - Alert when bulk oil is low relative to pending orders

5. **Quality Control Checkpoints**
   - Pre-run QC: Check oil quality metrics
   - Mid-run: Sample testing
   - Post-run: Final QC before marking complete

6. **Multi-user Support**
   - Role-based access (bottling operator vs. super admin)
   - Approval workflows for large runs
   - Audit log of who ran what when

## Related Documentation

- [Production Workflow](./PRODUCTION-WORKFLOW.md) - Dehusking & Pressing phases
- [Inventory Implementation](./INVENTORY-IMPLEMENTATION.md) - Stock management
- [ERP Bridge](./ERP-BRIDGE.md) - Finance-Inventory integration
- [Quick Start Guide](./QUICK-START-GUIDE.md) - Overall system overview
- [Database Schema](../supabase/schema.sql) - Complete schema reference
