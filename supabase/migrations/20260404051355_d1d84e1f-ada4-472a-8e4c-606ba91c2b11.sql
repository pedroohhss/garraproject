-- 1. Recreate users_public view with security_invoker=on
DROP VIEW IF EXISTS public.users_public;

CREATE VIEW public.users_public
WITH (security_invoker = on) AS
SELECT
  id,
  full_name,
  bio,
  avatar_url,
  linkedin_url,
  instagram_url,
  cidade,
  estado,
  cargos_aptos,
  created_at
FROM public.users;

-- Add a SELECT policy so all authenticated users can read public profile data
CREATE POLICY "all_read_public_profile"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Drop the old restrictive users_read_own since we now have all_read_public_profile
DROP POLICY IF EXISTS "users_read_own" ON public.users;

-- 2. Fix checklist_entries: add group membership check
DROP POLICY IF EXISTS "rep_manage_checklist" ON public.checklist_entries;

CREATE OR REPLACE FUNCTION public.is_group_representative(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id
    AND representative_id = _user_id
  );
$$;

CREATE POLICY "rep_manage_own_group_checklist"
ON public.checklist_entries
FOR ALL
TO authenticated
USING (
  auth.uid() = submitted_by
  AND public.is_group_representative(auth.uid(), group_id)
)
WITH CHECK (
  auth.uid() = submitted_by
  AND public.is_group_representative(auth.uid(), group_id)
);

-- 3. Fix users INSERT: prevent role escalation
CREATE POLICY "user_insert_own_profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND (role IS NULL OR role = 'participante')
);