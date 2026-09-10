-- ==============================================================================
-- KINETIC CINEMA // Migration: Blockbuster Vote Persistence
-- Persists each viewer's next-blockbuster candidate vote in Postgres so the
-- 30s audience vote survives restarts, with realtime replication for live UI.
-- ==============================================================================

create table if not exists public.blockbuster_votes (
  id uuid default gen_random_uuid() primary key,
  movie_id text not null references public.movies(id) on delete cascade,
  user_id text not null,
  candidate_id text not null check (candidate_id in ('A', 'B', 'C', 'D')),
  created_at timestamptz not null default now(),
  unique (movie_id, user_id)
);

create index if not exists idx_blockbuster_votes_lookup on public.blockbuster_votes(movie_id, candidate_id);

-- Realtime replication
do $$
begin
  if not exists (select 1 from pg_publication_tables where tablename = 'blockbuster_votes' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.blockbuster_votes;
  end if;
end $$;

-- Grants & RLS
grant select, insert, update on public.blockbuster_votes to anon, authenticated;
grant all on public.blockbuster_votes to service_role;

alter table public.blockbuster_votes enable row level security;

drop policy if exists "Public view blockbuster votes" on public.blockbuster_votes;
create policy "Public view blockbuster votes" on public.blockbuster_votes
  for select to anon, authenticated using (true);

drop policy if exists "Public vote blockbuster" on public.blockbuster_votes;
create policy "Public vote blockbuster" on public.blockbuster_votes
  for insert to anon, authenticated with check (true);

drop policy if exists "Public update own blockbuster vote" on public.blockbuster_votes;
create policy "Public update own blockbuster vote" on public.blockbuster_votes
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "Service role manage blockbuster votes" on public.blockbuster_votes;
create policy "Service role manage blockbuster votes" on public.blockbuster_votes
  for all to service_role using (true) with check (true);
