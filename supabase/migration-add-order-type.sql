-- ═══════════════════════════════════════════════════════════════
-- Migration: Add order_type column to orders table
-- Purpose: Separate Oil Retail from Byproduct Sales
-- Date: 2025-12-14
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Add order_type column
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_type text CHECK (order_type IN ('oil', 'byproduct'));

-- Step 2: Set default value for existing orders (assume oil)
UPDATE public.orders
SET order_type = 'oil'  
WHERE order_type IS NULL;

-- Step 3: Make column NOT NULL after setting defaults
ALTER TABLE public.orders
ALTER COLUMN order_type SET NOT NULL;

-- Step 4: Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);

-- Step 5: Add composite index for common query pattern (type + status)
CREATE INDEX IF NOT EXISTS idx_orders_type_status ON public.orders(order_type, status);

-- ═══════════════════════════════════════════════════════════════
-- Verification Queries
-- ═══════════════════════════════════════════════════════════════

-- Check column added successfully
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'orders' AND column_name = 'order_type';

-- Check all orders have order_type assigned
-- SELECT order_type, COUNT(*) 
-- FROM orders 
-- GROUP BY order_type;

-- Check indexes created
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'orders' AND indexname LIKE '%order_type%';

-- ═══════════════════════════════════════════════════════════════
-- Rollback (if needed)
-- ═══════════════════════════════════════════════════════════════

-- DROP INDEX IF EXISTS idx_orders_type_status;
-- DROP INDEX IF EXISTS idx_orders_order_type;
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS order_type;
