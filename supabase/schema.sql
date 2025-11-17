create extension if not exists "pgcrypto";

create type family_size as enum ('small', 'medium', 'large');
create type lead_status as enum (
  'inquiry',
  'education',
  'price_sent',
  'trust_process',
  'closed_won',
  'feedback_pending',
  'refill_due'
);
create type order_status as enum ('pending', 'processing', 'out_for_delivery', 'delivered');
create type payment_status as enum ('cod', 'prepaid');
create type expense_status as enum ('paid', 'unpaid');
create type loan_transaction_type as enum ('payment', 'interest');

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text check (role in ('super_admin', 'delivery_agent')) default 'delivery_agent',
  created_at timestamptz default now()
);

default privileges in schema public grant all on tables to postgres;
default privileges in schema public grant usage, select on sequences to postgres;

grant usage on schema public to authenticated;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  item_type text not null check (item_type in ('raw_material', 'packaging', 'intermediate', 'finished_good', 'byproduct')),
  stock_level numeric not null default 0,
  unit text not null,
  avg_cost numeric not null default 0,
  low_stock_threshold numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  quantity_change numeric not null,
  reason text,
  created_at timestamptz default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  address text not null,
  family_size family_size not null,
  status lead_status not null default 'inquiry',
  last_interaction_at timestamptz default now(),
  next_refill_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customer_status_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers on delete cascade,
  status lead_status not null,
  changed_at timestamptz not null default now(),
  notes text
);

create table if not exists public.production_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  phase text not null check (phase in ('dehusking', 'pressing', 'completed')),
  farmer_name text,
  batch_date date not null default current_date,
  input_groundnuts_kg numeric,
  output_peanuts_kg numeric,
  output_oil_liters numeric,
  output_oilcake_kg numeric,
  output_husk_kg numeric,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers on delete cascade,
  status order_status not null default 'pending',
  payment_status payment_status not null default 'prepaid',
  total_amount numeric not null default 0,
  total_liters numeric not null default 0,
  assigned_agent uuid references public.profiles,
  ordered_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  product_id uuid references public.inventory_items on delete set null,
  product_name text not null,
  quantity numeric not null,
  unit_price numeric not null,
  created_at timestamptz default now()
);

create table if not exists public.delivery_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  delivery_agent_id uuid not null references public.profiles on delete cascade,
  scheduled_for timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_type text not null check (expense_type in ('purchase_groundnuts', 'transport', 'labor', 'maintenance', 'utilities')),
  amount numeric not null,
  expense_date date not null default current_date,
  status expense_status not null default 'paid',
  description text,
  created_at timestamptz default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  lender_name text not null,
  initial_amount numeric not null,
  current_balance numeric not null,
  interest_rate_pa numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.loan_transactions (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans on delete cascade,
  date timestamptz not null default now(),
  type loan_transaction_type not null,
  amount numeric not null,
  created_at timestamptz default now()
);

create or replace function public.calculate_next_refill_date(last_order_liters numeric, household family_size)
returns date as $$
declare
  monthly_consumption numeric;
  days_of_supply integer;
begin
  if household = 'small' then
    monthly_consumption := 1;
  elsif household = 'large' then
    monthly_consumption := 3;
  else
    monthly_consumption := 2;
  end if;

  if last_order_liters is null or last_order_liters <= 0 then
    return null;
  end if;

  days_of_supply := greatest(ceil((last_order_liters / monthly_consumption) * 30), 7);
  return current_date + days_of_supply;
end;
$$ language plpgsql stable;

create or replace function public.handle_order_delivery()
returns trigger as $$
declare
  household family_size;
  refill_date date;
begin
  if new.status = 'delivered' and (tg_op = 'INSERT' or old.status <> 'delivered') then
    select family_size into household from public.customers where id = new.customer_id;

    if household is not null then
      refill_date := public.calculate_next_refill_date(new.total_liters, household);
      update public.customers
      set status = 'feedback_pending',
          next_refill_date = refill_date,
          last_interaction_at = now(),
          updated_at = now()
      where id = new.customer_id;

      insert into public.customer_status_history(customer_id, status, notes)
      values (new.customer_id, 'feedback_pending', 'Order delivered - awaiting feedback');
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.handle_stock_movement()
returns trigger as $$
begin
  update public.inventory_items
  set stock_level = stock_level + new.quantity_change,
      updated_at = now()
  where id = new.item_id;
  
  return new;
