-- Allow admin to update any idea
CREATE POLICY "admin_update_ideas"
ON public.ideas
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Allow admin to delete any idea
CREATE POLICY "admin_delete_ideas"
ON public.ideas
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));