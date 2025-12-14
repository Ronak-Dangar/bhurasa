-- Migration: Add Selling Price & Fix RLS for Super Admin
-- Date: 2025-12-11
-- Purpose: Add selling_price to inventory_items and fix RLS blocking super_admin

-- ──────────────────────────────────────────────────────────────
-- STEP 1: Add selling_price column to inventory_items
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS selling_price numeric DEFAULT 0;

COMMENT ON COLUMN public.inventory_items.selling_price IS 
'Default selling price for finished goods. Used to auto-fill order unit prices (can be overridden for discounts).';

-- ──────────────────────────────────────────────────────────────
-- STEP 2: Fix RLS Policies for Super Admin Access
-- ──────────────────────────────────────────────────────────────

-- Drop existing restrictive policies on orders table
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all operations" ON public.orders;

-- Create comprehensive super_admin policy for orders
CREATE POLICY "Super Admin Full Access"
ON public.orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- ──────────────────────────────────────────────────────────────
-- order_items table
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all operations" ON public.order_items;

CREATE POLICY "Super Admin Full Access"
ON public.order_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- ──────────────────────────────────────────────────────────────
-- profiles table (for delivery agent creation)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow all operations" ON public.profiles;

CREATE POLICY "Super Admin Full Access"
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'super_admin'
  )
);

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- delivery_assignments table
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all operations" ON public.delivery_assignments;

CREATE POLICY "Super Admin Full Access"
ON public.delivery_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- ──────────────────────────────────────────────────────────────
-- VERIFICATION: Check if policies are applied
-- ──────────────────────────────────────────────────────────────
-- Run this after migration to verify:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('orders', 'order_items', 'profiles', 'delivery_assignments');
