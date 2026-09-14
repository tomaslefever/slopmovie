import { loadAllValidVideoUrlsFromDb } from './supabase/db';
import { MovieStep } from '@/types/cinema';

/**
 * Pool en memoria de video_urls válidas de public.movie_steps.
 * Se precargan todas las URLs al comenzar los pasos para resolver al vuelo
 * cualquier step que no tenga video generado.
 */
let cachedVideoUrls: string[] = [];
let isLoaded = false;
let loadPromise: Promise<string[]> | null = null;

/**
 * Carga todas las video_url no vacías de public.movie_steps en memoria.
 * Deduplica y asegura que solo contenga URLs válidas.
 */
export async function loadStepVideoUrlsPool(forceRefresh = false): Promise<string[]> {
  if (isLoaded && !forceRefresh && cachedVideoUrls.length > 0) {
    return cachedVideoUrls;
  }

  if (loadPromise && !forceRefresh) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const urls = await loadAllValidVideoUrlsFromDb();
      if (urls.length > 0) {
        cachedVideoUrls = Array.from(new Set(urls.filter(u => typeof u === 'string' && u.trim() !== '')));
        isLoaded = true;
      }
      return cachedVideoUrls;
    } catch (err) {
      console.warn('[VideoPool] Error al cargar URLs de public.movie_steps:', err);
      return cachedVideoUrls;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Obtiene una URL de video al azar del archivo de public.movie_steps.
 * Si el pool aún no ha terminado de cargar, devuelve null.
 */
export function getRandomMovieStepVideoUrl(): string | null {
  if (cachedVideoUrls.length === 0) return null;
  const index = Math.floor(Math.random() * cachedVideoUrls.length);
  return cachedVideoUrls[index];
}

/**
 * Registra una nueva URL de video recién generada por IA en el pool en caliente.
 */
export function registerGeneratedVideoUrlInPool(url: string | null | undefined): void {
  if (url && typeof url === 'string' && url.trim() !== '' && !cachedVideoUrls.includes(url.trim())) {
    cachedVideoUrls.push(url.trim());
  }
}

/**
 * Resuelve la URL para visualización/reproducción AL VUELO:
 * - Si el step tiene su propia video_url generada válida, la respeta.
 * - Si no tiene video generado (vacío o nulo), selecciona una URL al azar de public.movie_steps.
 * - No modifica el registro original del step en la base de datos.
 */
export function resolveStepPlaybackUrl(
  step: Pick<MovieStep, 'videoUrl'> | null | undefined,
  fallbackUrl?: string
): string {
  if (step?.videoUrl && typeof step.videoUrl === 'string' && step.videoUrl.trim() !== '' && !step.videoUrl.startsWith('/videos/')) {
    return step.videoUrl;
  }

  // Obtener URL al azar del pool de public.movie_steps
  const randomUrl = getRandomMovieStepVideoUrl();
  if (randomUrl) {
    return randomUrl;
  }

  return fallbackUrl || "";
}

/**
 * Obtiene una copia del pool actual de URLs en memoria.
 */
export function getLoadedVideoPool(): string[] {
  return [...cachedVideoUrls];
}