end;
$$ language plpgsql;

create trigger trg_orders_updated
before update on public.orders
for each row execute function public.touch_updated_at();

create trigger trg_customers_updated
before update on public.customers
for each row execute function public.touch_updated_at();

create trigger trg_orders_delivery
after insert or update on public.orders
for each row execute function public.handle_order_delivery();

create trigger trg_loans_updated
before update on public.loans
for each row execute function public.touch_updated_at();

drop trigger if exists on_stock_movement on public.stock_movements;

create trigger on_stock_movement
after insert on public.stock_movements
for each row execute function public.handle_stock_movement();

create or replace function public.get_bulk_oil_cost_per_liter()
returns numeric as $$
declare
  total_production_expenses numeric;
  total_groundnut_expenses numeric;
  total_oil_liters numeric;
  bulk_cost numeric;
begin
  select coalesce(sum(amount), 0)
  into total_production_expenses
  from public.expenses
  where expense_type in ('labor', 'utilities', 'maintenance');

  select coalesce(sum(amount), 0)
  into total_groundnut_expenses
  from public.expenses
  where expense_type = 'purchase_groundnuts';

  select coalesce(sum(output_oil_liters), 0)
  into total_oil_liters
  from public.production_batches
  where output_oil_liters is not null and output_oil_liters > 0;

  if total_oil_liters = 0 then
    return 0;
  end if;

  bulk_cost := (total_production_expenses + total_groundnut_expenses) / total_oil_liters;
  return bulk_cost;
end;
$$ language plpgsql stable;

alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.customers enable row level security;
alter table public.customer_status_history enable row level security;
alter table public.production_batches enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.delivery_assignments enable row level security;
alter table public.expenses enable row level security;
alter table public.loans enable row level security;
alter table public.loan_transactions enable row level security;
alter table public.profiles enable row level security;

create policy "super admin manage inventory"
  on public.inventory_items
  for all using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'super_admin'
    )
  ) with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

create policy "super admin manage customers"
  on public.customers
  for all using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
    )
  ) with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

create policy "super admin manage orders"
  on public.orders
  for all using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
    )
  ) with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

create policy "delivery agent view own orders"
  on public.orders
  for select using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'delivery_agent'
    )
    and assigned_agent = auth.uid()
  );

create policy "delivery agent update delivery status"
  on public.orders
  for update using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'delivery_agent'
    )
    and assigned_agent = auth.uid()
  ) with check (status = 'delivered');

create policy "restrict customer history to admin"
  on public.customer_status_history
  for select using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

create policy "delivery agent assignments"
  on public.delivery_assignments
  for select using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'delivery_agent'
    )
    and delivery_agent_id = auth.uid()
  );

create policy "super admin assignments"
  on public.delivery_assignments
  for all using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
    )
  ) with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

create policy "super admin expenses"
  on public.expenses
  for all using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
    )
  ) with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

create policy "super admin production"
  on public.production_batches
  for all using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
    )
  ) with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

create policy "profiles self"
  on public.profiles
  for select using (auth.uid() = id);

create policy "profiles admin"
  on public.profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );

create policy "super admin loans"
  on public.loans
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );

create policy "super admin loan transactions"
  on public.loan_transactions
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );

create policy "super admin stock movements"
  on public.stock_movements
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );

insert into public.inventory_items (id, item_name, item_type, stock_level, unit, avg_cost, low_stock_threshold)
values
  ('b6b8b286-8cf7-4d05-b1e8-1ca5d7ccf111', 'Groundnuts', 'raw_material', 920, 'kg', 78, 600),
  ('f59fe2de-0c61-4d8f-9701-c074f4080bcf', '1L Bottle Oil', 'finished_good', 140, 'units', 260, 100),
  ('3d6b31d8-29ad-4ca1-b221-9c14b53627f7', 'Oilcake', 'byproduct', 240, 'kg', 32, 100),
  ('e8f1c2d3-5a6b-4c7d-8e9f-0a1b2c3d4e5f', 'Empty 1L Bottle', 'packaging', 260, 'units', 18, 200),
  ('f9e2d3c4-6b7a-5d8e-9f0a-1b2c3d4e5f6a', 'Empty 5L Tin', 'packaging', 80, 'units', 65, 50),
  ('a0b1c2d3-7c8b-6e9d-0f1a-2b3c4d5e6f7a', 'Empty 15L Tin', 'packaging', 25, 'units', 180, 20),
  ('b1c2d3e4-8d9c-7f0e-1a2b-3c4d5e6f7g8h', 'Labels', 'packaging', 520, 'units', 4, 400)
