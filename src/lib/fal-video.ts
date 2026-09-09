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

      // Target official endpoint: minimax/h3-max/text-to-video with 480p and 16:9
      const inputPayload: any = {
        prompt: fullPrompt,
        resolution: "480p",
        aspect_ratio: "16:9",
        prompt_expansion_mode: "balanced"
      };

      // Pass previous video as reference if available
      if (previousVideoUrl) {
        inputPayload.previous_video_url = previousVideoUrl;
        inputPayload.reference_video_url = previousVideoUrl;
      }

      // Pass prop reference images if available
      if (propReferenceImages.length > 0) {
        inputPayload.reference_images = propReferenceImages;
        inputPayload.image_urls = propReferenceImages;
      }

      const response: any = await fal.subscribe("minimax/h3-max/text-to-video", {
        input: inputPayload,
        logs: true
      });

      if (response.data && response.data.video && response.data.video.url) {
        return {
          videoUrl: response.data.video.url,
          thumbnailUrl: response.data.thumbnail?.url || "",
          isRealAiGenerated: true,
          modelUsed: "minimax/h3-max/text-to-video",
          resolution: "480p",
          aspectRatio: "16:9",
          previousVideoReference: previousVideoUrl,
          propImagesReferences: propReferenceImages
        };
      }
    } catch (error) {
      console.warn("fal.ai minimax/h3-max generation error, falling back to cinematic stream:", error);
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
