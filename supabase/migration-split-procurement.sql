-- Migration: Split Procurement (Purchase Groundnuts vs Purchase Packaging)
-- Date: 2025-12-05
-- Purpose: Update expense_type constraint to support two distinct procurement workflows

-- Drop the existing check constraint on expense_type
ALTER TABLE public.expenses 
DROP CONSTRAINT IF EXISTS expenses_expense_type_check;

-- Add new constraint with updated allowed values
ALTER TABLE public.expenses 
ADD CONSTRAINT expenses_expense_type_check 
CHECK (expense_type IN (
  'purchase_groundnuts',
  'purchase_packaging',
  'transport',
  'labor',
  'maintenance',
  'utilities'
));

-- No data migration needed - just expanding the allowed list
COMMENT ON CONSTRAINT expenses_expense_type_check ON public.expenses IS 
'Allows: purchase_groundnuts (auto-links to groundnuts), purchase_packaging (requires item selection), and other expense categories';
