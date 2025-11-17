-- Fix infinite recursion in profiles RLS policies
-- The issue is that the admin policy checks profiles table while querying profiles

-- First, drop the problematic policies
DROP POLICY IF EXISTS "profiles self" ON public.profiles;
DROP POLICY IF EXISTS "profiles admin" ON public.profiles;

-- Create fixed policies that don't cause recursion
-- Policy 1: Users can always read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Service role can do everything (this is what middleware uses)
-- No need for a separate admin policy since service role bypasses RLS anyway

-- Optional: If you want users to update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Optional: Allow inserts for new users (if using triggers)
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
