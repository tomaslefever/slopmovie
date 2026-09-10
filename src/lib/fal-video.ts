import { fal } from "@fal-ai/client";

// High-fidelity cinematic preview clips for mock/demo mode
export const CINEMATIC_MOCK_VIDEOS = [
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    poster: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80",
    name: "Cyberpunk Rain Alleyway"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
    name: "Neural Core Facility"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    poster: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop&q=80",
    name: "Tactical Chase"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    poster: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
    name: "High Altitude Monorail"
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    poster: "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=1200&auto=format&fit=crop&q=80",
    name: "The Neon Spire Infiltration"
  }
];

export function isFalGenerationPaused(): boolean {
  if (process.env.PAUSE_VIDEO_GENERATION === 'true') return true;
  if (typeof globalThis !== 'undefined' && Boolean((globalThis as any).__isCinemaGenerationPaused)) return true;
  return false;
}

// Registro de modelos generativos de video disponibles en fal.ai
// minimax/h3-max/text-to-video es el endpoint "Text To Video Turbo" de fal.ai
// minimax/h3-max/image-to-video es el endpoint "Image to Video Max" de fal.ai
export type VideoModelId =
  | 'minimax/h3-max/reference-to-video'
  | 'minimax/h3-max/text-to-video'
  | 'minimax/h3-max/image-to-video';

export const DEFAULT_VIDEO_MODEL: VideoModelId = 'minimax/h3-max/reference-to-video';

// Alias de ids antiguos persistidos en bibles de películas existentes
const LEGACY_VIDEO_MODEL_ALIASES: Record<string, VideoModelId> = {
  'minimax/h3-max-turbo': 'minimax/h3-max/text-to-video'
};

// Resoluciones soportadas por la familia MiniMax H3-Max en fal.ai (schema oficial: 480P, 768P, 1080P)
export const VIDEO_RESOLUTIONS = ['480P', '768P', '1080P'] as const;
export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];

export function isKnownVideoResolution(resolution: string | undefined | null): resolution is VideoResolution {
  return (VIDEO_RESOLUTIONS as readonly string[]).includes(resolution || '');
}

/**
 * Resuelve un id de modelo (actual o alias legacy) a un id válido, o null si no es reconocible.
 */
export function resolveVideoModel(model: string | undefined | null): VideoModelId | null {
  if (!model) return null;
  if (VIDEO_MODEL_OPTIONS.some(m => m.id === model)) return model as VideoModelId;
  return LEGACY_VIDEO_MODEL_ALIASES[model] || null;
}

export type VideoModelKind = 'reference-to-video' | 'text-to-video' | 'image-to-video';

export interface VideoModelOption {
  id: VideoModelId;
  label: string;
  description: string;
  kind: VideoModelKind;
  supportsReferences: boolean;
  resolution: string;
  aspectRatio: string;
}

export const VIDEO_MODEL_OPTIONS: VideoModelOption[] = [
  {
    id: 'minimax/h3-max/reference-to-video',
    label: 'MiniMax H3-Max — Reference-to-Video',
    description: 'Video con referencias (video previo, imágenes de props y audio). 768P adaptativo por defecto.',
    kind: 'reference-to-video',
    supportsReferences: true,
    resolution: '768P',
    aspectRatio: 'adaptive'
  },
  {
    id: 'minimax/h3-max/text-to-video',
    label: 'MiniMax H3-Max Turbo — Text-to-Video',
    description: 'Solo texto a video. Sin referencias. 480P 16:9 por defecto.',
    kind: 'text-to-video',
    supportsReferences: false,
    resolution: '480P',
    aspectRatio: '16:9'
  },
  {
    id: 'minimax/h3-max/image-to-video',
    label: 'MiniMax H3-Max — Image-to-Video',
    description: 'Anima un keyframe de continuidad generado con Flux. Sin referencias directas. 768P por defecto.',
    kind: 'image-to-video',
    supportsReferences: false,
    resolution: '768P',
    aspectRatio: '16:9'
  }
];

export function isKnownVideoModel(model: string | undefined | null): model is VideoModelId {
  return VIDEO_MODEL_OPTIONS.some(m => m.id === model);
}

