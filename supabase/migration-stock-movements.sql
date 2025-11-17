-- Migration: Audit Trail Implementation
-- Creates stock_movements ledger table with automatic trigger
-- This enables full audit trail for all inventory changes

-- 1. Create the new table for the audit trail
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_change NUMERIC NOT NULL,
  reason TEXT, -- e.g., "Production: Batch 24", "Bottling Run #123", "Order #1005"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the function that the trigger will run
CREATE OR REPLACE FUNCTION public.handle_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the stock_level in the inventory_items table
  UPDATE public.inventory_items
  SET stock_level = stock_level + NEW.quantity_change,
      updated_at = NOW()
  WHERE id = NEW.item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop the trigger if it already exists (to prevent errors)
DROP TRIGGER IF EXISTS on_stock_movement ON public.stock_movements;

-- 4. Create the trigger that runs the function after an insert
CREATE TRIGGER on_stock_movement
AFTER INSERT ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.handle_stock_movement();

-- 5. Enable RLS on the new table
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- 6. Add RLS Policies (allow all for super admins)
CREATE POLICY "Allow full access to super admins"
ON public.stock_movements
FOR ALL
USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'super_admin'
  )
);

-- 7. Create index for performance on common queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON public.stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);

-- Note: This migration is idempotent and safe to run multiple times
