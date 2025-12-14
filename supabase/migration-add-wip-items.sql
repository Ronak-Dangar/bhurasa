-- ═══════════════════════════════════════════════════════════════
-- Migration: Add WIP Inventory Items
-- Purpose: Add Peanuts and Bulk Oil as intermediate (WIP) items
--          Add Husk as byproduct item
-- ═══════════════════════════════════════════════════════════════

-- Add Peanuts (Kernels) - WIP from dehusking phase
INSERT INTO public.inventory_items (id, item_name, item_type, stock_level, unit, avg_cost, low_stock_threshold)
VALUES 
  ('c7d8e9f0-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'Peanuts', 'intermediate', 0, 'kg', 85, 200)
ON CONFLICT (id) DO NOTHING;

-- Add Bulk Oil - WIP from pressing phase
INSERT INTO public.inventory_items (id, item_name, item_type, stock_level, unit, avg_cost, low_stock_threshold)
VALUES 
  ('d8e9f0a1-2b3c-4d5e-6f7a-8b9c0d1e2f3a', 'Bulk Oil', 'intermediate', 0, 'liters', 180, 50)
ON CONFLICT (id) DO NOTHING;

-- Add Husk - byproduct from dehusking phase
INSERT INTO public.inventory_items (id, item_name, item_type, stock_level, unit, avg_cost, low_stock_threshold)
VALUES 
  ('e9f0a1b2-3c4d-5e6f-7a8b-9c0d1e2f3a4b', 'Husk', 'byproduct', 0, 'kg', 12, 50)
ON CONFLICT (id) DO NOTHING;

-- Add 5L Tin Oil - finished good
INSERT INTO public.inventory_items (id, item_name, item_type, stock_level, unit, avg_cost, low_stock_threshold)
VALUES 
  ('f0a1b2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c', '5L Tin Oil', 'finished_good', 0, 'units', 1100, 20)
ON CONFLICT (id) DO NOTHING;

-- Add 15L Tin Oil - finished good
INSERT INTO public.inventory_items (id, item_name, item_type, stock_level, unit, avg_cost, low_stock_threshold)
VALUES 
  ('a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d', '15L Tin Oil', 'finished_good', 0, 'units', 3200, 10)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Verification Query (run after migration)
-- ═══════════════════════════════════════════════════════════════
-- SELECT item_name, item_type, stock_level, unit 
-- FROM inventory_items 
-- WHERE item_name IN ('Peanuts', 'Bulk Oil', 'Husk', '5L Tin Oil', '15L Tin Oil')
-- ORDER BY item_type, item_name;
