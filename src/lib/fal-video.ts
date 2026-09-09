import { fal } from "@fal-ai/client";

// High-fidelity cinematic preview clips for mock/demo mode
const CINEMATIC_MOCK_VIDEOS = [
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

export interface VideoGenerationParams {
  prompt: string;
  cameraMotion: string;
  stepNumber: number;
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
  previousVideoUrl,
  propReferenceImages = [],
  voiceDirection = ""
}: VideoGenerationParams): Promise<VideoGenerationResult> {
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

      // Target official endpoint: minimax/h3-max/text-to-video with 480P, 16:9, and exact 15-second duration
      const inputPayload: any = {
        prompt: fullPrompt,
        duration: 15, // Requisito: generación exacta de 15 segundos
        resolution: "480P",
        aspect_ratio: "16:9",
        prompt_expansion_mode: "balanced"
      };

      // Pass previous video as reference if available (multiple gateway aliases)
      if (previousVideoUrl) {
        inputPayload.previous_video_url = previousVideoUrl;
        inputPayload.reference_video_url = previousVideoUrl;
        inputPayload.video_url = previousVideoUrl;
      }

      // Pass prop reference images stored in Supabase Storage (multiple gateway aliases)
      if (propReferenceImages.length > 0) {
        inputPayload.reference_images = propReferenceImages;
        inputPayload.reference_image_urls = propReferenceImages;
        inputPayload.image_urls = propReferenceImages;
        inputPayload.image_url = propReferenceImages[0];
      }

      console.log(`[fal.ai/Kie] Generating 15s video for Step ${stepNumber} with payload:`, JSON.stringify(inputPayload, null, 2));
      const response: any = await fal.subscribe("minimax/h3-max/text-to-video", {
        input: inputPayload,
        logs: true
      });

      if (response.data && response.data.video && response.data.video.url) {
        console.log(`[fal.ai] Successfully generated video for Step ${stepNumber}:`, response.data.video.url);
        return {
          videoUrl: response.data.video.url,
          thumbnailUrl: response.data.thumbnail?.url || "",
          isRealAiGenerated: true,
          modelUsed: "minimax/h3-max/text-to-video",
          resolution: "480P",
          aspectRatio: "16:9",
          previousVideoReference: previousVideoUrl,
          propImagesReferences: propReferenceImages
        };
      }
    } catch (error: any) {
      console.error("[fal.ai] minimax/h3-max generation error:", error?.message || error, "Body:", JSON.stringify(error?.body || {}));
    }
  }

  // Fallback / Simulation mode
  const mockIndex = (stepNumber - 1) % CINEMATIC_MOCK_VIDEOS.length;
  const mock = CINEMATIC_MOCK_VIDEOS[mockIndex];

  return {
    videoUrl: mock.url,
    thumbnailUrl: mock.poster,
    isRealAiGenerated: false,
    modelUsed: "minimax/h3-max/text-to-video (Simulador)",
    resolution: "480p",
    aspectRatio: "16:9",
    previousVideoReference: previousVideoUrl,
    propImagesReferences: propReferenceImages
  };
}
