-- Add video_url2 column to movie_steps table for Cinematique dual-shot scenes
ALTER TABLE public.movie_steps ADD COLUMN IF NOT EXISTS video_url2 text;
