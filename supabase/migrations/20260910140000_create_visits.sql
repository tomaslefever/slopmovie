-- ==============================================================================
-- KINETIC CINEMA // Migration: Real Visit Tracking
-- One row per unique viewer per day; last_seen powers the live audience count.
-- ==============================================================================

create table if not exists public.visits (
  id uuid default gen_random_uuid() primary key,
  viewer_id text not null,
  visit_date date not null default current_date,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (viewer_id, visit_date)
);

create index if not exists idx_visits_date on public.visits(visit_date desc);
create index if not exists idx_visits_last_seen on public.visits(last_seen desc);

do $$
begin
  if not exists (select 1 from pg_publication_tables where tablename = 'visits' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.visits;
  end if;
end $$;

grant select on public.visits to anon, authenticated;
grant all on public.visits to service_role;

alter table public.visits enable row level security;

drop policy if exists "Public view visits" on public.visits;
create policy "Public view visits" on public.visits
  for select to anon, authenticated using (true);

drop policy if exists "Service role manage visits" on public.visits;
create policy "Service role manage visits" on public.visits
  for all to service_role using (true) with check (true);
