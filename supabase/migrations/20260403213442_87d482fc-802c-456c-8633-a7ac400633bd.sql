
-- 1. Create a public view with only non-sensitive fields
CREATE OR REPLACE VIEW public.users_public
WITH (security_invoker = on) AS
SELECT id, full_name
FROM public.users;

-- 2. Replace the overly permissive read policy with a self-read-only policy
DROP POLICY IF EXISTS "authenticated_read_users" ON public.users;

CREATE POLICY "users_read_own"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 3. Add missing UPDATE policy on votes
CREATE POLICY "user_update_own_votes"
ON public.votes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
