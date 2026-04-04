
-- Allow admin to manage groups (insert, update, delete)
CREATE POLICY "admin_manage_groups"
ON public.groups FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
