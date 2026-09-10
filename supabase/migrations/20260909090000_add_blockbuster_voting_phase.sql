-- ==============================================================================
-- KINETIC CINEMA // Migration: Next-Blockbuster Audience Voting Phase
-- Adds BLOCKBUSTER_VOTING (30s, 4 candidate films) to the cinema_state phase enum
-- ==============================================================================

alter table public.cinema_state drop constraint if exists cinema_state_phase_check;
alter table public.cinema_state add constraint cinema_state_phase_check
  check (phase in ('PLAYING', 'VOTING', 'GENERATING', 'COMMERCIAL_BREAK', 'BLOCKBUSTER_VOTING'));

grant all on public.cinema_state to service_role;
grant select on public.cinema_state to anon, authenticated;
