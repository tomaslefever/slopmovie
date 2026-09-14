import { NextResponse } from 'next/server';
import { cinemaEngine } from '@/lib/cinema-orchestrator';

export const maxDuration = 60;
import { 
  loadActiveMovieFromDb, 
  loadAllMoviesFromDb,
  loadMovieByIdFromDb,
  loadLiveCinemaStateFromDb, 
  loadUserVoteForStep, 
  loadUserBlockbusterVote,
  loadBlockbusterVoteCountsFromDb,
  persistBlockbusterVote,
  broadcastCinemaEvent,
  loadViewerPreferences,
  loadRecentChatMessagesFromDb,
  recordVisit,
  countActiveViewersFromDb
} from '@/lib/supabase/db';
import { CINEMATIC_MOCK_VIDEOS } from '@/lib/fal-video';
import { loadStepVideoUrlsPool, resolveStepPlaybackUrl, isValidStepVideoUrl } from '@/lib/video-pool';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let cookieViewerId: string | undefined;
  try {
    const cookieStore = await cookies();
    cookieViewerId = cookieStore.get('kinetic_viewer_id')?.value;
  } catch {
    // Non-request or simulated context fallback
  }
  
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
  if (Array.isArray(liveState?.blockbusterCandidates)) {
    cinemaEngine.blockbusterCandidates = liveState.blockbusterCandidates;
  }
  if (liveState?.blockbusterVoteCounts !== undefined) {
    cinemaEngine.blockbusterVoteCounts = liveState.blockbusterVoteCounts || { A: 0, B: 0, C: 0, D: 0 };
  }
  if (liveState?.blockbusterWinner !== undefined) {
    cinemaEngine.blockbusterWinner = liveState.blockbusterWinner as any;
  }
  if (liveState?.phase) {
    cinemaEngine.phase = liveState.phase;
  }

  const isTransitionPhase = (liveState?.phase === 'BLOCKBUSTER_VOTING' || liveState?.phase === 'GENERATING') && activeMovie?.status === 'completed';

  // If activeMovie was not found or has no steps, fall back to newest streaming/paused movie
  if (!activeMovie || !activeMovie.steps || activeMovie.steps.length === 0) {
    const dbActive = await loadActiveMovieFromDb();
    if (dbActive && dbActive.steps && dbActive.steps.length > 0) {
      activeMovie = dbActive;
    }
  }

  // If activeMovie is set for live broadcast, ensure streaming status when playing
  if (activeMovie && (!liveState?.phase || liveState.phase === 'PLAYING') && activeMovie.status !== 'streaming') {
    activeMovie.status = 'streaming';
  }

  // If activeMovie is actively streaming or phase is PLAYING, wipe any stale blockbuster state
  if (activeMovie && (activeMovie.status === 'streaming' || liveState?.phase === 'PLAYING' || cinemaEngine.phase === 'PLAYING')) {
    if (liveState?.phase === 'BLOCKBUSTER_VOTING' || liveState?.phase === 'MOVIE_VOTING') {
      if (liveState) liveState.phase = 'PLAYING';
      cinemaEngine.phase = 'PLAYING';
    }
    cinemaEngine.blockbusterWinner = null;
    cinemaEngine.blockbusterCandidates = [];
    cinemaEngine.blockbusterVoteCounts = { A: 0, B: 0, C: 0, D: 0 };
    if (liveState) {
      liveState.blockbusterWinner = null;
      liveState.blockbusterCandidates = [];
      liveState.blockbusterVoteCounts = { A: 0, B: 0, C: 0, D: 0 };
    }
  }

  // Fallback to in-memory engine movie if available
  if (!activeMovie && cinemaEngine.movie) {
    activeMovie = cinemaEngine.movie;
  }

  // If no movie exists in DB yet, initialize one ONLY on true cold start (empty database) and NEVER during a transition phase
  if ((!activeMovie || !activeMovie.steps || activeMovie.steps.length === 0) && !isTransitionPhase) {
    const allDbMovies = await loadAllMoviesFromDb().catch(() => []);
    if (allDbMovies.length === 0) {
      activeMovie = await cinemaEngine.initializeMovie();
      liveState = await loadLiveCinemaStateFromDb();
    } else {
      activeMovie = allDbMovies[0];
    }
  }

  // Precargar pool de URLs de public.movie_steps al comenzar
  await loadStepVideoUrlsPool();

  if (activeMovie && activeMovie.steps && activeMovie.steps.length > 0) {
    activeMovie.steps.sort((a, b) => a.stepNumber - b.stepNumber);
  }

  const requestedStepNum = liveState?.currentStep || activeMovie?.currentStep || 1;
  let rawActiveStep = activeMovie?.steps.find(s => s.stepNumber === requestedStepNum);
  if (!rawActiveStep && activeMovie?.steps && activeMovie.steps.length > 0) {
    rawActiveStep = activeMovie.steps.find(s => s.stepNumber >= requestedStepNum) || activeMovie.steps[0];
  }
  const currentStepNum = rawActiveStep ? rawActiveStep.stepNumber : requestedStepNum;
  if (activeMovie) {
    activeMovie.currentStep = currentStepNum;
  }

  const activeStep: any = rawActiveStep ? {
    ...rawActiveStep,
    rawVideoUrl: rawActiveStep.rawVideoUrl !== undefined ? rawActiveStep.rawVideoUrl : (rawActiveStep.videoUrl || null),
    hasValidVideo: rawActiveStep.hasValidVideo !== undefined ? rawActiveStep.hasValidVideo : isValidStepVideoUrl(rawActiveStep.videoUrl),
    playbackUrl: resolveStepPlaybackUrl(rawActiveStep, CINEMATIC_MOCK_VIDEOS[0].url),
    videoUrl: resolveStepPlaybackUrl(rawActiveStep, CINEMATIC_MOCK_VIDEOS[0].url)
  } : {
    stepNumber: 1,
    title: "Opening Scene",
    synopsis: "The adventure begins.",
    visualPrompt: "",
    videoUrl: resolveStepPlaybackUrl(null, CINEMATIC_MOCK_VIDEOS[0].url),
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

  // Load aggregate blockbuster votes and user's specific blockbuster pick
  const targetBlockbusterMovieId = (liveState?.phase === 'BLOCKBUSTER_VOTING' && liveState?.movieId)
    ? liveState.movieId
    : (activeMovie?.id || liveState?.movieId || cinemaEngine.movie?.id);

  if (targetBlockbusterMovieId) {
    const dbCounts = await loadBlockbusterVoteCountsFromDb(targetBlockbusterMovieId);
    cinemaEngine.blockbusterVoteCounts = {
      A: Math.max(cinemaEngine.blockbusterVoteCounts?.A || 0, liveState?.blockbusterVoteCounts?.A || 0, dbCounts.A || 0),
      B: Math.max(cinemaEngine.blockbusterVoteCounts?.B || 0, liveState?.blockbusterVoteCounts?.B || 0, dbCounts.B || 0),
      C: Math.max(cinemaEngine.blockbusterVoteCounts?.C || 0, liveState?.blockbusterVoteCounts?.C || 0, dbCounts.C || 0),
      D: Math.max(cinemaEngine.blockbusterVoteCounts?.D || 0, liveState?.blockbusterVoteCounts?.D || 0, dbCounts.D || 0),
    };
  }

  const blockbusterUserVoted = targetBlockbusterMovieId
    ? (await loadUserBlockbusterVote(targetBlockbusterMovieId, userId)) || cinemaEngine.getBlockbusterUserVote(userId)
    : cinemaEngine.getBlockbusterUserVote(userId);

  // Load viewer preferences from Supabase
  const viewerPreferences = await loadViewerPreferences(userId, activeMovie?.id);

  // Only load all available movies when explicitly requested (e.g. by admin dashboard)
  // to avoid huge data egress for standard audience viewers
  const includeAllMovies = searchParams.get('includeAllMovies') === 'true';
  let allMovies: any[] = [];
  if (includeAllMovies) {
    const allAvailable = await cinemaEngine.loadAllAvailableMovies();
    allMovies = allAvailable.map(m => ({
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
      steps: m.steps.map(s => {
        const rawVideoUrl = s.rawVideoUrl !== undefined ? s.rawVideoUrl : (s.videoUrl || null);
        const hasValidVideo = s.hasValidVideo !== undefined ? s.hasValidVideo : isValidStepVideoUrl(s.videoUrl);
        return {
          stepNumber: s.stepNumber,
          title: s.title,
          duration: s.duration || 15,
          videoUrl: s.videoUrl || null,
          rawVideoUrl,
          hasValidVideo,
          playbackUrl: resolveStepPlaybackUrl(s, CINEMATIC_MOCK_VIDEOS[0].url),
          synopsis: s.synopsis
        };
      })
    }));
  }

  // Load recent chat messages from Supabase (cached)
  const chatMessages = activeMovie 
    ? await loadRecentChatMessagesFromDb(activeMovie.id)
    : [];

  const phase = liveState?.phase || cinemaEngine.phase || 'PLAYING';
  const phaseDuration = liveState?.phaseDuration || cinemaEngine.phaseDuration || (phase === 'VOTING' ? 10 : phase === 'BLOCKBUSTER_VOTING' ? 60 : 15);
  const phaseStartedAt = liveState?.phaseStartedAt || (cinemaEngine.phaseStartedAt ? new Date(cinemaEngine.phaseStartedAt).toISOString() : new Date().toISOString());

  // Dynamically compute exact seconds remaining based on phaseEndsAt timestamp
  const endsAtMs = liveState?.phaseEndsAt
    ? new Date(liveState.phaseEndsAt).getTime()
    : (cinemaEngine.phaseEndsAt || 0);
  const timeRemaining = endsAtMs > 0
    ? Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000))
    : (typeof liveState?.timeRemaining === 'number' ? liveState.timeRemaining : (cinemaEngine.timeRemaining ?? phaseDuration));

  const phaseEndsAt = liveState?.phaseEndsAt
    ? liveState.phaseEndsAt
    : (cinemaEngine.phaseEndsAt ? new Date(cinemaEngine.phaseEndsAt).toISOString() : new Date(Date.now() + timeRemaining * 1000).toISOString());

  const response = NextResponse.json({
    movie: activeMovie ? {
      ...activeMovie,
      steps: activeMovie.steps.map(s => ({
        ...s,
        rawVideoUrl: s.rawVideoUrl !== undefined ? s.rawVideoUrl : (s.videoUrl || null),
        hasValidVideo: s.hasValidVideo !== undefined ? s.hasValidVideo : isValidStepVideoUrl(s.videoUrl),
        playbackUrl: resolveStepPlaybackUrl(s, CINEMATIC_MOCK_VIDEOS[0].url),
        videoUrl: resolveStepPlaybackUrl(s, CINEMATIC_MOCK_VIDEOS[0].url)
      }))
    } : null,
    activeStep,
    phase: (activeMovie?.status === 'streaming' && (phase === 'BLOCKBUSTER_VOTING' || phase === 'MOVIE_VOTING')) ? 'PLAYING' : phase,
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
    isMovieGenerationPaused: liveState?.isMovieGenerationPaused ?? cinemaEngine.isMovieGenerationPaused ?? false,
    videoModel: cinemaEngine.videoModel,
    videoResolution: cinemaEngine.videoResolution,
    blockbusterCandidates: (phase === 'PLAYING' || activeMovie?.status === 'streaming') ? [] : (cinemaEngine.blockbusterCandidates || []),
    blockbusterVoteCounts: (phase === 'PLAYING' || activeMovie?.status === 'streaming') ? { A: 0, B: 0, C: 0, D: 0 } : (cinemaEngine.blockbusterVoteCounts || { A: 0, B: 0, C: 0, D: 0 }),
    blockbusterWinner: (phase === 'PLAYING' || activeMovie?.status === 'streaming') ? null : (cinemaEngine.blockbusterWinner ? {
      id: cinemaEngine.blockbusterWinner.id,
      title: cinemaEngine.blockbusterWinner.title,
      logline: cinemaEngine.blockbusterWinner.logline,
      genre: cinemaEngine.blockbusterWinner.genre,
      premise: cinemaEngine.blockbusterWinner.premise
    } : null),
    blockbusterUserVoted: (phase === 'PLAYING' || activeMovie?.status === 'streaming') ? null : blockbusterUserVoted,
    activeAd: liveState?.activeAd || null,
    adsConfig: liveState?.adsConfig || { autoAdsEnabled: true, adIntervalSteps: 5, lastAdStep: 0 },
    apiStatus: {
      hasDeepseek: Boolean(process.env.DEEPSEEK_API_KEY || process.env.NVIDIA_API_KEY),
      hasFal: Boolean(process.env.FAL_KEY),
      isMockMode: !(process.env.DEEPSEEK_API_KEY || process.env.NVIDIA_API_KEY) || !process.env.FAL_KEY
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
        return NextResponse.json({ error: 'Invalid vote option' }, { status: 400 });
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
        return NextResponse.json({ error: 'Invalid candidate option' }, { status: 400 });
      }

      // Sync cinemaEngine with Supabase live state if necessary (multi-process / serverless resilience)
      const liveState = await loadLiveCinemaStateFromDb();
      if (liveState) {
        if (liveState.phase === 'BLOCKBUSTER_VOTING') {
          cinemaEngine.phase = 'BLOCKBUSTER_VOTING';
          cinemaEngine.timeRemaining = liveState.timeRemaining;
          cinemaEngine.phaseEndsAt = typeof liveState.phaseEndsAt === 'number'
            ? liveState.phaseEndsAt
            : (liveState.phaseEndsAt ? new Date(liveState.phaseEndsAt).getTime() : Date.now() + 60000);
        }
        if (Array.isArray(liveState.blockbusterCandidates) && liveState.blockbusterCandidates.length > 0) {
          cinemaEngine.blockbusterCandidates = liveState.blockbusterCandidates;
        }
        if (liveState.movieId && (!cinemaEngine.movie || cinemaEngine.movie.id !== liveState.movieId)) {
          const m = await loadActiveMovieFromDb(liveState.movieId);
          if (m) cinemaEngine.movie = m;
        }
      }

      if (!cinemaEngine.movie) {
        const activeMovie = await loadActiveMovieFromDb();
        if (activeMovie) cinemaEngine.movie = activeMovie;
      }

      const { movieId: requestedMovieId } = body;
      const targetMovieId = requestedMovieId || liveState?.movieId || cinemaEngine.movie?.id;
      if (targetMovieId && cinemaEngine.movie && cinemaEngine.movie.id !== targetMovieId) {
        cinemaEngine.movie.id = targetMovieId;
      }

      cinemaEngine.castBlockbusterVote(userId || 'anonymous', optionId as 'A' | 'B' | 'C' | 'D');

      if (targetMovieId) {
        await persistBlockbusterVote(targetMovieId, userId || 'anonymous', optionId as 'A' | 'B' | 'C' | 'D');
        const authoritativeCounts = await loadBlockbusterVoteCountsFromDb(targetMovieId);
        cinemaEngine.blockbusterVoteCounts = {
          A: Math.max(cinemaEngine.blockbusterVoteCounts.A, authoritativeCounts.A),
          B: Math.max(cinemaEngine.blockbusterVoteCounts.B, authoritativeCounts.B),
          C: Math.max(cinemaEngine.blockbusterVoteCounts.C, authoritativeCounts.C),
          D: Math.max(cinemaEngine.blockbusterVoteCounts.D, authoritativeCounts.D),
        };
      }

      await cinemaEngine.persistCurrentStateToSupabase();

      broadcastCinemaEvent('blockbuster_vote_update', {
        counts: cinemaEngine.blockbusterVoteCounts,
        timeRemaining: cinemaEngine.timeRemaining
      });

      return NextResponse.json({
        success: true,
        counts: cinemaEngine.blockbusterVoteCounts,
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

    if (action === 'toggle_pause_movie_generation') {
      const success = cinemaEngine.togglePauseMovieGeneration();
      return NextResponse.json({
        success,
        isMovieGenerationPaused: cinemaEngine.isMovieGenerationPaused,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'pause_movie_generation') {
      const success = cinemaEngine.pauseMovieGeneration();
      return NextResponse.json({
        success,
        isMovieGenerationPaused: cinemaEngine.isMovieGenerationPaused,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'resume_movie_generation') {
      const success = cinemaEngine.resumeMovieGeneration();
      return NextResponse.json({
        success,
        isMovieGenerationPaused: cinemaEngine.isMovieGenerationPaused,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'jump_to_step' || action === 'set_current_step') {
      const stepNumber = Number(body.stepNumber);
      if (isNaN(stepNumber) || stepNumber < 1) {
        return NextResponse.json({ error: 'Invalid step number' }, { status: 400 });
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
        return NextResponse.json({ error: 'movieId is required' }, { status: 400 });
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
        return NextResponse.json({ error: 'movieId and fields are required' }, { status: 400 });
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
        return NextResponse.json({ error: 'movieId is required' }, { status: 400 });
      }
      const result = await cinemaEngine.deleteMovie(movieId);
      return NextResponse.json({
        success: result.success,
        movie: result.newMovie,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'bulk_delete_movies') {
      const { movieIds } = body;
      if (!Array.isArray(movieIds) || movieIds.length === 0) {
        return NextResponse.json({ error: 'movieIds must be a non-empty array' }, { status: 400 });
      }
      const result = await cinemaEngine.bulkDeleteMovies(movieIds);
      return NextResponse.json({
        success: result.success,
        deletedCount: result.deletedCount,
        movie: result.newMovie,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'bulk_update_movies') {
      const { movieIds, fields } = body;
      if (!Array.isArray(movieIds) || movieIds.length === 0 || !fields || typeof fields !== 'object') {
        return NextResponse.json({ error: 'movieIds (array) and fields (object) are required' }, { status: 400 });
      }
      const result = await cinemaEngine.bulkUpdateMovies(movieIds, fields);
      return NextResponse.json({
        success: result.success,
        updatedCount: result.updatedCount,
        state: cinemaEngine.getState()
      });
    }

    if (action === 'get_movie_details') {
      const { movieId } = body;
      if (!movieId) {
        return NextResponse.json({ error: 'movieId is required' }, { status: 400 });
      }
      const targetMovie = await loadMovieByIdFromDb(movieId);
      if (!targetMovie) {
        return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
      }
      const enrichedSteps = (targetMovie.steps || []).map(s => {
        const rawVideoUrl = s.rawVideoUrl !== undefined ? s.rawVideoUrl : (s.videoUrl || null);
        const hasValidVideo = s.hasValidVideo !== undefined ? s.hasValidVideo : isValidStepVideoUrl(s.videoUrl);
        return {
          ...s,
          rawVideoUrl,
          hasValidVideo,
          playbackUrl: resolveStepPlaybackUrl(s, CINEMATIC_MOCK_VIDEOS[0].url)
        };
      });
      return NextResponse.json({
        success: true,
        movie: {
          ...targetMovie,
          steps: enrichedSteps
        }
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
