import { NextResponse } from 'next/server';
import { cinemaEngine } from '@/lib/cinema-orchestrator';
import { VIDEO_MODEL_OPTIONS, VIDEO_RESOLUTIONS } from '@/lib/fal-video';
import { getLlmModel } from '@/lib/deepseek';

export async function GET() {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.NVIDIA_API_KEY;
  const hasDeepseek = Boolean(apiKey && apiKey.trim().length > 0);
  const hasFal = Boolean(process.env.FAL_KEY && process.env.FAL_KEY.trim().length > 0);
  const hasMachgen = Boolean(process.env.MACHGEN_API_KEY && process.env.MACHGEN_API_KEY.trim().length > 0);
  const modelName = getLlmModel();

  const isCurrentModelMachgen = cinemaEngine.videoModel.startsWith('machgen/');
  const activeVideoOnline = isCurrentModelMachgen ? hasMachgen : hasFal;

  return NextResponse.json({
    hasDeepseek,
    hasFal,
    hasMachgen,
    isMockMode: !hasDeepseek || (!hasFal && !hasMachgen),
    videoModel: cinemaEngine.videoModel,
    videoModelOptions: VIDEO_MODEL_OPTIONS,
    videoResolution: cinemaEngine.videoResolution,
    videoResolutionOptions: VIDEO_RESOLUTIONS,
    models: {
      llm: hasDeepseek ? `${modelName} (NVIDIA NIM)` : `${modelName} (Simulador Procedural Cinematográfico)`,
      video: activeVideoOnline
        ? `${cinemaEngine.videoModel} (${isCurrentModelMachgen ? 'MachGen API' : 'fal.ai'})`
        : `${cinemaEngine.videoModel} (Simulador)`
    }
  });
}
