import { NextResponse } from 'next/server';
import { cinemaEngine } from '@/lib/cinema-orchestrator';
import { VIDEO_MODEL_OPTIONS, VIDEO_RESOLUTIONS } from '@/lib/fal-video';

export async function GET() {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.NVIDIA_API_KEY;
  const hasDeepseek = Boolean(apiKey && apiKey.trim().length > 0);
  const hasFal = Boolean(process.env.FAL_KEY && process.env.FAL_KEY.trim().length > 0);
  const modelName = process.env.DEEPSEEK_MODEL || 'deepseek-ai/deepseek-v4-pro-0813';

  return NextResponse.json({
    hasDeepseek,
    hasFal,
    isMockMode: !hasDeepseek || !hasFal,
    videoModel: cinemaEngine.videoModel,
    videoModelOptions: VIDEO_MODEL_OPTIONS,
    videoResolution: cinemaEngine.videoResolution,
    videoResolutionOptions: VIDEO_RESOLUTIONS,
    models: {
      llm: hasDeepseek ? `${modelName} (NVIDIA NIM)` : `${modelName} (Simulador Procedural Cinematográfico)`,
      video: hasFal ? 'minimax/h3-max/reference-to-video (768P Oficial fal.ai)' : 'minimax/h3-max/reference-to-video (Simulador 768P)'
    }
  });
}
