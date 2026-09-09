-- ==============================================================================
-- SLOPMOVIE / KINETIC CINEMA - Initial Database Migration
-- Auto-deployable via Supabase GitHub Integration & Migrations
-- ==============================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. MOVIES TABLE
CREATE TABLE IF NOT EXISTS public.movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    tagline TEXT DEFAULT '',
    initial_plot TEXT DEFAULT '',
    master_arc_thread TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'streaming' CHECK (status IN ('streaming', 'completed', 'paused')),
    current_step INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL DEFAULT 100,
    bible JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_votes_cast INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

-- 2. MOVIE STEPS TABLE (100 sequential 15s steps)
CREATE TABLE IF NOT EXISTS public.movie_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id TEXT NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    synopsis TEXT NOT NULL,
    dialogue_snippet TEXT,
    voice_direction TEXT,
    visual_prompt TEXT NOT NULL,
    camera_motion_prompt TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER NOT NULL DEFAULT 15,
    voting_window_seconds INTEGER NOT NULL DEFAULT 10,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    selected_option TEXT CHECK (selected_option IN ('A', 'B')),
    was_random_pick BOOLEAN NOT NULL DEFAULT false,
    active_characters JSONB NOT NULL DEFAULT '[]'::jsonb,
    active_props JSONB NOT NULL DEFAULT '[]'::jsonb,
    new_dynamic_props JSONB NOT NULL DEFAULT '[]'::jsonb,
    reference_video_url TEXT,
    prop_reference_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    environment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_movie_step UNIQUE (movie_id, step_number)
);

-- 3. CHAT MESSAGES TABLE (Live audience chat)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    movie_id TEXT NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    text TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT false,
    voted_option TEXT CHECK (voted_option IN ('A', 'B')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. AUDIENCE VOTES TABLE (Per-step individual votes)
CREATE TABLE IF NOT EXISTS public.audience_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id TEXT NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    selected_option TEXT NOT NULL CHECK (selected_option IN ('A', 'B')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_step_vote UNIQUE (movie_id, step_number, user_id)
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_movies_status ON public.movies (status);
CREATE INDEX IF NOT EXISTS idx_movie_steps_movie_step ON public.movie_steps (movie_id, step_number);
CREATE INDEX IF NOT EXISTS idx_chat_messages_movie ON public.chat_messages (movie_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audience_votes_step ON public.audience_votes (movie_id, step_number);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_votes ENABLE ROW LEVEL SECURITY;

-- Movies: Public read, Service Role write
CREATE POLICY "Public can view movies"
    ON public.movies FOR SELECT
    USING (true);

CREATE POLICY "Service role full access on movies"
    ON public.movies FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Movie Steps: Public read, Service Role write
CREATE POLICY "Public can view movie steps"
    ON public.movie_steps FOR SELECT
    USING (true);

CREATE POLICY "Service role full access on movie steps"
    ON public.movie_steps FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Chat Messages: Public read, Public insert (anon/authenticated/service_role)
CREATE POLICY "Public can view chat messages"
    ON public.chat_messages FOR SELECT
    USING (true);

CREATE POLICY "Public and service role can insert chat messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (true);

-- Audience Votes: Public read, Public insert/update (anon/authenticated/service_role)
CREATE POLICY "Public can view audience votes"
    ON public.audience_votes FOR SELECT
    USING (true);

CREATE POLICY "Public and service role can insert votes"
    ON public.audience_votes FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public and service role can update votes"
    ON public.audience_votes FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- REALTIME SUBSCRIPTIONS
-- Enable realtime publication for interactive live streaming
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'movies'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.movies;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'movie_steps'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.movie_steps;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'audience_votes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.audience_votes;
    END IF;
END $$;
