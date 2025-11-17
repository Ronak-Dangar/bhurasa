# Finance Module Workflow

## Overview
The Finance module provides real-time profitability tracking, expense management, loan accounting, and dynamic COGS (Cost of Goods Sold) calculation for the peanut oil production business.

## Architecture

### Database Schema
```sql
-- Expense tracking
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_type TEXT NOT NULL,  -- 'purchase_groundnuts', 'transport', 'labor', 'maintenance', 'utilities'
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL,
  status TEXT DEFAULT 'paid',  -- 'paid' or 'unpaid'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loan management
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_name TEXT NOT NULL,
  initial_amount NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  interest_rate_pa NUMERIC,  -- Annual interest percentage
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loan transaction history
CREATE TABLE loan_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'payment' or 'interest'
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW()
);
```

### Dynamic COGS Calculation
The system uses a PostgreSQL stored function to calculate real-time bulk oil cost:

```sql
CREATE OR REPLACE FUNCTION get_bulk_oil_cost_per_liter()
RETURNS numeric AS $$
DECLARE
  total_production_expenses numeric;
  total_groundnut_expenses numeric;
  total_oil_liters numeric;
  bulk_cost numeric;
BEGIN
  -- Sum all non-groundnut expenses (transport, labor, utilities, maintenance)
  SELECT COALESCE(SUM(amount), 0)
  INTO total_production_expenses
  FROM expenses
  WHERE expense_type IN ('transport', 'labor', 'utilities', 'maintenance');

  -- Sum groundnut purchase expenses
  SELECT COALESCE(SUM(amount), 0)
  INTO total_groundnut_expenses
  FROM expenses
  WHERE expense_type = 'purchase_groundnuts';

  -- Sum total oil produced (liters)
  SELECT COALESCE(SUM(pressing_oil), 0)
  INTO total_oil_liters
  FROM production_batches;

  IF total_oil_liters = 0 THEN
    RETURN 0;
  END IF;

  -- Calculate cost per liter
  bulk_cost := (total_production_expenses + total_groundnut_expenses) / total_oil_liters;
  RETURN bulk_cost;
END;
$$ LANGUAGE plpgsql;
```

## Features Implemented

### 1. Finance Snapshot Dashboard (`/finance`)
Real-time metrics displayed using server-side rendering:

**Key Metrics:**
- **Income (Delivered)** - Total revenue from delivered orders
- **Expenses (30d)** - All recorded expenses
- **Net Profit** - Income minus expenses
- **COD Receivables** - Pending cash-on-delivery collections
- **Payables** - Unpaid expenses

**Data Flow:**
```typescript
const totalIncome = orders
  .filter(order => order.status === 'delivered')
  .reduce((acc, order) => acc + order.total_amount, 0);

const totalExpenses = expenses
  .reduce((acc, expense) => acc + expense.amount, 0);

const netProfit = totalIncome - totalExpenses;
```

### 2. Add Expense Form
Component: `components/finance/add-expense-form.tsx`

**Expense Categories:**
- **Purchase Groundnuts** - Raw material procurement
- **Transport** - Delivery and logistics costs
- **Labor** - Wages and worker payments
- **Maintenance** - Equipment repairs and upkeep
- **Utilities** - Electricity, water, gas

**Form Fields:**
- Date (defaults to today)
- Amount (₹)
- Category (dropdown)
- Status (Paid/Unpaid)
- Notes (optional description)

**Server Action:**
```typescript
// app/actions/finance.ts
export async function addExpense(formData: FormData) {
  const expense = {
    expense_type: formData.get("expense_type"),
    amount: parseFloat(formData.get("amount")),
    expense_date: formData.get("expense_date"),
    status: formData.get("status") || "paid",
    description: formData.get("description")
  };
  
  await supabase.from("expenses").insert([expense]);
  revalidatePath("/finance");
}
```

### 3. Loan Management
Component: `components/finance/loan-management.tsx`

**Features:**
- View all active loans with current balances
- Log interest charges (increases loan balance)
- Log payments (decreases loan balance)
- Track transaction history

**Loan Transaction Flow:**
```typescript
export async function addLoanTransaction(formData: FormData) {
  const type = formData.get("type"); // 'payment' or 'interest'
  const amount = parseFloat(formData.get("amount"));
  
  // Insert transaction record
  await supabase.from("loan_transactions").insert([{
    loan_id: loanId,
    type,
    amount,
    date: new Date().toISOString()
  }]);
  
  // Update loan balance
  const newBalance = type === "payment"
    ? currentBalance - amount
    : currentBalance + amount;
    
  await supabase.from("loans")
    .update({ current_balance: newBalance })
    .eq("id", loanId);
}
```

