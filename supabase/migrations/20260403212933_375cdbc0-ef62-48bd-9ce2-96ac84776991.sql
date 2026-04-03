
-- Add profile fields to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text;

-- Create cargo enum
DO $$ BEGIN
  CREATE TYPE public.group_cargo AS ENUM ('fundador', 'estrategista', 'construtor', 'closer', 'analista');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create group_members table
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo public.group_cargo NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_in_group UNIQUE (user_id),
  CONSTRAINT unique_cargo_per_group UNIQUE (group_id, cargo)
);

-- Enable RLS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "all_read_group_members"
ON public.group_members FOR SELECT
TO authenticated
USING (true);

-- Users can insert themselves
CREATE POLICY "user_insert_own_membership"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own membership
CREATE POLICY "user_delete_own_membership"
ON public.group_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "admin_manage_group_members"
ON public.group_members FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
