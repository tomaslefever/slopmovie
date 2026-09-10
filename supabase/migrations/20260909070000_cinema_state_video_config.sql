-- ==============================================================================
-- KINETIC CINEMA // Migration: Cinema State Video Config
-- Persists the director-selected generative video model and output resolution
-- in cinema_state (the primary live-state source of truth) so they survive
-- restarts, worker rotations and movie changes.
-- ==============================================================================

alter table public.cinema_state
  add column if not exists video_model text,
  add column if not exists video_resolution text;

-- Ensure RLS allows service_role to manage all columns
grant all on public.cinema_state to service_role;
grant select on public.cinema_state to anon, authenticated;