export interface VideoGenerationParams {
  prompt: string;
  cameraMotion: string;
  stepNumber: number;
  duration?: number;
  previousVideoUrl?: string;
  propReferenceImages?: string[];
  voiceDirection?: string;
  model?: VideoModelId;
  resolution?: VideoResolution;
}

export interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl: string;
  isRealAiGenerated: boolean;
  modelUsed: string;
  resolution: string;
  aspectRatio: string;
  previousVideoReference?: string;
  propImagesReferences?: string[];
}

/**
 * Genera un keyframe de continuidad con Flux Schnell a partir del prompt de la escena.
 * Devuelve la URL pública del archivo generado en fal, o null si falla.
 */
export async function generateContinuityKeyframeWithFlux(prompt: string): Promise<string | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) return null;

  try {
    fal.config({ credentials: falKey });

    const keyframePrompt = `Cinematic film still, first frame of a scene, faithful to the following shot description — characters, costumes, props, environment, lighting and color grade must match exactly: ${prompt}. 35mm anamorphic framing, high detail, photorealistic.`;

    console.log('[fal.ai] Generating continuity keyframe with Flux Schnell...');
    const response: any = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt: keyframePrompt,
        image_size: 'landscape_16_9',
        num_inference_steps: 4,
        enable_safety_checker: true
      }
    });

    const imageUrl = response.data?.images?.[0]?.url;
    if (imageUrl) {
      console.log('[fal.ai] Continuity keyframe generated:', imageUrl);
      return imageUrl;
    }
    return null;
  } catch (err) {
    console.warn('[fal.ai] Continuity keyframe generation failed, falling back to text-only image-to-video:', err);
    return null;
  }
}