### 4. Payables & Receivables Tracker
Two-column card showing cash flow obligations:

**Payables (Red):**
- Total unpaid expenses
- Helps track vendor dues

**Receivables (Green):**
- Pending COD collections
- Expected cash inflow from undelivered COD orders

### 5. Expense Ledger
Chronological table of all expenses with:
- Date
- Category (human-readable labels)
- Amount (₹)
- Status badge (Paid/Unpaid)
- Description notes

### 6. Cost of Goods Sold (COGS) Calculator
Dynamic profitability breakdown per SKU:

**Bulk Oil Cost:**
- Calculated using `get_bulk_oil_cost_per_liter()` RPC
- Updates automatically when expenses or production data changes

**Per-SKU COGS:**
```typescript
const cogs1L = bulkOilCostPerLiter * 1 
             + packagingCost("Empty 1L Bottle")
             + packagingCost("Labels");

const cogs5L = bulkOilCostPerLiter * 5
             + packagingCost("Empty 5L Tin")
             + packagingCost("Labels");

const cogs15L = bulkOilCostPerLiter * 15
              + packagingCost("Empty 15L Tin")
              + packagingCost("Labels");
```

**Packaging Costs:**
Fetched from `inventory_items.avg_cost` for:
- Empty 1L Bottle
- Empty 5L Tin
- Empty 15L Tin
- Labels

## User Workflows

### Workflow 1: Log Daily Expense
1. Navigate to `/finance`
2. Click **"+ Log New Expense"** button
3. Fill form:
   - Date: Today (pre-filled)
   - Amount: ₹5000
   - Category: Transport
   - Status: Paid
   - Notes: "Delivery to Bangalore customers"
4. Click **"Add Expense"**
5. Page revalidates → Expense appears in ledger
6. Metrics update automatically

### Workflow 2: Track Loan Payment
1. View **Loan Management** card on finance page
2. Locate loan in table (e.g., "HDFC Bank - ₹500,000 balance")
3. Click **"Log Payment"** button
4. Enter payment amount: ₹25,000
5. Click **"Record Transaction"**
6. System updates:
   - Inserts transaction to `loan_transactions`
   - Decreases `current_balance` to ₹475,000
   - Page refreshes to show new balance

### Workflow 3: Add Interest Charge
1. Find loan in **Loan Management** table
2. Click **"Log Interest"** button
3. Enter interest amount: ₹3,500
4. Click **"Record Transaction"**
5. System updates:
   - Inserts transaction with `type='interest'`
   - Increases `current_balance` by ₹3,500
   - Reflects new balance immediately

### Workflow 4: Monitor Profitability
1. Check **Finance Snapshot** metrics at page top
2. Review:
   - **Income**: ₹145,000 (from delivered orders)
   - **Expenses**: ₹98,000 (last 30 days)
   - **Net Profit**: ₹47,000
3. Scroll to **COGS Card** to analyze per-unit profit margins
4. Compare selling price vs COGS:
   - 1L Bottle: Sell ₹350, COGS ₹180 → Margin: ₹170
   - 5L Tin: Sell ₹1,600, COGS ₹920 → Margin: ₹680
   - 15L Tin: Sell ₹4,500, COGS ₹2,800 → Margin: ₹1,700

### Workflow 5: Manage Payables
1. View **Payables & Receivables** card
2. Note **Total Payables**: ₹12,000 (unpaid expenses)
3. Click **Expense Ledger** to identify vendors
4. Filter by **Status: UNPAID**
5. Contact vendors to settle dues
6. After payment, edit expense status to "Paid"
7. Payables metric decreases automatically

## Technical Details

### Server-Side Rendering (SSR)
The finance page uses Next.js App Router server components for optimal performance:

```typescript
// app/finance/page.tsx
export default async function FinancePage() {
  const supabase = await createSupabaseServerClient();
  
  // Parallel data fetching
  const [
    { data: expenses },
    { data: orders },
    { data: loans },
    { data: inventoryItems },
    bulkOilCostResult
  ] = await Promise.all([
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    supabase.from("orders").select("*"),
    supabase.from("loans").select("*"),
    supabase.from("inventory_items").select("item_name, avg_cost"),
    supabase.rpc("get_bulk_oil_cost_per_liter")
  ]);
  
  // Server-side calculations
  const totalIncome = orders
    .filter(order => order.status === 'delivered')
    .reduce((acc, order) => acc + order.total_amount, 0);
    
  return <FinanceDashboard data={{ expenses, orders, ... }} />;
}
```

### Revalidation Strategy
After mutations, `revalidatePath("/finance")` ensures fresh data:

