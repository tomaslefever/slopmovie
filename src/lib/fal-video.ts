import { fal } from "@fal-ai/client";
import { generateVideoWithMachgen, generateDualShotVideoWithMachgen } from './machgen-video';

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

/**
 * Reconoce URLs de video realmente GENERADAS por fal.ai (fal.media / fal.ai /
 * fal.run / falserverless) con extensión de video o ruta de archivos.
 * Es el criterio de "url válida de video generado" que alimenta el pool de
 * archivo cuando la generación está desactivada: nunca una imagen estática.
 */
export function isRealGeneratedVideoUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  if (/^\/api\/cinema\/machgen\/asset/i.test(url)) return true;
  if (!/(fal\.media|fal\.ai|fal\.run|falserverless|machgen\.ai)/i.test(url)) return false;
  const bare = url.split('?')[0];
  if (/\.(mp4|webm|mov)$/i.test(bare)) return true;
  if (/\/(files|media|assets)\//i.test(url)) return true;
  return false;
}

export function isFalGenerationPaused(): boolean {
  if (process.env.PAUSE_VIDEO_GENERATION === 'true') return true;
  if (typeof globalThis !== 'undefined' && Boolean((globalThis as any).__isCinemaGenerationPaused)) return true;
  return false;
}

/**
 * Delega en el orquestador de cine la selección de un video generado aleatorio
 * del archivo (todas las escenas de todas las películas). Acceso por globalThis
 * para evitar dependencia circular fal-video <-> cinema-orchestrator.
 */
async function pickRandomArchivedGeneratedVideo(): Promise<{ videoUrl: string; thumbnailUrl?: string } | null> {
  try {
    const orchestrator = (globalThis as any)?.__cinemaOrchestratorInstance;
    if (orchestrator && typeof orchestrator.pickRandomArchivedVideo === 'function') {
      const pick = await orchestrator.pickRandomArchivedVideo();
      if (pick && pick.videoUrl) return pick;
    }
  } catch (err) {
    console.warn('[fal.ai] No se pudo seleccionar un video generado archivado:', err);
  }
  return null;
}

// Registro de modelos generativos de video disponibles (fal.ai y MachGen)
// fal.ai:
// minimax/h3-max-turbo/text-to-video = "Text to Video Max Turbo" (el MÁS BARATO/rápido)
// minimax/h3-max/text-to-video        = "Text to Video Max" (más costoso)
// MachGen (api.machgen.ai):
// machgen/minimax-h3-turbo/text-to-video = "MiniMax H3 Turbo Text-to-Video"
// machgen/minimax-h3-turbo/reference-to-video = "MiniMax H3 Turbo Reference-to-Video"
// machgen/minimax-h3-turbo/image-to-video = "MiniMax H3 Turbo Image-to-Video"
// machgen/minimax-h3/text-to-video = "MiniMax H3 Text-to-Video"
// machgen/minimax-h3/reference-to-video = "MiniMax H3 Reference-to-Video"
export type VideoModelId =
  | 'minimax/h3-max/reference-to-video'
  | 'minimax/h3-max-turbo/text-to-video'
  | 'minimax/h3-max/text-to-video'
  | 'minimax/h3-max/image-to-video'
  | 'machgen/minimax-h3-turbo/text-to-video'
  | 'machgen/minimax-h3-turbo/reference-to-video'
  | 'machgen/minimax-h3-turbo/image-to-video'
  | 'machgen/minimax-h3-turbo/first-last-frame'
  | 'machgen/minimax-h3/text-to-video'
  | 'machgen/minimax-h3/reference-to-video';

export const DEFAULT_VIDEO_MODEL: VideoModelId = 'machgen/minimax-h3-turbo/text-to-video';

// Alias de ids antiguos o cortos persistidos en bibles de películas existentes
const LEGACY_VIDEO_MODEL_ALIASES: Record<string, VideoModelId> = {
  'minimax/h3-max-turbo': 'minimax/h3-max-turbo/text-to-video',
  'machgen/minimax-h3-turbo': 'machgen/minimax-h3-turbo/text-to-video',
  'machgen/minimax-h3': 'machgen/minimax-h3/text-to-video',
  'machgen': 'machgen/minimax-h3-turbo/text-to-video',
  'machgen/minimax-h3-turbo/f2f': 'machgen/minimax-h3-turbo/first-last-frame',
  'machgen/minimax-h3-turbo/ff-lf': 'machgen/minimax-h3-turbo/first-last-frame',
  'machgen/f2f': 'machgen/minimax-h3-turbo/first-last-frame',
  'machgen/ff-lf': 'machgen/minimax-h3-turbo/first-last-frame'
};

