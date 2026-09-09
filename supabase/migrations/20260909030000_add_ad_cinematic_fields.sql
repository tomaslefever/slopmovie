-- ============================================================
-- Migration: Add cinematic continuity fields to immersive_ads
-- Created:   2026-09-09
--
-- Adds:
--   cinematic_prompt        — Screenplay script fed to fal.ai when generating
--                             the immersive ad clip. The model is instructed to
--                             continue the film world while weaving in the brand.
--   generated_ad_video_url  — URL of the fal.ai-generated ad clip. Stored so
--                             the clip can be re-played consistently across
--                             sessions without re-generating it.
-- ============================================================

ALTER TABLE immersive_ads
  ADD COLUMN IF NOT EXISTS cinematic_prompt       text,
  ADD COLUMN IF NOT EXISTS generated_ad_video_url text;

COMMENT ON COLUMN immersive_ads.cinematic_prompt IS
  'Screenplay/direction script passed to fal.ai minimax/h3-max when generating the immersive ad clip. Instructs the model to continue the film world visually and weave the brand in as a natural story element.';

COMMENT ON COLUMN immersive_ads.generated_ad_video_url IS
  'URL of the fal.ai-generated ad clip produced at commercial break time. If NULL the ad player falls back to the static video_url.';
