-- Migration: Fix and Decouple Production/Bottling
-- Fixes the check constraint violation by running
-- data updates *before* applying new constraints.

-- 1. Remove the old constraint (if it exists)
ALTER TABLE public.production_batches
DROP CONSTRAINT IF EXISTS production_batches_phase_check;

-- 2. (FIX) Migrate any existing 'bottling' phase
-- batches to 'completed'. This is the step
-- that was out of order.
UPDATE public.production_batches
SET phase = 'completed'
WHERE phase = 'bottling';

-- 3. (NEW) Now that the data is clean,
-- add the new, stricter constraint.
ALTER TABLE public.production_batches
ADD CONSTRAINT production_batches_phase_check 
CHECK (phase IN ('dehusking', 'pressing', 'completed'));

-- 4. Remove the bottled_units column (no longer needed)
ALTER TABLE public.production_batches
DROP COLUMN IF EXISTS bottled_units;

-- Note: This corrected script is safe to run.