-- ==============================================================================
-- KINETIC CINEMA // Migration: Fix Cinema State Column & RLS Policies
-- Adds blockbuster_winner column to cinema_state and grants all operations
-- ==============================================================================

-- 1. Add blockbuster_winner to cinema_state
alter table public.cinema_state add column if not exists blockbuster_winner jsonb;

-- 2. Grant permissions to anon, authenticated and service_role
grant all on public.cinema_state to anon, authenticated, service_role;
grant all on public.movies to anon, authenticated, service_role;
grant all on public.movie_steps to anon, authenticated, service_role;
grant all on public.props to anon, authenticated, service_role;
grant all on public.chat_messages to anon, authenticated, service_role;
grant all on public.immersive_ads to anon, authenticated, service_role;
grant all on public.step_votes to anon, authenticated, service_role;
grant all on public.blockbuster_votes to anon, authenticated, service_role;
grant all on public.viewer_preferences to anon, authenticated, service_role;
grant all on public.visits to anon, authenticated, service_role;
grant all on public.comment_votes to anon, authenticated, service_role;
grant all on public.top_voted_comments to anon, authenticated, service_role;

-- 3. Update RLS policies for cinema_state
drop policy if exists  Public all cinema state on public.cinema_state;
create policy Public all cinema state on public.cinema_state
  for all to anon, authenticated using (true) with check (true);

-- 4. Update RLS policies for movies
drop policy if exists Public all movies on public.movies;
create policy Public all movies on public.movies
  for all to anon, authenticated using (true) with check (true);

-- 5. Update RLS policies for movie_steps
drop policy if exists Public all movie steps on public.movie_steps;
create policy Public all movie steps on public.movie_steps
  for all to anon, authenticated using (true) with check (true);

-- 6. Update RLS policies for props
drop policy if exists Public all props on public.props;
create policy Public all props on public.props
  for all to anon, authenticated using (true) with check (true);

-- 7. Update RLS policies for blockbuster_votes
drop policy if exists Public all blockbuster votes on public.blockbuster_votes;
create policy Public all blockbuster votes on public.blockbuster_votes
  for all to anon, authenticated using (true) with check (true);
