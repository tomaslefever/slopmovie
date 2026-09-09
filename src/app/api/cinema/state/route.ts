import { NextResponse } from 'next/server';
import { cinemaEngine } from '@/lib/cinema-orchestrator';
import { loadUserVoteForStep, loadViewerPreferences } from '@/lib/supabase/db';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cookieStore = await cookies();
  const cookieViewerId = cookieStore.get('kinetic_viewer_id')?.value;
  
  const rawId = searchParams.get('userId') || cookieViewerId;
  const isUuid = Boolean(rawId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId));
  const userId: string = isUuid && rawId ? rawId : crypto.randomUUID();
  const isNewViewer = !isUuid;

  // If no movie is initialized yet, spin up or restore the movie
  if (!cinemaEngine.movie) {
    await cinemaEngine.initializeMovie();
  }

  const state = cinemaEngine.getState(userId);

  // Load vote from Supabase if not in memory
  let hasUserVoted = state.hasUserVoted;
  if (!hasUserVoted && cinemaEngine.movie) {
    const dbVote = await loadUserVoteForStep(cinemaEngine.movie.id, cinemaEngine.movie.currentStep, userId);
    if (dbVote) {
      hasUserVoted = dbVote;
      cinemaEngine.userVotes.set(userId, dbVote);
    }
  }

  // Load viewer preferences from Supabase
  const viewerPreferences = await loadViewerPreferences(userId, cinemaEngine.movie?.id);

  const allAvailable = await cinemaEngine.loadAllAvailableMovies();
  const allMovies = allAvailable.map(m => ({
    id: m.id,
    title: m.title,
    genre: m.genre,
    currentStep: m.currentStep,
    totalSteps: m.totalSteps,
    stepsCount: m.steps.length,
    status: m.status,
    createdAt: m.createdAt,
    steps: m.steps.map(s => ({
      stepNumber: s.stepNumber,
      title: s.title,
      duration: s.duration || 15,
      videoUrl: s.videoUrl,
      synopsis: s.synopsis
    }))
  }));

  const response = NextResponse.json({
    ...state,
    userId,
    hasUserVoted,
    viewerPreferences,
    allMovies,
    chatMessages: cinemaEngine.chatMessages.slice(-50),
    supabaseConfig: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || null
    }
  });

  // Set HTTP-only compatible session cookie (zero localStorage required)
  if (isNewViewer || !cookieViewerId) {
    response.cookies.set('kinetic_viewer_id', userId, {
      path: '/',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60
    });
  }

  return response;
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

    if (action === 'jump_to_step' || action === 'set_current_step') {
      const stepNumber = Number(body.stepNumber);
      if (isNaN(stepNumber) || stepNumber < 1) {
        return NextResponse.json({ error: 'Número de step inválido' }, { status: 400 });
      }
      const success = await cinemaEngine.jumpToStep(stepNumber);
      return NextResponse.json({
        success,
        currentStep: cinemaEngine.movie?.currentStep,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'switch_movie') {
      const { movieId, stepNumber } = body;
      if (!movieId) {
        return NextResponse.json({ error: 'movieId es requerido' }, { status: 400 });
      }
      const success = await cinemaEngine.switchToMovie(movieId, stepNumber ? Number(stepNumber) : 1);
      return NextResponse.json({
        success,
        movie: cinemaEngine.movie,
        currentStep: cinemaEngine.movie?.currentStep,
        state: cinemaEngine.getState()
      });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en el servidor' }, { status: 500 });
  }
}
