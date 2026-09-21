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

export const VIDEO_RESOLUTIONS = ['480P', '768P', '1080P'] as const;
export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];

export function isKnownVideoResolution(resolution: string | undefined | null): resolution is VideoResolution {
  return (VIDEO_RESOLUTIONS as readonly string[]).includes(resolution || '');
}

export type VideoModelKind = 'reference-to-video' | 'text-to-video' | 'image-to-video';

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

export interface VideoModelOption {
  id: VideoModelId;
  label: string;
  description: string;
  kind: VideoModelKind;
  supportsReferences: boolean;
  resolution: string;
  aspectRatio: string;
  provider: 'fal' | 'machgen';
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
  model?: VideoModelId | string;
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
  firstFrameReference?: string;
  lastFrameReference?: string;
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
  model?: VideoModelId | string;
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

export function isVideoGenerationPaused(): boolean {
  if (process.env.PAUSE_VIDEO_GENERATION === 'true') return true;
  if (typeof globalThis !== 'undefined' && Boolean((globalThis as any).__isCinemaGenerationPaused)) return true;
  return false;
}
