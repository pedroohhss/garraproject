
-- Add admin_score column to deliveries (0-100)
ALTER TABLE public.deliveries ADD COLUMN admin_score integer;

-- Ensure score is between 0 and 100
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_score_range CHECK (admin_score >= 0 AND admin_score <= 100);

-- Update the rep_update_own_delivery_content policy to prevent participants from changing admin_score
DROP POLICY IF EXISTS "rep_update_own_delivery_content" ON public.deliveries;
CREATE POLICY "rep_update_own_delivery_content"
  ON public.deliveries FOR UPDATE
  TO authenticated
  USING (auth.uid() = submitted_by)
  WITH CHECK (
    auth.uid() = submitted_by
    AND NOT (admin_feedback IS DISTINCT FROM (SELECT d.admin_feedback FROM deliveries d WHERE d.id = deliveries.id))
    AND NOT (admin_score IS DISTINCT FROM (SELECT d.admin_score FROM deliveries d WHERE d.id = deliveries.id))
  );
