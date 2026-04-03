
-- Add new profile fields to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sexo text,
  ADD COLUMN IF NOT EXISTS idade integer,
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS trabalho_estudo text,
  ADD COLUMN IF NOT EXISTS habilidades text,
  ADD COLUMN IF NOT EXISTS objetivos_curto_prazo text,
  ADD COLUMN IF NOT EXISTS objetivos_longo_prazo text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS cargos_aptos text[];

-- Update the public view to include profile fields (no email exposed)
CREATE OR REPLACE VIEW public.users_public
WITH (security_invoker = on) AS
SELECT
  id, full_name, bio, avatar_url, linkedin_url,
  sexo, idade, estado_civil, estado, cidade,
  trabalho_estudo, habilidades,
  objetivos_curto_prazo, objetivos_longo_prazo,
  instagram_url, cargos_aptos, created_at
FROM public.users;
