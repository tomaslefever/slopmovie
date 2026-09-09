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

export interface VideoGenerationParams {
  prompt: string;
  cameraMotion: string;
  stepNumber: number;
  duration?: number;
  previousVideoUrl?: string;
  propReferenceImages?: string[];
  voiceDirection?: string;
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

export async function generateVideoWithFal({
  prompt,
  cameraMotion,
  stepNumber,
  duration = 15,
  previousVideoUrl,
  propReferenceImages = [],
  voiceDirection = ""
}: VideoGenerationParams): Promise<VideoGenerationResult> {
  // Credit protection guard: if video generation is paused, immediately return mock video without calling fal.ai
  if (isFalGenerationPaused()) {
    console.log(`[fal.ai] 🛡️ Generación de video PAUSADA (protección de créditos activa). Retornando clip simulado para el paso ${stepNumber}.`);
    const mockIndex = (stepNumber - 1) % CINEMATIC_MOCK_VIDEOS.length;
    const mock = CINEMATIC_MOCK_VIDEOS[mockIndex];
    return {
      videoUrl: mock.url,
      thumbnailUrl: mock.poster,
      isRealAiGenerated: false,
      modelUsed: "minimax/h3-max/reference-to-video (Simulador - Modo Pausa)",
      resolution: "768P",
      aspectRatio: "adaptive",
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

      // Target official endpoint: minimax/h3-max/reference-to-video
      const inputPayload = {
        prompt: fullPrompt,
        duration: duration || 15,
        resolution: "768P",
        enable_safety_checker: true,
        prompt_expansion_mode: "balanced",
        aspect_ratio: "adaptive",
        reference_image_urls: propReferenceImages.length > 0 ? propReferenceImages : [],
        reference_audio_urls: [],
        reference_video_urls: previousVideoUrl ? [previousVideoUrl] : []
      };

      console.log(`[fal.ai/Kie] Generating video for Step ${stepNumber} using minimax/h3-max/reference-to-video with payload:`, JSON.stringify(inputPayload, null, 2));
      const response: any = await fal.subscribe("minimax/h3-max/reference-to-video", {
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
            modelUsed: "minimax/h3-max/reference-to-video",
            resolution: "768P",
            aspectRatio: "adaptive",
            previousVideoReference: previousVideoUrl,
            propImagesReferences: propReferenceImages
          };
        }
      }
    } catch (error: any) {
      console.error("[fal.ai] minimax/h3-max/reference-to-video generation error:", error?.message || error, "Body:", JSON.stringify(error?.body || {}));
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
    modelUsed: "minimax/h3-max/reference-to-video (Simulador)",
    resolution: "768P",
    aspectRatio: "adaptive",
    previousVideoReference: previousVideoUrl,
    propImagesReferences: propReferenceImages
  };
}
