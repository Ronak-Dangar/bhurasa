-- Step 1: Check if you have any users and their profiles
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- Step 2: If you see your user but no profile row, create one
-- Replace 'your-email@example.com' with your actual email

-- Create a super_admin profile:
INSERT INTO public.profiles (id, full_name, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com' LIMIT 1),
  'Super Admin',
  'super_admin'
)
ON CONFLICT (id) DO UPDATE 
SET role = 'super_admin';

-- Or if you already have the user ID:
-- INSERT INTO public.profiles (id, full_name, role)
-- VALUES (
--   'YOUR_USER_UUID_HERE',
--   'Super Admin',
--   'super_admin'
-- )
-- ON CONFLICT (id) DO UPDATE 
-- SET role = 'super_admin';

