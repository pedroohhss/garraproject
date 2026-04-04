
-- 1. Fix deliveries RLS: restrict SELECT to own group members + admins
-- Drop the overly permissive read policy
DROP POLICY IF EXISTS "all_read_deliveries" ON public.deliveries;

-- Allow users to read only deliveries from their own group
CREATE POLICY "read_own_group_deliveries"
  ON public.deliveries FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR group_id = (SELECT group_id FROM public.users WHERE id = auth.uid())
  );

-- 2. Create a view for ranking that exposes only scores (no content)
CREATE OR REPLACE VIEW public.deliveries_scores
WITH (security_invoker = on)
AS
SELECT id, activity_id, group_id, admin_score
FROM public.deliveries;

-- 3. Fix storage: restrict delivery file reads to uploader + admin
DROP POLICY IF EXISTS "Authenticated users can read deliveries" ON storage.objects;

CREATE POLICY "owner_or_admin_read_deliveries"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'deliveres'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR is_admin(auth.uid())
    )
  );
