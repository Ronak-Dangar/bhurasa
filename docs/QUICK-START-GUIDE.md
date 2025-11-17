# CRM Quick Start Guide

## 🚀 Quick Navigation

### Command Center Dashboard
- **URL:** `http://localhost:3000/`
- **Purpose:** Real-time business overview
- **Key Metrics:**
  - Leads to Nurture (live count)
  - Orders in Flight (live count)
  - Upcoming Refills (top 5 customers)
  - Net Profit, Low Stock Items

### Customer Management
- **URL:** `http://localhost:3000/dashboard/customers`
- **Features:**
  - View all customers
  - Filter by status
  - Add new customer
  - Edit customer details
  - Delete customer
  - View activity timeline

### Create Order
- **URL:** `http://localhost:3000/orders/new`
- **Features:**
  - Search customers
  - Add customer inline
  - Select products from inventory
  - Calculate totals
  - Assign delivery agent

## 🎯 Common Workflows

### 1. New Lead Comes In
```
1. Go to /dashboard/customers
2. Click "Add New Customer"
3. Enter: Name, Phone, Address, Family Size
4. Submit → Status = "inquiry" (automatic)
5. Lead appears in "Leads to Nurture" widget
```

### 2. Move Lead Through Funnel
```
1. Go to /dashboard/customers
2. Click customer row
3. In Customer 360 modal, select "Details" tab
4. Change "Status" dropdown (e.g., inquiry → education)
5. Save → Change logged in Activity Timeline
```

### 3. Create Order for Customer
```
1. Go to /orders/new
2. Search customer by name or phone
3. Select customer from dropdown
4. Add products (click "+ Add product" for multiple)
5. Select payment status (COD or Prepaid)
6. Assign delivery agent (optional)
7. Submit → Order created with status "pending"
```

### 4. Mark Order as Delivered
```
⚠️ This triggers automation!

When order status → "delivered":
✅ Customer status → "feedback_pending" (automatic)
✅ next_refill_date calculated (automatic)
✅ Activity logged: "Order delivered - awaiting feedback"

The customer will appear in "Upcoming Refills" widget
when their refill date is within 7 days.
```

### 5. Collect Feedback & Schedule Refill
```
1. Go to /dashboard/customers
2. Filter by "Feedback Pending"
3. Click customer
4. Manually update status to "closed_won" or "refill_due"
5. Customer enters retention cycle
```

## 🔍 Key Business Rules

### Customer Status Flow
```
inquiry → education → price_sent → trust_process → closed_won
                                                  ↓
                                          (First Order Delivered)
                                                  ↓
                                          feedback_pending
                                                  ↓
                                          (After feedback collected)
                                                  ↓
                                             refill_due
                                                  ↓
                                          (Refill order placed)
                                                  ↓
                                          Loop: feedback_pending → refill_due
```

### Refill Date Calculation
- **Formula:** Based on total liters delivered and family size
- **Small family:** 1L/month consumption
- **Medium family:** 2L/month consumption
- **Large family:** 3L/month consumption
- **Example:** 5L delivered to medium family = ~75 days supply

### Phone Number = Unique ID
- Phone numbers must be unique
- Used as primary customer identifier
- Cannot create duplicate phone numbers

## 📊 Understanding the Widgets

### Leads to Nurture
**Shows:** Customers in early stages who need follow-up
**Statuses included:** inquiry, education, price_sent, trust_process
**Action:** Review these customers daily and progress them through funnel

### Orders in Flight
**Shows:** Active orders needing action
**Statuses included:** pending, processing, out_for_delivery
**Action:** Ensure these orders are being fulfilled

### Upcoming Refills
**Shows:** Top 5 customers due for refill soon
**Criteria:** status = "refill_due" OR next_refill_date within 7 days
**Action:** Proactively reach out to these customers

## 🎨 UI Tips

### Status Badge Colors
- 🔵 Blue (Info): inquiry, education
- 🟡 Yellow (Warning): price_sent, trust_process
- 🟢 Green (Success): closed_won
- ⚪ Gray (Default): feedback_pending
- 🔴 Red (Danger): refill_due

### Filter Buttons
- Click to show only customers with that status
- Click "All" to reset filter
- Active filter highlighted in green

### Search in Order Form
- Type customer name or phone in search box
- Dropdown automatically filters
- Click "+ Add New" to create customer without leaving page

## ⚡ Pro Tips

1. **Use Status Filters** - Don't scroll through all customers; filter by stage
2. **Activity Timeline** - Check this tab to understand customer journey
3. **Inline Customer Creation** - When creating order, use "+ Add New" button instead of switching pages
4. **Real-time Updates** - Customer list auto-refreshes; no need to reload page
5. **Delivery Agent Assignment** - Assign agents during order creation for better tracking

## 🐛 Troubleshooting

### "Phone number already exists"
- Each customer must have unique phone
- Check if customer already exists before creating
- Use search to find existing customer

### "No products in dropdown"
- Products must be `item_type = 'finished_good'`
- Products must have `stock_level > 0`
- Check inventory management

### Order not triggering customer status update
- Status must change to exactly "delivered"
- Check if trigger `handle_order_delivery()` is enabled in database
- Verify total_liters is calculated correctly

## 📞 Support

For technical issues, check:
1. Browser console for errors
2. Supabase dashboard for database errors
3. Ensure environment variables are set
4. Verify Supabase RLS policies are active

## 🎓 Training Checklist

- [ ] Navigate to Command Center
- [ ] Create a test customer
- [ ] Filter customers by status
- [ ] Open Customer 360 and view timeline
- [ ] Update customer status manually
- [ ] Create an order for the customer
- [ ] Check order appears in "Orders in Flight"
- [ ] Mark order as delivered (simulate)
- [ ] Verify customer status auto-updated
- [ ] Check customer appears in "Upcoming Refills"

---

**Ready to use!** Start at the Command Center (`/`) to see your real-time dashboard.
