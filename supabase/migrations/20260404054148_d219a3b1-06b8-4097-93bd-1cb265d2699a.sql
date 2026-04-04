
-- ============================================================
-- 1. FIX PII EXPOSURE: restrict users table SELECT to own row
-- ============================================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "all_read_public_profile" ON public.users;

-- Owner-only SELECT
CREATE POLICY "users_read_own"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Recreate users_public view with group_id and role (non-sensitive)
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
    created_at,
    group_id,
    role
  FROM public.users;

-- ============================================================
-- 2. ENFORCE challenge_config FLAGS IN RLS
-- ============================================================

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_joining_open()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT joining_open FROM challenge_config LIMIT 1), false)
$$;

CREATE OR REPLACE FUNCTION public.is_ideas_open()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT ideas_open FROM challenge_config LIMIT 1), false)
$$;

CREATE OR REPLACE FUNCTION public.is_voting_open()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT voting_open FROM challenge_config LIMIT 1), false)
$$;

-- Update group_members INSERT policy
DROP POLICY IF EXISTS "user_insert_own_membership" ON public.group_members;
CREATE POLICY "user_insert_own_membership"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_joining_open());

-- Update ideas INSERT policy
DROP POLICY IF EXISTS "user_insert_idea" ON public.ideas;
CREATE POLICY "user_insert_idea"
  ON public.ideas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by AND is_ideas_open());

-- Update votes INSERT policy
DROP POLICY IF EXISTS "user_insert_votes" ON public.votes;
CREATE POLICY "user_insert_votes"
  ON public.votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_voting_open());

-- Update votes UPDATE policy
DROP POLICY IF EXISTS "user_update_own_votes" ON public.votes;
CREATE POLICY "user_update_own_votes"
  ON public.votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_voting_open());

-- ============================================================
-- 3. VALIDATE VOTE QUANTITY AT DB LEVEL
-- ============================================================

-- Positive quantity constraint
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_quantity_positive;
ALTER TABLE public.votes ADD CONSTRAINT votes_quantity_positive CHECK (quantity > 0 AND quantity <= 100);

-- Unique vote per user per idea
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_unique_user_idea;
DO $$
BEGIN
  -- Remove duplicates first if any exist
  DELETE FROM public.votes
  WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, idea_id) id
    FROM public.votes
    ORDER BY user_id, idea_id, updated_at DESC
  );
  
  ALTER TABLE public.votes ADD CONSTRAINT votes_unique_user_idea UNIQUE (user_id, idea_id);
END $$;
