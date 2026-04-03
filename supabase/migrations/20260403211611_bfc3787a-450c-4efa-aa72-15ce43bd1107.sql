-- Allow all authenticated users to read basic user info (needed for author names)
CREATE POLICY "authenticated_read_users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Drop the now-redundant individual read policies
DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "admin_read_all_users" ON public.users;