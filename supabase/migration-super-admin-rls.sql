-- =====================================================================
-- MIGRATION: Super Admin RLS Policies
-- =====================================================================
-- Purpose: Grant full access to super_admin role across all tables
-- Problem: Super Admin sees "0" data due to missing RLS policies
-- Solution: Create policies that check profiles.role = 'super_admin'
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- Helper Function: Check if current user is Super Admin
-- ─────────────────────────────────────────────────────────────────────
-- This function prevents infinite recursion on profiles table
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'super_admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: profiles
-- ─────────────────────────────────────────────────────────────────────
-- Special handling: Allow users to read their own profile (avoid recursion)
-- Super Admin gets full access to ALL profiles

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin full access to profiles" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Super Admin full access to profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'super_admin'
  )
);

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: inventory_items
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Super Admin full access to inventory_items" ON public.inventory_items;

CREATE POLICY "Super Admin full access to inventory_items"
ON public.inventory_items
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: production_batches
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Super Admin full access to production_batches" ON public.production_batches;

CREATE POLICY "Super Admin full access to production_batches"
ON public.production_batches
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: stock_movements
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Super Admin full access to stock_movements" ON public.stock_movements;

CREATE POLICY "Super Admin full access to stock_movements"
ON public.stock_movements
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: expenses
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Super Admin full access to expenses" ON public.expenses;

CREATE POLICY "Super Admin full access to expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: customers
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Super Admin full access to customers" ON public.customers;

CREATE POLICY "Super Admin full access to customers"
ON public.customers
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: orders
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Super Admin full access to orders" ON public.orders;

CREATE POLICY "Super Admin full access to orders"
ON public.orders
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: order_items
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Super Admin full access to order_items" ON public.order_items;

CREATE POLICY "Super Admin full access to order_items"
ON public.order_items
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: delivery_assignments (if exists)
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Super Admin full access to delivery_assignments" ON public.delivery_assignments;

CREATE POLICY "Super Admin full access to delivery_assignments"
ON public.delivery_assignments
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- =====================================================================
-- VERIFICATION QUERIES (Run these AFTER migration to test)
-- =====================================================================

-- 1. Verify the helper function works:
-- SELECT is_super_admin();

-- 2. Check all policies were created:
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND policyname LIKE '%Super Admin%'
-- ORDER BY tablename, policyname;

-- 3. Test data access as Super Admin:
-- SELECT COUNT(*) FROM inventory_items;
-- SELECT COUNT(*) FROM orders;
-- SELECT COUNT(*) FROM expenses;

-- =====================================================================
-- ROLLBACK (if needed)
-- =====================================================================

-- DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
-- DROP POLICY IF EXISTS "Super Admin full access to profiles" ON public.profiles;
-- DROP POLICY IF EXISTS "Super Admin full access to inventory_items" ON public.inventory_items;
-- DROP POLICY IF EXISTS "Super Admin full access to production_batches" ON public.production_batches;
-- DROP POLICY IF EXISTS "Super Admin full access to stock_movements" ON public.stock_movements;
-- DROP POLICY IF EXISTS "Super Admin full access to expenses" ON public.expenses;
-- DROP POLICY IF EXISTS "Super Admin full access to customers" ON public.customers;
-- DROP POLICY IF EXISTS "Super Admin full access to orders" ON public.orders;
-- DROP POLICY IF EXISTS "Super Admin full access to order_items" ON public.order_items;
-- DROP POLICY IF EXISTS "Super Admin full access to delivery_assignments" ON public.delivery_assignments;
-- DROP FUNCTION IF EXISTS public.is_super_admin();
