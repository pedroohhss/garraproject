
-- votes -> users
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_user_id_fkey;
ALTER TABLE public.votes ADD CONSTRAINT votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- deliveries -> users
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_submitted_by_fkey;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE CASCADE;

-- checklist_entries -> users
ALTER TABLE public.checklist_entries DROP CONSTRAINT IF EXISTS checklist_entries_submitted_by_fkey;
ALTER TABLE public.checklist_entries ADD CONSTRAINT checklist_entries_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE CASCADE;

-- ideas -> users
ALTER TABLE public.ideas DROP CONSTRAINT IF EXISTS ideas_created_by_fkey;
ALTER TABLE public.ideas ADD CONSTRAINT ideas_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

-- groups leader/representative -> users
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_leader_id_fkey;
ALTER TABLE public.groups ADD CONSTRAINT groups_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_representative_id_fkey;
ALTER TABLE public.groups ADD CONSTRAINT groups_representative_id_fkey FOREIGN KEY (representative_id) REFERENCES public.users(id) ON DELETE SET NULL;
