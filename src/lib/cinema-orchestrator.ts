import { Movie, MovieStep, CinemaState, ChatMessage, PlaybackPhase, ImmersiveAd, AdsConfig, BlockbusterCandidate, TOTAL_STEPS } from '@/types/cinema';
import { generateStoryBibleWithDeepSeek, generateNextStepWithDeepSeek, generateMovieFinalSummaryWithDeepSeek, generateBlockbusterCandidatesWithDeepSeek, generateImmersiveAdPromptWithDeepSeek, ensureOptionPrompts } from './deepseek';
import type { CommentInfluence } from './deepseek';
import { generateVideoWithFal, generateDualShotVideoWithFal, CINEMATIC_MOCK_VIDEOS, DEFAULT_VIDEO_MODEL, isKnownVideoResolution, resolveVideoModel, isRealGeneratedVideoUrl } from './fal-video';
import type { VideoModelId, VideoResolution } from './fal-video';

declare global {
  // eslint-disable-next-line no-var
  var __cinemaOrchestratorInstance: CinemaOrchestrator | undefined;
  // eslint-disable-next-line no-var
  var __isCinemaGenerationPaused: boolean | undefined;
}
import { 
  persistMovie, 
  persistMovieStep, 
  persistChatMessage, 
  persistProp,
  loadActiveMovieFromDb, 
  loadAllMoviesFromDb,
  loadMovieByIdFromDb,
  loadRecentChatMessagesFromDb,
  loadImmersiveAdsFromDb,
  persistImmersiveAd,
  recordAdMetric,
  deleteImmersiveAdFromDb,
  archiveAllStreamingMovies,
  broadcastCinemaEvent, 
  isSupabaseConfigured,
  persistLiveCinemaState,
  loadLiveCinemaStateFromDb,
  recordUserVoteInDb,
  voteChatMessageInDb,
  markChatMessageUsedForInfluence,
  updateMovieInDb,
  updateMoviesInDb,
  deleteMovieFromDb,
  deleteMoviesFromDb,
  persistBlockbusterVote,
  loadBlockbusterVoteCountsFromDb,
  countActiveViewersFromDb
} from './supabase/db';
import { generateAndStorePropReferenceImage } from './supabase/storage';


const DEFAULT_IMMERSIVE_ADS: ImmersiveAd[] = [
  {
    id: "ad_omniatech",
    brandName: "OmniaTech Systems",
    title: "NeuroSync Pro: The Transhuman Edge",
    tagline: "Why perceive reality when you can optimize it?",
    description: "Military-grade synaptic overclocking with zero latency neural feedback.",
    type: "commercial_break",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80",
    ctaText: "Connect Neural Port",
    ctaUrl: "https://example.com/omniatech",
    perkReward: "+50 Audience Community Votes",
    duration: 15,
    isActive: true,
    frequencySteps: 5,
    impressions: 24,
    clicks: 6,
    cinematicPrompt: "Continúa la escena e integra este anuncio de forma natural en la historia: A sleek OmniaTech NeuroSync Pro device is glimpsed naturally in the environment — on a workbench, holographic display, or worn by a background figure. The world of the film is unchanged. The scene flows with the same cinematic grammar: 35mm anamorphic grain, deep focus, teal-amber color grade. No jarring cuts. The brand exists organically inside the story universe."
  },
  {
    id: "ad_apex_energy",
    brandName: "Apex Quantum Energy",
    title: "Liquid Supernova in a Can",
    tagline: "Distilled from deep space ion drives.",
    description: "Electrolytes harvested directly from orbital nebula storms.",
    type: "commercial_break",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    imageUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&auto=format&fit=crop&q=80",
    ctaText: "Acquire Supply",
    ctaUrl: "https://example.com/apex",
    perkReward: "+30 Audience Community Votes",
    duration: 15,
    isActive: true,
    frequencySteps: 5,
    impressions: 18,
    clicks: 4,
    cinematicPrompt: "Continúa la escena e integra este anuncio de forma natural en la historia: A character reaches for an Apex Quantum Energy can — its iridescent metallic surface catching the ambient lighting of the scene. The action is brief and naturalistic, matching the existing tone and pacing of the film. No logo overlay, no jingle. Maintain the same lens flare quality, color palette, and depth of field from the preceding clip."
  },
  {
    id: "ad_suntory_reserve",
    brandName: "Suntory Orbital Reserve",
    title: "Zero-Gravity Single Malt",
    tagline: "Aged 50 years aboard the Lunar Spire.",
    description: "Smooth oak notes refined without atmospheric drag.",
    type: "in_scene_overlay",
    imageUrl: "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=800&auto=format&fit=crop&q=80",
    ctaText: "Inspect Vintage",
    ctaUrl: "https://example.com/suntory",
    duration: 15,
    isActive: true,
    frequencySteps: 3,
    impressions: 35,
    clicks: 11,
    cinematicPrompt: "Continúa la escena e integra este anuncio de forma natural en la historia: In a quiet beat between action, a Suntory Orbital Reserve bottle is seen resting on a surface — its amber liquid glowing softly under the scene's existing lighting. The visual integration is subtle and atmospheric, never breaking immersion. The brand exists as a world-building prop. Maintain the film's color grade, depth of field, and grain structure throughout."
  }
];

// Singleton in-memory store for active cinema session with Supabase persistence & Realtime
class CinemaOrchestrator {
  private static instance: CinemaOrchestrator;

  public movie: Movie | null = null;
  public completedMovies: Movie[] = [];
  public phase: PlaybackPhase = 'PLAYING';
  public timeRemaining: number = 15; // 15s clip
  public phaseDuration: number = 15;
  public phaseStartedAt: number = Date.now();
  public phaseEndsAt: number = Date.now() + 15000;
  public votesA: number = 0;
  public votesB: number = 0;
  public totalAudience: number = 142; // Dynamic audience count
  public chatMessages: ChatMessage[] = [];
  public commentVotes: Map<string, Set<string>> = new Map();
  /** Comment ids already consumed for narrative influence — never reconsidered. */
  private usedInfluenceCommentIds: Set<string> = new Set();
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public isGenerationPaused: boolean = false;
  public videoModel: VideoModelId = DEFAULT_VIDEO_MODEL;
  public videoResolution: VideoResolution | null = null;
  private timerInterval: NodeJS.Timeout | null = null;
  public userVotes: Map<string, 'A' | 'B'> = new Map();
  private isAdvancing: boolean = false;
  private isAdvancingStartedAt: number = 0;
  private audienceRefreshTickCounter: number = 0;

  public setPhase(newPhase: PlaybackPhase, durationSeconds: number) {
    this.phase = newPhase;
    this.timeRemaining = durationSeconds;
    this.phaseDuration = durationSeconds;
    this.phaseStartedAt = Date.now();
    this.phaseEndsAt = Date.now() + durationSeconds * 1000;
  }

  // Immersive Ads Engine
  public activeAd: ImmersiveAd | null = null;
  public adsList: ImmersiveAd[] = [...DEFAULT_IMMERSIVE_ADS];
  public adsConfig: AdsConfig = {
    autoAdsEnabled: true,
    adIntervalSteps: 5, // Commercial break every 5 movie steps
    lastAdStep: 0
  };
  private returnPhaseAfterAd: PlaybackPhase = 'PLAYING';
  private pendingNextStep: MovieStep | null = null;
  /**
   * The videoUrl of the story clip that was playing immediately before a commercial break.
   * Used as previousVideoUrl for the NEXT story step so the ad clip never contaminates
   * narrative continuity. Reset to null once consumed by the step generator.
   */
  private preAdVideoUrl: string | null = null;

  /**
   * Ad clip pre-generated together with the story clip, so when the commercial break
   * starts the ad is already rendered and only needs to be played back.
   */
  private pendingPreGeneratedAd: {
    ad: ImmersiveAd;
    stepNumber: number;
    videoUrl: string;
    thumbnailUrl: string;
    isRealAiGenerated: boolean;
  } | null = null;

  // Next-blockbuster audience voting (60s, 4 candidates)
  public blockbusterCandidates: BlockbusterCandidate[] = [];
  public blockbusterVoteCounts: Record<'A' | 'B' | 'C' | 'D', number> = { A: 0, B: 0, C: 0, D: 0 };
  public blockbusterWinner: BlockbusterCandidate | null = null;
  private blockbusterUserVotes: Map<string, 'A' | 'B' | 'C' | 'D'> = new Map();

