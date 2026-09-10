-- ==============================================================================
-- KINETIC CINEMA // Migration: Cinema State Admin Preferences Columns
-- Persists director-chosen video model/resolution and blockbuster vote state
-- directly on cinema_state so multi-process reads see them instantly.
-- ==============================================================================

alter table public.cinema_state
  add column if not exists video_model text,
  add column if not exists video_resolution text,
  add column if not exists blockbuster_candidates jsonb not null default '[]'::jsonb,
  add column if not exists blockbuster_vote_counts jsonb not null default '{"A":0,"B":0,"C":0,"D":0}'::jsonb;

grant all on public.cinema_state to service_role;
grant select on public.cinema_state to anon, authenticated;
