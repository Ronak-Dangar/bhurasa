-- =====================================================================
-- UNIVERSAL RLS UNLOCK: Super Admin Full Access
-- =====================================================================
-- Purpose: Grant Super Admin unrestricted access to ALL tables
-- Problem: Super Admin sees "0" data across all dashboards
-- Root Cause: RLS is enabled but policies are missing
-- Solution: Apply "Super Admin Access" policy to every table
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- STEP 1: Create Helper Function (Recursion-Safe)
-- ─────────────────────────────────────────────────────────────────────
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

COMMENT ON FUNCTION public.is_super_admin() IS 
'Checks if the current authenticated user has super_admin role. Uses SECURITY DEFINER to bypass RLS on profiles table.';

-- ─────────────────────────────────────────────────────────────────────
-- STEP 2: Apply Policies to ALL Tables
-- ─────────────────────────────────────────────────────────────────────

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: profiles (Special Handling - Allow self-read for all users)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin full access to profiles" ON public.profiles;

-- Allow all authenticated users to read their own profile (prevents login lockout)
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Super Admin gets full CRUD on all profiles
CREATE POLICY "Super Admin full access to profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: inventory_items
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "Super Admin full access to inventory_items" ON public.inventory_items;

CREATE POLICY "Super Admin full access to inventory_items"
ON public.inventory_items
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: production_batches
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "Super Admin full access to production_batches" ON public.production_batches;

CREATE POLICY "Super Admin full access to production_batches"
ON public.production_batches
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: stock_movements
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "Super Admin full access to stock_movements" ON public.stock_movements;

CREATE POLICY "Super Admin full access to stock_movements"
ON public.stock_movements
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: expenses
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "Super Admin full access to expenses" ON public.expenses;

CREATE POLICY "Super Admin full access to expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: loans
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "Super Admin full access to loans" ON public.loans;

CREATE POLICY "Super Admin full access to loans"
ON public.loans
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: loan_transactions
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "Super Admin full access to loan_transactions" ON public.loan_transactions;

CREATE POLICY "Super Admin full access to loan_transactions"
ON public.loan_transactions
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: customers
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "Super Admin full access to customers" ON public.customers;

CREATE POLICY "Super Admin full access to customers"
ON public.customers
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: orders
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "Super Admin full access to orders" ON public.orders;

CREATE POLICY "Super Admin full access to orders"
ON public.orders
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: order_items
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "Super Admin full access to order_items" ON public.order_items;

CREATE POLICY "Super Admin full access to order_items"
ON public.order_items
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TABLE: delivery_assignments
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DROP POLICY IF EXISTS "Super Admin full access to delivery_assignments" ON public.delivery_assignments;

CREATE POLICY "Super Admin full access to delivery_assignments"
ON public.delivery_assignments
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ─────────────────────────────────────────────────────────────────────
-- STEP 3: Verification
-- ─────────────────────────────────────────────────────────────────────

-- List all policies created by this script
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (
    policyname LIKE '%Super Admin%' 
    OR policyname = 'Users can read own profile'
  )
ORDER BY tablename, policyname;

-- =====================================================================
-- INSTRUCTIONS:
-- =====================================================================
-- 1. Copy this entire script
-- 2. Open Supabase Dashboard → SQL Editor
-- 3. Paste and click "Run"
-- 4. Wait for "Success. No rows returned"
-- 5. Check the verification query output (should list all policies)
-- 6. Log out and log back in as Super Admin
-- 7. Navigate to any dashboard - data should now appear
-- =====================================================================

-- =====================================================================
-- ROLLBACK (if needed):
-- =====================================================================
-- DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
-- DROP POLICY IF EXISTS "Super Admin full access to profiles" ON public.profiles;
-- DROP POLICY IF EXISTS "Super Admin full access to inventory_items" ON public.inventory_items;
-- DROP POLICY IF EXISTS "Super Admin full access to production_batches" ON public.production_batches;
-- DROP POLICY IF EXISTS "Super Admin full access to stock_movements" ON public.stock_movements;
-- DROP POLICY IF EXISTS "Super Admin full access to expenses" ON public.expenses;
-- DROP POLICY IF EXISTS "Super Admin full access to loans" ON public.loans;
-- DROP POLICY IF EXISTS "Super Admin full access to loan_transactions" ON public.loan_transactions;
-- DROP POLICY IF EXISTS "Super Admin full access to customers" ON public.customers;
-- DROP POLICY IF EXISTS "Super Admin full access to orders" ON public.orders;
-- DROP POLICY IF EXISTS "Super Admin full access to order_items" ON public.order_items;
-- DROP POLICY IF EXISTS "Super Admin full access to delivery_assignments" ON public.delivery_assignments;
-- DROP FUNCTION IF EXISTS public.is_super_admin();
-- =====================================================================