// Resoluciones soportadas por MiniMax (480P, 768P, 1080P)
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
  provider?: 'fal' | 'machgen';
}

export const VIDEO_MODEL_OPTIONS: VideoModelOption[] = [
  // Fal.ai Models
  {
    id: 'minimax/h3-max-turbo/text-to-video',
    label: 'MiniMax H3-Max Turbo — Text-to-Video (Fal)',
    description: 'Text-to-video rápido y ECONÓMICO en fal.ai. Sin referencias. 480P 16:9 por defecto.',
    kind: 'text-to-video',
    supportsReferences: false,
    resolution: '480P',
    aspectRatio: '16:9',
    provider: 'fal'
  },
  {
    id: 'minimax/h3-max/text-to-video',
    label: 'MiniMax H3-Max — Text-to-Video (Fal - Costoso)',
    description: 'Text-to-video estándar en fal.ai, más COSTOSO que Turbo. Sin referencias. 768P por defecto.',
    kind: 'text-to-video',
    supportsReferences: false,
    resolution: '768P',
    aspectRatio: '16:9',
    provider: 'fal'
  },
  {
    id: 'minimax/h3-max/reference-to-video',
    label: 'MiniMax H3-Max — Reference-to-Video (Fal - Premium)',
    description: 'Video con referencias en fal.ai (video previo, imágenes de props y audio). 768P adaptativo por defecto.',
    kind: 'reference-to-video',
    supportsReferences: true,
    resolution: '768P',
    aspectRatio: 'adaptive',
    provider: 'fal'
  },
  {
    id: 'minimax/h3-max/image-to-video',
    label: 'MiniMax H3-Max — Image-to-Video (Fal)',
    description: 'Anima un keyframe de continuidad generado con Flux en fal.ai. Sin referencias directas. 768P por defecto.',
    kind: 'image-to-video',
    supportsReferences: false,
    resolution: '768P',
    aspectRatio: '16:9',
    provider: 'fal'
  },
  // MachGen Models (api.machgen.ai)
  {
    id: 'machgen/minimax-h3-turbo/text-to-video',
    label: 'MachGen MiniMax H3-Turbo — Text-to-Video',
    description: 'Generación acelerada y económica en MachGen API. 768P 16:9 por defecto.',
    kind: 'text-to-video',
    supportsReferences: false,
    resolution: '768P',
    aspectRatio: '16:9',
    provider: 'machgen'
  },
  {
    id: 'machgen/minimax-h3-turbo/reference-to-video',
    label: 'MachGen MiniMax H3-Turbo — Reference-to-Video',
    description: 'Video con referencias (clip previo y utilería) en MachGen API con mapeo @handles. 768P 16:9.',
    kind: 'reference-to-video',
    supportsReferences: true,
    resolution: '768P',
    aspectRatio: '16:9',
    provider: 'machgen'
  },
  {
    id: 'machgen/minimax-h3-turbo/image-to-video',
    label: 'MachGen MiniMax H3-Turbo — Image-to-Video (First Frame / FF)',
    description: 'Animación desde fotograma inicial (First Frame / FF) en MachGen API. 768P 16:9.',
    kind: 'image-to-video',
    supportsReferences: false,
    resolution: '768P',
    aspectRatio: '16:9',
    provider: 'machgen'
  },
  {
    id: 'machgen/minimax-h3-turbo/first-last-frame',
    label: 'MachGen MiniMax H3-Turbo — First & Last Frame (FF + LF)',
    description: 'Generación controlada entre fotograma inicial y fotograma final (FF + LF / F2F) en MachGen API. 768P 16:9.',
    kind: 'image-to-video',
    supportsReferences: true,
    resolution: '768P',
    aspectRatio: '16:9',
    provider: 'machgen'
  },
  {
    id: 'machgen/minimax-h3/text-to-video',
    label: 'MachGen MiniMax H3 — Text-to-Video (768p)',
    description: 'Text-to-video de alta fidelidad 768p en MachGen API.',
    kind: 'text-to-video',
    supportsReferences: false,
    resolution: '768P',
    aspectRatio: '16:9',
    provider: 'machgen'
  },
  {
    id: 'machgen/minimax-h3/reference-to-video',
    label: 'MachGen MiniMax H3 — Reference-to-Video',
    description: 'Reference-to-video de alta fidelidad con soporte de referencias en MachGen API.',
    kind: 'reference-to-video',
    supportsReferences: true,
    resolution: '768P',
    aspectRatio: '16:9',
    provider: 'machgen'
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
  dialogueSnippet?: string;
  model?: VideoModelId;
  resolution?: VideoResolution;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  startFrameUrl?: string;
  endFrameUrl?: string;
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

    const keyframePrompt = `Master cinematic film still, opening composition of a scene. Photorealistic 16:9 theatrical master, 35mm anamorphic framing. Faithful to the exact characters, costumes, key props, spatial geometry, lighting physics, and color grade: ${prompt}. Pristine optical texture, Kodak Vision3 500T grain profile, master color grade, zero digital artifacts, photorealistic cinema.`;

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
  dialogueSnippet = "",
  model = DEFAULT_VIDEO_MODEL,
  resolution,
  firstFrameUrl,
  lastFrameUrl,
  startFrameUrl,
  endFrameUrl
}: VideoGenerationParams): Promise<VideoGenerationResult> {
  const videoModel: VideoModelId = resolveVideoModel(model) || DEFAULT_VIDEO_MODEL;

  // Enrutamiento directo al proveedor MachGen API (api.machgen.ai)
  if (videoModel.startsWith('machgen/')) {
    return generateVideoWithMachgen({
      prompt,
      cameraMotion,
      stepNumber,
      duration,
      previousVideoUrl,
      propReferenceImages,
      voiceDirection,
      dialogueSnippet,
      model: videoModel,
      resolution,
      firstFrameUrl,
      lastFrameUrl,
      startFrameUrl,
      endFrameUrl
    });
  }

  const modelOption = VIDEO_MODEL_OPTIONS.find(m => m.id === videoModel)!;
  const isTextToVideo = modelOption.kind === 'text-to-video';
  const isImageToVideo = modelOption.kind === 'image-to-video';
  // Resolución elegida por el Director; si no hay una válida se usa la del modelo
  const effectiveResolution: string = isKnownVideoResolution(resolution) ? resolution : modelOption.resolution;

  // Credit protection guard: if video generation is paused, replay a random
  // ARCHIVED GENERATED VIDEO from any scene of any movie (zero fal.ai calls).
  // Never falls back to a static image — mocks are actual video clips.
  if (isFalGenerationPaused()) {
    const archived = await pickRandomArchivedGeneratedVideo();
    if (archived) {
      console.log(`[fal.ai] 🛡️ Generación PAUSADA: Reproduciendo video generado archivado (otra escena/película) para el paso ${stepNumber}.`);
      return {
        videoUrl: archived.videoUrl,
        thumbnailUrl: archived.thumbnailUrl || "",
        isRealAiGenerated: false,
        modelUsed: `${videoModel} (Archivo - Modo Pausa)`,
        resolution: effectiveResolution,
        aspectRatio: modelOption.aspectRatio,
        previousVideoReference: previousVideoUrl,
        propImagesReferences: propReferenceImages
      };
    }

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

  // Build enhanced prompt embedding continuity anchors, audio voice directions, and continuous dialogue
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

  let dialogueContext = "";
  if (dialogueSnippet && dialogueSnippet.trim().length > 0) {
    dialogueContext = ` [PACING & DIALOGUE INTERACTION: Fast-paced cinematic rhythm, rapid speech delivery. Characters actively converse and exchange spoken dialogue throughout the entire shot with synchronized lip movements from opening to climax: "${dialogueSnippet.trim()}". Brisk back-and-forth verbal interaction, natural delivery, zero awkward pauses].`;
  } else {
    dialogueContext = ` [PACING & DIALOGUE INTERACTION: Fast-paced cinematic rhythm, snappy dialogue and reactive character speech throughout the shot, dynamic acoustic presence].`;
  }

  // Cinematique Layered Synthesis for fal.ai / MiniMax:
  // Layer 1: [Visual Scene & Characters]
  // Layer 2: [Dialogue & Character Interaction Cadence]
  // Layer 3: [Cinematography & Camera Motion Cadence]
  // Layer 4: [Color Science & Film Stock Texture]
  const fullPrompt = `${prompt}.${continuityContext}${dialogueContext} Camera cinematography: ${cameraMotion}. Panavision anamorphic optics, organic 35mm film grain, 24fps kinetic motion blur.`;

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
      } else if (isTextToVideo) {
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

  const mockIndex = Math.abs((stepNumber || 1) - 1) % CINEMATIC_MOCK_VIDEOS.length;
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

export interface DualShotVideoParams {
  prompt1: string;
  cameraMotion1: string;
  prompt2?: string;
  cameraMotion2?: string;
  stepNumber: number;
  previousVideoUrl?: string;
  propReferenceImages?: string[];
  voiceDirection?: string;
  dialogue1?: string;
  dialogue2?: string;
  model?: VideoModelId;
  resolution?: VideoResolution;
  firstFrameUrl1?: string;
  lastFrameUrl1?: string;
  firstFrameUrl2?: string;
  lastFrameUrl2?: string;
}

export interface DualShotVideoResult {
  videoUrl1: string;
  thumbnailUrl1: string;
  videoUrl2: string;
  thumbnailUrl2: string;
  shot1: { videoUrl: string; thumbnailUrl: string };
  shot2: { videoUrl: string; thumbnailUrl: string };
  isRealAiGenerated: boolean;
  modelUsed: string;
  resolution: string;
}

/**
 * Generates TWO continuous 15-second cinematic shots in parallel using Fal.ai or MachGen.
 * Shot 1: Opening / Action (with rapid opening/mid dialogue)
 * Shot 2: Continuation / Climax / Resolution (with decisive reaction dialogue)
 * Concurrent execution ensures total wait time is virtually identical to a single shot (~20-30s).
 */
export async function generateDualShotVideoWithFal({
  prompt1,
  cameraMotion1,
  prompt2,
  cameraMotion2,
  stepNumber,
  previousVideoUrl,
  propReferenceImages = [],
  voiceDirection = "",
  dialogue1 = "",
  dialogue2 = "",
  model,
  resolution,
  firstFrameUrl1,
  lastFrameUrl1,
  firstFrameUrl2,
  lastFrameUrl2
}: DualShotVideoParams): Promise<DualShotVideoResult> {
  const resolvedModel = (model ? resolveVideoModel(model) : null) || DEFAULT_VIDEO_MODEL;
  if (resolvedModel.startsWith('machgen/')) {
    return generateDualShotVideoWithMachgen({
      prompt1,
      cameraMotion1,
      prompt2,
      cameraMotion2,
      stepNumber,
      previousVideoUrl,
      propReferenceImages,
      voiceDirection,
      dialogue1,
      dialogue2,
      model: resolvedModel,
      resolution,
      firstFrameUrl1,
      lastFrameUrl1,
      firstFrameUrl2,
      lastFrameUrl2
    });
  }

  const p2 = prompt2 || `Direct continuous second-half follow-through of the previous 15s action: ${prompt1}. Fast-paced narrative climax, dynamic character reactions, and dramatic consequence, identical characters, wardrobe and lighting, unbroken cinematic continuity.`;
  const cm2 = cameraMotion2 || "Fast-paced cinematic camera tracking continuing the motion trajectory, shallow depth of field, 24fps kinetic motion blur";

  // Dispatch both shots in parallel to Fal.ai cluster
  const [shot1Res, shot2Res] = await Promise.all([
    generateVideoWithFal({
      prompt: prompt1,
      cameraMotion: cameraMotion1,
      stepNumber,
      previousVideoUrl,
      propReferenceImages,
      voiceDirection,
      dialogueSnippet: dialogue1,
      model,
      resolution,
      firstFrameUrl: firstFrameUrl1,
      lastFrameUrl: lastFrameUrl1
    }),
    generateVideoWithFal({
      prompt: p2,
      cameraMotion: cm2,
      stepNumber: stepNumber + 1, // ensures distinct consecutive sequential clip if simulation mode
      previousVideoUrl,
      propReferenceImages,
      voiceDirection,
      dialogueSnippet: dialogue2 || dialogue1,
      model,
      resolution,
      firstFrameUrl: firstFrameUrl2 || lastFrameUrl1,
      lastFrameUrl: lastFrameUrl2
    })
  ]);

  return {
    videoUrl1: shot1Res.videoUrl,
    thumbnailUrl1: shot1Res.thumbnailUrl,
    videoUrl2: shot2Res.videoUrl,
    thumbnailUrl2: shot2Res.thumbnailUrl,
    shot1: { videoUrl: shot1Res.videoUrl, thumbnailUrl: shot1Res.thumbnailUrl },
    shot2: { videoUrl: shot2Res.videoUrl, thumbnailUrl: shot2Res.thumbnailUrl },
    isRealAiGenerated: Boolean(shot1Res.isRealAiGenerated || shot2Res.isRealAiGenerated),
    modelUsed: shot1Res.modelUsed,
    resolution: shot1Res.resolution
  };
}