```typescript
export async function addExpense(formData: FormData) {
  // ... insert expense
  revalidatePath("/finance");  // Triggers re-render with new data
  return { success: true };
}
```

### COGS Formula Breakdown
```
Bulk Oil Cost = (Total Expenses) / (Total Oil Produced)
              = (Groundnuts + Transport + Labor + Utilities + Maintenance) / (Liters)

1L COGS = (Bulk Oil × 1L) + Bottle Cost + Label Cost
5L COGS = (Bulk Oil × 5L) + Tin Cost + Label Cost
15L COGS = (Bulk Oil × 15L) + Tin Cost + Label Cost
```

**Example Calculation:**
```
Total Expenses: ₹98,000
Total Oil Produced: 550 L
Bulk Oil Cost: ₹98,000 / 550 = ₹178.18/L

1L Bottle COGS:
  Oil: ₹178.18 × 1 = ₹178.18
  Bottle: ₹15
  Label: ₹2
  Total: ₹195.18
```

### Loan Balance Updates
Transaction-based approach prevents race conditions:

```typescript
// 1. Insert transaction (audit trail)
await supabase.from("loan_transactions").insert([{
  loan_id: "abc-123",
  type: "payment",
  amount: 25000,
  date: "2025-11-17"
}]);

// 2. Fetch current balance
const { data: loan } = await supabase
  .from("loans")
  .select("current_balance")
  .eq("id", "abc-123")
  .single();

// 3. Calculate new balance
const newBalance = loan.current_balance - 25000;

// 4. Update loan record
await supabase.from("loans")
  .update({ current_balance: newBalance })
  .eq("id", "abc-123");
```

## Integration Points

### With Production Module
- Production batches create `pressing_oil` records
- Finance module queries `production_batches.pressing_oil` for COGS calculation
- Bulk oil cost updates automatically when new batches complete pressing phase

### With Orders Module
- Delivered orders contribute to **Income** metric
- COD orders with `status != 'delivered'` show in **Receivables**
- Payment status tracked separately from delivery status

### With Inventory Module
- Packaging costs fetched from `inventory_items.avg_cost`
- Supports dynamic pricing (e.g., if bottle supplier raises prices, COGS updates instantly)
- **Stock Movement Bridge**: Expense creation can trigger inventory updates via `createStockMovement()` action

#### The Finance-Inventory Bridge

When recording expenses for procurement (e.g., "Purchase Groundnuts"), the system **automatically updates inventory** using **Weighted Average Cost (WAC)** calculation.

**Automated Workflow (ERP Integration):**
1. Navigate to `/finance`
2. Click **"+ Log New Expense"**
3. Select Category: **Purchase Groundnuts**
4. 📦 **Inventory Update section appears** (conditional rendering)
5. Fill procurement details:
   - Amount: ₹80,000
   - Inventory Item: Groundnuts (dropdown shows current stock)
   - Quantity Purchased: 1000 kg
6. Click **"Add Expense"**
7. System performs **two-step transaction**:
   - **Step 1:** Insert expense record into `expenses` table
   - **Step 2:** Update `inventory_items` with WAC formula

**Weighted Average Cost Formula:**
```typescript
// Current State
current_stock = 1500 kg
current_avg_cost = ₹78/kg
current_value = 1500 × 78 = ₹117,000

// Purchase
purchased_quantity = 1000 kg
purchase_amount = ₹80,000

// New State Calculation
new_stock = current_stock + purchased_quantity
         = 1500 + 1000 = 2500 kg

new_total_value = current_value + purchase_amount
                = 117,000 + 80,000 = ₹197,000

new_avg_cost = new_total_value / new_stock
             = 197,000 / 2500 = ₹78.8/kg
```

**Result:**
```
✅ Expense logged: ₹80,000
✅ Inventory updated: Groundnuts 1500 → 2500 kg
✅ Avg cost updated: ₹78 → ₹78.8/kg
✅ Finance COGS recalculates automatically
```

**Server Action:**
```typescript
// app/actions/finance.ts
async function updateInventoryFromPurchase(
  itemId: string,
  quantity: number,
  purchaseAmount: number
) {
  // Fetch current state
  const { data: item } = await supabase
    .from("inventory_items")
    .select("stock_level, avg_cost, item_name")
    .eq("id", itemId)
    .single();
  
  const currentStock = item.stock_level;
  const currentAvgCost = item.avg_cost;
  
  // Calculate new values
  const newStock = currentStock + quantity;
  const currentValue = currentStock * currentAvgCost;
  const newTotalValue = currentValue + purchaseAmount;
  const newAvgCost = newTotalValue / newStock;
  
  // Update inventory
  await supabase
    .from("inventory_items")
    .update({
      stock_level: newStock,
      avg_cost: newAvgCost
    })
    .eq("id", itemId);
    
  // Revalidate both pages
  revalidatePath("/inventory");
  revalidatePath("/finance");
}

export async function addExpense(formData: FormData) {
  // Step 1: Insert expense
  await supabase.from("expenses").insert([expense]);
  
  // Step 2: Update inventory if procurement
  if (inventoryItemId && procurementQuantity > 0) {
    await updateInventoryFromPurchase(
      inventoryItemId,
      procurementQuantity,
      amount
    );
  }
}
```

