-- ==============================================================================
-- KINETIC CINEMA // Migration: Realtime Cinema State & Viewer Preferences
-- Persists live playback state, viewer settings, and step votes in Supabase
-- ==============================================================================

-- 1. CINEMA LIVE STATE TABLE
create table if not exists public.cinema_state (
  id text primary key default 'active_session',
  movie_id text references public.movies(id) on delete cascade,
  phase text not null default 'PLAYING' check (phase in ('PLAYING', 'VOTING', 'GENERATING', 'COMMERCIAL_BREAK')),
  time_remaining int not null default 15,
  current_step int not null default 1,
  total_audience int not null default 142,
  votes_a int not null default 0,
  votes_b int not null default 0,
  is_live boolean not null default true,
  is_paused boolean not null default false,
  is_generation_paused boolean not null default false,
  active_ad_id text references public.immersive_ads(id) on delete set null,
  ads_config jsonb not null default '{"autoAdsEnabled": true, "adIntervalSteps": 5, "lastAdStep": 0}'::jsonb,
  selected_option text check (selected_option in ('A', 'B')),
  was_random_pick boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 2. VIEWER PREFERENCES TABLE (Subtitles, language, persistent in Supabase)
create table if not exists public.viewer_preferences (
  user_id text primary key,
  subtitles_enabled boolean not null default true,
  subtitle_language text not null default 'en' check (subtitle_language in ('en', 'es')),
  last_voted_step int,
  voted_option text check (voted_option in ('A', 'B')),
  nickname text,
  updated_at timestamptz not null default now()
);

-- 3. STEP VOTES TABLE (Audience decision votes per step)
create table if not exists public.step_votes (
  id uuid default gen_random_uuid() primary key,
  movie_id text not null references public.movies(id) on delete cascade,
  step_number int not null,
  user_id text not null,
  user_name text,
  option_id text not null check (option_id in ('A', 'B')),
  created_at timestamptz not null default now(),
  unique (movie_id, step_number, user_id)
);

-- 4. PERFORMANCE INDEXES
create index if not exists idx_step_votes_lookup on public.step_votes(movie_id, step_number, user_id);
create index if not exists idx_cinema_state_movie on public.cinema_state(movie_id);

-- 5. REALTIME REPLICATION PUBLICATION
do $$
begin
  if not exists (select 1 from pg_publication_tables where tablename = 'cinema_state' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.cinema_state;
  end if;
  if not exists (select 1 from pg_publication_tables where tablename = 'viewer_preferences' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.viewer_preferences;
  end if;
  if not exists (select 1 from pg_publication_tables where tablename = 'step_votes' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.step_votes;
  end if;
end $$;

-- 6. DATA API GRANTS
grant select on public.cinema_state to anon, authenticated;
grant all on public.cinema_state to service_role;

grant select, insert, update on public.viewer_preferences to anon, authenticated;
grant all on public.viewer_preferences to service_role;

grant select, insert on public.step_votes to anon, authenticated;
grant all on public.step_votes to service_role;

-- 7. ROW LEVEL SECURITY (RLS)
alter table public.cinema_state enable row level security;
alter table public.viewer_preferences enable row level security;
alter table public.step_votes enable row level security;

-- Policies
drop policy if exists "Public view cinema state" on public.cinema_state;
create policy "Public view cinema state" on public.cinema_state
  for select to anon, authenticated using (true);

drop policy if exists "Service role manage cinema state" on public.cinema_state;
create policy "Service role manage cinema state" on public.cinema_state
  for all to service_role using (true) with check (true);

drop policy if exists "Public view viewer preferences" on public.viewer_preferences;
create policy "Public view viewer preferences" on public.viewer_preferences
  for select to anon, authenticated using (true);

drop policy if exists "Public insert/update viewer preferences" on public.viewer_preferences;
create policy "Public insert/update viewer preferences" on public.viewer_preferences
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "Service role manage viewer preferences" on public.viewer_preferences;
create policy "Service role manage viewer preferences" on public.viewer_preferences
  for all to service_role using (true) with check (true);

drop policy if exists "Public view step votes" on public.step_votes;
create policy "Public view step votes" on public.step_votes
  for select to anon, authenticated using (true);

drop policy if exists "Public insert step votes" on public.step_votes;
create policy "Public insert step votes" on public.step_votes
  for insert to anon, authenticated with check (true);

drop policy if exists "Service role manage step votes" on public.step_votes;
create policy "Service role manage step votes" on public.step_votes
  for all to service_role using (true) with check (true);
