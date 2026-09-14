-- ==============================================================================
-- KINETIC CINEMA // Cleanup, Deduplication and Step Integrity Migration
-- 1. Permite NULL en movie_steps.video_url para steps sin video generado.
-- 2. Elimina duplicados en public.movie_steps.video_url manteniendo los más antiguos.
-- 3. Elimina steps que tengan video_url vacío o NULL.
-- 4. Elimina películas que no tengan al menos un step con video_url no vacío.
-- ==============================================================================

-- 1. Asegurar que video_url permita NULL para evitar video_urls forzadas
ALTER TABLE public.movie_steps ALTER COLUMN video_url DROP NOT NULL;

-- 2. Eliminar duplicados en public.movie_steps.video_url manteniendo el registro más antiguo
WITH ranked_steps AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY video_url
           ORDER BY created_at ASC, id ASC
         ) AS rnum
  FROM public.movie_steps
  WHERE video_url IS NOT NULL AND TRIM(video_url) <> ''
)
DELETE FROM public.movie_steps
WHERE id IN (
  SELECT id
  FROM ranked_steps
  WHERE rnum > 1
);

-- 3. Eliminar todos los steps que tengan video_url vacío o NULL
DELETE FROM public.movie_steps
WHERE video_url IS NULL OR TRIM(video_url) = '';

-- 4. Eliminar todas las películas que no tengan al menos un step con video_url válido
DELETE FROM public.movies m
WHERE NOT EXISTS (
  SELECT 1
  FROM public.movie_steps s
  WHERE s.movie_id = m.id
    AND s.video_url IS NOT NULL
    AND TRIM(s.video_url) <> ''
);
