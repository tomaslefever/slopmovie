import { NextResponse } from 'next/server';
import { loadViewerPreferences, persistViewerPreferences } from '@/lib/supabase/db';
import { cinemaEngine } from '@/lib/cinema-orchestrator';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const movieId = cinemaEngine.movie?.id;
  const prefs = await loadViewerPreferences(userId, movieId);

  return NextResponse.json(prefs);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, subtitlesEnabled, subtitleLanguage, nickname } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const movieId = cinemaEngine.movie?.id;
    await persistViewerPreferences(
      userId,
      {
        subtitlesEnabled: typeof subtitlesEnabled === 'boolean' ? subtitlesEnabled : undefined,
        subtitleLanguage: subtitleLanguage === 'es' || subtitleLanguage === 'en' ? subtitleLanguage : undefined,
        nickname: typeof nickname === 'string' ? nickname.trim() : undefined
      },
      movieId
    );

    return NextResponse.json({
      success: true,
      subtitlesEnabled,
      subtitleLanguage,
      nickname
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error saving preferences' }, { status: 500 });
  }
}
