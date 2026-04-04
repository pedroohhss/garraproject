-- Remove duplicate weeks keeping the active one or the first one for each number
DELETE FROM weeks WHERE id IN (
  '42c29fa5-008e-4694-b9a1-be9c77301c0f',
  'f4a788c1-5d44-44b7-9d86-7631a23d0981',
  '4cfd9f98-8c87-435e-9a97-471037e01dd0',
  '11331e67-3e8e-4b39-b49b-1bce4dcb0b85',
  '089bd0c4-50b9-41ab-a8e6-8bebea08e704',
  '3d753707-efa7-4e99-885f-43a5d63f3027'
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE weeks ADD CONSTRAINT weeks_number_unique UNIQUE (number);
