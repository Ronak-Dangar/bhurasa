-- =====================================================================
-- FORCE-SYNC: Link Email to Super Admin Role
-- =====================================================================
-- Purpose: Ensure the authenticated user's auth.uid() matches the
--          super_admin profile in public.profiles
-- Problem: User is logged in but RLS blocks access (0 data shown)
-- Root Cause: Mismatch between auth.users.id and profiles.id
-- =====================================================================

DO $$
DECLARE
  target_email TEXT := 'my@email.com'; -- ⚠️ REPLACE WITH YOUR ACTUAL LOGIN EMAIL
  user_id UUID;
  profile_exists BOOLEAN;
BEGIN
  -- ─────────────────────────────────────────────────────────────────
  -- STEP 1: Lookup User ID from auth.users
  -- ─────────────────────────────────────────────────────────────────
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = target_email;

  -- Check if user exists
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email: %', target_email;
  END IF;

  RAISE NOTICE '✓ Found User ID: %', user_id;

  -- ─────────────────────────────────────────────────────────────────
  -- STEP 2: Check if profile already exists
  -- ─────────────────────────────────────────────────────────────────
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = user_id
  ) INTO profile_exists;

  IF profile_exists THEN
    RAISE NOTICE '⚠ Profile exists. Updating role to super_admin...';
  ELSE
    RAISE NOTICE '⚠ Profile missing. Creating new super_admin profile...';
  END IF;

  -- ─────────────────────────────────────────────────────────────────
  -- STEP 3: Upsert Profile (Insert or Update)
  -- ─────────────────────────────────────────────────────────────────
  INSERT INTO public.profiles (id, role, created_at, updated_at)
  VALUES (
    user_id,
    'super_admin',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET 
    role = 'super_admin',
    updated_at = NOW();

  RAISE NOTICE '✓ Profile synced successfully!';

  -- ─────────────────────────────────────────────────────────────────
  -- STEP 4: Verify the Fix
  -- ─────────────────────────────────────────────────────────────────
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'VERIFICATION:';
  RAISE NOTICE '  User ID:  %', user_id;
  RAISE NOTICE '  Email:    %', target_email;
  RAISE NOTICE '  Role:     super_admin';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

END $$;

-- ─────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERY: Run this to confirm the sync worked
-- ─────────────────────────────────────────────────────────────────────
SELECT 
  u.id,
  u.email,
  u.created_at AS "Auth Created",
  p.role,
  p.updated_at AS "Profile Updated"
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'my@email.com'; -- ⚠️ REPLACE WITH YOUR ACTUAL EMAIL

-- =====================================================================
-- INSTRUCTIONS:
-- =====================================================================
-- 1. Replace 'my@email.com' with your actual login email (2 places)
-- 2. Copy/paste this entire script into Supabase SQL Editor
-- 3. Click "Run"
-- 4. Check the NOTICE logs for success confirmation
-- 5. Run the verification query at the bottom
-- 6. Log out and log back in to refresh your session
-- 7. Navigate to /inventory or /finance - data should now appear
-- =====================================================================