export async function generateVideoWithFal({
  prompt,
  cameraMotion,
  stepNumber,
  duration = 15,
  previousVideoUrl,
  propReferenceImages = [],
  voiceDirection = "",
  model = DEFAULT_VIDEO_MODEL,
  resolution
}: VideoGenerationParams): Promise<VideoGenerationResult> {
  const videoModel: VideoModelId = resolveVideoModel(model) || DEFAULT_VIDEO_MODEL;
  const modelOption = VIDEO_MODEL_OPTIONS.find(m => m.id === videoModel)!;
  const isTurbo = videoModel === 'minimax/h3-max/text-to-video';
  const isImageToVideo = videoModel === 'minimax/h3-max/image-to-video';
  // Resolución elegida por el Director; si no hay una válida se usa la del modelo
  const effectiveResolution: string = isKnownVideoResolution(resolution) ? resolution : modelOption.resolution;

  // Credit protection guard: if video generation is paused, immediately return mock video without calling fal.ai
  if (isFalGenerationPaused()) {
    console.log(`[fal.ai] 🛡️ Generación de video PAUSADA (protección de créditos activa). Retornando clip simulado para el paso ${stepNumber}.`);
    const mockIndex = (stepNumber - 1) % CINEMATIC_MOCK_VIDEOS.length;
    const mock = CINEMATIC_MOCK_VIDEOS[mockIndex];
    return {
      videoUrl: mock.url,
      thumbnailUrl: mock.poster,
      isRealAiGenerated: false,
      modelUsed: `${videoModel} (Simulador - Modo Pausa)`,
      resolution: effectiveResolution,
      aspectRatio: modelOption.aspectRatio,
      previousVideoReference: previousVideoUrl,
      propImagesReferences: propReferenceImages
    };
  }

  const falKey = process.env.FAL_KEY;

  // Build enhanced prompt embedding continuity anchors and audio voice directions
  let continuityContext = "";
  if (previousVideoUrl) {
    continuityContext += ` [CONTINUITY: Visual continuation seamlessly extending from previous scene clip (${previousVideoUrl})].`;
  }
  if (propReferenceImages.length > 0) {
    continuityContext += ` [PROP REFERENCES: Maintain exact physical appearance matching reference prop assets (${propReferenceImages.join(', ')})].`;
  }
  if (voiceDirection) {
    continuityContext += ` [VOICE & AUDIO DESIGN: ${voiceDirection}].`;
  }

  const fullPrompt = `${prompt}.${continuityContext} Camera cinematography: ${cameraMotion}. Professional 35mm anamorphic grading, 24fps film motion blur.`;

  if (falKey) {
    try {
      fal.config({
        credentials: falKey
      });

      // H3-Max Turbo (text-to-video): solo texto — se descartan todas las referencias
      // H3-Max Reference-to-Video: mantiene el comportamiento actual con referencias
      // H3-Max Image-to-Video: anima un keyframe de continuidad generado con Flux (image_url = primer frame)
      let inputPayload: Record<string, any>;

      if (isImageToVideo) {
        const keyframeUrl = await generateContinuityKeyframeWithFlux(fullPrompt);
        inputPayload = {
          prompt: fullPrompt,
          duration: duration || 15,
          resolution: effectiveResolution,
          enable_safety_checker: true,
          prompt_expansion_mode: "balanced",
          ...(keyframeUrl ? { image_url: keyframeUrl } : {})
        };
      } else if (isTurbo) {
        inputPayload = {
          prompt: fullPrompt,
          duration: duration || 15,
          resolution: effectiveResolution,
          enable_safety_checker: true,
          prompt_expansion_mode: "balanced",
          aspect_ratio: "16:9"
        };
      } else {
        inputPayload = {
          prompt: fullPrompt,
          duration: duration || 15,
          resolution: effectiveResolution,
          enable_safety_checker: true,
          prompt_expansion_mode: "balanced",
          aspect_ratio: "adaptive",
          reference_image_urls: propReferenceImages.length > 0 ? propReferenceImages : [],
          reference_audio_urls: [],
          reference_video_urls: previousVideoUrl ? [previousVideoUrl] : []
        };
      }

      console.log(`[fal.ai/Kie] Generating video for Step ${stepNumber} using ${videoModel} with payload:`, JSON.stringify(inputPayload, null, 2));
      const response: any = await fal.subscribe(videoModel, {
        input: inputPayload,
        logs: true
      });

      if (response.data) {
        const videoUrl = response.data.video?.url 
          || response.data.video_url 
          || (typeof response.data.video === 'string' ? response.data.video : null);

        if (videoUrl) {
          console.log(`[fal.ai] Successfully generated video for Step ${stepNumber}:`, videoUrl);
          return {
            videoUrl,
            thumbnailUrl: response.data.thumbnail?.url || response.data.thumbnail_url || "",
            isRealAiGenerated: true,
            modelUsed: videoModel,
            resolution: effectiveResolution,
            aspectRatio: modelOption.aspectRatio,
            previousVideoReference: previousVideoUrl,
            propImagesReferences: propReferenceImages
          };
        }
      }
    } catch (error: any) {
      console.error(`[fal.ai] ${videoModel} generation error:`, error?.message || error, "Body:", JSON.stringify(error?.body || {}));
      const errorStr = `${error?.message || ''} ${JSON.stringify(error?.body || '')}`.toLowerCase();
      if (
        error?.status === 402 || 
        errorStr.includes('payment') || 
        errorStr.includes('credit') || 
        errorStr.includes('balance') || 
        errorStr.includes('quota') ||
        errorStr.includes('insufficient') ||
        errorStr.includes('funds')
      ) {
        console.warn("[fal.ai] ⚠️ SALDO O CRÉDITOS AGOTADOS en fal.ai: Activando pausa automática de generación para proteger la cuenta.");
        if (typeof globalThis !== 'undefined') {
          (globalThis as any).__isCinemaGenerationPaused = true;
          if ((globalThis as any).__cinemaOrchestratorInstance) {
            (globalThis as any).__cinemaOrchestratorInstance.pauseGeneration();
          }
        }
      }
    }
  }

  // Fallback / Simulation mode
  const mockIndex = (stepNumber - 1) % CINEMATIC_MOCK_VIDEOS.length;
  const mock = CINEMATIC_MOCK_VIDEOS[mockIndex];

  return {
    videoUrl: mock.url,
    thumbnailUrl: mock.poster,
    isRealAiGenerated: false,
    modelUsed: `${videoModel} (Simulador)`,
    resolution: effectiveResolution,
    aspectRatio: modelOption.aspectRatio,
    previousVideoReference: previousVideoUrl,
    propImagesReferences: propReferenceImages
  };
}
