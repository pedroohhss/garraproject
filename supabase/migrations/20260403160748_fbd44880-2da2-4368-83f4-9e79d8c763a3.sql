
-- 1. Create security definer function to check admin role (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = _user_id AND role = 'admin'
  )
$$;

-- 2. Fix handle_new_user search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'participante'
  );
  RETURN new;
END;
$$;

-- 3. Fix users table policies (prevent role escalation, fix recursion)
DROP POLICY IF EXISTS "admin_full_users" ON public.users;
DROP POLICY IF EXISTS "users_read_own" ON public.users;

CREATE POLICY "admin_read_all_users" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "users_read_own" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "admin_manage_users" ON public.users
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "users_update_own_safe" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()));

-- 4. Fix activities policies
DROP POLICY IF EXISTS "admin_write_activities" ON public.activities;
CREATE POLICY "admin_write_activities" ON public.activities
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 5. Fix challenge_config policies
DROP POLICY IF EXISTS "admin_write_config" ON public.challenge_config;
CREATE POLICY "admin_write_config" ON public.challenge_config
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 6. Fix checklist_criteria policies
DROP POLICY IF EXISTS "admin_write_criteria" ON public.checklist_criteria;
CREATE POLICY "admin_write_criteria" ON public.checklist_criteria
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 7. Fix materials policies
DROP POLICY IF EXISTS "admin_write_materials" ON public.materials;
CREATE POLICY "admin_write_materials" ON public.materials
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 8. Fix weeks policies
DROP POLICY IF EXISTS "admin_write_weeks" ON public.weeks;
CREATE POLICY "admin_write_weeks" ON public.weeks
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 9. Fix votes policies (replace ALL with specific operations)
DROP POLICY IF EXISTS "user_manage_votes" ON public.votes;

CREATE POLICY "user_insert_votes" ON public.votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_delete_votes" ON public.votes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 10. Storage RLS for deliveres bucket
CREATE POLICY "Authenticated users can read deliveries"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deliveres');

CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deliveres' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'deliveres' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'deliveres' AND auth.uid()::text = (storage.foldername(name))[1]);