ON CONFLICT (id) DO NOTHING;

insert into public.customers (id, name, phone, address, family_size, status, last_interaction_at, next_refill_date)
values
  ('1b4bee8c-81c7-4f50-a32f-8eec127c2e10', 'Anita Rao', '+91 99001 11223', 'HSR Layout, Bengaluru', 'medium', 'price_sent', now() - interval '26 hours', current_date + 12),
  ('a73bbad8-855a-4f67-b0f1-4e9a784889d8', 'Vishal Sharma', '+91 98450 22334', 'Whitefield, Bengaluru', 'large', 'inquiry', now() - interval '3 hours', null),
  ('e2f39f48-0d40-4c77-a5b4-623d001a6c23', 'Deepa Natarajan', '+91 99867 44556', 'Koramangala, Bengaluru', 'small', 'refill_due', now() - interval '18 days', current_date + 2)
ON CONFLICT (id) DO NOTHING;

insert into public.expenses (id, expense_type, amount, expense_date, description)
values
  ('a4e8a0a6-ec7b-4dc3-93de-50f8745bf2fe', 'purchase_groundnuts', 102000, current_date - 2, 'Bulk procurement from Gowda Farms (1.2T)'),
  ('0b9d3a60-3572-4665-97ce-25c418dcb704', 'transport', 8500, current_date - 2, 'Inbound logistics'),
  ('bc2a82aa-59c5-45f6-bd24-6e7c56bdd1e5', 'labor', 6200, current_date - 1, 'Pressing crew payouts')
ON CONFLICT (id) DO NOTHING;

insert into public.profiles (id, full_name, role)
values
  ('8d0b9e80-671b-4d0f-9e5c-d7c2b6d6a111', 'Founder Admin', 'super_admin'),
  ('f60216f4-9cb0-4915-9d00-5389d02b8c21', 'Aditya Shetty', 'delivery_agent')
ON CONFLICT (id) DO NOTHING;

insert into public.orders (id, customer_id, status, payment_status, total_amount, total_liters, assigned_agent, ordered_at, delivered_at)
values
  ('bf8d85da-38b7-4c2d-a6cc-d0c6eefd3f82', '1b4bee8c-81c7-4f50-a32f-8eec127c2e10', 'out_for_delivery', 'prepaid', 520, 2, 'f60216f4-9cb0-4915-9d00-5389d02b8c21', now() - interval '5 hours', null),
  ('70c24885-887d-4f3b-9ce0-1aa569f902fb', 'e2f39f48-0d40-4c77-a5b4-623d001a6c23', 'delivered', 'cod', 1150, 5, 'f60216f4-9cb0-4915-9d00-5389d02b8c21', now() - interval '7 days', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

insert into public.order_items (id, order_id, product_id, product_name, quantity, unit_price)
values
  ('c7e7a555-267d-4270-b478-1d1df2b56ba2', 'bf8d85da-38b7-4c2d-a6cc-d0c6eefd3f82', 'f59fe2de-0c61-4d8f-9701-c074f4080bcf', '1L Bottle Oil', 2, 260),
  ('427f3f5c-36bf-41e5-a3fa-b31c3d650eba', '70c24885-887d-4f3b-9ce0-1aa569f902fb', 'f59fe2de-0c61-4d8f-9701-c074f4080bcf', '1L Bottle Oil', 2, 260)
ON CONFLICT (id) DO NOTHING;

insert into public.delivery_assignments (id, order_id, delivery_agent_id, scheduled_for)
values
  ('a27b0d52-9ee4-4b93-95ef-5656d87f2622', 'bf8d85da-38b7-4c2d-a6cc-d0c6eefd3f82', 'f60216f4-9cb0-4915-9d00-5389d02b8c21', now())
ON CONFLICT (id) DO NOTHING;
