# Production Workflow Implementation

## Overview
**Architecture Change (Decoupled Model):** Production now tracks batches from "Groundnuts" to "Bulk Oil" only. Bottling has been decoupled into a separate module (`/bottling`) to support commingled bulk oil inventory and flexible multi-SKU packaging.

## New Architecture

### Two Separate Processes

**Process 1: Production** (`/production`)
- Tracks transformation: Groundnuts → Peanuts → Bulk Oil
- Ends when bulk oil is produced and added to inventory
- No longer handles packaging/bottling

**Process 2: Bottling** (`/bottling`)
- Independent module for converting bulk oil to finished goods
- Supports multiple SKUs in a single run (1L Bottle, 5L Tin, 15L Tin)
- Solves the "partial batch" problem with commingled inventory

## Production Workflow

### Phased Workflow Model
Production batches move through two sequential phases plus completion:
1. **Dehusking** - Convert groundnuts → peanuts
2. **Pressing** - Extract oil, oilcake, and husk from peanuts
3. **Completed** - Batch finished, bulk oil in inventory

### Database Schema
```sql
CREATE TABLE production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT UNIQUE NOT NULL,
  farmer_name TEXT,
  phase TEXT DEFAULT 'dehusking' CHECK (phase IN ('dehusking', 'pressing', 'completed')),
  batch_date DATE NOT NULL,
  
  -- Phase 1: Dehusking
  input_groundnuts_kg NUMERIC,
  output_peanuts_kg NUMERIC,
  
  -- Phase 2: Pressing
  output_oil_liters NUMERIC,
  output_oilcake_kg NUMERIC,
  output_husk_kg NUMERIC,
  
  -- General
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** The `bottled_units` column has been removed. Bottling is now handled in the separate `/bottling` module.
```

## Features Implemented

### 1. Kanban Production Board (`/production`)
- **3-column layout**: Phase 1: De-husking | Phase 2: Pressing | Completed
- **Real-time updates** via Supabase subscriptions
- **Batch cards** show phase-specific metrics
- **Click to edit** - Opens modal for current phase (dehusking or pressing only)
- **Completed batches** - Read-only, cannot be edited

### 2. Start New Batch Dialog
Component: `components/production/start-batch-dialog.tsx`

Simple form to initiate a new batch:
- Batch Code (auto-suggested: `BATCH-{timestamp}`)
- Farmer name
- Batch date

Creates batch with `phase='dehusking'` default. Input groundnuts are entered in the dehusking phase form.

### 3. Phased Update Modal
Component: `components/production/workflow-form.tsx`

Modal displays only the form relevant to current phase:

**Phase 1 Form (Dehusking)**
- Input: `input_groundnuts_kg` - Groundnuts (kg)
- Output: `output_peanuts_kg` - Dehusked peanuts (kg)
- Notes: Optional text field
- Action: Advances to `pressing` phase

**Phase 2 Form (Pressing)**
- Displays: Expected oil yield = `output_peanuts_kg × 0.62` (62% conversion)
- Outputs: 
  - `output_oil_liters` - Oil collected (L)
  - `output_oilcake_kg` - Oilcake (kg)
  - `output_husk_kg` - Husk (kg)
- Notes: Optional text field
- Action: **Completes batch** - Sets phase to `completed`

### 4. ERP Inventory Transactions
Server action: `app/actions/production.ts` → `updatePhasedInventory()`

Each phase completion triggers automated inventory updates:

**Phase 1 Complete (Dehusking)**
```typescript
// Decrement groundnuts input
if (phaseData.input_groundnuts_kg && groundnuts) {
  await supabase
    .from('inventory_items')
    .update({ stock_level: groundnuts.stock_level - phaseData.input_groundnuts_kg })
    .eq('id', groundnuts.id);
}
// Increment peanuts output
if (phaseData.output_peanuts_kg && peanuts) {
  await supabase
    .from('inventory_items')
    .update({ stock_level: peanuts.stock_level + phaseData.output_peanuts_kg })
    .eq('id', peanuts.id);
}
```

