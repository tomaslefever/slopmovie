import { NextResponse } from 'next/server';
import { cinemaEngine } from '@/lib/cinema-orchestrator';
import { VIDEO_MODEL_OPTIONS } from '@/lib/fal-video';

export async function GET() {
  const hasDeepseek = Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim().length > 0);
  const hasFal = Boolean(process.env.FAL_KEY && process.env.FAL_KEY.trim().length > 0);

  return NextResponse.json({
    hasDeepseek,
    hasFal,
    isMockMode: !hasDeepseek || !hasFal,
    videoModel: cinemaEngine.videoModel,
    videoModelOptions: VIDEO_MODEL_OPTIONS,
    models: {
      llm: hasDeepseek ? 'deepseek-chat (Oficial)' : 'deepseek-chat (Simulador Procedural Cinematográfico)',
      video: hasFal ? 'minimax/h3-max/reference-to-video (768P Oficial fal.ai)' : 'minimax/h3-max/reference-to-video (Simulador 768P)'
    }
  });
}
