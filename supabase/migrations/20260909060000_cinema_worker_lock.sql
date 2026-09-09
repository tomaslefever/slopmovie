-- ==============================================================================
-- KINETIC CINEMA // Migration: Cinema Worker Lock & Timing Columns
-- Ensures a single background worker controls the live cinema state
-- ==============================================================================

alter table public.cinema_state 
  add column if not exists worker_id text,
  add column if not exists worker_heartbeat timestamptz,
  add column if not exists phase_started_at timestamptz default now(),
  add column if not exists phase_ends_at timestamptz default (now() + interval '15 seconds'),
  add column if not exists phase_duration int default 15;

-- Ensure RLS allows service_role to manage all columns
grant all on public.cinema_state to service_role;
grant select on public.cinema_state to anon, authenticated;