## Files Modified/Created

**Created:**
- `app/actions/finance.ts` - Server actions with ERP WAC logic
- `components/finance/add-expense-form.tsx` - Conditional inventory fields
- `components/finance/loan-management.tsx` - Loan tracking with modals
- `app/api/inventory-items/route.ts` - API endpoint for inventory dropdown
- `docs/FINANCE-WORKFLOW.md` - This documentation

**Modified:**
- `app/finance/page.tsx` - Server component with parallel data fetching
- `supabase/schema.sql` - Added `get_bulk_oil_cost_per_liter()` function

## Testing Checklist

- [ ] Add expense with all categories (groundnuts, transport, labor, maintenance, utilities)
- [ ] Verify expense appears in ledger immediately
- [ ] Check metrics update: Expenses ↑, Net Profit ↓
- [ ] Toggle expense status (Paid ↔ Unpaid), verify Payables updates
- [ ] Create loan record in Supabase
- [ ] Log payment on loan, verify balance decreases
- [ ] Log interest on loan, verify balance increases
- [ ] Check transaction history persists in `loan_transactions`
- [ ] Complete production batch, verify Bulk Oil Cost recalculates
- [ ] Update `inventory_items.avg_cost` for bottle, verify COGS updates
- [ ] Mark order as delivered, verify Income increases
- [ ] Create COD order, verify appears in Receivables

## Future Enhancements

1. **Profit & Loss Statement** - Monthly P&L report with category breakdowns
2. **Cash Flow Forecast** - Predict next 30/60/90 days cash position
3. **Expense Analytics** - Charts showing expense trends by category
4. **Budget Tracking** - Set monthly budgets and track variance
5. **Invoice Generation** - Auto-generate PDF invoices for delivered orders
6. **Tax Calculation** - GST tracking and quarterly reporting
7. **Bank Reconciliation** - Match recorded transactions with bank statements
8. **Multi-Currency Support** - Handle forex if exporting products
9. **Loan Amortization Schedule** - Auto-calculate EMI and interest splits
10. **Profitability by Customer** - Identify most/least profitable customers

## Formulas Reference

### Key Financial Metrics
```typescript
// Revenue Recognition
Income = Σ(orders.total_amount WHERE status = 'delivered')

// Total Operating Expenses
Expenses = Σ(expenses.amount)

// Bottom Line
Net Profit = Income - Expenses

// Outstanding Collections
Receivables = Σ(orders.total_amount WHERE payment_status = 'cod' AND status != 'delivered')

// Vendor Dues
Payables = Σ(expenses.amount WHERE status = 'unpaid')
```

### COGS Components
```typescript
// Base Oil Cost
Bulk Oil Cost/L = (Σ expenses.amount) / (Σ production_batches.pressing_oil)

// Packaging Costs (from inventory_items.avg_cost)
Bottle 1L Cost = inventory_items[name='Empty 1L Bottle'].avg_cost
Tin 5L Cost = inventory_items[name='Empty 5L Tin'].avg_cost
Tin 15L Cost = inventory_items[name='Empty 15L Tin'].avg_cost
Label Cost = inventory_items[name='Labels'].avg_cost

// Total COGS per SKU
COGS(1L) = (Bulk Oil Cost × 1) + Bottle 1L Cost + Label Cost
COGS(5L) = (Bulk Oil Cost × 5) + Tin 5L Cost + Label Cost
COGS(15L) = (Bulk Oil Cost × 15) + Tin 15L Cost + Label Cost
```

### Loan Calculations
```typescript
// Balance after payment
New Balance = Current Balance - Payment Amount

// Balance after interest charge
New Balance = Current Balance + Interest Amount

// Total loan obligation
Total Debt = Σ(loans.current_balance)
```

## Related Documentation
- [Production Workflow](./PRODUCTION-WORKFLOW.md) - How oil costs feed into COGS
- [CRM Implementation](./CRM-IMPLEMENTATION.md) - How orders affect income
- [Quick Start Guide](./QUICK-START-GUIDE.md) - Initial setup
- [Database Schema](../supabase/schema.sql) - Full schema reference