  // Historical archive of previous generated ad clips for replay mode
  public generatedAdVideoArchive: string[] = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4"
  ];

  private constructor() {
    if (process.env.PAUSE_VIDEO_GENERATION === 'true') {
      this.isGenerationPaused = true;
      if (typeof globalThis !== 'undefined') {
        (globalThis as any).__isCinemaGenerationPaused = true;
      }
    }

    this.chatMessages.push({
      id: "sys_init",
      userId: "system",
      userName: "CINEMA AI",
      text: "🍿 Welcome to the live interactive cinema screening! The audience shapes the destiny of the film at every 15-second cut.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    });
    this.loadInitialAds();
  }

  private async loadInitialAds() {
    try {
      if (isSupabaseConfigured()) {
        const dbAds = await loadImmersiveAdsFromDb();
        if (dbAds && dbAds.length > 0) {
          this.adsList = dbAds;
          dbAds.forEach(ad => {
            if (ad.generatedAdVideoUrl && !this.generatedAdVideoArchive.includes(ad.generatedAdVideoUrl)) {
              this.generatedAdVideoArchive.push(ad.generatedAdVideoUrl);
            }
            if (ad.videoUrl && !this.generatedAdVideoArchive.includes(ad.videoUrl)) {
              this.generatedAdVideoArchive.push(ad.videoUrl);
            }
          });
        } else {
          for (const ad of DEFAULT_IMMERSIVE_ADS) {
            await persistImmersiveAd(ad);
          }
        }
      }
    } catch {
      // Ignored
    }
  }

  public static getInstance(): CinemaOrchestrator {
    if (typeof globalThis !== 'undefined' && (globalThis as any).__cinemaOrchestratorInstance) {
      return (globalThis as any).__cinemaOrchestratorInstance;
    }
    if (!CinemaOrchestrator.instance) {
      CinemaOrchestrator.instance = new CinemaOrchestrator();
    }
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).__cinemaOrchestratorInstance = CinemaOrchestrator.instance;
    }
    return CinemaOrchestrator.instance;
  }

  private initializeMoviePromise: Promise<Movie> | null = null;

  /**
   * Pool de URLs de video GENERADAS válidas provenientes de TODAS las películas
   * (en memoria y en Supabase). Se usa cuando la generación está desactivada
   * para garantizar que siempre se reproduzca un clip en movimiento — jamás
   * una imagen estática. Deduplicado: llamadas concurrentes comparten el build.
   */
  private archivedGeneratedPoolPromise: Promise<{ videoUrl: string; thumbnailUrl?: string }[]> | null = null;

  private async buildArchivedGeneratedVideoPool(): Promise<{ videoUrl: string; thumbnailUrl?: string }[]> {
    const movies: Movie[] = [];
    if (this.movie) movies.push(this.movie);
    for (const m of this.completedMovies) movies.push(m);

    if (isSupabaseConfigured()) {
      try {
        const dbMovies = await loadAllMoviesFromDb();
        for (const m of dbMovies) {
          if (!movies.some(x => x.id === m.id)) movies.push(m);
        }
      } catch (err) {
        console.warn('[Cinema] Error loading all movies for the archived video pool:', err);
      }
    }

    const pool: { videoUrl: string; thumbnailUrl?: string }[] = [];
    const seen = new Set<string>();
    for (const m of movies) {
      for (const s of m.steps || []) {
        if (isRealGeneratedVideoUrl(s.videoUrl) && !seen.has(s.videoUrl as string)) {
          seen.add(s.videoUrl as string);
          pool.push({ videoUrl: s.videoUrl as string, thumbnailUrl: s.thumbnailUrl });
        }
        if (isRealGeneratedVideoUrl(s.videoUrl2) && !seen.has(s.videoUrl2 as string)) {
          seen.add(s.videoUrl2 as string);
          pool.push({ videoUrl: s.videoUrl2 as string, thumbnailUrl: s.thumbnailUrl });
        }
      }
    }
    for (const url of this.generatedAdVideoArchive) {
      if (isRealGeneratedVideoUrl(url) && !seen.has(url)) {
        seen.add(url);
        pool.push({ videoUrl: url });
      }
    }

    return pool;
  }

  /**
   * Selecciona un video generado ALEATORIO de TODAS las escenas con URL válida
   * de video generado (no importa de qué película provengan). Devuelve null si
   * el archivo no tiene ningún video generado.
   */
  public async pickRandomArchivedVideo(): Promise<{ videoUrl: string; thumbnailUrl?: string; isRealGenerated: true } | null> {
    if (!this.archivedGeneratedPoolPromise) {
      this.archivedGeneratedPoolPromise = this.buildArchivedGeneratedVideoPool().finally(() => {
        this.archivedGeneratedPoolPromise = null;
      });
    }
    const pool = await this.archivedGeneratedPoolPromise;
    if (pool.length === 0) return null;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return { ...pick, isRealGenerated: true };
  }

  /**
   * Selecciona DOS videos existentes para reproducirlos consecutivamente (Shot 1 + Shot 2 = 30s)
   * cuando la generación con IA está desactivada. Utiliza videos generados del pool o
   * los clips cinematic mock para garantizar siempre dos tomas en movimiento sin repetición.
   */
  public async pickTwoArchivedOrMockVideos(stepNumber: number): Promise<{
    shot1: { videoUrl: string; thumbnailUrl?: string };
    shot2: { videoUrl: string; thumbnailUrl?: string };
  }> {
    if (!this.archivedGeneratedPoolPromise) {
      this.archivedGeneratedPoolPromise = this.buildArchivedGeneratedVideoPool().finally(() => {
        this.archivedGeneratedPoolPromise = null;
      });
    }
    const pool = await this.archivedGeneratedPoolPromise;
    const mockIndex = Math.abs((stepNumber || 1) - 1) % CINEMATIC_MOCK_VIDEOS.length;
    const mock1 = CINEMATIC_MOCK_VIDEOS[mockIndex];
    const mock2 = CINEMATIC_MOCK_VIDEOS[(mockIndex + 1) % CINEMATIC_MOCK_VIDEOS.length];

    if (pool.length === 0) {
      return {
        shot1: { videoUrl: mock1.url, thumbnailUrl: mock1.poster },
        shot2: { videoUrl: mock2.url, thumbnailUrl: mock2.poster }
      };
    } else if (pool.length === 1) {
      return {
        shot1: { videoUrl: pool[0].videoUrl, thumbnailUrl: pool[0].thumbnailUrl },
        shot2: { videoUrl: mock2.url, thumbnailUrl: mock2.poster }
      };
    } else {
      const idx1 = Math.floor(Math.random() * pool.length);
      let idx2 = Math.floor(Math.random() * pool.length);
      if (idx2 === idx1) {
        idx2 = (idx1 + 1) % pool.length;
      }
      return {
        shot1: { videoUrl: pool[idx1].videoUrl, thumbnailUrl: pool[idx1].thumbnailUrl },
        shot2: { videoUrl: pool[idx2].videoUrl, thumbnailUrl: pool[idx2].thumbnailUrl }
      };
    }
  }

  /**
   * True while forceReset is generating a brand-new movie. The background worker
   * must not auto-initialize another movie during this window (race that resurrects
   * an automatic movie instead of the director's).
   */
  public isResetting: boolean = false;

  /**
   * Deduplicated entry point: concurrent callers (worker tick, API routes) join
   * the SAME in-flight initialization instead of generating competing movies.
   */
  public initializeMovie(customPrompt?: BlockbusterCandidate | string): Promise<Movie> {
    if (this.initializeMoviePromise) {
      console.log('[Cinema] initializeMovie already in progress — joining existing initialization.');
      return this.initializeMoviePromise;
    }
    this.initializeMoviePromise = this.doInitializeMovie(customPrompt).finally(() => {
      this.initializeMoviePromise = null;
    });
    return this.initializeMoviePromise;
  }

  private async doInitializeMovie(customPrompt?: BlockbusterCandidate | string): Promise<Movie> {
    // Try to restore existing streaming or paused movie from Supabase if available
    if (isSupabaseConfigured() && !customPrompt) {
      try {
        const savedMovie = await loadActiveMovieFromDb();
        if (savedMovie && savedMovie.steps.length > 0) {
          // Sanitize step video URLs so none are missing or 404. When generation
          // is paused, prefer a random archived generated video over the mocks so
          // a scene with a missing URL never degrades to a static image.
          const archivedFallback = this.isGenerationPaused ? await this.pickRandomArchivedVideo() : null;
          savedMovie.steps = savedMovie.steps.map((s, idx) => {
            const mock = CINEMATIC_MOCK_VIDEOS[idx % CINEMATIC_MOCK_VIDEOS.length];
            const mock2 = CINEMATIC_MOCK_VIDEOS[(idx + 1) % CINEMATIC_MOCK_VIDEOS.length];
            const needsReplacement = !s.videoUrl || s.videoUrl.startsWith('/videos/');
            const needsReplacement2 = !s.videoUrl2 || s.videoUrl2.startsWith('/videos/');
            return {
              ...s,
              videoUrl: needsReplacement ? (archivedFallback?.videoUrl ?? mock.url) : s.videoUrl,
              thumbnailUrl: s.thumbnailUrl || archivedFallback?.thumbnailUrl || mock.poster,
              videoUrl2: needsReplacement2 ? mock2.url : s.videoUrl2,
              duration: s.hasMidRollAd ? 45 : 30
            };
          });
          this.movie = savedMovie;
          this.phase = 'PLAYING';
          this.timeRemaining = 15;
          this.votesA = 0;
          this.votesB = 0;
          this.userVotes.clear();

          // Restore exact live state from Supabase
          const liveState = await loadLiveCinemaStateFromDb(savedMovie.id);
          if (liveState) {
            this.phase = liveState.phase || 'PLAYING';
            this.timeRemaining = typeof liveState.timeRemaining === 'number' ? liveState.timeRemaining : 15;
            this.votesA = liveState.votesA || 0;
            this.votesB = liveState.votesB || 0;
            this.totalAudience = liveState.totalAudience || 142;
            if (liveState.adsConfig) this.adsConfig = liveState.adsConfig;
            if (liveState.activeAd) this.activeAd = liveState.activeAd;
            if (liveState.isPaused !== undefined) this.isPaused = liveState.isPaused;
            if (liveState.isGenerationPaused !== undefined) this.isGenerationPaused = liveState.isGenerationPaused;
          }

          const dbChats = await loadRecentChatMessagesFromDb(savedMovie.id);
          if (dbChats.length > 0) this.chatMessages = dbChats;
          // Restore the influence-consumed marks so used comments are never picked again
          for (const msg of dbChats) {
            if (msg.usedForInfluence) this.usedInfluenceCommentIds.add(msg.id);
          }

          // Restore paused and generation paused states accurately
          if (savedMovie.status === 'paused') {
            this.isPaused = true;
          }
          if ((savedMovie.bible as any)?.isGenerationPaused || process.env.PAUSE_VIDEO_GENERATION === 'true') {
            this.isGenerationPaused = true;
            if (typeof globalThis !== 'undefined') {
              (globalThis as any).__isCinemaGenerationPaused = true;
            }
          }

          // Restore director-selected generative video model
          const restoredModel = resolveVideoModel((savedMovie.bible as any)?.videoModel);
          if (restoredModel) {
            this.videoModel = restoredModel;
          }

          // Restore director-selected video resolution
          if (isKnownVideoResolution((savedMovie.bible as any)?.videoResolution)) {
            this.videoResolution = (savedMovie.bible as any).videoResolution;
          }

          // Movie restored from Supabase
          return this.movie;
        }
      } catch (err) {
        console.warn("[Cinema] Error restoring from Supabase, initializing fresh:", err);
      }
    }

    const dbMovies = await loadAllMoviesFromDb().catch(() => []);
    const existingTitles = dbMovies.map(m => m.title).filter(Boolean);
    const generated = await generateStoryBibleWithDeepSeek(customPrompt, existingTitles);
    const movieId = `movie_${Date.now()}`;

    // Ensure all props in the story bible have authentic reference assets stored in Supabase Storage
    for (const prop of generated.bible.props) {
      try {
        if (!this.isGenerationPaused) {
          console.log(`[Cinema] Generating and storing reference asset for prop "${prop.name}" in Supabase Storage...`);
          prop.imageUrl = await generateAndStorePropReferenceImage(prop);
          await persistProp(movieId, prop);
        }
      } catch (err) {
        console.warn(`[Cinema] Error storing prop image in Supabase Storage:`, err);
      }
    }

    // Ensure Step 1 has activeProps specified so prop references are sent to video generation
    if (generated.firstStep && (!generated.firstStep.activeProps || generated.firstStep.activeProps.length === 0)) {
      if (generated.bible.props.length > 0) {
        generated.firstStep.activeProps = [generated.bible.props[0].id];
      }
    }

    const initialStepsRaw = (generated.initialSteps && generated.initialSteps.length === 4)
      ? generated.initialSteps
      : [generated.firstStep];

    // Re-adopt the director's persisted model/resolution before spending credits
    if (!this.isGenerationPaused) {
      await this.refreshGenerationPrefsFromDb();
    }

    // Generate videos for all initial steps (First-Shot: 4 scenes = 1 minute total)
    console.log(`[Cinema] Synthesizing 4-scene First-Shot sequence (1-minute uninterrupted opening)...`);
    const initialStepsWithVideo: MovieStep[] = await Promise.all(
      initialStepsRaw.map(async (step, idx) => {
        // Collect reference images of props for this step
        const stepPropImages = generated.bible.props
          .filter(p => (step.activeProps || []).includes(p.id))
          .map(p => p.imageUrl)
          .filter(Boolean) as string[];

        let stepVideoUrl: string;
        let stepThumbnailUrl: string | undefined;
        let stepVideoUrl2: string;

        if (!this.isGenerationPaused) {
          try {
            const videoResult = await generateVideoWithFal({
              prompt: step.visualPrompt,
              cameraMotion: step.cameraMotionPrompt,
              stepNumber: step.stepNumber,
              propReferenceImages: stepPropImages.length > 0 ? stepPropImages : undefined,
              voiceDirection: step.voiceDirection,
              model: this.videoModel,
              resolution: this.videoResolution || undefined
            });
            stepVideoUrl = videoResult.videoUrl;
            stepThumbnailUrl = videoResult.thumbnailUrl;
            const mock2 = CINEMATIC_MOCK_VIDEOS[(idx + 1) % CINEMATIC_MOCK_VIDEOS.length];
            stepVideoUrl2 = mock2.url;
          } catch (err) {
            console.warn(`[Cinema] Fal.ai video generation failed for step ${step.stepNumber}, using mock fallback:`, err);
            const mock = CINEMATIC_MOCK_VIDEOS[idx % CINEMATIC_MOCK_VIDEOS.length];
            const mock2 = CINEMATIC_MOCK_VIDEOS[(idx + 1) % CINEMATIC_MOCK_VIDEOS.length];
            stepVideoUrl = mock.url;
            stepThumbnailUrl = mock.poster;
            stepVideoUrl2 = mock2.url;
          }
        } else {
          console.log(`[Cinema] 🛡️ Generación PAUSADA: Seleccionando 2 videos existentes para el paso ${step.stepNumber}.`);
          const twoVideos = await this.pickTwoArchivedOrMockVideos(step.stepNumber);
          stepVideoUrl = twoVideos.shot1.videoUrl;
          stepThumbnailUrl = twoVideos.shot1.thumbnailUrl;
          stepVideoUrl2 = twoVideos.shot2.videoUrl;
        }

        return {
          ...step,
          videoUrl: stepVideoUrl,
          thumbnailUrl: stepThumbnailUrl,
          videoUrl2: stepVideoUrl2,
          duration: 30,
          propReferenceImages: stepPropImages
        };
      })
    );

    this.movie = {
      id: movieId,
      title: generated.title,
      genre: generated.genre,
      tagline: generated.tagline,
      initialPlot: generated.initialPlot,
      masterArcThread: generated.masterArcThread,
      status: 'streaming',
      currentStep: 1,
      totalSteps: TOTAL_STEPS,
      bible: {
        ...generated.bible,
        isGenerationPaused: this.isGenerationPaused,
        videoModel: this.videoModel,
        videoResolution: this.videoResolution
      } as any,
      steps: initialStepsWithVideo,
      createdAt: new Date().toISOString(),
      totalVotesCast: 0
    };

    this.setPhase('PLAYING', 30);
    this.votesA = 0;
    this.votesB = 0;
    this.userVotes.clear();
    this.blockbusterCandidates = [];
    this.blockbusterUserVotes.clear();
    this.blockbusterVoteCounts = { A: 0, B: 0, C: 0, D: 0 };

    // Persist movie and all 4 initial steps to Supabase
    await persistMovie(this.movie);
    for (const step of initialStepsWithVideo) {
      await persistMovieStep(this.movie.id, step);
    }
    // Refresh live state so cinema_state.movie_id points at THIS movie (prevents stale-movie resurrection)
    await this.persistCurrentStateToSupabase();

    this.addSystemMessage(`🎬 Starting new interactive film: "${this.movie.title}" (First-shot 1-minute prologue engaged)`);
    return this.movie;
  }

  /**
   * Synchronize cinema orchestrator with state currently in Supabase.
   */
  public async syncFromDatabase() {
    if (!isSupabaseConfigured()) return;
    if (this.isResetting) {
      console.log('[CinemaEngine] Skipping DB sync: a movie reset is in progress.');
      return;
    }
    try {
      const savedMovie = await loadActiveMovieFromDb();
      if (savedMovie && savedMovie.steps.length > 0) {
        // Sanitize missing step URLs; prefer archived generated videos when
        // generation is paused so a scene never shows a static image.
        const archivedFallback = this.isGenerationPaused ? await this.pickRandomArchivedVideo() : null;
        savedMovie.steps = savedMovie.steps.map((s, idx) => {
          const mock = CINEMATIC_MOCK_VIDEOS[idx % CINEMATIC_MOCK_VIDEOS.length];
          const mock2 = CINEMATIC_MOCK_VIDEOS[(idx + 1) % CINEMATIC_MOCK_VIDEOS.length];
          const needsReplacement = !s.videoUrl || s.videoUrl.startsWith('/videos/');
          const needsReplacement2 = !s.videoUrl2 || s.videoUrl2.startsWith('/videos/');
          return {
            ...s,
            videoUrl: needsReplacement ? (archivedFallback?.videoUrl ?? mock.url) : s.videoUrl,
            thumbnailUrl: s.thumbnailUrl || archivedFallback?.thumbnailUrl || mock.poster,
            videoUrl2: needsReplacement2 ? mock2.url : s.videoUrl2,
            duration: s.hasMidRollAd ? 45 : 30
          };
        });
        this.movie = savedMovie;
      }

      const liveState = await loadLiveCinemaStateFromDb(this.movie?.id);
      if (liveState) {
        this.phase = liveState.phase || 'PLAYING';
        this.phaseDuration = liveState.phaseDuration || 15;
        this.phaseStartedAt = liveState.phaseStartedAt ? new Date(liveState.phaseStartedAt).getTime() : Date.now();
        this.phaseEndsAt = liveState.phaseEndsAt ? new Date(liveState.phaseEndsAt).getTime() : Date.now() + 15000;
        
        // If phase has already ended in real time, set timeRemaining to 0 so transition fires immediately
        if (liveState.phaseEndsAt) {
          const remainingSec = Math.ceil((new Date(liveState.phaseEndsAt).getTime() - Date.now()) / 1000);
          this.timeRemaining = Math.max(0, remainingSec);
        } else {
          this.timeRemaining = typeof liveState.timeRemaining === 'number' ? liveState.timeRemaining : 15;
        }
        this.votesA = liveState.votesA || 0;
        this.votesB = liveState.votesB || 0;
        this.totalAudience = liveState.totalAudience || 142;
        this.isPaused = liveState.isPaused ?? false;
        this.isGenerationPaused = liveState.isGenerationPaused ?? false;
        if (liveState.adsConfig) this.adsConfig = liveState.adsConfig;
        if (liveState.activeAd) this.activeAd = liveState.activeAd;
        const syncedModel = resolveVideoModel(liveState.videoModel);
        if (syncedModel) this.videoModel = syncedModel;
        if (isKnownVideoResolution(liveState.videoResolution)) this.videoResolution = liveState.videoResolution;
        if (liveState.currentStep && this.movie) {
          this.movie.currentStep = liveState.currentStep;
        }
        if (Array.isArray(liveState.blockbusterCandidates) && liveState.blockbusterCandidates.length > 0) {
          this.blockbusterCandidates = liveState.blockbusterCandidates;
        }
        if (liveState.blockbusterVoteCounts) {
          this.blockbusterVoteCounts = liveState.blockbusterVoteCounts;
        }
      }
    } catch (err) {
      console.warn('[CinemaEngine] Error syncing from database:', err);
    }
  }

  /**
   * Execute one tick of the engine. Called ONLY by the single leader worker.
   */
  public async tickWorker(workerId: string) {
    // Multi-instance / DB sync: check if active movie in Supabase differs from in-memory movie
    if (isSupabaseConfigured() && !this.isResetting && !this.isAdvancing) {
      try {
        const liveState = await loadLiveCinemaStateFromDb();
        if (liveState?.movieId && (!this.movie || this.movie.id !== liveState.movieId)) {
          console.log(`[CinemaWorker] Active movie in DB (${liveState.movieId}) differs from memory. Re-syncing...`);
          await this.syncFromDatabase();
        }
      } catch {
        // non-blocking
      }
    }

    // Watchdog: recover if isAdvancing was stalled for >90s
    if (this.isAdvancing && Date.now() - this.isAdvancingStartedAt > 90000) {
      console.warn('[CinemaWorker] Watchdog: isAdvancing stuck for >90s. Releasing lock.');
      this.isAdvancing = false;
    }

    if (!this.movie) {
      // A forceReset (new blockbuster rotation) is mid-flight: the worker must NOT
      // auto-generate a competing movie while the director's/rotation's movie is being created.
      if (this.isResetting || this.phase === 'GENERATING' || this.phase === 'BLOCKBUSTER_VOTING') {
        if (this.phase !== 'BLOCKBUSTER_VOTING') return;
      } else {
        const liveState = await loadLiveCinemaStateFromDb().catch(() => null);
        if (liveState?.phase === 'GENERATING' || liveState?.phase === 'BLOCKBUSTER_VOTING') {
          return;
        }
        await this.initializeMovie();
        if (!this.movie) return;
      }
    }

    // Blockbuster rotation watchdog: if a film completed but its rotation flow was
    // lost (serverless restart / swallowed error), rotate automatically after 3 minutes.
    if (this.movie && this.movie.status === 'completed') {
      // During the async generation of the winning blockbuster or reset, never auto-rotate on top of it.
      if (this.phase === 'GENERATING' || this.isResetting) {
        return;
      }
      if (this.phase !== 'BLOCKBUSTER_VOTING') {
        const completedAtMs = this.movie.completedAt ? new Date(this.movie.completedAt).getTime() : 0;
        if (completedAtMs && Date.now() - completedAtMs > 180000 && !this.isResetting) {
          console.log('[CinemaEngine] Completed movie detected without rotation for >180s — opening blockbuster voting.');
          await this.prepareBlockbusterVoting();
        }
        return;
      }
      // If phase is BLOCKBUSTER_VOTING, continue down to timer calculation and transition!
    }

    // If stream is paused by director, refresh heartbeat in Supabase without advancing timers
    if (this.isPaused) {
      await this.persistCurrentStateToSupabase(workerId);
      return;
    }

    // Calculate remaining seconds strictly from phaseEndsAt timestamp
    const remaining = Math.max(0, Math.ceil((this.phaseEndsAt - Date.now()) / 1000));
    this.timeRemaining = remaining;

    if (remaining > 0) {
      // Real audience count: refresh from the visits table every ~10 ticks
      // instead of the old random fluctuation.
      this.audienceRefreshTickCounter = (this.audienceRefreshTickCounter || 0) + 1;
      if (this.audienceRefreshTickCounter % 10 === 0) {
        countActiveViewersFromDb(5).then((count) => {
          if (count !== null && count > 0) {
            this.totalAudience = count;
          }
        }).catch(() => {});
      }
      // Note: Remaining seconds are NOT streamed. Clients run local countdown timers synchronized by phase start/ends timestamps.
    } else {
      // Authoritative time engine: phase timer expired. Advance immediately.
      if (!this.isAdvancing) {
        const stepNum = this.movie ? this.movie.currentStep : 1;
        console.log(`[CinemaWorker] ⏱️ Authoritative timer elapsed for phase '${this.phase}' (Step ${stepNum}). Transitioning to next stage...`);
        this.isAdvancing = true;
        this.isAdvancingStartedAt = Date.now();
        try {
          await this.handlePhaseTransition(workerId);
        } finally {
          this.isAdvancing = false;
        }
      }
    }
  }

  /**
   * Explicitly complete a cinema stage driven by client playback/voting completion.
   * Eliminates arbitrary periodic polling and prevents scene cutting/repetition.
   */
  public async completeStage(
    requestedStage?: PlaybackPhase,
    stepNumber?: number,
    workerId?: string
  ): Promise<{ success: boolean; state: ReturnType<CinemaOrchestrator['getState']> }> {
    if (!this.movie) {
      if (this.phase !== 'BLOCKBUSTER_VOTING') {
        if (this.isResetting || this.phase === 'GENERATING') {
          return { success: false, state: this.getState() };
        }
        await this.initializeMovie();
        if (!this.movie) return { success: false, state: this.getState() };
      }
    }

    if (this.isAdvancing) {
      return { success: true, state: this.getState() };
    }

    // If client specified the stage that ended, ensure it matches current phase
    if (requestedStage && this.phase !== requestedStage) {
      console.log(`[CinemaEngine] completeStage: current phase (${this.phase}) already moved past (${requestedStage}). Returning live state.`);
      return { success: true, state: this.getState() };
    }

    // If client specified the step number, ensure it matches currentStep during PLAYING
    if (typeof stepNumber === 'number' && this.movie && this.movie.currentStep !== stepNumber && this.phase === 'PLAYING') {
      console.log(`[CinemaEngine] completeStage: current step (${this.movie.currentStep}) does not match requested (${stepNumber}). Returning live state.`);
      return { success: true, state: this.getState() };
    }

    this.isAdvancing = true;
    this.isAdvancingStartedAt = Date.now();
    try {
      const stepNum = this.movie ? this.movie.currentStep : 1;
      console.log(`[CinemaEngine] 🎬 Stage completion received from client for '${this.phase}' (Step ${stepNum}). Transitioning...`);
      await this.handlePhaseTransition(workerId);
      return { success: true, state: this.getState() };
    } catch (err) {
      console.error('[CinemaEngine] Error advancing cinema stage:', err);
      return { success: false, state: this.getState() };
    } finally {
      this.isAdvancing = false;
    }
  }

  private async handlePhaseTransition(workerId?: string) {
    if (!this.movie && this.phase !== 'BLOCKBUSTER_VOTING') return;

    // ── NEXT BLOCKBUSTER AUDIENCE VOTE CONCLUDED (60s) ───────────────────────
    if (this.phase === 'BLOCKBUSTER_VOTING') {
      if (isSupabaseConfigured() && this.movie) {
        try {
          const freshCounts = await loadBlockbusterVoteCountsFromDb(this.movie.id);
          if (freshCounts) {
            this.blockbusterVoteCounts = freshCounts;
          }
        } catch (err) {
          console.warn('[Cinema] Error refreshing blockbuster votes from DB before resolution:', err);
        }
      }
      const winner = this.resolveBlockbusterVote();
      const savedCandidates = this.blockbusterCandidates.length > 0 ? [...this.blockbusterCandidates] : [];
      const savedCounts = { ...this.blockbusterVoteCounts };

      // Keep winner and candidates in memory during GENERATING so the reveal and zoom-out/zoom-in animation play smoothly
      this.blockbusterWinner = winner;
      this.blockbusterCandidates = savedCandidates;
      this.setPhase('GENERATING', 90);

      const winnerPayload = {
        id: winner.id,
        title: winner.title,
        logline: winner.logline,
        genre: winner.genre,
        premise: winner.premise
      };

      broadcastCinemaEvent('blockbuster_vote_ended', {
        winner: winnerPayload,
        counts: savedCounts,
        candidates: savedCandidates
      });
      broadcastCinemaEvent('phase_change', {
        phase: 'GENERATING',
        timeRemaining: 90,
        phaseDuration: 90,
        phaseStartedAt: this.phaseStartedAt,
        phaseEndsAt: this.phaseEndsAt,
        winner: winnerPayload,
        blockbusterCandidates: savedCandidates,
        blockbusterVoteCounts: savedCounts
      });

      // Persist GENERATING state to Supabase so all workers/endpoints know we are generating the new film
      await this.persistCurrentStateToSupabase(workerId);

      this.addSystemMessage(`🏆 NEXT BLOCKBUSTER: "${winner.title}" (${winner.genre}) won the audience vote! Generating now — the premiere begins automatically when it's ready.`);
      // ASYNC BY DESIGN: does not await. The new movie broadcasts new_movie_started
      // and starts playing when its generation finishes.
      this.startNextBlockbusterMovie(winner).catch((err) => {
        console.error('[Cinema] Async blockbuster generation failed:', err);
      });

      await this.broadcastStateSnapshot(workerId);
      return;
    }

    if (!this.movie) return;

    const currentStep = (this.movie.steps.find(s => s.stepNumber === this.movie!.currentStep))
      || this.movie.steps[this.movie.steps.length - 1];

    if (this.phase === 'COMMERCIAL_BREAK') {
      // 15s Commercial break has completed -> Transition to next phase (typically VOTING)
      this.addSystemMessage(`📺 Sponsor transmission ended. Resuming live interactive film.`);
      this.activeAd = null;
      const targetPhase = this.returnPhaseAfterAd;

      if (targetPhase === 'VOTING') {
        this.setPhase('VOTING', 10);
        this.votesA = 0;
        this.votesB = 0;
        this.userVotes.clear();
        this.addSystemMessage(`⏳ TIME TO VOTE! You have 10 seconds to choose the next scene branch.`);
        broadcastCinemaEvent('phase_change', {
          phase: 'VOTING',
          timeRemaining: 10,
          phaseDuration: 10,
          phaseStartedAt: this.phaseStartedAt,
          phaseEndsAt: this.phaseEndsAt,
          options: currentStep.options
        });
      } else {
        this.setPhase('PLAYING', 15);
      }

      broadcastCinemaEvent('ad_break_ended', {
        phase: this.phase,
        timeRemaining: this.timeRemaining,
        phaseDuration: this.phaseDuration,
        phaseStartedAt: this.phaseStartedAt,
        phaseEndsAt: this.phaseEndsAt
      });
      await this.broadcastStateSnapshot(workerId);
      return;
    }

    if (this.phase === 'PLAYING') {
      // 15 seconds clip has ended.
      const currentStepNum = this.movie.currentStep;

      // FIRST-SHOT UNINTERRUPTED PLAYBACK:
      // Steps 1, 2, and 3 transition directly into the next scene without voting breaks,
      // delivering exactly 1 minute (4 x 15s) of continuous cinematic storytelling.
      // The first interactive audience voting only opens after Step 4 completes.
      if (currentStepNum < 4 && this.movie.steps.some(s => s.stepNumber === currentStepNum + 1)) {
        const nextStepNum = currentStepNum + 1;
        this.movie.currentStep = nextStepNum;
        const nextStepObj = this.movie.steps.find(s => s.stepNumber === nextStepNum) || this.movie.steps[nextStepNum - 1];
        const duration = nextStepObj?.duration || 15;

        this.setPhase('PLAYING', duration);
        if (nextStepNum === 2) {
          this.addSystemMessage(`🎬 Scene 2/4: Establishing the protagonist & signature mission...`);
        } else if (nextStepNum === 3) {
          this.addSystemMessage(`🎬 Scene 3/4: A looming threat emerges... tensions rise!`);
        } else if (nextStepNum === 4) {
          this.addSystemMessage(`⚠️ SCENE 4/4: THE FIRST CONFLICT! The crisis explodes — the audience will decide the resolution!`);
        } else {
          this.addSystemMessage(`🎬 First-shot sequence continuing: Scene ${nextStepNum}/4 ("${nextStepObj?.title || 'Continuing'}")`);
        }

        // Broadcast new_step so EVERY client (including late joiners) switches to the
        // next prologue scene authoritatively — 4 x 15s = 1 minute uninterrupted.
        broadcastCinemaEvent('new_step', {
          step: nextStepObj,
          currentStep: nextStepNum,
          totalSteps: this.movie.totalSteps || this.movie.steps.length,
          phaseDuration: duration,
          phaseStartedAt: this.phaseStartedAt,
          phaseEndsAt: this.phaseEndsAt
        });
        broadcastCinemaEvent('phase_change', {
          phase: 'PLAYING',
          timeRemaining: duration,
          phaseDuration: duration,
          phaseStartedAt: this.phaseStartedAt,
          phaseEndsAt: this.phaseEndsAt
        });
        await this.broadcastStateSnapshot(workerId);
        return;
      }

      // Ads are now seamlessly embedded in Block 2 (Mid-roll) within the scene itself.
      // Scene completion transitions directly to audience voting!
      this.pendingPreGeneratedAd = null;

      // Enter 10-second VOTING phase!
      this.setPhase('VOTING', 10);
      this.votesA = 0;
      this.votesB = 0;
      this.userVotes.clear();
      if (currentStepNum === 4) {
        this.addSystemMessage(`⚔️ FIRST AUDIENCE DECISION: The first conflict has arrived! Cast your vote now to decide the story's direction!`);
      } else {
        this.addSystemMessage(`⏳ TIME TO VOTE! You have 10 seconds to choose the next scene branch.`);
      }

      broadcastCinemaEvent('phase_change', {
        phase: 'VOTING',
        timeRemaining: 10,
        phaseDuration: 10,
        phaseStartedAt: this.phaseStartedAt,
        phaseEndsAt: this.phaseEndsAt,
        options: currentStep.options
      });
      await this.broadcastStateSnapshot(workerId);
    } 
    else if (this.phase === 'VOTING') {
      // 10-second voting has concluded -> Resolve winner
      this.setPhase('GENERATING', 6); // 6s buffer for secret ballot results reveal and zoom-out/zoom-in transitions
      this.blockbusterCandidates = [];
      this.blockbusterUserVotes.clear();
      this.blockbusterVoteCounts = { A: 0, B: 0, C: 0, D: 0 };

      let chosenOption: 'A' | 'B';
      let wasRandomPick = false;

      if (this.votesA > this.votesB) {
        chosenOption = 'A';
      } else if (this.votesB > this.votesA) {
        chosenOption = 'B';
      } else {
        // Tie or zero votes -> Automatic random selection
        chosenOption = Math.random() > 0.5 ? 'A' : 'B';
        wasRandomPick = true;
      }

      // Record selected option in step history
      currentStep.selectedOption = chosenOption;
      currentStep.wasRandomPick = wasRandomPick;
      currentStep.options[0].votes = this.votesA;
      currentStep.options[1].votes = this.votesB;
      this.movie.totalVotesCast += (this.votesA + this.votesB);

      // Persist completed step decisions to Supabase
      await persistMovieStep(this.movie.id, currentStep);

      const winningOption = currentStep.options.find(o => o.id === chosenOption)!;

      // Broadcast phase change to GENERATING with the selected option
      broadcastCinemaEvent('phase_change', {
        phase: 'GENERATING',
        timeRemaining: 0,
        selectedOption: chosenOption,
        wasRandomPick,
        winningOption,
        votesA: this.votesA,
        votesB: this.votesB
      });
      await this.broadcastStateSnapshot(workerId);

      if (wasRandomPick) {
        this.addSystemMessage(`🎲 [TIE / RANDOM] Fate chose at random: OPTION ${chosenOption} ("${winningOption.title}")`);
      } else {
        const percent = Math.round((chosenOption === 'A' ? this.votesA : this.votesB) / (this.votesA + this.votesB) * 100);
        this.addSystemMessage(`🏆 VOTING CLOSED! Audience selected OPTION ${chosenOption} ("${winningOption.title}") with ${percent}% of votes.`);
      }

      // CHECK IF TOTAL_STEPS (50) COMPLETED: GENERATE FINAL SUMMARY & AUTO-START NEXT BLOCKBUSTER
      if (this.movie.steps.length >= TOTAL_STEPS) {
        this.movie.status = 'completed';
        this.movie.completedAt = new Date().toISOString();

        try {
          this.addSystemMessage(`📜 Film complete! DeepSeek synthesizing 50-step narrative retrospective and master synopsis...`);
          const finalReport = await generateMovieFinalSummaryWithDeepSeek(this.movie);
          this.movie.finalSummary = finalReport.finalSummary;
          this.movie.finalSynopsis = finalReport.finalSynopsis;
        } catch (err) {
          console.error("Error generating final summary:", err);
        }

        // Persist completed movie with final summaries to Supabase
        await persistMovie(this.movie);
        this.completedMovies.push({ ...this.movie });

        this.addSystemMessage(`🌟 MASTERPIECE COMPLETED! Definitive synopsis created. The full movie is now saved to the Cinema Gallery.`);
        broadcastCinemaEvent('movie_completed', {
          movie: this.movie
        });

        // REQUISITO: Al terminar una película, la audiencia elige la siguiente entre 4 candidatas.
        // startNextBlockbusterMovie es ASYNC y no bloquea: la votación de 60s se abre de inmediato
        // y la película ganadora se genera en segundo plano, transmitiéndose al terminar.
        this.addSystemMessage(`🎟️ MASTERPIECE COMPLETE: Opening the NEXT BLOCKBUSTER audience vote...`);
        try {
          await this.prepareBlockbusterVoting();
        } catch (err) {
          console.error('[Cinema] Blockbuster voting preparation failed, auto-rotating:', err);
          this.startNextBlockbusterMovie().catch((e) => console.error('[Cinema] Fallback rotation failed:', e));
        }
        return;
      }

      // Rule: take the last 30 comments, pick ONE at random, and let it influence
      // exactly ONE of the two next options (the other follows the normal route).
      // The picked comment is marked as used and never reconsidered in later rounds.
      const commentInfluence = await this.selectCommentForInfluence();

      const nextStepNum = currentStep.stepNumber + 1;
      // Narrative continuity: always link to Shot 2 of previous scene (or Shot 1), NEVER to an ad!
      const storyReferenceUrl = currentStep.videoUrl2 || currentStep.videoUrl;

      // Extract pre-computed Cinematique prompts from winning option (with guaranteed fallback)
      const guaranteedWinningOption = ensureOptionPrompts(winningOption, chosenOption, {
        characterName: this.movie.bible.characters[0]?.name,
        visualTraits: this.movie.bible.characters[0]?.visualTraits,
        clothing: this.movie.bible.characters[0]?.clothing,
        propName: this.movie.bible.props[0]?.name,
        propVisual: this.movie.bible.props[0]?.visualAppearance,
        envName: this.movie.bible.environments[0]?.name,
        cinematicStyle: this.movie.bible.cinematicStyle
      });

      const videoPromptToUse = guaranteedWinningOption.visualPrompt!;
      const cameraPromptToUse = guaranteedWinningOption.cameraMotionPrompt || "Cinematic camera dolly tracking with shallow depth of field, 24fps";
      const videoPrompt2ToUse = guaranteedWinningOption.visualPrompt2 || `${videoPromptToUse}, climax reaction and dramatic consequence`;
      const cameraPrompt2ToUse = guaranteedWinningOption.cameraMotionPrompt2 || "Cinematic tracking shot, closer framing, high intensity, 24fps";
      const voiceDirectionToUse = guaranteedWinningOption.voiceDirection || currentStep.voiceDirection || this.movie.bible.characters[0]?.voicePrompt;

      // Check if a mid-roll commercial ad should be embedded in Block 2 of this scene
      const isAdStep = Boolean(
        this.adsConfig.autoAdsEnabled &&
        nextStepNum > 1 &&
        nextStepNum % this.adsConfig.adIntervalSteps === 0 &&
        nextStepNum !== this.adsConfig.lastAdStep &&
        nextStepNum < TOTAL_STEPS - 2
      );

      let adToPlay: ImmersiveAd | null = null;
      if (isAdStep) {
        adToPlay = this.pickRandomCommercialAd() || DEFAULT_IMMERSIVE_ADS[0];
        this.adsConfig.lastAdStep = nextStepNum;
        if (adToPlay) {
          adToPlay.impressions = (adToPlay.impressions || 0) + 1;
          recordAdMetric(adToPlay.id, 'impression');
          this.activeAd = adToPlay;
        }
      }

      // Ensure all active props have their reference assets stored in Supabase Storage
      const activePropImages = this.movie.bible.props
        .map(p => p.imageUrl)
        .filter(Boolean) as string[];

      let nextStep: MovieStep | null = null;
      try {
        console.log(`[Cinema] 🚀 Immediate Fal.ai dual-shot video dispatch for Step ${nextStepNum} (30s block${isAdStep ? ' + 15s mid-roll ad = 45s' : ''})`);

        // 1. DISPATCH FAL.AI DUAL-SHOT VIDEO GENERATION (2 consecutive 15s videos = 30s)
        const videoPromise = (async () => {
          if (this.isGenerationPaused) {
            console.log(`[Cinema] 🛡️ Generación PAUSADA: Seleccionando 2 videos existentes para la escena ${nextStepNum}.`);
            return this.pickTwoArchivedOrMockVideos(nextStepNum);
          } else {
            await this.refreshGenerationPrefsFromDb();
            return generateDualShotVideoWithFal({
              prompt1: videoPromptToUse,
              cameraMotion1: cameraPromptToUse,
              prompt2: videoPrompt2ToUse,
              cameraMotion2: cameraPrompt2ToUse,
              stepNumber: nextStepNum,
              previousVideoUrl: storyReferenceUrl,
              propReferenceImages: activePropImages,
              voiceDirection: voiceDirectionToUse,
              model: this.videoModel,
              resolution: this.videoResolution || undefined
            });
          }
        })();

        // 2. DISPATCH AD VIDEO GENERATION IN PARALLEL IF AD STEP (BLOCK 2 MID-ROLL)
        const adPromise = (async (): Promise<string | null> => {
          if (!isAdStep || !adToPlay) return null;
          if (this.isGenerationPaused) {
            return adToPlay.generatedAdVideoUrl || adToPlay.videoUrl || DEFAULT_IMMERSIVE_ADS[0].videoUrl || null;
          }
          try {
            await this.refreshGenerationPrefsFromDb();
            const adPrompt = await this.buildAdGenerationPrompt(adToPlay);
            const adRes = await generateVideoWithFal({
              prompt: adPrompt,
              cameraMotion: "Smooth dolly or static hold, matching the previous scene's camera language",
              stepNumber: nextStepNum,
              previousVideoUrl: storyReferenceUrl || undefined,
              model: this.videoModel,
              resolution: this.videoResolution || undefined
            });
            if (adRes.videoUrl && !this.generatedAdVideoArchive.includes(adRes.videoUrl)) {
              this.generatedAdVideoArchive.push(adRes.videoUrl);
            }
            adToPlay.generatedAdVideoUrl = adRes.videoUrl;
            persistImmersiveAd(adToPlay);
            return adRes.videoUrl;
          } catch (err) {
            console.warn('[Cinema] Ad generation error, using fallback:', err);
            return adToPlay.videoUrl || DEFAULT_IMMERSIVE_ADS[0].videoUrl || null;
          }
        })();

        // 3. RUN DEEPSEEK IN PARALLEL IN BACKGROUND: Flesh out dialogue, new characters/props,
        // and pre-generate the NEXT pair of options (with their dual visualPrompts)
        const deepseekPromise: Promise<MovieStep | null> = generateNextStepWithDeepSeek(
          this.movie,
          chosenOption,
          currentStep,
          commentInfluence ?? undefined
        ).catch((err) => {
          console.warn("[Cinema] DeepSeek next-step generation error during background execution:", err);
          return null;
        });

        // Await dual-shot video rendering, LLM option generation, and optional ad concurrently
        const [videoRes, nextStepRaw, adVideoUrl] = await Promise.all([videoPromise, deepseekPromise, adPromise]);

        if (commentInfluence) {
          this.addSystemMessage(`💡 La idea de @${commentInfluence.userName} moldea la Opción ${commentInfluence.optionId} de esta ronda (comentario marcado como usado).`);
        }

        if (this.isGenerationPaused) {
          this.addSystemMessage(`🎲 [ARCHIVE REPLAY] Generación pausada. Escena #${nextStepNum}: "${guaranteedWinningOption.title}" (30s) activa.`);
        } else if (isAdStep && adVideoUrl) {
          this.addSystemMessage(`📺 [MID-ROLL SPONSOR] Anuncio integrado en Bloque 2 para "${adToPlay?.brandName}". Duración total escena: 45s.`);
        }

        // Handle newly introduced characters & props from the LLM if any
        if (nextStepRaw?.newCharacter) {
          const charExists = this.movie.bible.characters.some(c => c.id === nextStepRaw.newCharacter?.id);
          if (!charExists) {
            this.movie.bible.characters.push(nextStepRaw.newCharacter);
          }

          if (nextStepRaw.newProp) {
            try {
              console.log(`[Cinema] Generating and storing reference asset for new prop "${nextStepRaw.newProp.name}" in Supabase Storage...`);
              nextStepRaw.newProp.imageUrl = await generateAndStorePropReferenceImage(nextStepRaw.newProp);
              await persistProp(this.movie.id, nextStepRaw.newProp);
            } catch (err) {
              console.warn(`[Cinema] Error storing new prop image in Supabase Storage:`, err);
            }

            const propExists = this.movie.bible.props.some(p => p.id === nextStepRaw.newProp?.id);
            if (!propExists) {
              this.movie.bible.props.push(nextStepRaw.newProp);
            }
            this.addSystemMessage(`🎭 New character introduced by narrative: "${nextStepRaw.newCharacter.name}" (${nextStepRaw.newCharacter.role}) with signature consistency prop: "${nextStepRaw.newProp.name}".`);
          }
        }

        // Consume and reset preAdVideoUrl — it must never persist past this step
        this.preAdVideoUrl = null;

        const hasAd = Boolean(isAdStep && adVideoUrl);
        const stepDuration = hasAd ? 45 : 30;

        // Construct nextStep merging the dual video renders and next pre-computed options
        nextStep = {
          stepNumber: nextStepNum,
          title: guaranteedWinningOption.title || nextStepRaw?.title || `Scene ${nextStepNum}`,
          synopsis: nextStepRaw?.synopsis || guaranteedWinningOption.synopsis || `${guaranteedWinningOption.title}: ${guaranteedWinningOption.text}`,
          dialogueSnippet: nextStepRaw?.dialogueSnippet || guaranteedWinningOption.dialogueSnippet,
          subtitles: nextStepRaw?.subtitles || guaranteedWinningOption.subtitles || [
            {
              start: 1.0,
              end: 14.0,
              speaker: this.movie.bible.characters[0]?.name || "Character",
              text: guaranteedWinningOption.title,
              textEs: guaranteedWinningOption.title
            },
            {
              start: hasAd ? 31.0 : 16.0,
              end: hasAd ? 44.0 : 29.0,
              speaker: this.movie.bible.characters[0]?.name || "Character",
              text: guaranteedWinningOption.text || guaranteedWinningOption.title,
              textEs: guaranteedWinningOption.text || guaranteedWinningOption.title
            }
          ],
          voiceDirection: nextStepRaw?.voiceDirection || voiceDirectionToUse,
          visualPrompt: videoPromptToUse,
          cameraMotionPrompt: cameraPromptToUse,
          visualPrompt2: videoPrompt2ToUse,
          cameraMotionPrompt2: cameraPrompt2ToUse,
          videoUrl: videoRes.shot1.videoUrl,
          thumbnailUrl: videoRes.shot1.thumbnailUrl,
          videoUrl2: videoRes.shot2.videoUrl,
          hasMidRollAd: hasAd,
          adVideoUrl: hasAd ? (adVideoUrl ?? undefined) : undefined,
          referenceVideoUrl: storyReferenceUrl,
          propReferenceImages: activePropImages,
          duration: stepDuration,
          votingWindowSeconds: 10,
          options: nextStepRaw?.options || [
            ensureOptionPrompts({ id: 'A', title: 'Advance the Offensive', text: 'Push forward into the breach.', dramaticHook: 'High risk frontal assault.', expectedConsequence: 'Immediate combat escalation.', votes: 0 }, 'A', { characterName: this.movie.bible.characters[0]?.name, envName: this.movie.bible.environments[0]?.name, cinematicStyle: this.movie.bible.cinematicStyle }),
            ensureOptionPrompts({ id: 'B', title: 'Regroup and Adapt', text: 'Fall back into the defensive perimeter.', dramaticHook: 'Strategic redeployment.', expectedConsequence: 'Preserves resources at cost of tempo.', votes: 0 }, 'B', { characterName: this.movie.bible.characters[0]?.name, envName: this.movie.bible.environments[0]?.name, cinematicStyle: this.movie.bible.cinematicStyle })
          ],
          activeCharacters: nextStepRaw?.activeCharacters || currentStep.activeCharacters,
          activeProps: nextStepRaw?.activeProps || currentStep.activeProps,
          newCharacter: nextStepRaw?.newCharacter,
          newProp: nextStepRaw?.newProp,
          environment: nextStepRaw?.environment || currentStep.environment,
          createdAt: new Date().toISOString()
        };

        this.movie.steps.push(nextStep);
        this.movie.currentStep = nextStep.stepNumber;

        // Persist update in Supabase
        await persistMovie(this.movie);
        await persistMovieStep(this.movie.id, nextStep);

        // Transition immediately to PLAYING for the full stepDuration (30s or 45s)
        this.votesA = 0;
        this.votesB = 0;
        this.userVotes.clear();
        this.setPhase('PLAYING', stepDuration);

        // Realtime broadcast of new clip and phase transition
        broadcastCinemaEvent('new_step', {
          step: nextStep,
          currentStep: nextStep.stepNumber,
          phaseDuration: stepDuration,
          phaseStartedAt: this.phaseStartedAt,
          phaseEndsAt: this.phaseEndsAt
        });

        broadcastCinemaEvent('phase_change', {
          phase: 'PLAYING',
          timeRemaining: stepDuration,
          phaseDuration: stepDuration,
          phaseStartedAt: this.phaseStartedAt,
          phaseEndsAt: this.phaseEndsAt
        });

        await this.broadcastStateSnapshot(workerId);
      } catch (err) {
        console.error("Error generating next step:", err);
        // Fallback recovery if something catastrophic happened
        const mockIndex = nextStepNum % CINEMATIC_MOCK_VIDEOS.length;
        const mock1 = CINEMATIC_MOCK_VIDEOS[mockIndex];
        const mock2 = CINEMATIC_MOCK_VIDEOS[(mockIndex + 1) % CINEMATIC_MOCK_VIDEOS.length];
        const fallbackStep: MovieStep = {
          stepNumber: nextStepNum,
          title: guaranteedWinningOption.title || `Scene ${nextStepNum}`,
          synopsis: guaranteedWinningOption.synopsis || guaranteedWinningOption.title,
          visualPrompt: videoPromptToUse,
          cameraMotionPrompt: cameraPromptToUse,
          videoUrl: mock1.url,
          videoUrl2: mock2.url,
          duration: 30,
          votingWindowSeconds: 10,
          options: [
            ensureOptionPrompts({ id: 'A', title: 'Advance', text: 'Push forward.', dramaticHook: 'Assault', expectedConsequence: 'Combat', votes: 0 }, 'A', {}),
            ensureOptionPrompts({ id: 'B', title: 'Regroup', text: 'Fall back.', dramaticHook: 'Defense', expectedConsequence: 'Tactical delay', votes: 0 }, 'B', {})
          ],
          activeCharacters: currentStep.activeCharacters,
          activeProps: currentStep.activeProps,
          environment: currentStep.environment,
          createdAt: new Date().toISOString()
        };
        this.movie.steps.push(fallbackStep);
        this.movie.currentStep = fallbackStep.stepNumber;
        this.votesA = 0;
        this.votesB = 0;
        this.userVotes.clear();
        this.setPhase('PLAYING', 30);
        await this.broadcastStateSnapshot(workerId);
      }
    }
    else if (this.phase === 'GENERATING') {
      // Watchdog: If the engine is in GENERATING and the timer elapsed,
      // verify that an async movie reset or generation is not actively mid-flight.
      if (this.isResetting || this.initializeMoviePromise || !this.movie || this.movie.status === 'completed') {
        console.log('[CinemaEngine] Movie generation still mid-flight (or awaiting premiere) — extending GENERATING timer.');
        this.phaseEndsAt = Date.now() + 15000;
        this.timeRemaining = 15;
        this.phaseDuration = 15;
        await this.persistCurrentStateToSupabase(workerId);
        return;
      }

      console.log(`[CinemaEngine] ⏱️ Watchdog: GENERATING phase buffer ended for Step ${this.movie.currentStep}. Transitioning to PLAYING...`);
      const currentStepObj = (this.movie.steps.find(s => s.stepNumber === this.movie!.currentStep))
        || this.movie.steps[this.movie.steps.length - 1]
        || this.movie.steps[0];
      const duration = currentStepObj?.duration || 15;
      this.setPhase('PLAYING', duration);
      this.votesA = 0;
      this.votesB = 0;
      this.userVotes.clear();

      broadcastCinemaEvent('phase_change', {
        phase: 'PLAYING',
        timeRemaining: duration,
        phaseDuration: duration,
        phaseStartedAt: this.phaseStartedAt,
        phaseEndsAt: this.phaseEndsAt
      });
      await this.persistCurrentStateToSupabase(workerId);
      await this.broadcastStateSnapshot(workerId);
      return;
    }
  }

  public castVote(userId: string, optionId: 'A' | 'B', userName?: string): { success: boolean; votesA: number; votesB: number } {
    if (this.phase !== 'VOTING') {
      return { success: false, votesA: this.votesA, votesB: this.votesB };
    }

    const previousVote = this.userVotes.get(userId);
    if (previousVote === optionId) {
      return { success: true, votesA: this.votesA, votesB: this.votesB };
    }

    if (previousVote === 'A') this.votesA--;
    if (previousVote === 'B') this.votesB--;

    if (optionId === 'A') this.votesA++;
    if (optionId === 'B') this.votesB++;

    this.userVotes.set(userId, optionId);

    // Persist vote and updated counts directly to Supabase
    if (this.movie) {
      recordUserVoteInDb(this.movie.id, this.movie.currentStep, userId, optionId, userName);
      this.persistCurrentStateToSupabase();
    }

    // Broadcast updated vote counts via Realtime
    broadcastCinemaEvent('vote_update', {
      votesA: this.votesA,
      votesB: this.votesB,
      totalVotes: this.votesA + this.votesB,
      timeRemaining: this.timeRemaining,
      totalAudience: this.totalAudience
    });

    return { success: true, votesA: this.votesA, votesB: this.votesB };
  }

  /**
   * Prepare the 30-second NEXT BLOCKBUSTER audience voting stage:
   * generates 4 varied candidate movies (title, logline, genre) and enters BLOCKBUSTER_VOTING.
   */
  public async prepareBlockbusterVoting(): Promise<BlockbusterCandidate[]> {
    let candidates: BlockbusterCandidate[] = [];
    try {
      const dbMovies = await loadAllMoviesFromDb().catch(() => []);
      const existingTitles = dbMovies.map(m => m.title).filter(Boolean);
      candidates = await generateBlockbusterCandidatesWithDeepSeek(existingTitles);
    } catch (err) {
      console.error('[Cinema] Error generating blockbuster candidates:', err);
    }

    this.blockbusterCandidates = candidates;
    this.blockbusterVoteCounts = { A: 0, B: 0, C: 0, D: 0 };
    this.blockbusterUserVotes.clear();

    // Seed counts from the realtime database (survives server restarts mid-vote)
    if (this.movie) {
      try {
        this.blockbusterVoteCounts = await loadBlockbusterVoteCountsFromDb(this.movie.id);
      } catch (err) {
        console.warn('[Cinema] Could not restore blockbuster vote counts from DB:', err);
      }
    }

    this.isPaused = false;
    this.setPhase('BLOCKBUSTER_VOTING', 60);
    this.addSystemMessage(`🎟️ NEXT BLOCKBUSTER VOTE: The audience has 60 seconds to pick the next film!`);

    broadcastCinemaEvent('phase_change', {
      phase: 'BLOCKBUSTER_VOTING',
      timeRemaining: 60,
      phaseDuration: 60,
      phaseStartedAt: this.phaseStartedAt,
      phaseEndsAt: this.phaseEndsAt,
      blockbusterCandidates: this.blockbusterCandidates,
      blockbusterVoteCounts: this.blockbusterVoteCounts
    });
    // Dedicated event so viewers switch to the selection phase even mid-PLAYING
    // (state_snapshot intentionally never cuts live playback).
    broadcastCinemaEvent('blockbuster_vote_started', {
      candidates: this.blockbusterCandidates,
      timeRemaining: 60,
      phaseDuration: 60,
      phaseStartedAt: this.phaseStartedAt,
      phaseEndsAt: this.phaseEndsAt
    });
    await this.broadcastStateSnapshot();
    return candidates;
  }

  /**
   * Cast a vote for the next blockbuster movie during the BLOCKBUSTER_VOTING stage.
   * Persisted in Supabase (blockbuster_votes, realtime-published) as well as memory.
   */
  public castBlockbusterVote(userId: string, candidateId: 'A' | 'B' | 'C' | 'D'): { success: boolean; counts: Record<'A' | 'B' | 'C' | 'D', number> } {
    if (!['A', 'B', 'C', 'D'].includes(candidateId)) {
      return { success: false, counts: this.blockbusterVoteCounts };
    }

    if (this.blockbusterCandidates.length > 0 && !this.blockbusterCandidates.some(c => c.id === candidateId)) {
      return { success: false, counts: this.blockbusterVoteCounts };
    }

    // Ensure phase matches BLOCKBUSTER_VOTING even if in-memory state lagged behind DB
    if (this.phase !== 'BLOCKBUSTER_VOTING') {
      this.phase = 'BLOCKBUSTER_VOTING';
    }

    const previousVote = this.blockbusterUserVotes.get(userId);
    if (previousVote === candidateId) {
      return { success: true, counts: this.blockbusterVoteCounts };
    }

    if (previousVote) {
      this.blockbusterVoteCounts[previousVote] = Math.max(0, (this.blockbusterVoteCounts[previousVote] || 0) - 1);
    }
    this.blockbusterVoteCounts[candidateId] = (this.blockbusterVoteCounts[candidateId] || 0) + 1;

    this.blockbusterUserVotes.set(userId, candidateId);

    // Persist to the realtime database (upsert: one vote per user per movie)
    if (this.movie) {
      persistBlockbusterVote(this.movie.id, userId, candidateId).catch((err) => {
        console.warn('[Cinema] Failed to persist blockbuster vote:', err);
      });
    }

    // Persist live state to Supabase cinema_state so counts are never wiped out by subsequent polls/snapshots
    this.persistCurrentStateToSupabase().catch((err) => {
      console.warn('[Cinema] Failed to persist live state on blockbuster vote:', err);
    });

    broadcastCinemaEvent('blockbuster_vote_update', {
      counts: this.blockbusterVoteCounts,
      timeRemaining: this.timeRemaining
    });

    return { success: true, counts: this.blockbusterVoteCounts };
  }

  public getBlockbusterUserVote(userId: string): 'A' | 'B' | 'C' | 'D' | null {
    return this.blockbusterUserVotes.get(userId) || null;
  }

  private resolveBlockbusterVote(): BlockbusterCandidate {
    if (this.blockbusterCandidates.length === 0) {
      this.blockbusterCandidates = [
        { id: 'A', title: 'Cyberpunk Odyssey', genre: 'Sci-Fi Action', logline: 'A rogue hacker uncovers an AI conspiracy in Neo-Tokyo.', premise: 'Cyberpunk dystopian thriller' },
        { id: 'B', title: 'Shadows of the West', genre: 'Western Thriller', logline: 'A lone gunslinger hunts a mystical outlaw across the badlands.', premise: 'Gritty supernatural western' },
        { id: 'C', title: 'Neon Phantom', genre: 'Cyberpunk Noir', logline: 'A detective investigates memory thefts in a neon-drenched city.', premise: 'Futuristic detective noir' },
        { id: 'D', title: 'Samurai Horizon', genre: 'Feudal Action', logline: 'A masterless warrior defends a mountain temple from warlords.', premise: 'Honor and katana warfare' }
      ];
    }

    const maxVotes = Math.max(...(['A', 'B', 'C', 'D'] as const).map(id => this.blockbusterVoteCounts[id] || 0));
    const leaders = maxVotes > 0
      ? this.blockbusterCandidates.filter(c => (this.blockbusterVoteCounts[c.id] || 0) === maxVotes)
      : this.blockbusterCandidates;
    const winner = leaders.length > 0
      ? leaders[Math.floor(Math.random() * leaders.length)]
      : this.blockbusterCandidates[0];

    return winner;
  }

  /**
   * Influence rule: take the last 30 audience comments, pick ONE at random and
   * mark it as used (in memory + DB) so it is never considered again. The pick
   * influences exactly one of the two next options, chosen at random.
   */
  private async selectCommentForInfluence(): Promise<CommentInfluence | null> {
    // Merge the DB's last comments (source of truth across processes) with live
    // memory so the picker always sees the true "last 30" regardless of which
    // process advances the film.
    if (this.movie && isSupabaseConfigured()) {
      try {
        const dbComments = await loadRecentChatMessagesFromDb(this.movie.id, 30);
        const known = new Map(this.chatMessages.map(m => [m.id, m]));
        for (const dbMsg of dbComments) {
          if (dbMsg.usedForInfluence) this.usedInfluenceCommentIds.add(dbMsg.id);
          if (!known.has(dbMsg.id)) known.set(dbMsg.id, dbMsg);
        }
        this.chatMessages = Array.from(known.values())
          .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
      } catch {
        // Fall back to in-memory comments
      }
    }

    const candidates = this.chatMessages
      .filter(m =>
        !m.isSystem &&
        !m.votedOption &&
        m.text.trim().length > 0 &&
        !this.usedInfluenceCommentIds.has(m.id)
      )
      .slice(-30);

    if (candidates.length === 0) return null;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    // Mark as used: never considered in a future round
    this.usedInfluenceCommentIds.add(pick.id);
    pick.usedForInfluence = true;
    if (this.movie) {
      markChatMessageUsedForInfluence(pick.id).catch(() => {
        // Non-blocking
      });
    }

    const optionId: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';

    return {
      commentId: pick.id,
      userName: pick.userName,
      text: pick.text.trim(),
      optionId
    };
  }

  /**
   * Upvote a comment by a spectator (identified by their session UUID).
   * Persists in Supabase and broadcasts realtime update.
   */
  public async voteComment(commentId: string, userId: string): Promise<{ success: boolean; votesCount: number; userVoted: boolean }> {
    const targetMsg = this.chatMessages.find(m => m.id === commentId);
    if (!targetMsg) return { success: false, votesCount: 0, userVoted: false };

    let voters = this.commentVotes.get(commentId);
    if (!voters) {
      voters = new Set<string>();
      this.commentVotes.set(commentId, voters);
    }

    let userVoted = false;
    if (voters.has(userId)) {
      voters.delete(userId);
      userVoted = false;
    } else {
      voters.add(userId);
      userVoted = true;
    }

    targetMsg.votesCount = voters.size;

    // Persist to Supabase in background
    if (this.movie) {
      voteChatMessageInDb(commentId, userId, this.movie.id).catch(err => {
        console.warn('[Cinema] Error persisting comment vote:', err);
      });
    }

    // Broadcast comment vote via Supabase Realtime
    broadcastCinemaEvent('comment_voted', {
      commentId,
      votesCount: targetMsg.votesCount,
      userId,
      userVoted
    });

    return { success: true, votesCount: targetMsg.votesCount, userVoted };
  }

  public addChatMessage(message: ChatMessage) {
    if (!message.createdAtMs) {
      message.createdAtMs = Date.now();
    }
    if (message.votesCount === undefined) {
      message.votesCount = 0;
    }

    this.chatMessages.push(message);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }

    // Persist chat to Supabase if movie is active
    if (this.movie) {
      persistChatMessage(this.movie.id, message);
    }

    // Broadcast chat message via Supabase Realtime
    broadcastCinemaEvent('chat_message', message);
  }

  public addSystemMessage(text: string) {
    this.addChatMessage({
      id: `sys_${Date.now()}`,
      userId: "system",
      userName: "SISTEMA",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMs: Date.now(),
      votesCount: 0,
      isSystem: true
    });
  }

  /**
   * Pick a random active commercial-break ad.
   */
  private pickRandomCommercialAd(): ImmersiveAd | undefined {
    const activeAds = this.adsList.filter(a => a.isActive && a.type === 'commercial_break');
    if (activeAds.length === 0) return undefined;
    return activeAds[Math.floor(Math.random() * activeAds.length)];
  }

  /**
   * Build the fal.ai generation prompt for an immersive ad. DeepSeek writes a
   * cinematic prompt that weaves the product INTO the story world when available;
   * otherwise falls back to the ad's own cinematicPrompt / a generic template.
   * The product never leaks into the NEXT story step's prompt (story generation
   * only reads the movie bible + audience comments, never the ad).
   */
  private async buildAdGenerationPrompt(ad: ImmersiveAd): Promise<string> {
    if (this.movie) {
      try {
        const characters = (this.movie.bible.characters || [])
          .slice(0, 4)
          .map(c => `${c.name} (${c.role}, ${c.visualTraits || ''})`)
          .join('; ');
        const lastStep = this.movie.steps[this.movie.steps.length - 1];
        const environment = lastStep?.synopsis || this.movie.initialPlot || '';

        const immersive = await generateImmersiveAdPromptWithDeepSeek({
          brandName: ad.brandName,
          title: ad.title,
          tagline: ad.tagline,
          description: ad.description,
          movieTitle: this.movie.title,
          genre: this.movie.genre,
          cinematicStyle: (this.movie.bible as any)?.cinematicStyle || '',
          characters,
          environment
        });
        if (immersive) return immersive;
      } catch (err) {
        console.warn('[Cinema] Immersive ad prompt generation failed, using template fallback:', err);
      }
    }

    const rawPrompt = ad.cinematicPrompt
      || `A character naturally interacts with or observes "${ad.brandName}". ${ad.tagline || ''}. Maintain identical cinematic lighting, colors, lens flare, and environment as the previous shot.`;

    const promptPrefix = "Continúa la escena e integra este anuncio de forma natural en la historia: ";
    return rawPrompt.startsWith(promptPrefix) ? rawPrompt : `${promptPrefix}${rawPrompt}`;
  }

  /**
   * Pre-generate the upcoming commercial ad clip IN PARALLEL with the story clip
   * generation. By the time the story clip finishes playing and the break starts,
   * the ad is already rendered and only needs to be played back.
   */
  private async preGenerateUpcomingAd(stepNumber: number, referenceVideoUrl: string): Promise<void> {
    if (!this.adsConfig.autoAdsEnabled) return;
    if (this.isGenerationPaused) return;
    if (stepNumber <= 0) return;
    if (stepNumber % this.adsConfig.adIntervalSteps !== 0) return;
    if (stepNumber === this.adsConfig.lastAdStep) return;
    if (stepNumber >= TOTAL_STEPS - 3) return; // Never break during the denouement/finale: scene 50 must end the film

    const ad = this.pickRandomCommercialAd();
    if (!ad) return;

    const adPrompt = await this.buildAdGenerationPrompt(ad);

    console.log(`[Cinema] 🎬 Pre-generating ad clip for "${ad.brandName}" in parallel with story clip (Step ${stepNumber})...`);

    generateVideoWithFal({
      prompt: adPrompt,
      cameraMotion: "Smooth dolly or static hold, matching the previous scene's camera language",
      stepNumber,
      previousVideoUrl: referenceVideoUrl || undefined,
      model: this.videoModel,
      resolution: this.videoResolution || undefined
    }).then((adVideo) => {
      if (!this.adsConfig.autoAdsEnabled) return; // Auto-ads disabled while rendering: discard
      if (this.movie && this.movie.steps.length !== stepNumber) return; // Timeline moved on: discard
      this.pendingPreGeneratedAd = {
        ad,
        stepNumber,
        videoUrl: adVideo.videoUrl,
        thumbnailUrl: adVideo.thumbnailUrl,
        isRealAiGenerated: adVideo.isRealAiGenerated
      };
      console.log(`[Cinema] ✅ Pre-generated ad clip ready for "${ad.brandName}" (will play instantly at break time).`);
    }).catch((err) => {
      console.warn('[Cinema] Pre-generation of ad clip failed; will generate on demand at break time:', err);
    });
  }

  /**
   * Trigger an immersive commercial break.
   *
   * Flow:
   *  1. Capture the last story clip URL as preAdVideoUrl (preserved for the NEXT story step).
   *  2. Switch phase to COMMERCIAL_BREAK immediately so clients show the break screen.
   *  3. If the ad clip was pre-generated with the story clip, play it directly; otherwise
   *     generate the ad clip via fal.ai using the story clip as visual reference and
   *     the ad's cinematicPrompt as the screenplay — so the ad feels like it continues
   *     the film world, not an external interruption.
   *  4. Broadcast the generated ad video to all connected clients.
   *  5. The NEXT story step generation will use preAdVideoUrl (not the ad clip), ensuring
   *     the commercial has zero influence on future narrative direction.
   */
  public async triggerCommercialBreak(customAd?: ImmersiveAd, nextPhase: PlaybackPhase = 'VOTING'): Promise<boolean> {
    const currentStepCount = this.movie?.steps.length ?? 0;

    // If an ad clip was pre-generated TOGETHER with the story clip that just
    // finished, prefer that exact ad — never re-roll the random pick, or the
    // pre-rendered clip would be discarded and we'd burn credits again.
    const pendingForThisStep = !customAd &&
      this.pendingPreGeneratedAd &&
      this.pendingPreGeneratedAd.stepNumber === currentStepCount
      ? this.pendingPreGeneratedAd.ad
      : undefined;

    const adToPlay = customAd || pendingForThisStep || this.pickRandomCommercialAd() || DEFAULT_IMMERSIVE_ADS[0];

    if (!adToPlay) return false;

    // ── Step 1: Capture pre-ad story clip before switching phase ──────────────
    const lastStoryStep = this.movie?.steps[this.movie.steps.length - 1];
    this.preAdVideoUrl = lastStoryStep?.videoUrl || null;

    // ── Step 1b: Resolve the pre-generated ad clip (generated together with the story clip) ──
    let preGenerated: { ad: ImmersiveAd; stepNumber: number; videoUrl: string; thumbnailUrl: string; isRealAiGenerated: boolean } | null = null;
    if (!customAd && !this.isGenerationPaused) {
      if (
        this.pendingPreGeneratedAd &&
        this.pendingPreGeneratedAd.ad.id === adToPlay.id &&
        this.pendingPreGeneratedAd.stepNumber === currentStepCount
      ) {
        preGenerated = this.pendingPreGeneratedAd;
        this.pendingPreGeneratedAd = null; // Consumed — never reuse
      }
    }
    // Manual/custom breaks or stale/mismatched pending clips invalidate any pre-generated clip
    if (customAd || (!preGenerated && this.pendingPreGeneratedAd)) {
      this.pendingPreGeneratedAd = null;
    }

    // ── Step 2: Switch phase immediately so UI enters COMMERCIAL_BREAK ────────
    this.returnPhaseAfterAd = nextPhase;
    this.activeAd = adToPlay;
    adToPlay.duration = 15;
    this.setPhase('COMMERCIAL_BREAK', 15);

    // Track impression
    adToPlay.impressions = (adToPlay.impressions || 0) + 1;
    recordAdMetric(adToPlay.id, 'impression');

    // If the clip is already rendered, wire it into the ad BEFORE broadcasting so
    // clients play it directly instead of showing a placeholder.
    if (preGenerated) {
      adToPlay.generatedAdVideoUrl = preGenerated.videoUrl;
      adToPlay.isArchiveReplay = false;
      if (preGenerated.videoUrl && !this.generatedAdVideoArchive.includes(preGenerated.videoUrl)) {
        this.generatedAdVideoArchive.push(preGenerated.videoUrl);
      }
      persistImmersiveAd(adToPlay);
      this.addSystemMessage(`📺 INCOMING SPONSOR TRANSMISSION: "${adToPlay.brandName}" presents: ${adToPlay.title} (clip pre-rendered with the scene).`);
    } else {
      this.addSystemMessage(`📺 INCOMING SPONSOR TRANSMISSION: "${adToPlay.brandName}" presents: ${adToPlay.title}`);
    }

    // Broadcast initial break — clients play the pre-rendered clip immediately or a placeholder while fal.ai renders
    broadcastCinemaEvent('ad_break_started', {
      ad: adToPlay,
      timeRemaining: this.timeRemaining,
      phaseDuration: 15,
      phaseStartedAt: this.phaseStartedAt,
      phaseEndsAt: this.phaseEndsAt,
      phase: 'COMMERCIAL_BREAK'
    });
    await this.broadcastStateSnapshot();

    // ── Step 3: Handle ad playback — pre-generated clip, archive replay, or live generation ──
    if (preGenerated) {
      // Clip was generated together with the story clip — nothing to wait for.
      broadcastCinemaEvent('ad_video_generated', {
        adId: adToPlay.id,
        generatedAdVideoUrl: preGenerated.videoUrl,
        isRealAiGenerated: preGenerated.isRealAiGenerated,
        isPreGenerated: true
      });
    } else if (this.isGenerationPaused) {
      // Replay previous generated version of this ad or from the archive pool (zero fal.ai calls)
      const allPreviousAdVideos = Array.from(new Set([
        ...this.generatedAdVideoArchive,
        ...this.adsList.map(a => a.generatedAdVideoUrl).filter((u): u is string => Boolean(u)),
        ...this.adsList.map(a => a.videoUrl).filter((u): u is string => Boolean(u))
      ]));

      let replayAdUrl = adToPlay.generatedAdVideoUrl;
      if (!replayAdUrl && allPreviousAdVideos.length > 0) {
        replayAdUrl = allPreviousAdVideos[Math.floor(Math.random() * allPreviousAdVideos.length)];
      } else if (!replayAdUrl) {
        replayAdUrl = adToPlay.videoUrl || DEFAULT_IMMERSIVE_ADS[0].videoUrl;
      }

      if (replayAdUrl) {
        adToPlay.generatedAdVideoUrl = replayAdUrl;
        adToPlay.isArchiveReplay = true;
        this.activeAd = { ...adToPlay };

        this.addSystemMessage(`📺 [Archive Ad Replay] Reproduciendo versión anterior generada para "${adToPlay.brandName}" (cero créditos fal.ai).`);

        broadcastCinemaEvent('ad_video_generated', {
          adId: adToPlay.id,
          generatedAdVideoUrl: replayAdUrl,
          isArchiveReplay: true
        });

        await this.persistCurrentStateToSupabase();
        await this.broadcastStateSnapshot();
      }
    } else if (this.preAdVideoUrl || adToPlay.cinematicPrompt) {
      // Re-adopt the director's persisted model/resolution before spending credits
      await this.refreshGenerationPrefsFromDb();

      const adPrompt = await this.buildAdGenerationPrompt(adToPlay);

      generateVideoWithFal({
        prompt: adPrompt,
        cameraMotion: "Smooth dolly or static hold, matching the previous scene's camera language",
        stepNumber: this.movie?.steps.length ?? 0,
        previousVideoUrl: this.preAdVideoUrl || undefined,
        model: this.videoModel,
        resolution: this.videoResolution || undefined
      }).then(async (adVideo) => {
        if (!this.activeAd || this.activeAd.id !== adToPlay.id) return; // Phase already changed

        adToPlay.generatedAdVideoUrl = adVideo.videoUrl;
        adToPlay.isArchiveReplay = false;
        this.activeAd = { ...adToPlay }; // Trigger reactivity

        // Store into historical archive
        if (adVideo.videoUrl && !this.generatedAdVideoArchive.includes(adVideo.videoUrl)) {
          this.generatedAdVideoArchive.push(adVideo.videoUrl);
        }

        // Persist generated URL to Supabase
        persistImmersiveAd(adToPlay);

        // Broadcast update so clients switch to the AI-generated ad clip
        broadcastCinemaEvent('ad_video_generated', {
          adId: adToPlay.id,
          generatedAdVideoUrl: adVideo.videoUrl,
          isRealAiGenerated: adVideo.isRealAiGenerated
        });
      }).catch((err) => {
        console.warn('[Cinema] Ad clip generation failed, using static fallback:', err);
      });
    }

    return true;
  }

  /**
   * Manual trigger from Admin panel
   */
  public async triggerManualAdBreak(adId?: string): Promise<boolean> {
    let targetAd: ImmersiveAd | undefined;
    if (adId) {
      targetAd = this.adsList.find(a => a.id === adId);
    }
    return this.triggerCommercialBreak(targetAd, 'VOTING');
  }

  /**
   * Record click or interaction with an ad and grant community perk if defined
   */
  public recordAdInteraction(adId: string, metric: 'impression' | 'click') {
    const ad = this.adsList.find(a => a.id === adId);
    if (ad) {
      if (metric === 'click') {
        ad.clicks = (ad.clicks || 0) + 1;
        if (ad.perkReward) {
          this.totalAudience += 10;
          this.addSystemMessage(`🎁 SPONSOR PERK UNLOCKED! Viewer interacted with "${ad.brandName}": ${ad.perkReward}`);
        }
      } else {
        ad.impressions = (ad.impressions || 0) + 1;
      }
    }
    recordAdMetric(adId, metric);
  }

  /**
   * Update ads configuration (intervals, auto-ads toggle)
   */
  public updateAdsConfig(config: Partial<AdsConfig>) {
    this.adsConfig = {
      ...this.adsConfig,
      ...config
    };
    // Config change invalidates any pre-generated ad clip
    this.pendingPreGeneratedAd = null;
    // Persist immediately so other processes/restarts see the change
    this.persistCurrentStateToSupabase();
    broadcastCinemaEvent('ads_config_update', this.adsConfig);
  }

  /**
   * Add or update an ad
   */
  public async addOrUpdateAd(ad: ImmersiveAd): Promise<boolean> {
    const existingIndex = this.adsList.findIndex(a => a.id === ad.id);
    if (existingIndex >= 0) {
      this.adsList[existingIndex] = ad;
    } else {
      this.adsList.unshift(ad);
    }
    await persistImmersiveAd(ad);
    return true;
  }

  /**
   * Delete an ad
   */
  public async deleteAd(adId: string): Promise<boolean> {
    this.adsList = this.adsList.filter(a => a.id !== adId);
    await deleteImmersiveAdFromDb(adId);
    return true;
  }

  public getAds(): ImmersiveAd[] {
    return this.adsList;
  }

  /**
   * Rotate and start next blockbuster movie automatically using real AI (DeepSeek + fal.ai)
   */
  public async startNextBlockbusterMovie(customGenreOrPrompt?: BlockbusterCandidate | string): Promise<Movie> {
    this.addSystemMessage(`🍿 Initializing new blockbuster film premiere with real AI...`);
    const newMovie = await this.forceReset(customGenreOrPrompt);
    broadcastCinemaEvent('new_movie_started', { movie: newMovie });
    await this.broadcastStateSnapshot();
    return newMovie;
  }

  /**
   * Hard reset: clears in-memory state + archives old Supabase movie,
   * then generates a brand-new film using real AI APIs (DeepSeek + fal.ai).
   * Call this after adding API keys so the mockup content is discarded.
   */
  private resetPromise: Promise<Movie> | null = null;

  /**
   * Hard reset: clears in-memory state + archives old Supabase movie,
   * then generates a brand-new film using real AI APIs (DeepSeek + fal.ai).
   * Deduplicated: concurrent callers join the same in-flight reset.
   */
  public forceReset(customPrompt?: BlockbusterCandidate | string): Promise<Movie> {
    if (this.resetPromise) {
      console.log('[Cinema] forceReset already in progress — joining in-flight reset.');
      return this.resetPromise;
    }
    this.resetPromise = this.doForceReset(customPrompt).finally(() => {
      this.resetPromise = null;
    });
    return this.resetPromise;
  }

  private async doForceReset(customPrompt?: BlockbusterCandidate | string): Promise<Movie> {
    this.isResetting = true;
    try {
      // Stop the current engine loop
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      this.isRunning = false;

      // Clear in-memory voting and ad state. Keep previous movie metadata in memory (marked completed)
      // until the new movie finishes generating, so getState() and polling return coherent state.
      if (this.movie) {
        this.movie.status = 'completed';
      }
      this.timeRemaining = 90;
      this.votesA = 0;
      this.votesB = 0;
      this.userVotes.clear();
      this.activeAd = null;
      this.pendingPreGeneratedAd = null;
      // Do NOT clear blockbusterCandidates or blockbusterWinner here!
      // They are retained during GENERATING so that the audience sees the winning movie card and synthesis screen.
      this.blockbusterUserVotes.clear();
      this.blockbusterVoteCounts = { A: 0, B: 0, C: 0, D: 0 };

      // Do NOT call archiveAllStreamingMovies() here: persistMovie(newMovie) at the
      // end of initializeMovie automatically archives other streaming movies atomically.
      // This eliminates the 40-second void where no streaming movie exists in DB.

      this.addSystemMessage('🔄 Cinema engine reset. Generating new film with real AI...');

      // Now initialize fresh with real AI (customPrompt bypasses Supabase restore)
      const freshPrompt = customPrompt || `force_reset_${Date.now()}`;
      const newMovie = await this.initializeMovie(freshPrompt);
      // New film premiere is now active! Clear blockbuster selection state
      this.blockbusterWinner = null;
      this.blockbusterCandidates = [];
      broadcastCinemaEvent('new_movie_started', { movie: newMovie });
      await this.broadcastStateSnapshot();
      return newMovie;
    } finally {
      this.isResetting = false;
    }
  }

  public getState(userId?: string): CinemaState {
    const activeStep = (this.movie?.steps.find(s => s.stepNumber === this.movie!.currentStep))
      || this.movie?.steps[this.movie.steps.length - 1] 
      || {
      stepNumber: 1,
      title: "Loading clip...",
      synopsis: "Initializing cinematic transmission...",
      dialogueSnippet: "System connecting to neural stream...",
      subtitles: [
        { start: 1.0, end: 14.0, speaker: "System", text: "Connecting to live neural stream...", textEs: "Conectando al streaming neural en vivo..." }
      ],
      visualPrompt: "",
      cameraMotionPrompt: "",
      videoUrl: "",
      duration: 15,
      votingWindowSeconds: 10,
      options: [
        { id: "A", title: "Option A", text: "Awaiting initialization...", dramaticHook: "", expectedConsequence: "", votes: 0 },
        { id: "B", title: "Option B", text: "Awaiting initialization...", dramaticHook: "", expectedConsequence: "", votes: 0 }
      ],
      activeCharacters: [],
      activeProps: [],
      environment: "",
      createdAt: new Date().toISOString()
    };

    const hasUserVoted = userId ? this.userVotes.get(userId) || null : null;

    return {
      movie: this.movie!,
      phase: this.phase,
      timeRemaining: this.timeRemaining,
      phaseDuration: this.phaseDuration,
      phaseStartedAt: this.phaseStartedAt,
      phaseEndsAt: this.phaseEndsAt,
      totalAudience: this.totalAudience,
      votesA: this.votesA,
      votesB: this.votesB,
      hasUserVoted,
      activeStep,
      isLive: !this.isPaused,
      isPaused: this.isPaused,
      isGenerationPaused: this.isGenerationPaused,
      videoModel: this.videoModel,
      videoResolution: this.videoResolution,
      blockbusterCandidates: this.blockbusterCandidates,
      blockbusterVoteCounts: this.blockbusterVoteCounts,
      blockbusterWinner: this.blockbusterWinner ? {
        id: this.blockbusterWinner.id,
        title: this.blockbusterWinner.title,
        logline: this.blockbusterWinner.logline,
        genre: this.blockbusterWinner.genre,
        premise: this.blockbusterWinner.premise
      } : null,
      activeAd: this.activeAd,
      adsConfig: this.adsConfig,
      apiStatus: {
        hasDeepseek: Boolean(process.env.DEEPSEEK_API_KEY || process.env.NVIDIA_API_KEY),
        hasFal: Boolean(process.env.FAL_KEY),
        isMockMode: !(process.env.DEEPSEEK_API_KEY || process.env.NVIDIA_API_KEY) || !process.env.FAL_KEY
      }
    };
  }

  /**
   * Pause the live cinema playback and generative pipeline.
   * Freezes countdown timer and prevents automatic voting/step generation transitions.
   */
  public pause(): boolean {
    if (this.isPaused) return false;
    this.isPaused = true;
    if (this.movie) {
      this.movie.status = 'paused';
      persistMovie(this.movie);
    }
    this.addSystemMessage('⏸️ Cinema stream and AI generation PAUSED by Director.');
    broadcastCinemaEvent('cinema_paused', {
      isPaused: true,
      phase: this.phase,
      timeRemaining: this.timeRemaining
    });
    this.broadcastStateSnapshot();
    return true;
  }

  /**
   * Resume the live cinema stream and generation pipeline right where it was paused.
   */
  public resume(): boolean {
    if (!this.isPaused) return false;
    this.isPaused = false;
    if (this.movie) {
      this.movie.status = 'streaming';
      persistMovie(this.movie);
    }
    this.addSystemMessage('▶️ Cinema stream and AI generation RESUMED. Action continuing!');
    broadcastCinemaEvent('cinema_resumed', {
      isPaused: false,
      phase: this.phase,
      timeRemaining: this.timeRemaining
    });
    this.broadcastStateSnapshot();
    return true;
  }

  /**
   * Toggle between paused and streaming states.
   */
  public togglePause(): boolean {
    return this.isPaused ? this.resume() : this.pause();
  }

  /**
   * Pause AI video generation specifically.
   * When paused, scene transitions will randomly replay previously generated video clips
   * without calling DeepSeek or fal.ai.
   */
  public pauseGeneration(): boolean {
    if (this.isGenerationPaused) return false;
    this.isGenerationPaused = true;
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).__isCinemaGenerationPaused = true;
    }
    if (this.movie) {
      (this.movie.bible as any).isGenerationPaused = true;
      persistMovie(this.movie);
    }
    this.addSystemMessage('⏸️ AI scene generation PAUSED. Switching to random archive replay mode (zero video credits spent).');
    broadcastCinemaEvent('generation_paused', {
      isGenerationPaused: true
    });
    this.broadcastStateSnapshot();
    return true;
  }

  /**
   * Resume AI video generation with DeepSeek and fal.ai.
   */
  public resumeGeneration(): boolean {
    if (!this.isGenerationPaused) return false;
    this.isGenerationPaused = false;
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).__isCinemaGenerationPaused = false;
    }
    if (this.movie) {
      (this.movie.bible as any).isGenerationPaused = false;
      persistMovie(this.movie);
    }
    this.addSystemMessage('▶️ AI scene generation RESUMED. Next scenes will be synthesized with DeepSeek & fal.ai.');
    broadcastCinemaEvent('generation_resumed', {
      isGenerationPaused: false
    });
    this.broadcastStateSnapshot();
    return true;
  }

  /**
   * Toggle AI video generation pause status.
   */
  public togglePauseGeneration(): boolean {
    return this.isGenerationPaused ? this.resumeGeneration() : this.pauseGeneration();
  }

  /**
   * Silently adopt a persisted video model read from the database (no broadcast/persist).
   */
  public adoptVideoModel(model: string | null | undefined): void {
    const resolved = resolveVideoModel(model);
    if (resolved) {
      this.videoModel = resolved;
    }
  }

  /**
   * Re-read the director's persisted generation preferences (video model + resolution)
   * from the database right before spending credits. In multi-process deployments the
   * admin's choice is written by one process but generation may run in another — this
   * guarantees the cheap model stays the cheap model.
   */
  private async refreshGenerationPrefsFromDb(): Promise<void> {
    try {
      const ls = await loadLiveCinemaStateFromDb(this.movie?.id || undefined);
      if (ls) {
        this.adoptVideoModel(ls.videoModel);
        this.adoptVideoResolution(ls.videoResolution);
      }
    } catch (err) {
      console.warn('[Cinema] refreshGenerationPrefsFromDb failed:', err);
    }
  }

  /**
   * Silently adopt a persisted video resolution read from the database (no broadcast/persist).
   */
  public adoptVideoResolution(resolution: string | null | undefined): void {
    if (resolution === null || resolution === undefined || resolution === '') {
      this.videoResolution = null;
    } else if (isKnownVideoResolution(resolution)) {
      this.videoResolution = resolution;
    }
  }

  /**
   * Director selects the output resolution for video generation.
   * Empty string / null resets to the active model's default resolution.
   * Persisted in the movie bible so it survives restarts and movie rotations.
   */
  public setVideoResolution(resolution: string | null): boolean {
    if (!resolution) {
      this.videoResolution = null;
    } else if (!isKnownVideoResolution(resolution)) {
      return false;
    } else {
      this.videoResolution = resolution;
    }

    if (this.movie) {
      (this.movie.bible as any).videoResolution = this.videoResolution;
      persistMovie(this.movie);
    }
    const label = this.videoResolution ? this.videoResolution : 'Auto (por defecto del modelo)';
    this.addSystemMessage(`🎞️ Director set video resolution to ${label}.`);
    broadcastCinemaEvent('video_resolution_changed', { videoResolution: this.videoResolution });
    this.broadcastStateSnapshot();
    return true;
  }

  /**
   * Director selects which generative video model fal.ai should use.
   * Persisted in the movie bible so it survives restarts and movie rotations.
   */
  public setVideoModel(model: string): boolean {
    const resolved = resolveVideoModel(model);
    if (!resolved) return false;
    if (this.videoModel === resolved) return true;

    this.videoModel = resolved;
    if (this.movie) {
      (this.movie.bible as any).videoModel = resolved;
      persistMovie(this.movie);
    }
    this.addSystemMessage(`🎞️ Director switched generative video model to ${resolved}.`);
    broadcastCinemaEvent('video_model_changed', { videoModel: resolved });
    this.broadcastStateSnapshot();
    return true;
  }

  /**
   * Jump to a specific step number in the current movie for manual replay.
   */
  public async jumpToStep(stepNumber: number): Promise<boolean> {
    if (!this.movie || !this.movie.steps || this.movie.steps.length === 0) return false;
    const targetStep = this.movie.steps.find(s => s.stepNumber === stepNumber);
    if (!targetStep) return false;

    // Sanitize videoUrl if missing or broken
    if (!targetStep.videoUrl || targetStep.videoUrl.startsWith('/videos/')) {
      const mockIndex = Math.abs(targetStep.stepNumber - 1) % CINEMATIC_MOCK_VIDEOS.length;
      targetStep.videoUrl = CINEMATIC_MOCK_VIDEOS[mockIndex].url;
      targetStep.thumbnailUrl = targetStep.thumbnailUrl || CINEMATIC_MOCK_VIDEOS[mockIndex].poster;
    }

    this.movie.currentStep = stepNumber;
    const duration = targetStep.duration || 15;
    this.setPhase('PLAYING', duration);
    this.votesA = 0;
    this.votesB = 0;
    this.userVotes.clear();
    this.activeAd = null;
    this.pendingPreGeneratedAd = null; // Timeline jumped — pre-generated ad is stale
    this.blockbusterCandidates = [];
    this.blockbusterUserVotes.clear();
    this.blockbusterVoteCounts = { A: 0, B: 0, C: 0, D: 0 };

    persistMovie(this.movie);

    this.addSystemMessage(`⏮️ Director triggered manual replay of Step ${stepNumber}: "${targetStep.title}".`);

    // Broadcast new_step so players switch video/subtitles immediately
    await broadcastCinemaEvent('new_step', {
      step: targetStep,
      currentStep: stepNumber,
      totalSteps: this.movie.totalSteps || this.movie.steps.length,
      phaseDuration: duration,
      phaseStartedAt: this.phaseStartedAt,
      phaseEndsAt: this.phaseEndsAt
    });

    await this.broadcastStateSnapshot();
    return true;
  }

  /**
   * Switch active broadcasting movie to any existing/archived movie and optionally start at a specific step.
   */
  public async switchToMovie(movieId: string, stepNumber: number = 1): Promise<boolean> {
    let targetMovie: Movie | null = null;

    // 1. Check current movie
    if (this.movie && this.movie.id === movieId) {
      targetMovie = this.movie;
    }

    // 2. Check in-memory completed movies
    if (!targetMovie) {
      targetMovie = this.completedMovies.find(m => m.id === movieId) || null;
    }

    // 3. Check Supabase
    if (!targetMovie && isSupabaseConfigured()) {
      targetMovie = await loadMovieByIdFromDb(movieId);
    }

    if (!targetMovie || !targetMovie.steps || targetMovie.steps.length === 0) {
      console.warn(`[Cinema] Cannot switch to movie ${movieId}: not found or has no steps`);
      return false;
    }

    // Archive current movie if switching to a different one
    if (this.movie && this.movie.id !== movieId) {
      this.movie.status = 'completed';
      if (!this.completedMovies.some(m => m.id === this.movie!.id)) {
        this.completedMovies.unshift(this.movie);
      }
      persistMovie(this.movie);
    }

    // Sanitize all steps of targetMovie so videos play immediately without errors
    targetMovie.steps = targetMovie.steps.map((s, idx) => {
      const mock = CINEMATIC_MOCK_VIDEOS[idx % CINEMATIC_MOCK_VIDEOS.length];
      return {
        ...s,
        videoUrl: (!s.videoUrl || s.videoUrl.startsWith('/videos/')) ? mock.url : s.videoUrl,
        thumbnailUrl: s.thumbnailUrl || mock.poster
      };
    });

    const chosenStepNum = Math.max(1, Math.min(stepNumber, targetMovie.steps.length));
    targetMovie.currentStep = chosenStepNum;
    targetMovie.status = 'streaming';
    this.movie = targetMovie;

    const currentStepObj = targetMovie.steps.find(s => s.stepNumber === chosenStepNum) || targetMovie.steps[0];
    const duration = currentStepObj.duration || 15;
    this.setPhase('PLAYING', duration);
    this.votesA = 0;
    this.votesB = 0;
    this.userVotes.clear();
    this.activeAd = null;
    this.pendingPreGeneratedAd = null; // Movie switched — pre-generated ad is stale
    this.blockbusterCandidates = [];
    this.blockbusterUserVotes.clear();
    this.blockbusterVoteCounts = { A: 0, B: 0, C: 0, D: 0 };

    persistMovie(this.movie);

    this.addSystemMessage(`🎬 [DIRECTOR SWITCH] Película cambiada a "${this.movie.title}" (Step ${chosenStepNum}).`);

    // Broadcast new movie and new step to all clients
    await broadcastCinemaEvent('new_movie_started', {
      movie: this.movie
    });

    await broadcastCinemaEvent('new_step', {
      step: currentStepObj,
      currentStep: chosenStepNum,
      totalSteps: this.movie.totalSteps || this.movie.steps.length,
      phaseDuration: duration,
      phaseStartedAt: this.phaseStartedAt,
      phaseEndsAt: this.phaseEndsAt
    });

    await this.broadcastStateSnapshot();
    return true;
  }

  /**
   * Director edits movie details (title, genre, tagline, initial plot).
   * Updates the in-memory copy (active or archived) and the database.
   */
  public async updateMovieDetails(
    movieId: string,
    fields: { title?: string; genre?: string; tagline?: string; initialPlot?: string }
  ): Promise<boolean> {
    const clean: Record<string, string> = {};
    if (typeof fields.title === 'string' && fields.title.trim()) clean.title = fields.title.trim();
    if (typeof fields.genre === 'string' && fields.genre.trim()) clean.genre = fields.genre.trim();
    if (typeof fields.tagline === 'string') clean.tagline = fields.tagline.trim();
    if (typeof fields.initialPlot === 'string') clean.initialPlot = fields.initialPlot.trim();
    if (Object.keys(clean).length === 0) return false;

    const target = this.movie?.id === movieId
      ? this.movie
      : this.completedMovies.find(m => m.id === movieId) || null;

    if (target) {
      if (clean.title !== undefined) target.title = clean.title;
      if (clean.genre !== undefined) target.genre = clean.genre;
      if (clean.tagline !== undefined) target.tagline = clean.tagline;
      if (clean.initialPlot !== undefined) target.initialPlot = clean.initialPlot;
    }

    const updated = await updateMovieInDb(movieId, clean);
    if (!updated) return false;

    if (target) {
      this.addSystemMessage(`✏️ Director updated movie details${target.title ? ` for "${target.title}"` : ''}.`);
      this.broadcastStateSnapshot();
    }
    return true;
  }

  /**
   * Director deletes a movie from the library.
   * Deleting the currently streaming movie starts a fresh film automatically.
   */
  public async deleteMovie(movieId: string): Promise<{ success: boolean; newMovie?: Movie }> {
    let liveState = null;
    try {
      liveState = await loadLiveCinemaStateFromDb();
    } catch {
      // ignore
    }
    const activeMovieId = this.movie?.id || liveState?.movieId;
    const isActive = activeMovieId === movieId;

    let newMovie: Movie | undefined;
    if (isActive) {
      this.movie = null;
      this.activeAd = null;
      this.addSystemMessage(`🗑️ Director deleted the currently streaming movie. Generating a fresh blockbuster film...`);
      newMovie = await this.startNextBlockbusterMovie();
    }

    const deleted = await deleteMovieFromDb(movieId);
    if (!deleted) return { success: false };

    this.completedMovies = this.completedMovies.filter(m => m.id !== movieId);

    if (!isActive) {
      this.addSystemMessage(`🗑️ Director deleted movie "${movieId}" from the library.`);
      await this.broadcastStateSnapshot();
    }

    return { success: true, newMovie };
  }

  /**
   * Bulk delete multiple movies from library and database.
   */
  public async bulkDeleteMovies(movieIds: string[]): Promise<{ success: boolean; deletedCount: number; newMovie?: Movie }> {
    if (!movieIds || movieIds.length === 0) return { success: false, deletedCount: 0 };

    let liveState = null;
    try {
      liveState = await loadLiveCinemaStateFromDb();
    } catch {
      // ignore
    }
    const activeMovieId = this.movie?.id || liveState?.movieId;
    const activeIncluded = Boolean(activeMovieId && movieIds.includes(activeMovieId));

    let newMovie: Movie | undefined;
    if (activeIncluded) {
      this.movie = null;
      this.activeAd = null;
      this.addSystemMessage(`🗑️ Director deleted ${movieIds.length} movie(s) including active broadcast. Generating a fresh blockbuster film...`);
      newMovie = await this.startNextBlockbusterMovie();
    }

    const dbResult = await deleteMoviesFromDb(movieIds);
    this.completedMovies = this.completedMovies.filter(m => !movieIds.includes(m.id));

    if (!activeIncluded) {
      this.addSystemMessage(`🗑️ Director deleted ${dbResult.deletedCount || movieIds.length} movie(s) from the library.`);
      await this.broadcastStateSnapshot();
    }

    return {
      success: dbResult.success,
      deletedCount: dbResult.deletedCount || movieIds.length,
      newMovie
    };
  }

  /**
   * Bulk update details for multiple movies (e.g. genre or status).
   */
  public async bulkUpdateMovies(
    movieIds: string[],
    fields: { genre?: string; status?: string; tagline?: string }
  ): Promise<{ success: boolean; updatedCount: number }> {
    if (!movieIds || movieIds.length === 0) return { success: false, updatedCount: 0 };

    await updateMoviesInDb(movieIds, fields);

    if (this.movie && movieIds.includes(this.movie.id)) {
      if (fields.genre) this.movie.genre = fields.genre;
      if (fields.status) this.movie.status = fields.status as any;
      if (fields.tagline) this.movie.tagline = fields.tagline;
    }

    for (const m of this.completedMovies) {
      if (movieIds.includes(m.id)) {
        if (fields.genre) m.genre = fields.genre;
        if (fields.status) m.status = fields.status as any;
        if (fields.tagline) m.tagline = fields.tagline;
      }
    }

    this.addSystemMessage(`✏️ Director updated ${movieIds.length} movie(s) in the library.`);
    await this.broadcastStateSnapshot();
    return { success: true, updatedCount: movieIds.length };
  }

  /**
   * Load all available movies across memory and database for director selection.
   */
  public async loadAllAvailableMovies(): Promise<Movie[]> {
    const moviesMap = new Map<string, Movie>();

    if (isSupabaseConfigured()) {
      try {
        const dbMovies = await loadAllMoviesFromDb(100);
        for (const m of dbMovies) {
          moviesMap.set(m.id, m);
        }
      } catch (err) {
        console.warn("[Cinema] Error loading all movies from db:", err);
      }
    }

    // Add active in-memory movie if not already in map
    if (this.movie && !moviesMap.has(this.movie.id)) {
      moviesMap.set(this.movie.id, this.movie);
    }

    // Only add in-memory completed movies if Supabase is NOT configured
    if (!isSupabaseConfigured()) {
      for (const m of this.completedMovies) {
        if (!moviesMap.has(m.id)) {
          moviesMap.set(m.id, m);
        }
      }
    }

    return Array.from(moviesMap.values());
  }

  public async persistCurrentStateToSupabase(workerId?: string) {
    if (!this.movie) return;
    try {
      const currentStepObj = (this.movie.steps.find(s => s.stepNumber === this.movie!.currentStep))
        || this.movie.steps[this.movie.steps.length - 1];
      await persistLiveCinemaState({
        movieId: this.movie.id,
        phase: this.phase,
        timeRemaining: this.timeRemaining,
        currentStep: this.movie.currentStep,
        totalAudience: this.totalAudience,
        votesA: this.votesA,
        votesB: this.votesB,
        isLive: !this.isPaused,
        isPaused: this.isPaused,
        isGenerationPaused: this.isGenerationPaused,
        videoModel: this.videoModel,
        videoResolution: this.videoResolution,
        blockbusterCandidates: this.blockbusterCandidates,
        blockbusterVoteCounts: this.blockbusterVoteCounts,
        blockbusterWinner: this.blockbusterWinner ? {
          id: this.blockbusterWinner.id,
          title: this.blockbusterWinner.title,
          logline: this.blockbusterWinner.logline,
          genre: this.blockbusterWinner.genre,
          premise: this.blockbusterWinner.premise
        } : null,
        activeAd: this.activeAd,
        adsConfig: this.adsConfig,
        selectedOption: currentStepObj?.selectedOption,
        wasRandomPick: currentStepObj?.wasRandomPick,
        phaseStartedAt: this.phaseStartedAt,
        phaseEndsAt: this.phaseEndsAt,
        phaseDuration: this.phaseDuration,
        workerId: workerId
      });

      // Mirror the liveState into the in-memory bible so the next persistMovie()
      // writes the FRESH state instead of stomping it with a stale frozen snapshot.
      if (this.movie) {
        (this.movie.bible as any).liveState = {
          phase: this.phase,
          timeRemaining: this.timeRemaining,
          currentStep: this.movie.currentStep,
          totalAudience: this.totalAudience,
          votesA: this.votesA,
          votesB: this.votesB,
          isLive: !this.isPaused,
          isPaused: this.isPaused,
          isGenerationPaused: this.isGenerationPaused,
          videoModel: this.videoModel,
          videoResolution: this.videoResolution,
          blockbusterCandidates: this.blockbusterCandidates,
          blockbusterVoteCounts: this.blockbusterVoteCounts,
          blockbusterWinner: this.blockbusterWinner ? {
            id: this.blockbusterWinner.id,
            title: this.blockbusterWinner.title,
            logline: this.blockbusterWinner.logline,
            genre: this.blockbusterWinner.genre,
            premise: this.blockbusterWinner.premise
          } : null,
          activeAd: this.activeAd || null,
          adsConfig: this.adsConfig,
          selectedOption: currentStepObj?.selectedOption || null,
          wasRandomPick: currentStepObj?.wasRandomPick || false,
          phaseStartedAt: this.phaseStartedAt,
          phaseEndsAt: this.phaseEndsAt,
          phaseDuration: this.phaseDuration,
          updatedAt: new Date().toISOString()
        };
      }
    } catch {
      // Non-blocking
    }
  }

  public async broadcastStateSnapshot(workerId?: string) {
    if (!this.movie) return;
    const state = this.getState();
    await this.persistCurrentStateToSupabase(workerId);
    await broadcastCinemaEvent('state_snapshot', {
      movie: state.movie,
      phase: state.phase,
      timeRemaining: state.timeRemaining,
      phaseDuration: state.phaseDuration,
      phaseStartedAt: state.phaseStartedAt,
      phaseEndsAt: state.phaseEndsAt,
      totalAudience: state.totalAudience,
      votesA: state.votesA,
      votesB: state.votesB,
      activeStep: state.activeStep,
      activeAd: state.activeAd,
      adsConfig: state.adsConfig,
      isLive: state.isLive,
      isPaused: state.isPaused,
      isGenerationPaused: state.isGenerationPaused,
      videoModel: state.videoModel,
      videoResolution: state.videoResolution,
      blockbusterCandidates: state.blockbusterCandidates,
      blockbusterVoteCounts: state.blockbusterVoteCounts,
      blockbusterWinner: state.blockbusterWinner
    });
  }
}

export const cinemaEngine = CinemaOrchestrator.getInstance();