**Phase 2 Complete (Pressing)**
```typescript
// Increment oil, oilcake, husk outputs
if (phaseData.output_oil_liters && bulkOil) {
  await supabase.from('inventory_items')
    .update({ stock_level: bulkOil.stock_level + phaseData.output_oil_liters })
    .eq('id', bulkOil.id);
}
if (phaseData.output_oilcake_kg && oilcake) { /* ... */ }
if (phaseData.output_husk_kg && husk) { /* ... */ }

// Decrement peanuts used (passed from batch data)
if (phaseData.output_peanuts_kg && peanuts) {
  await supabase.from('inventory_items')
    .update({ stock_level: peanuts.stock_level - phaseData.output_peanuts_kg })
    .eq('id', peanuts.id);
}
```

**Phase 3 Complete (Bottling)**
```typescript
// Increment finished goods (1L bottles of oil)
if (phaseData.bottled_units && finishedOil) {
  await supabase.from('inventory_items')
    .update({ stock_level: finishedOil.stock_level + phaseData.bottled_units })
    .eq('id', finishedOil.id);
}

// Decrement bulk oil consumed
if (phaseData.output_oil_liters && bulkOil) {
  await supabase.from('inventory_items')
    .update({ stock_level: bulkOil.stock_level - phaseData.output_oil_liters })
    .eq('id', bulkOil.id);
}

// Decrement empty bottles used
if (phaseData.bottled_units && bottle1L) {
  await supabase.from('inventory_items')
    .update({ stock_level: bottle1L.stock_level - phaseData.bottled_units })
    .eq('id', bottle1L.id);
}
```

## User Journey

1. **Create Batch**
   - Click "Start New Batch" on `/production`
   - Fill: Batch code, Farmer name, Batch date
   - Batch appears in "Phase 1: De-husking" column

2. **Complete Dehusking**
   - Click batch card in De-husking column
   - Enter: Input groundnuts (kg), Output peanuts (kg)
   - Optional: Add notes
   - Click "Save & Advance to Pressing"
   - Batch moves to "Phase 2: Pressing" column
   - Inventory: Groundnuts ↓, Peanuts ↑

3. **Complete Pressing (Final Step)**
   - Click batch card in Pressing column
   - View expected oil yield (peanuts × 62%)
   - Enter: Oil collected (L), Oilcake (kg), Husk (kg)
   - Optional: Add notes
   - Click "Save & Complete Batch"
   - Batch moves to "Completed" column
   - Inventory: Peanuts ↓, **Bulk Oil ↑**, Oilcake ↑, Husk ↑
   - **Batch is now finished** - Bulk oil is ready for bottling

