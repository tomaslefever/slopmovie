-- ==============================================================================
-- KINETIC CINEMA // Migration: Comment Upvoting & Top Voted Comments Persistence
-- Allows viewers with session UUIDs to upvote comments and persists top comments
-- ==============================================================================

-- 1. Add votes_count column to chat_messages if not exists
alter table public.chat_messages add column if not exists votes_count int not null default 0;

-- 2. Create comment_votes table (1 vote per session UUID per comment)
create table if not exists public.comment_votes (
  id uuid default gen_random_uuid() primary key,
  comment_id text not null references public.chat_messages(id) on delete cascade,
  user_id text not null,
  movie_id text not null references public.movies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

-- 3. Create top_voted_comments table (persisted table of highest voted audience ideas)
create table if not exists public.top_voted_comments (
  id text primary key, -- identical to comment_id
  comment_id text not null,
  movie_id text not null references public.movies(id) on delete cascade,
  user_id text not null,
  user_name text not null,
  text text not null,
  votes_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Indexes for rapid leaderboard queries
create index if not exists idx_comment_votes_lookup on public.comment_votes(comment_id, user_id);
create index if not exists idx_top_voted_movie on public.top_voted_comments(movie_id, votes_count desc);
create index if not exists idx_chat_messages_votes on public.chat_messages(movie_id, votes_count desc);

-- 5. Enable Realtime Replication
do $$
begin
  if not exists (select 1 from pg_publication_tables where tablename = 'comment_votes' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.comment_votes;
  end if;
  if not exists (select 1 from pg_publication_tables where tablename = 'top_voted_comments' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.top_voted_comments;
  end if;
end $$;

-- 6. Grants
grant select, insert, delete on public.comment_votes to anon, authenticated;
grant all on public.comment_votes to service_role;

grant select, insert, update, delete on public.top_voted_comments to anon, authenticated;
grant all on public.top_voted_comments to service_role;

-- 7. Row Level Security
alter table public.comment_votes enable row level security;
alter table public.top_voted_comments enable row level security;

drop policy if exists "Public view comment votes" on public.comment_votes;
create policy "Public view comment votes" on public.comment_votes
  for select to anon, authenticated using (true);

drop policy if exists "Public insert comment votes" on public.comment_votes;
create policy "Public insert comment votes" on public.comment_votes
  for insert to anon, authenticated with check (true);

drop policy if exists "Public delete own comment votes" on public.comment_votes;
create policy "Public delete own comment votes" on public.comment_votes
  for delete to anon, authenticated using (true);

drop policy if exists "Service role all comment votes" on public.comment_votes;
create policy "Service role all comment votes" on public.comment_votes
  for all to service_role using (true) with check (true);

drop policy if exists "Public view top comments" on public.top_voted_comments;
create policy "Public view top comments" on public.top_voted_comments
  for select to anon, authenticated using (true);

drop policy if exists "Public manage top comments" on public.top_voted_comments;
create policy "Public manage top comments" on public.top_voted_comments
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "Service role all top comments" on public.top_voted_comments;
create policy "Service role all top comments" on public.top_voted_comments
  for all to service_role using (true) with check (true);
