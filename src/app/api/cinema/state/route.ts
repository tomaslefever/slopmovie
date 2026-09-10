import { NextResponse } from 'next/server';
import { cinemaEngine } from '@/lib/cinema-orchestrator';
import { 
  loadActiveMovieFromDb, 
  loadLiveCinemaStateFromDb, 
  loadUserVoteForStep, 
  loadViewerPreferences,
  loadRecentChatMessagesFromDb,
  recordVisit,
  countActiveViewersFromDb
} from '@/lib/supabase/db';
import { CINEMATIC_MOCK_VIDEOS } from '@/lib/fal-video';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cookieStore = await cookies();
  const cookieViewerId = cookieStore.get('kinetic_viewer_id')?.value;
  
  const rawId = searchParams.get('userId') || cookieViewerId;
  const isUuid = Boolean(rawId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId));
  const userId: string = isUuid && rawId ? rawId : crypto.randomUUID();
  const isNewViewer = !isUuid;

  // Record the real visit (unique per viewer per day) — fire-and-forget
  recordVisit(userId).catch(() => {});
  // Real active-viewer count for the audience counter
  const realActiveViewers = await countActiveViewersFromDb(5);
  if (realActiveViewers !== null) {
    cinemaEngine.totalAudience = realActiveViewers;
  }

  // 1. Read live cinema state directly from Supabase database (Source of Truth)
  let liveState = await loadLiveCinemaStateFromDb();
  let activeMovie = await loadActiveMovieFromDb(liveState?.movieId);

  // Adopt the director-selected video model persisted in the DB
  cinemaEngine.adoptVideoModel(liveState?.videoModel);
  cinemaEngine.adoptVideoResolution(liveState?.videoResolution);

  // Adopt ads configuration persisted in the DB
  if (liveState?.adsConfig) {
    cinemaEngine.adsConfig = liveState.adsConfig;
  }

  // Adopt blockbuster voting state persisted in the DB (survives restarts / multi-process)
  if (Array.isArray(liveState?.blockbusterCandidates) && liveState.blockbusterCandidates.length > 0) {
    cinemaEngine.blockbusterCandidates = liveState.blockbusterCandidates;
  }
  if (liveState?.blockbusterVoteCounts) {
    cinemaEngine.blockbusterVoteCounts = liveState.blockbusterVoteCounts;
  }

  // If the live-state movie id points at an archived/completed movie (stale pointer),
  // fall back to the newest streaming/paused movie so the same old film is never resurrected.
  if (!activeMovie || !activeMovie.steps || activeMovie.steps.length === 0 || activeMovie.status === 'completed') {
    activeMovie = await loadActiveMovieFromDb();
  }

  // If no movie exists in DB yet, initialize one
  if (!activeMovie || !activeMovie.steps || activeMovie.steps.length === 0) {
    activeMovie = await cinemaEngine.initializeMovie();
    liveState = await loadLiveCinemaStateFromDb();
  }

  // Ensure active movie steps have valid playback URLs. When generation is
  // paused, missing URLs pick a random archived generated video from ANY movie
  // so a scene never degrades to a static image.
  if (activeMovie) {
    const generationPaused = liveState?.isGenerationPaused === true || cinemaEngine.isGenerationPaused;
    const archivedFallback = generationPaused ? await cinemaEngine.pickRandomArchivedVideo() : null;
    activeMovie.steps = activeMovie.steps.map((s, idx) => {
      const mock = CINEMATIC_MOCK_VIDEOS[idx % CINEMATIC_MOCK_VIDEOS.length];
      const needsReplacement = !s.videoUrl || s.videoUrl.startsWith('/videos/');
      return {
        ...s,
        videoUrl: needsReplacement ? (archivedFallback?.videoUrl ?? mock.url) : s.videoUrl,
        thumbnailUrl: s.thumbnailUrl || archivedFallback?.thumbnailUrl || mock.poster
      };
    });
  }

  const currentStepNum = liveState?.currentStep || activeMovie?.currentStep || 1;
  const activeStep = activeMovie?.steps.find(s => s.stepNumber === currentStepNum)
    || activeMovie?.steps?.[activeMovie.steps.length - 1]
    || {
      stepNumber: 1,
      title: "Opening Scene",
      synopsis: "The adventure begins.",
      visualPrompt: "",
      videoUrl: CINEMATIC_MOCK_VIDEOS[0].url,
      thumbnailUrl: CINEMATIC_MOCK_VIDEOS[0].poster,
      duration: 15,
      votingWindowSeconds: 10,
      options: [
        { id: 'A', title: 'Option A', description: 'Branch A', prompt: '', votes: 0 },
        { id: 'B', title: 'Option B', description: 'Branch B', prompt: '', votes: 0 }
      ],
      activeCharacters: [],
      activeProps: [],
      subtitles: [],
      environment: "",
      createdAt: new Date().toISOString()
    };

  // Load vote for this step directly from Supabase
  const hasUserVoted = activeMovie 
    ? await loadUserVoteForStep(activeMovie.id, currentStepNum, userId)
    : null;

  // Load viewer preferences from Supabase
  const viewerPreferences = await loadViewerPreferences(userId, activeMovie?.id);

  // Load all available movies for selector
  const allAvailable = await cinemaEngine.loadAllAvailableMovies();
  const allMovies = allAvailable.map(m => ({
    id: m.id,
    title: m.title,
    genre: m.genre,
    tagline: m.tagline || '',
    initialPlot: m.initialPlot || '',
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

  // Load recent chat messages from Supabase
  const chatMessages = activeMovie 
    ? await loadRecentChatMessagesFromDb(activeMovie.id)
    : [];

  const phase = liveState?.phase || 'PLAYING';
  const phaseDuration = liveState?.phaseDuration || (phase === 'VOTING' ? 10 : phase === 'BLOCKBUSTER_VOTING' ? 60 : 15);
  const phaseStartedAt = liveState?.phaseStartedAt || new Date().toISOString();

  // Dynamically compute exact seconds remaining based on phaseEndsAt timestamp
  const endsAtMs = liveState?.phaseEndsAt ? new Date(liveState.phaseEndsAt).getTime() : 0;
  const timeRemaining = endsAtMs > 0
    ? Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000))
    : (typeof liveState?.timeRemaining === 'number' ? liveState.timeRemaining : phaseDuration);

  const phaseEndsAt = liveState?.phaseEndsAt || new Date(Date.now() + timeRemaining * 1000).toISOString();

  const response = NextResponse.json({
    movie: activeMovie,
    activeStep,
    phase,
    timeRemaining,
    phaseDuration,
    phaseStartedAt,
    phaseEndsAt,
    votesA: liveState?.votesA || 0,
    votesB: liveState?.votesB || 0,
    totalAudience: realActiveViewers !== null && realActiveViewers > 0
      ? realActiveViewers
      : (liveState?.totalAudience || cinemaEngine.totalAudience || 0),
    isLive: liveState?.isLive !== false,
    isPaused: liveState?.isPaused ?? false,
    isGenerationPaused: liveState?.isGenerationPaused ?? false,
    videoModel: cinemaEngine.videoModel,
    videoResolution: cinemaEngine.videoResolution,
    blockbusterCandidates: cinemaEngine.blockbusterCandidates,
    blockbusterVoteCounts: cinemaEngine.blockbusterVoteCounts,
    activeAd: liveState?.activeAd || null,
    adsConfig: liveState?.adsConfig || { autoAdsEnabled: true, adIntervalSteps: 5, lastAdStep: 0 },
    apiStatus: {
      hasDeepseek: Boolean(process.env.DEEPSEEK_API_KEY),
      hasFal: Boolean(process.env.FAL_KEY),
      isMockMode: !process.env.DEEPSEEK_API_KEY || !process.env.FAL_KEY
    },
    userId,
    hasUserVoted,
    viewerPreferences,
    allMovies,
    chatMessages: chatMessages.slice(-50),
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

    if (action === 'complete_stage') {
      const { stage, stepNumber } = body;
      const result = await cinemaEngine.completeStage(stage, stepNumber ? Number(stepNumber) : undefined);
      return NextResponse.json({
        success: result.success,
        state: result.state
      });
    }

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

    if (action === 'blockbuster_vote') {
      if (!optionId || !['A', 'B', 'C', 'D'].includes(optionId)) {
        return NextResponse.json({ error: 'Candidata de película inválida' }, { status: 400 });
      }

      const voteResult = cinemaEngine.castBlockbusterVote(userId || 'anonymous', optionId as 'A' | 'B' | 'C' | 'D');
      return NextResponse.json({
        success: voteResult.success,
        counts: voteResult.counts,
        userVoted: optionId
      });
    }

    if (action === 'prepare_blockbuster_voting' || action === 'start_blockbuster_voting') {
      const candidates = await cinemaEngine.prepareBlockbusterVoting();
      return NextResponse.json({
        success: true,
        candidates,
        state: cinemaEngine.getState()
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

    if (action === 'set_video_model') {
      const { model } = body;
      const success = cinemaEngine.setVideoModel(model);
      return NextResponse.json({
        success,
        videoModel: cinemaEngine.videoModel,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'set_video_resolution') {
      const { resolution } = body;
      const success = cinemaEngine.setVideoResolution(resolution ?? null);
      return NextResponse.json({
        success,
        videoResolution: cinemaEngine.videoResolution,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'create_movie') {
      const newMovie = await cinemaEngine.startNextBlockbusterMovie(prompt);
      return NextResponse.json({
        success: true,
        movie: newMovie,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'update_movie') {
      const { movieId, fields } = body;
      if (!movieId || !fields || typeof fields !== 'object') {
        return NextResponse.json({ error: 'movieId y fields son requeridos' }, { status: 400 });
      }
      const success = await cinemaEngine.updateMovieDetails(movieId, fields);
      return NextResponse.json({
        success,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'delete_movie') {
      const { movieId } = body;
      if (!movieId) {
        return NextResponse.json({ error: 'movieId es requerido' }, { status: 400 });
      }
      const result = await cinemaEngine.deleteMovie(movieId);
      return NextResponse.json({
        success: result.success,
        movie: result.newMovie,
        state: cinemaEngine.getState()
      });
    }

    return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error en el servidor' }, { status: 500 });
  }
}
