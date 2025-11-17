# Groundnut Oil ERP: Super Admin Workflow Guide

## 1. Introduction: Your Business Command Center

Welcome to your complete business management platform. This system provides a single, integrated solution to manage your entire groundnut oil operation—from purchasing raw materials to tracking customer relationships and monitoring profitability.

**The Power of Integration:** Every action you take in one module automatically updates related areas throughout the system. When you complete a production batch, your inventory updates instantly. When you deliver an order, your customer's status changes automatically. This ensures your business data is always accurate and synchronized.

---

## 2. The Full Business Cycle: Step-by-Step

### Workflow 1: Procurement (Buying New Stock)

This workflow explains how to record purchases of raw materials (groundnuts, packaging materials) and automatically update your inventory.

#### Log the Expense

1. Navigate to the **Finance** page
2. Click **"+ Log New Expense"**
3. Fill in the expense details:
   - **Amount:** Enter the total purchase cost (e.g., ₹80,000)
   - **Category:** Select **"Purchase Groundnuts"** or **"Purchase Packaging"**
   - **Description:** Add any relevant notes (supplier name, invoice number, etc.)

#### Update Inventory (The "Bridge")

**Critical Step:** Because this is a **procurement** expense, the form will ask for additional inventory details:

- **Item:** Select the inventory item you purchased (e.g., "Groundnuts")
- **Quantity:** Enter the amount received (e.g., "1000" kg)

#### What Happens When You Submit

The system automatically performs **two integrated actions**:

1. **Records the ₹80,000 expense** in your Finance module
2. **Adds 1,000 kg to your Groundnuts stock** in the Inventory module

**Bonus:** The system recalculates the **Average Cost** of the item based on your purchase history. This ensures your profit margin calculations are always accurate when you sell finished products.

---

### Workflow 2: Production (Making Bulk Oil)

This workflow explains how to use the Production Kanban board to transform groundnuts into bulk oil through a two-phase manufacturing process.

#### Start a New Batch

1. Navigate to the **Production** page
2. Click **"Start New Batch"**
3. Enter a unique **Batch Code** (e.g., "BATCH-001")
4. Click **"Create Batch"**

**Result:** A new batch card appears in the **"Phase 1: De-husking"** column.

#### Complete Phase 1 (De-husking)

1. Click on the batch card in the De-husking column
2. Enter the production data:
   - **Input Groundnuts (kg):** Amount of raw groundnuts used
   - **Output Peanuts (kg):** Amount of de-husked peanuts produced
   - **Output Husk (kg):** Byproduct generated
3. Click **"Save & Advance"**

**Automated Result:**
- The batch card **moves to "Phase 2: Pressing"** column
- **Inventory updates automatically:**
  - Groundnuts stock **decreases** by the input amount
  - Peanuts stock **increases** by the output amount
  - Husk stock **increases** by the byproduct amount

#### Complete Phase 2 (Pressing)

1. Click on the batch card in the Pressing column
2. Enter the production data:
   - **Input Peanuts (kg):** Amount of peanuts used (auto-filled from Phase 1)
   - **Output Oil (L):** Liters of bulk oil produced
   - **Output Oilcake (kg):** Byproduct generated
3. Click **"Save & Complete Batch"**

**Automated Result:**
- The batch card **moves to "Completed"** column
- **Inventory updates automatically:**
  - Peanuts stock **decreases** by the input amount
  - Bulk Oil stock **increases** by the output amount
  - Oilcake stock **increases** by the byproduct amount

**Note:** All inventory changes are logged in the Audit Trail with the batch code for full traceability.

---

### Workflow 3: Packaging (Bottling Your Oil)

This workflow explains how to convert bulk oil into finished products ready for sale.

#### Start a Bottling Run

1. Navigate to the **Bottling** page
2. Check the **"Available Bulk Oil"** display at the top (e.g., "500.5 L")
   - This shows your current bulk oil stock in real-time

#### Plan Your Run

Use the bottling form to plan which products to create. You can **mix and match multiple SKUs** in a single run.

**Example Plan:**
- **Line 1:** 1L Bottle - Quantity: 50 units
- **Line 2:** 5L Tin - Quantity: 10 units

**How to Add Lines:**
1. Select a **SKU** from the dropdown (e.g., "1L Bottle")
2. Enter the **Quantity** (e.g., 50)
3. Click **"+ Add SKU"** to add another line
4. Repeat for all products you want to bottle

#### Execute the Run

1. Review your bottling plan
2. Click **"Start Bottling Run"**

**Automated Result:** The system performs a **complete multi-inventory transaction**. Using the example above:

**Decreases (Consumed):**
- Bulk Oil: **-100 L** (50×1L + 10×5L)
- Empty 1L Bottle: **-50 units**
- Empty 5L Tin: **-10 units**

**Increases (Produced):**
- Finished 1L Oil: **+50 units**
- Finished 5L Oil: **+10 units**

**Note:** The entire bottling run is logged as a single transaction in the Audit Trail with a unique Bottling Run ID for complete traceability.

---

### Workflow 4: Sales & CRM (Managing Customers)

This workflow explains how to manage customer relationships from initial inquiry through repeat purchases.

#### Manage Leads

1. Navigate to the **Customers** page
2. Click **"Add New Customer"** to log a new lead
3. Fill in the customer details:
   - Name, contact information, location
   - **Default Status:** Automatically set to "Inquiry"

#### Track the Sales Pipeline

As you nurture each lead, update their status to reflect your sales process:

1. Click on the customer's name to open their details
2. Go to the **"Details"** tab
3. Update their **Status** manually:
   - **Inquiry** → Initial contact made
   - **Price Sent** → Quotation provided
   - **Trust Process** → Building relationship
   - **Converted** → First sale completed
   - **Feedback Pending** → Order delivered, awaiting feedback
   - **Repeat Customer** → Multiple purchases completed

#### Create an Order

1. Navigate to **"New Order"**
2. Select the **customer** from the dropdown (or create a new one)
3. Add **products** from your finished inventory:
   - Select item (e.g., "Finished 1L Oil")
   - Enter quantity
   - Price auto-fills based on your pricing
4. Review the order total
5. Click **"Submit Order"**

**Result:** Order is created with status "Pending"

#### Fulfill an Order

1. Navigate to the **Delivery** board
2. Find the order in the delivery queue
3. When the order is dispatched and delivered, mark it as **"Delivered"**

**Automated Result:**
- Customer's CRM status automatically updates to **"Feedback Pending"**
- System calculates the customer's **Next Refill Date** based on their order
- This automatically puts the customer on your radar for a timely follow-up call

---

### Workflow 5: Full System Oversight

This section explains how to monitor your entire business at a glance and access detailed historical data.

#### The Command Center (Dashboard)

Navigate to the main **Dashboard** page for a comprehensive view of your business:

**What You'll See:**
- **Leads to Nurture:** Customers in "Inquiry" or "Price Sent" stages
- **Orders in Flight:** Pending and in-progress orders
- **Upcoming Refills:** Customers approaching their next purchase date
- **Production Status:** Active batches and their current phase
- **Inventory Alerts:** Low stock warnings for critical items
- **Financial Snapshot:** Quick view of income vs. expenses

**Use Case:** Start each day by reviewing the Dashboard to prioritize your tasks—follow up with hot leads, complete pending production batches, or restock low-inventory items.

#### The Finance Hub

Navigate to the **Finance** page to track your business profitability:

**Financial Overview:**
- **Total Income:** Revenue from all delivered orders
- **Total Expenses:** All logged expenses (procurement, operations, overhead)
- **Net Profit:** Real-time calculation of Income minus Expenses

**Additional Features:**
- **Expense Breakdown:** View expenses by category
- **Loan Management:** Track loans, payables, and repayment schedules
- **Cost Analysis:** Monitor your procurement costs and production efficiency

**Use Case:** Review this page weekly or monthly to understand your business profitability and make informed decisions about pricing, procurement, and investment.

#### The Audit Trail (Full History)

If you ever wonder **"Why did my stock level change?"** or **"When did this inventory move?"**, the Audit Trail provides complete transparency.

**How to Access:**

1. Navigate to the **Inventory** page
2. Click **"View Full Log"** in the header

**What You'll See:**

A complete, **un-editable history** of every single stock movement, displayed in reverse chronological order:

| Date & Time | Item | Change | Reason |
|-------------|------|--------|--------|
| Nov 17, 2:30 PM | Bulk Oil | -100 L | Bottling Run BR-1234567890: Total bulk oil consumed |
| Nov 17, 2:30 PM | Finished 1L Oil | +50 units | Bottling Run BR-1234567890: 1L Bottle (50 units) |
| Nov 17, 10:15 AM | Groundnuts | -200 kg | Production: Batch BATCH-001 - Dehusking (consumed) |
| Nov 17, 10:15 AM | Peanuts | +160 kg | Production: Batch BATCH-001 - Dehusking (produced) |

**Key Features:**
- **Timestamp:** Exact date and time of every change
- **Item Name:** Which inventory item was affected
- **Quantity Change:** Positive (addition) or negative (consumption)
- **Reason:** Full context—which batch, bottling run, or manual adjustment caused the change

**Use Case:** This audit trail is essential for:
- Reconciling physical stock with system records
- Investigating discrepancies
- Providing accountability for all inventory movements
- Meeting compliance or accounting requirements

---

## 3. Best Practices for Super Admins

### Daily Routine

1. **Morning:** Review Dashboard for pending tasks and alerts
2. **Operations:** Process production batches and bottling runs as needed
3. **Sales:** Follow up with leads in the CRM pipeline
4. **Evening:** Log any new expenses and verify inventory accuracy

### Weekly Routine

1. **Review Finance Hub:** Analyze income, expenses, and profit trends
2. **CRM Cleanup:** Update customer statuses and schedule follow-ups
3. **Inventory Check:** Reconcile physical stock with system records using the Audit Trail

### Monthly Routine

1. **Financial Reporting:** Export or review monthly profit/loss
2. **Production Analysis:** Review completed batches for efficiency trends
3. **Customer Retention:** Analyze repeat customer patterns and refill cycles

---

## 4. Key System Benefits

✅ **Integrated:** One action updates multiple modules automatically  
✅ **Real-time:** All data refreshes live—no delays or manual updates  
✅ **Traceable:** Complete audit trail for every inventory movement  
✅ **Automated:** Customer status updates, stock calculations, and refill predictions happen automatically  
✅ **Scalable:** Built to grow with your business from startup to enterprise  

---

## 5. Support & Questions

This system is designed to be intuitive, but if you encounter any questions:

- **Inventory Questions:** Check the Audit Trail (Inventory → View Full Log)
- **Customer Questions:** Review the customer's Details tab in the CRM
- **Financial Questions:** Review the Finance Hub and expense logs
- **System Issues:** Contact your technical support team

**Remember:** Every module is connected. Understanding how one action flows through the system will help you leverage the full power of this integrated ERP platform.

---

*End of Guide*