4. **Bottling (Separate Process)**
   - Navigate to `/bottling` page
   - Create bottling run with multiple SKUs
   - See [Bottling Module Documentation](#bottling-module) below

## Technical Details

### Real-Time Synchronization
```typescript
useEffect(() => {
  const channel = supabase
    .channel('production-batches')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'production_batches'
    }, () => {
      fetchBatches();
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

### Phase Transition Logic
```typescript
const phaseMap: Record<string, string> = {
  'dehusking': 'pressing',
  'pressing': 'completed',
};

const nextPhase = phaseMap[currentPhase];
await supabase
  .from('production_batches')
  .update({ phase: nextPhase, ...phaseData })
  .eq('id', batchId);
```
```

### Inventory Item Mapping
The `updatePhasedInventory()` function uses fuzzy name matching to find inventory items:
```typescript
const { data: inventoryItems } = await supabase
  .from('inventory_items')
  .select('id, item_name, stock_level');

const findItem = (name: string) =>
  inventoryItems.find((item: any) =>
    item.item_name.toLowerCase().includes(name.toLowerCase())
  );

const groundnuts = findItem('groundnut');
const peanuts = findItem('peanut');
const bulkOil = findItem('bulk oil') || findItem('oil');
const oilcake = findItem('oilcake');
const husk = findItem('husk');
```

This approach is resilient to slight variations in item naming (e.g., "Groundnuts" vs "Groundnut Raw").

**Note:** Empty bottles and finished goods are now managed in the `/bottling` module.

## Files Modified/Created

**Production Module:**
- `app/actions/production.ts` - Server actions with `createProductionBatch()`, `updateProductionPhase()`, `updatePhasedInventory()` (2 phases only)
- `components/production/start-batch-dialog.tsx` - Batch creation form with batch_code/farmer_name/batch_date
- `app/production/page.tsx` - Kanban board with 3 columns: Dehusking | Pressing | Completed
- `components/production/workflow-form.tsx` - Phase-specific forms (DehuskingForm, PressingForm only)

**Bottling Module (New):**
- `app/bottling/page.tsx` - Bottling run UI with multi-SKU support
- `app/actions/bottling.ts` - Server action `createBottlingRun()` with commingled inventory logic

**Database:**
- `supabase/schema.sql` - Updated production_batches table (removed bottled_units, updated phase constraint)
- `supabase/migration-remove-bottled-units.sql` - Migration script

**Documentation:**
- `docs/PRODUCTION-WORKFLOW.md` - This documentation

## Testing Checklist

**Production Module:**
- [ ] Create batch with Start New Batch dialog (batch_code, farmer_name, batch_date)
- [ ] Verify batch appears in "Phase 1: De-husking" column with "Pending" status
- [ ] Click batch, enter input_groundnuts_kg and output_peanuts_kg
- [ ] Verify batch moves to "Phase 2: Pressing" column
- [ ] Check inventory: Groundnuts stock_level decreased, Peanuts stock_level increased
- [ ] Click batch in Pressing, see expected oil yield calculation
- [ ] Enter output_oil_liters, output_oilcake_kg, output_husk_kg
- [ ] Click "Save & Complete Batch" - verify batch moves to "Completed" column
- [ ] Check inventory: Peanuts decreased, **Bulk Oil** increased, Oilcake increased, Husk increased
- [ ] Try clicking completed batch - verify read-only modal appears
- [ ] Verify real-time updates (open /production in two browser tabs, update in one)
- [ ] Test notes field in each phase form
- [ ] Verify revalidatePath() updates both /production and /inventory pages

**Bottling Module:**
- [ ] Navigate to `/bottling` page
- [ ] Add multiple bottling lines (1L, 5L, 15L)
- [ ] Verify total liters calculation updates correctly
- [ ] Submit bottling run - verify success message
- [ ] Check inventory: Bulk Oil decreased, Empty containers decreased, Finished goods increased
- [ ] Verify insufficient bulk oil error handling
- [ ] Verify insufficient empty container error handling
- [ ] Test remove line functionality (minimum 1 line enforced)

---

## Bottling Module

### Overview
The bottling module (`/bottling`) is a **separate, independent process** that converts commingled bulk oil into multiple finished good SKUs in a single run. This solves the "partial batch" problem by decoupling packaging from production.

### Key Benefits
1. **Commingled Inventory** - All bulk oil goes into one inventory pool, regardless of which batch produced it
2. **Multi-SKU Flexibility** - Package 1L bottles, 5L tins, and 15L tins in any combination
3. **No Batch Constraints** - Not tied to specific production batches
4. **Simplified Production** - Production workflow ends at bulk oil, reducing complexity

### Bottling Run Workflow

**UI: `/bottling` Page**
- Form with repeatable "bottling lines"
- Each line: [SKU Dropdown] | [Quantity Input] | [Liters Calculation] | [Remove Button]
- Add Line button to create new rows
- Total liters summary at bottom

**Form Structure:**
```typescript
type BottlingLine = {
  id: number;
  sku: string;      // "1L Bottle" | "5L Tin" | "15L Tin"
  quantity: number; // Number of units to bottle
};
```

**Example Bottling Run:**
```
Line 1: 50 × 1L Bottle  = 50 L
Line 2: 10 × 5L Tin     = 50 L
Line 3: 2 × 15L Tin     = 30 L
────────────────────────────────
Total: 130 L bulk oil required
```

### ERP Transaction Logic

Server action: `app/actions/bottling.ts` → `createBottlingRun()`

**Algorithm:**
1. Initialize `total_liters_consumed = 0`
2. For each bottling line:
   - Calculate liters: `parseFloat(sku.split('L')[0]) × quantity`
   - Add to `total_liters_consumed`
   - Find empty container inventory item (fuzzy match)
   - Find finished good inventory item (fuzzy match)
   - Validate sufficient empty containers available
   - Queue updates: Decrement empty containers, Increment finished goods
3. Validate sufficient bulk oil available (`bulk_oil.stock_level >= total_liters_consumed`)
4. Execute all container updates
5. **Final transaction**: Decrement bulk oil by `total_liters_consumed`
6. Revalidate `/inventory` and `/bottling` paths

**Inventory Item Mapping:**
```typescript
// SKU → Empty Container → Finished Good
"1L Bottle" → "1l bottle" / "empty 1l" → "1l bottle oil" / "finished 1l"
"5L Tin"    → "5l tin" / "empty 5l"    → "5l tin oil" / "finished 5l"
"15L Tin"   → "15l tin" / "empty 15l"  → "15l tin oil" / "finished 15l"
```

**Error Handling:**
- Insufficient bulk oil: Shows available vs required
- Insufficient empty containers: Shows available vs required per SKU
- Invalid quantities: All quantities must be > 0

### Code Example

```typescript
// app/actions/bottling.ts
export async function createBottlingRun(formData: FormData) {
  const lines: BottlingLine[] = JSON.parse(formData.get("bottling_lines"));
  let totalLitersConsumed = 0;

  // Process each line
  for (const line of lines) {
    const litersPerUnit = parseFloat(line.sku.split("L")[0]);
    totalLitersConsumed += litersPerUnit * line.quantity;

    // Decrement empty containers
    await updateInventory(emptyContainer.id, -line.quantity);
    // Increment finished goods
    await updateInventory(finishedGood.id, +line.quantity);
  }

  // Final: Decrement bulk oil
  await updateInventory(bulkOil.id, -totalLitersConsumed);

  revalidatePath("/inventory");
  revalidatePath("/bottling");
}
```

### User Journey: Bottling Run

1. **Navigate to Bottling** - Click "Bottling" in sidebar or go to `/bottling`

2. **Add Lines** 
   - Default: 1 line with "1L Bottle" selected
   - Click "Add Line" to add more SKUs
   - Select SKU from dropdown (1L Bottle, 5L Tin, 15L Tin)
   - Enter quantity
   - See automatic liter calculation

3. **Review Total**
   - Blue summary box shows total bulk oil required
   - Example: "130.0 L - This amount will be deducted from your bulk oil inventory"

4. **Submit Run**
   - Click "Start Bottling Run"
   - Validation checks run
   - Success: Green message shows "Bottling run completed! Consumed 130.0L of bulk oil."
   - Form resets for next run

5. **Verify Inventory**
   - Check `/inventory` page
   - Bulk Oil decreased by total liters
   - Empty containers decreased by quantities
   - Finished goods increased by quantities

## Future Enhancements

**Production:**
1. **Batch Status** - Add 'paused' or 'cancelled' states
2. **Quality Metrics** - Track oil quality (color, acidity)
3. **Waste Tracking** - Record spillage or damaged goods
4. **Photo Uploads** - Attach batch photos at each phase
5. **Analytics** - Phase duration, yield efficiency reports

**Bottling:**
1. **Bottling History** - Track all bottling runs with timestamps
2. **Label Tracking** - Integrate label consumption into bottling runs
3. **Batch Traceability** - Optional: Link finished goods back to source batches
4. **Pre-fill Suggestions** - Recommend SKU mix based on order backlog
5. **Quality Control** - Add QC checkpoints before finishing run

## Related Documentation
- [CRM Implementation](./CRM-IMPLEMENTATION.md)
- [Inventory Implementation](./INVENTORY-IMPLEMENTATION.md)
- [Finance Workflow](./FINANCE-WORKFLOW.md)
- [ERP Bridge](./ERP-BRIDGE.md)
- [Quick Start Guide](./QUICK-START-GUIDE.md)
- [Database Schema](../supabase/schema.sql)
