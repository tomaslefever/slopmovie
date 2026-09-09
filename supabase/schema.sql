-- ==============================================================================
-- KINETIC CINEMA // Supabase Production Database Schema & Realtime Replication
-- Project Ref: bqaivpmgfntphfggbitz
-- Compatible with Supabase Postgres 15+ / PostgREST / Realtime
-- ==============================================================================

-- 0. EXTENSIONS
create extension if not exists "pgcrypto";

-- 1. MOVIES TABLE (Master Film Records)
create table if not exists public.movies (
  id text primary key,
  title text not null,
  genre text not null default 'Sci-Fi / Thriller',
  tagline text default '',
  initial_plot text not null default '',
  master_arc_thread text not null default '',
  status text not null default 'streaming' check (status in ('streaming', 'completed', 'paused')),
  current_step int not null default 1,
  total_steps int not null default 100,
  bible jsonb not null default '{}'::jsonb,
  total_votes_cast int not null default 0,
  final_summary text,
  final_synopsis text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 2. MOVIE STEPS TABLE (Sequential 15s Clips & Decision Branches)
create table if not exists public.movie_steps (
  id uuid default gen_random_uuid() primary key,
  movie_id text not null references public.movies(id) on delete cascade,
  step_number int not null,
  title text not null,
  synopsis text not null,
  dialogue_snippet text,
  voice_direction text,
  visual_prompt text not null,
  camera_motion_prompt text,
  video_url text not null,
  thumbnail_url text,
  duration int not null default 15,
  voting_window_seconds int not null default 10,
  options jsonb not null default '[]'::jsonb,
  selected_option text check (selected_option in ('A', 'B')),
  was_random_pick boolean not null default false,
  active_characters jsonb not null default '[]'::jsonb,
  active_props jsonb not null default '[]'::jsonb,
  new_character jsonb,
  new_prop jsonb,
  reference_video_url text,
  prop_reference_images jsonb not null default '[]'::jsonb,
  subtitles jsonb not null default '[]'::jsonb,
  environment text default '',
  created_at timestamptz not null default now(),
  unique (movie_id, step_number)
);

-- 3. PROPS TABLE (Persistent consistency assets created on-the-fly with new characters)
create table if not exists public.props (
  id text primary key,
  movie_id text not null references public.movies(id) on delete cascade,
  name text not null,
  description text default '',
  visual_appearance text not null,
  narrative_significance text default '',
  image_url text,
  step_introduced int not null default 1,
  owner_character_id text,
  owner_character_name text,
  icon text default 'box',
  created_at timestamptz not null default now()
);

-- 4. CHAT MESSAGES TABLE (Live audience chat & system announcements)
create table if not exists public.chat_messages (
  id text primary key,
  movie_id text not null references public.movies(id) on delete cascade,
  user_id text not null,
  user_name text not null,
  user_avatar text,
  text text not null,
  is_system boolean not null default false,
  voted_option text check (voted_option in ('A', 'B')),
  created_at timestamptz not null default now()
);

-- 5. IMMERSIVE ADS TABLE
create table if not exists public.immersive_ads (
  id text primary key,
  movie_id text references public.movies(id) on delete set null,
  brand_name text not null,
  title text not null,
  tagline text default '',
  description text default '',
  type text not null default 'commercial_break' check (type in ('commercial_break', 'in_scene_overlay')),
  video_url text,
  image_url text,
  cta_text text not null default 'Explore',
  cta_url text,
  perk_reward text default '+50 Audience Votes',
  duration int not null default 10,
  is_active boolean not null default true,
  frequency_steps int default 5,
  step_trigger int,
  impressions int not null default 0,
  clicks int not null default 0,
  cinematic_prompt text,
  generated_ad_video_url text,
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- 6. PERFORMANCE INDEXES
-- ==============================================================================
create index if not exists idx_movies_status on public.movies(status);
create index if not exists idx_movie_steps_movie_step on public.movie_steps(movie_id, step_number);
create index if not exists idx_props_movie on public.props(movie_id);
create index if not exists idx_chat_movie on public.chat_messages(movie_id, created_at desc);
create index if not exists idx_immersive_ads_active on public.immersive_ads(is_active);
create index if not exists idx_immersive_ads_movie on public.immersive_ads(movie_id);

-- ==============================================================================
-- 7. DATA API GRANTS (PostgREST Role Permissions)
-- ==============================================================================
grant usage on schema public to anon, authenticated, service_role;

grant select on public.movies to anon, authenticated;
grant all on public.movies to service_role;

grant select on public.movie_steps to anon, authenticated;
grant all on public.movie_steps to service_role;

grant select on public.props to anon, authenticated;
grant all on public.props to service_role;

grant select, insert on public.chat_messages to anon, authenticated;
grant all on public.chat_messages to service_role;

grant select on public.immersive_ads to anon, authenticated;
grant all on public.immersive_ads to service_role;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.movies enable row level security;
alter table public.movie_steps enable row level security;
alter table public.props enable row level security;
alter table public.chat_messages enable row level security;
alter table public.immersive_ads enable row level security;

-- Drop existing policies if any to allow safe re-runs
drop policy if exists "Public view movies" on public.movies;
drop policy if exists "Service role manage movies" on public.movies;
drop policy if exists "Public view movie steps" on public.movie_steps;
drop policy if exists "Service role manage movie steps" on public.movie_steps;
drop policy if exists "Public view props" on public.props;
drop policy if exists "Service role manage props" on public.props;
drop policy if exists "Public view chat" on public.chat_messages;
drop policy if exists "Audience insert chat" on public.chat_messages;
drop policy if exists "Service role manage chat" on public.chat_messages;
drop policy if exists "Public view ads" on public.immersive_ads;
drop policy if exists "Service role manage ads" on public.immersive_ads;

-- Movies Policies
create policy "Public view movies" on public.movies
  for select to anon, authenticated using (true);
create policy "Service role manage movies" on public.movies
  for all to service_role using (true) with check (true);

-- Movie Steps Policies
create policy "Public view movie steps" on public.movie_steps
  for select to anon, authenticated using (true);
create policy "Service role manage movie steps" on public.movie_steps
  for all to service_role using (true) with check (true);

-- Props Policies
create policy "Public view props" on public.props
  for select to anon, authenticated using (true);
create policy "Service role manage props" on public.props
  for all to service_role using (true) with check (true);

-- Chat Messages Policies
create policy "Public view chat" on public.chat_messages
  for select to anon, authenticated using (true);
create policy "Audience insert chat" on public.chat_messages
  for insert to anon, authenticated with check (true);
create policy "Service role manage chat" on public.chat_messages
  for all to service_role using (true) with check (true);

-- Immersive Ads Policies
create policy "Public view ads" on public.immersive_ads
  for select to anon, authenticated using (true);
create policy "Service role manage ads" on public.immersive_ads
  for all to service_role using (true) with check (true);


-- ==============================================================================
-- 9. REALTIME CINEMA STATE & VIEWER PREFERENCES
-- ==============================================================================

-- 9.1. Cinema Live State Table (Single live broadcast row)
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
  worker_id text,
  worker_heartbeat timestamptz,
  phase_started_at timestamptz default now(),
  phase_ends_at timestamptz default (now() + interval '15 seconds'),
  phase_duration int default 15,
  updated_at timestamptz not null default now()
);

-- 9.2. Viewer Preferences Table (Subtitles, language, zero-browser-storage)
create table if not exists public.viewer_preferences (
  user_id text primary key,
  subtitles_enabled boolean not null default true,
  subtitle_language text not null default 'en' check (subtitle_language in ('en', 'es')),
  last_voted_step int,
  voted_option text check (voted_option in ('A', 'B')),
  nickname text,
  updated_at timestamptz not null default now()
);

-- 9.3. Step Votes Table (Persistent audience votes)
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

create index if not exists idx_step_votes_lookup on public.step_votes(movie_id, step_number, user_id);
create index if not exists idx_cinema_state_movie on public.cinema_state(movie_id);

grant select on public.cinema_state to anon, authenticated;
grant all on public.cinema_state to service_role;

grant select, insert, update on public.viewer_preferences to anon, authenticated;
grant all on public.viewer_preferences to service_role;

grant select, insert on public.step_votes to anon, authenticated;
grant all on public.step_votes to service_role;

alter table public.cinema_state enable row level security;
alter table public.viewer_preferences enable row level security;
alter table public.step_votes enable row level security;

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

-- 10. COMMENT VOTES & TOP VOTED COMMENTS
alter table public.chat_messages add column if not exists votes_count int not null default 0;

create table if not exists public.comment_votes (
  id uuid default gen_random_uuid() primary key,
  comment_id text not null references public.chat_messages(id) on delete cascade,
  user_id text not null,
  movie_id text not null references public.movies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create table if not exists public.top_voted_comments (
  id text primary key,
  comment_id text not null,
  movie_id text not null references public.movies(id) on delete cascade,
  user_id text not null,
  user_name text not null,
  text text not null,
  votes_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comment_votes_lookup on public.comment_votes(comment_id, user_id);
create index if not exists idx_top_voted_movie on public.top_voted_comments(movie_id, votes_count desc);
create index if not exists idx_chat_messages_votes on public.chat_messages(movie_id, votes_count desc);

grant select, insert, delete on public.comment_votes to anon, authenticated;
grant all on public.comment_votes to service_role;
grant select, insert, update, delete on public.top_voted_comments to anon, authenticated;
grant all on public.top_voted_comments to service_role;

alter table public.comment_votes enable row level security;
alter table public.top_voted_comments enable row level security;

drop policy if exists "Public view comment votes" on public.comment_votes;
create policy "Public view comment votes" on public.comment_votes for select to anon, authenticated using (true);
drop policy if exists "Public insert comment votes" on public.comment_votes;
create policy "Public insert comment votes" on public.comment_votes for insert to anon, authenticated with check (true);
drop policy if exists "Public delete own comment votes" on public.comment_votes;
create policy "Public delete own comment votes" on public.comment_votes for delete to anon, authenticated using (true);
drop policy if exists "Service role all comment votes" on public.comment_votes;
create policy "Service role all comment votes" on public.comment_votes for all to service_role using (true) with check (true);

drop policy if exists "Public view top comments" on public.top_voted_comments;
create policy "Public view top comments" on public.top_voted_comments for select to anon, authenticated using (true);
drop policy if exists "Public manage top comments" on public.top_voted_comments;
create policy "Public manage top comments" on public.top_voted_comments for all to anon, authenticated using (true) with check (true);
drop policy if exists "Service role all top comments" on public.top_voted_comments;
create policy "Service role all top comments" on public.top_voted_comments for all to service_role using (true) with check (true);

-- ==============================================================================
-- 11. SUPABASE REALTIME REPLICATION
-- Adds all interactive tables to the realtime publication so web clients receive live events.
-- Safe check ensuring tables exist (to_regclass) and aren't already published.
-- ==============================================================================
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if to_regclass('public.movies') is not null and not exists (select 1 from pg_publication_tables where tablename = 'movies' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.movies;
  end if;

  if to_regclass('public.movie_steps') is not null and not exists (select 1 from pg_publication_tables where tablename = 'movie_steps' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.movie_steps;
  end if;

  if to_regclass('public.props') is not null and not exists (select 1 from pg_publication_tables where tablename = 'props' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.props;
  end if;

  if to_regclass('public.chat_messages') is not null and not exists (select 1 from pg_publication_tables where tablename = 'chat_messages' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if to_regclass('public.immersive_ads') is not null and not exists (select 1 from pg_publication_tables where tablename = 'immersive_ads' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.immersive_ads;
  end if;

  if to_regclass('public.cinema_state') is not null and not exists (select 1 from pg_publication_tables where tablename = 'cinema_state' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.cinema_state;
  end if;

  if to_regclass('public.viewer_preferences') is not null and not exists (select 1 from pg_publication_tables where tablename = 'viewer_preferences' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.viewer_preferences;
  end if;

  if to_regclass('public.step_votes') is not null and not exists (select 1 from pg_publication_tables where tablename = 'step_votes' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.step_votes;
  end if;

  if to_regclass('public.comment_votes') is not null and not exists (select 1 from pg_publication_tables where tablename = 'comment_votes' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.comment_votes;
  end if;

  if to_regclass('public.top_voted_comments') is not null and not exists (select 1 from pg_publication_tables where tablename = 'top_voted_comments' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.top_voted_comments;
  end if;
end $$;
