-- ========================================================
-- KINETIC CINEMA // Tabla de Anuncios Inmersivos (Immersive Ads)
-- ========================================================

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
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_immersive_ads_active on public.immersive_ads(is_active);
create index if not exists idx_immersive_ads_movie on public.immersive_ads(movie_id);

-- RLS
alter table public.immersive_ads enable row level security;

create policy "Lectura pública de anuncios" on public.immersive_ads for select to anon, authenticated using (true);
create policy "Escritura de anuncios" on public.immersive_ads for all to anon, authenticated using (true) with check (true);

-- Agregar a publicación Realtime si existe
do $$
begin
  if not exists (select 1 from pg_publication_tables where tablename = 'immersive_ads' and pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.immersive_ads;
  end if;
end $$;
