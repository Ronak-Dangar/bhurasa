# Groundnut Oil Startup OS — Implementation Plan

## Scope Overview
- Build admin-focused CRM + manufacturing ERP with supporting delivery interface.
- Use Next.js App Router (TypeScript), Tailwind CSS, and Supabase client helpers.
- Provide Supabase SQL schema with RLS, seed data, and helper functions.

## Work Breakdown
1. **Infrastructure & Utilities**
   - Configure global layout, navigation shell, and responsive grid.
   - Set up Supabase client helpers (`lib/supabase/server.ts`, `lib/supabase/client.ts`).
   - Provide shared UI primitives (cards, badges, table, alert chips).

2. **Sample Data & Types**
   - Define TypeScript domain models in `types/`.
   - Provide `lib/sample-data.ts` with mock records for dashboard demos (inventory, customers, orders, production).
   - Implement derived helper functions for alerts (nurture, retention, low stock).

3. **Dashboard Command Center**
   - Create `/app/page.tsx` as admin dashboard showing:
     - Key production & financial metrics summary cards.
     - Pipeline alert widgets (nurture + retention + low stock + delivery follow-ups).
     - Tables/lists for active leads and upcoming refills.

4. **Inventory Module**
   - Build `/app/inventory/page.tsx` to list items, highlight low-stock, and show consumption trends (static sample data).

5. **Production Run Workflow**
   - Implement `/app/production/page.tsx` as multi-step form (de-husking → pressing → bottling) with stateful client component, updating preview summary.
   - Hook into helper functions to compute expected outputs and create inventory adjustments (conceptual placeholders).

6. **Order Management**
   - Create `/app/orders/new/page.tsx` for order entry (customer select, products, payment, assignment) with sample data bridging to inventory.
   - Provide delivery agent list view `/app/delivery/page.tsx` that uses RBAC stub to filter assigned orders.

7. **Accounting Snapshot**
   - Add `/app/finance/page.tsx` summarizing income, expenses, actionable profit metrics using sample data.

8. **Styling & Components**
   - Ensure responsive design with Tailwind; include mobile navigation (bottom sheet) and desktop sidebar.
   - Add charts using lightweight CSS-only or simple components (no heavy chart libs to keep deps minimal).

9. **Documentation & Schema**
   - Write Supabase schema + seeds in `supabase/schema.sql` covering:
     - Tables for customers, inventory, orders, production, expenses, assignments, status history.
     - RLS policies for super_admin vs delivery_agent.
     - `calculate_next_refill_date` function + triggers.
     - Sample insert statements.
   - Update `README.md` with setup steps, environment variables, and workflow explanation.

## Out of Scope / Assumptions
- Supabase project provisioning and env var secrets handled externally.
- Real-time updates and background jobs noted as future enhancements.
- Authentication scaffolding limited to Supabase helper placeholders.
