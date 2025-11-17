## Groundnut Oil Startup Operating System

This repository implements a specialised CRM + Manufacturing ERP to run a wood pressed groundnut oil business end-to-end. It combines pipeline orchestration, production batch logging, inventory control, and lightweight accounting into a single responsive Next.js application.

### Stack

- Next.js App Router (TypeScript) deployed on Vercel
- Supabase (PostgreSQL, Auth, Row Level Security)
- Tailwind CSS (mobile-first)
- React Hook Form + Zod for interactive forms

### Features at a Glance

- **Command Center Dashboard**: Live pipeline alerts (nurture, retention, inventory, delivery). Quick-action panel and production timeline.
- **Inventory Management**: Single source of truth for raw material, intermediates, packaging, finished goods, and by-products with low-stock signals.
- **Production Workflow**: Guided three-phase manufacturing form (de-husking → pressing → bottling) with computed yields and batch summary.
- **Order Entry & Delivery View**: Sales desk interface to raise orders plus RBAC-limited delivery agent view exposing only necessary customer data.
- **Smart CRM Automations**: Automatic refill reminders and feedback nudges tied to customer family size and delivered quantities.
- **Finance Snapshot**: Income vs expenses with COD receivables context and actionable margin levers.
- **Supabase Schema**: SQL DDL + seed data, RLS policies for Super Admins and Delivery Agents, and `calculate_next_refill_date` helper.


## Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` on any device—layout adapts down to 360px viewports.

### Environment Variables

Duplicate `.env.example` (create one if missing) into `.env.local` and populate with Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The service role key is required only for local tooling or server actions that manage RLS-enabled resources—never expose it client-side. When deploying on Vercel, configure these variables in the project dashboard.

## Supabase Setup

1. Create or reuse a Supabase project.
2. Run the SQL in `supabase/schema.sql` using the Supabase SQL Editor or CLI.
	- Creates enumerations, tables, triggers, and RLS policies.
	- Seeds sample profiles, customers, inventory, orders, and expenses to mirror UI mock data.
3. In Supabase Auth → Policies, ensure Email sign-in is enabled. Add your founder account to the `profiles` table with `role = 'super_admin'`.

### Authentication & RBAC Notes

- Super Admins (founders) have unrestricted CRUD on operational tables.
- Delivery Agents see only orders assigned to them and may toggle status to `delivered`.
- Customer history, inventory costs, and financial ledgers are fully hidden from delivery agents via RLS.

## Project Structure Highlights

- `app/` — route-driven UI (dashboard, inventory, production, orders, delivery, finance)
- `components/ui/` — lightweight design primitives (metric cards, tables, badges)
- `components/production/` — multi-step production workflow form
- `components/orders/` — sales order form with Supabase-ready payload preview
- `lib/sample-data.ts` — mock dataset powering UI demos without Supabase yet
- `lib/analytics.ts` — domain logic for alerts, profit summaries, and refill scheduling
- `supabase/schema.sql` — authoritative schema + seeds + functions

## Data & Sample Content

The UI currently reads from in-memory sample data to illustrate expected states. After wiring Supabase, replace `lib/sample-data.ts` fetches with real queries (Server Actions or Supabase client helpers in `lib/supabase/`).

Key helper files:

- `lib/supabase/server.ts` — SSR-friendly client (uses Next.js cookies API)
- `lib/supabase/client.ts` — browser client for client components where needed
- `lib/analytics.ts` — `buildPipelineAlerts`, `calculate_next_refill_date`, aggregated metrics

## Deployment Checklist

1. Push repo to GitHub.
2. Create Vercel project → import repo → set environment variables.
3. Link Supabase project → set `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Re-run `supabase/schema.sql` on production database.
5. Validate RLS policies by testing super admin vs delivery agent sessions.
6. Trigger `npm run lint` & `npm run build` locally before deploying.

## Next Steps

- Hook Supabase data fetching into each route (replace sample data).
- Add background jobs (Supabase Edge Functions or Scheduled Functions) for automated nurture reminders.
- Integrate WhatsApp/SMS service for alerts triggered from dashboard actions.
- Extend analytics with yield-per-farmer and batch cost attribution once live data flows.
