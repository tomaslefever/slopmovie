import { NextResponse } from 'next/server';
import { cinemaEngine } from '@/lib/cinema-orchestrator';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'guest';

  // If no movie is initialized yet, spin up or restore the movie
  if (!cinemaEngine.movie) {
    await cinemaEngine.initializeMovie();
  }

  const state = cinemaEngine.getState(userId);
  return NextResponse.json({
    ...state,
    chatMessages: cinemaEngine.chatMessages.slice(-50),
    supabaseConfig: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || null
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, userName, optionId, prompt } = body;

    if (action === 'vote') {
      if (!optionId || !['A', 'B'].includes(optionId)) {
        return NextResponse.json({ error: 'Opción de voto inválida' }, { status: 400 });
      }

      const voteResult = cinemaEngine.castVote(userId || 'anonymous', optionId, userName);
      return NextResponse.json({
        success: voteResult.success,
        votesA: voteResult.votesA,
        votesB: voteResult.votesB,
        userVoted: optionId
      });
    }

    if (action === 'init') {
      const newMovie = await cinemaEngine.initializeMovie(prompt);
      return NextResponse.json({
        success: true,
        movie: newMovie
      });
    }

    if (action === 'next_movie') {
      const newMovie = await cinemaEngine.startNextBlockbusterMovie(prompt);
      return NextResponse.json({
        success: true,
        movie: newMovie
      });
    }

    if (action === 'force_reset') {
      // Clears in-memory state + archives Supabase movie + generates fresh AI content.
      // Use this after adding API keys to escape mockup mode.
      const newMovie = await cinemaEngine.forceReset(prompt);
      return NextResponse.json({
        success: true,
        movie: newMovie
      });
    }

    if (action === 'toggle_pause') {
      const success = cinemaEngine.togglePause();
      return NextResponse.json({
        success,
        isPaused: cinemaEngine.isPaused,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'pause') {
      const success = cinemaEngine.pause();
      return NextResponse.json({
        success,
        isPaused: cinemaEngine.isPaused,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'resume') {
      const success = cinemaEngine.resume();
      return NextResponse.json({
        success,
        isPaused: cinemaEngine.isPaused,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'toggle_pause_generation') {
      const success = cinemaEngine.togglePauseGeneration();
      return NextResponse.json({
        success,
        isGenerationPaused: cinemaEngine.isGenerationPaused,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'pause_generation') {
      const success = cinemaEngine.pauseGeneration();
      return NextResponse.json({
        success,
        isGenerationPaused: cinemaEngine.isGenerationPaused,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'resume_generation') {
      const success = cinemaEngine.resumeGeneration();
      return NextResponse.json({
        success,
        isGenerationPaused: cinemaEngine.isGenerationPaused,
        state: cinemaEngine.getState()
      });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en el servidor' }, { status: 500 });
  }
}
