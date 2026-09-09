import { NextResponse } from 'next/server';

export async function GET() {
  const hasDeepseek = Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim().length > 0);
  const hasFal = Boolean(process.env.FAL_KEY && process.env.FAL_KEY.trim().length > 0);

  return NextResponse.json({
    hasDeepseek,
    hasFal,
    isMockMode: !hasDeepseek || !hasFal,
    models: {
      llm: hasDeepseek ? 'deepseek-chat (Oficial)' : 'deepseek-chat (Simulador Procedural Cinematográfico)',
      video: hasFal ? 'minimax/h3-max/text-to-video (480p 16:9 Oficial fal.ai)' : 'minimax/h3-max/text-to-video (Simulador 480p 16:9)'
    }
  });
}
