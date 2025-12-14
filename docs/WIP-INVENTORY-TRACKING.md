# WIP Inventory Tracking Implementation

## Overview
The production module now properly tracks Work-In-Progress (WIP) inventory separately from sellable byproducts. This ensures the "In Processing" dashboard card accurately reflects intermediate items.

## Item Type Classification

### Database Types → Dashboard Categories
```
Raw Material      → Purchased
Packaging         → Purchased
Intermediate (WIP)→ In Processing ✓
Finished Good     → Ready to Sell
Byproduct         → Ready to Sell
```

### Item Type Definitions

**Intermediate (WIP) - NOT ready for sale:**
- **Peanuts (Kernels)**: Produced from dehusking, consumed in pressing
- **Bulk Oil**: Produced from pressing, consumed in bottling

**Byproduct - Ready for sale:**
- **Husk**: Produced from dehusking (animal feed)
- **Oil Cake**: Produced from pressing (fertilizer/feed)

## Production Flow with Inventory Credits

### Phase 1: Dehusking
```
Input:  Groundnuts (debited)
Output: Peanuts (credited) ← WIP item_type='intermediate'
        Husk (credited) ← Byproduct item_type='byproduct'
```

### Phase 2: Pressing
```
Input:  Peanuts (debited)
Output: Bulk Oil (credited) ← WIP item_type='intermediate'
        Oil Cake (credited) ← Byproduct item_type='byproduct'
        (Husk was already credited in dehusking)
```

### Phase 3: Bottling
```
Input:  Bulk Oil (debited)
        Empty Bottles/Tins (debited)
        Labels (debited)
Output: Finished Goods (credited) ← item_type='finished_good'
        (1L Bottle Oil, 5L Tin Oil, 15L Tin Oil)
```

## Implementation Details

### Code Changes
**File: `app/actions/production.ts`**
- Added husk credit in dehusking phase (lines 130-140)
- Uses `stock_movements` audit trail with `quantity_change`
- Reason: "Production: Batch {code} - Dehusking (husk byproduct)"

### Database Migration
**File: `supabase/migration-add-wip-items.sql`**
- Adds 5 new inventory items:
  - Peanuts (intermediate, 0 kg, threshold 200)
  - Bulk Oil (intermediate, 0 liters, threshold 50)
  - Husk (byproduct, 0 kg, threshold 50)
  - 5L Tin Oil (finished_good, 0 units, threshold 20)
  - 15L Tin Oil (finished_good, 0 units, threshold 10)

### Dashboard Display
**File: `app/inventory/page.tsx`**
- Grouping logic (lines 175-196):
  ```typescript
  if (item.item_type === "raw_material" || item.item_type === "packaging") {
    purchased.push(item);
  } else if (item.item_type === "intermediate") {
    inProcessing.push(item); // ← WIP items appear here
  } else if (item.item_type === "finished_good" || item.item_type === "byproduct") {
    readyToSell.push(item);
  }
  ```

## Testing Checklist

1. **Run Migration**
   ```sql
   -- Execute migration-add-wip-items.sql in Supabase SQL Editor
   -- Verify with:
   SELECT item_name, item_type, stock_level, unit 
   FROM inventory_items 
   WHERE item_name IN ('Peanuts', 'Bulk Oil', 'Husk', '5L Tin Oil', '15L Tin Oil');
   ```

2. **Create Production Batch**
   - Navigate to `/production`
   - Create batch with Groundnuts input
   - Complete dehusking phase

3. **Verify Dehusking Inventory**
   - Check `/inventory` → "In Processing" card shows Peanuts weight
   - Check "Ready to Sell" shows Husk weight
   - Verify stock movements: Groundnuts debited, Peanuts + Husk credited

4. **Complete Pressing Phase**
   - Click batch → Complete pressing
   - Enter pressing outputs

5. **Verify Pressing Inventory**
   - "In Processing" shows Bulk Oil liters (Peanuts debited)
   - "Ready to Sell" shows Oil Cake weight
   - Husk weight remains unchanged (already credited)

6. **Complete Bottling**
   - Navigate to `/bottling`
   - Process batch into finished goods

7. **Verify Bottling Inventory**
   - "In Processing" Bulk Oil reduced (debited)
   - "Ready to Sell" shows 1L/5L/15L finished goods (credited)

## Benefits

✅ **Dashboard Accuracy**: "In Processing" card reflects true WIP inventory  
✅ **Production Visibility**: Track intermediate items through workflow stages  
✅ **Byproduct Tracking**: Husk and Oil Cake credited at production time  
✅ **Audit Trail**: Complete stock_movements history for all transactions  
✅ **Cost Accounting**: Weighted Average Cost (WAC) maintained for WIP items
