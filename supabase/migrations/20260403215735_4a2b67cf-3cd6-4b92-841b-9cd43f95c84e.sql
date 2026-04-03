
-- 1. Fix deliveries: restrict participant updates so they can't overwrite admin_feedback
DROP POLICY IF EXISTS "rep_update_delivery" ON public.deliveries;

CREATE POLICY "rep_update_own_delivery_content"
ON public.deliveries FOR UPDATE
TO authenticated
USING (auth.uid() = submitted_by)
WITH CHECK (
  auth.uid() = submitted_by
  AND admin_feedback IS NOT DISTINCT FROM (SELECT d.admin_feedback FROM public.deliveries d WHERE d.id = deliveries.id)
);

-- Admin can update any delivery (including admin_feedback)
CREATE POLICY "admin_update_delivery"
ON public.deliveries FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 2. Make deliveres bucket private
UPDATE storage.buckets SET public = false WHERE id = 'deliveres';
