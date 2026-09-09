import { Movie, MovieStep, CinemaState, ChatMessage, PlaybackPhase, ImmersiveAd, AdsConfig } from '@/types/cinema';
import { generateStoryBibleWithDeepSeek, generateNextStepWithDeepSeek, generateMovieFinalSummaryWithDeepSeek } from './deepseek';
import { generateVideoWithFal, CINEMATIC_MOCK_VIDEOS } from './fal-video';

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
  loadTopVotedCommentsFromDb,
  loadUserVotedCommentIdsFromDb
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
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public isGenerationPaused: boolean = false;
  private timerInterval: NodeJS.Timeout | null = null;
  public userVotes: Map<string, 'A' | 'B'> = new Map();

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

  public async initializeMovie(customPrompt?: string): Promise<Movie> {
    // Try to restore existing streaming or paused movie from Supabase if available
    if (isSupabaseConfigured() && !customPrompt) {
      try {
        const savedMovie = await loadActiveMovieFromDb();
        if (savedMovie && savedMovie.steps.length > 0) {
          // Sanitize step video URLs so none are missing or 404
          savedMovie.steps = savedMovie.steps.map((s, idx) => {
            const mock = CINEMATIC_MOCK_VIDEOS[idx % CINEMATIC_MOCK_VIDEOS.length];
            return {
              ...s,
              videoUrl: (!s.videoUrl || s.videoUrl.startsWith('/videos/')) ? mock.url : s.videoUrl,
              thumbnailUrl: s.thumbnailUrl || mock.poster
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

          // Movie restored from Supabase
          return this.movie;
        }
      } catch (err) {
        console.warn("[Cinema] Error restoring from Supabase, initializing fresh:", err);
      }
    }

    const generated = await generateStoryBibleWithDeepSeek(customPrompt);
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
    if (!generated.firstStep.activeProps || generated.firstStep.activeProps.length === 0) {
      if (generated.bible.props.length > 0) {
        generated.firstStep.activeProps = [generated.bible.props[0].id];
      }
    }
    
    // Collect reference images of props for Step 1 (strictly necessary only, hosted on Supabase Storage)
    const initialPropImages = generated.bible.props
      .filter(p => (generated.firstStep.activeProps || []).includes(p.id))
      .map(p => p.imageUrl)
      .filter(Boolean) as string[];

    console.log(`[Cinema] Step 1 active prop reference images (Supabase Storage):`, initialPropImages);

    // Generate initial video for Step 1 with Minimax H3-Max (or simulated clip if generation is paused)
    let initialVideoUrl: string;
    let initialThumbnailUrl: string | undefined;

    if (!this.isGenerationPaused) {
      const videoResult = await generateVideoWithFal({
        prompt: generated.firstStep.visualPrompt,
        cameraMotion: generated.firstStep.cameraMotionPrompt,
        stepNumber: 1,
        propReferenceImages: initialPropImages,
        voiceDirection: generated.firstStep.voiceDirection
      });
      initialVideoUrl = videoResult.videoUrl;
      initialThumbnailUrl = videoResult.thumbnailUrl;
    } else {
      console.log('[Cinema] 🛡️ Generación PAUSADA: Usando video simulado para el paso 1 sin llamar a fal.ai.');
      const mock = CINEMATIC_MOCK_VIDEOS[0];
      initialVideoUrl = mock.url;
      initialThumbnailUrl = mock.poster;
    }

    const firstStepWithVideo: MovieStep = {
      ...generated.firstStep,
      videoUrl: initialVideoUrl,
      thumbnailUrl: initialThumbnailUrl,
      propReferenceImages: initialPropImages
    };

    this.movie = {
      id: `movie_${Date.now()}`,
      title: generated.title,
      genre: generated.genre,
      tagline: generated.tagline,
      initialPlot: generated.initialPlot,
      masterArcThread: generated.masterArcThread,
      status: 'streaming',
      currentStep: 1,
      totalSteps: 100,
      bible: {
        ...generated.bible,
        isGenerationPaused: this.isGenerationPaused
      } as any,
      steps: [firstStepWithVideo],
      createdAt: new Date().toISOString(),
      totalVotesCast: 0
    };

    this.phase = 'PLAYING';
    this.timeRemaining = 15;
    this.votesA = 0;
    this.votesB = 0;
    this.userVotes.clear();

    // Persist movie and initial step to Supabase
    await persistMovie(this.movie);
    await persistMovieStep(this.movie.id, firstStepWithVideo);

    this.addSystemMessage(`🎬 Starting new interactive film: "${this.movie.title}"`);
    return this.movie;
  }

  /**
   * Synchronize cinema orchestrator with state currently in Supabase.
   */
  public async syncFromDatabase() {
    if (!isSupabaseConfigured()) return;
    try {
      const savedMovie = await loadActiveMovieFromDb();
      if (savedMovie && savedMovie.steps.length > 0) {
        savedMovie.steps = savedMovie.steps.map((s, idx) => {
          const mock = CINEMATIC_MOCK_VIDEOS[idx % CINEMATIC_MOCK_VIDEOS.length];
          return {
            ...s,
            videoUrl: (!s.videoUrl || s.videoUrl.startsWith('/videos/')) ? mock.url : s.videoUrl,
            thumbnailUrl: s.thumbnailUrl || mock.poster
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
        if (liveState.currentStep && this.movie) {
          this.movie.currentStep = liveState.currentStep;
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
    if (!this.movie) {
      await this.initializeMovie();
      if (!this.movie) return;
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
      // Random audience fluctuation
      if (Math.random() > 0.7) {
        this.totalAudience += Math.random() > 0.4 ? 1 : -1;
        if (this.totalAudience < 30) this.totalAudience = 45;
      }

      // Generate simulated audience chats occasionally
      if (Math.random() > 0.85) {
        this.injectSimulatedAudienceActivity();
      }

      // Fast, lightweight broadcast tick without heavy database/CDC spam
      broadcastCinemaEvent('time_tick', {
        timeRemaining: this.timeRemaining,
        phase: this.phase,
        votesA: this.votesA,
        votesB: this.votesB,
        totalAudience: this.totalAudience
      });
    } else {
      // Duration expired -> Transition to next phase and persist ONCE to database
      await this.handlePhaseTransition(workerId);
    }
  }

  private async handlePhaseTransition(workerId?: string) {
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
      // Check if automatic commercial break should trigger a continuación of this scene!
      const currentStepCount = this.movie.steps.length;
      if (
        this.adsConfig.autoAdsEnabled &&
        currentStepCount > 0 &&
        currentStepCount % this.adsConfig.adIntervalSteps === 0 &&
        currentStepCount !== this.adsConfig.lastAdStep
      ) {
        this.adsConfig.lastAdStep = currentStepCount;
        // Trigger commercial break immediately after this scene plays.
        // It takes currentStep.videoUrl as reference and transitions to VOTING afterwards.
        await this.triggerCommercialBreak(undefined, 'VOTING');
        return;
      }

      // Enter 10-second VOTING phase!
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
      await this.broadcastStateSnapshot(workerId);
    } 
    else if (this.phase === 'VOTING') {
      // 10-second voting has concluded -> Resolve winner
      this.setPhase('GENERATING', 4); // Short generative transition buffer

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
        timeRemaining: this.timeRemaining,
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

      // CHECK IF 100 STEPS COMPLETED: GENERATE FINAL SUMMARY & AUTO-START NEXT BLOCKBUSTER
      if (this.movie.steps.length >= 100) {
        this.movie.status = 'completed';
        this.movie.completedAt = new Date().toISOString();

        try {
          this.addSystemMessage(`📜 Film complete! DeepSeek synthesizing 100-step narrative retrospective and master synopsis...`);
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

        // REQUISITO: Las películas se crean automáticamente cuando finaliza una con rotación de temáticas de taquilla
        this.addSystemMessage(`🎬 PREMIERING NEXT BLOCKBUSTER: Auto-generating new film with rotated blockbuster genre in 5 seconds...`);
        setTimeout(async () => {
          await this.startNextBlockbusterMovie();
        }, 5000);
        return;
      }

      // CHECK IF AI GENERATION IS PAUSED: REPLAY RANDOM PREVIOUSLY GENERATED VIDEO (ZERO FAL.AI CALLS)
      if (this.isGenerationPaused) {
        const previousSteps = [
          ...this.movie.steps,
          ...this.completedMovies.flatMap(m => m.steps)
        ].filter(s => s.videoUrl);

        let chosenVideoUrl: string;
        let chosenThumbnailUrl: string | undefined;
        let chosenTitle = `Scene Continuation`;
        let chosenSynopsis = `The narrative advances seamlessly using archived visual cinematography.`;
        let chosenOptions = currentStep.options;

        if (previousSteps.length > 0) {
          const randomStep = previousSteps[Math.floor(Math.random() * previousSteps.length)];
          chosenVideoUrl = randomStep.videoUrl;
          chosenThumbnailUrl = randomStep.thumbnailUrl;
          chosenTitle = `[Archive Replay] ${randomStep.title}`;
          chosenSynopsis = `[Replay Mode] ${randomStep.synopsis}`;
          chosenOptions = [
            { ...randomStep.options[0], votes: 0 },
            { ...randomStep.options[1], votes: 0 }
          ];
        } else {
          const mockIndex = (this.movie.steps.length) % CINEMATIC_MOCK_VIDEOS.length;
          const mock = CINEMATIC_MOCK_VIDEOS[mockIndex];
          chosenVideoUrl = mock.url;
          chosenThumbnailUrl = mock.poster;
          chosenTitle = `[Simulated Scene] ${mock.name}`;
          chosenSynopsis = `Simulated scene continuous playback while AI generation is paused.`;
        }

        const replayStepNumber = this.movie.steps.length + 1;
        const replayStep: MovieStep = {
          stepNumber: replayStepNumber,
          title: chosenTitle,
          synopsis: chosenSynopsis,
          dialogueSnippet: "Continuing scene sequence...",
          visualPrompt: "Archived cinematic clip playback.",
          cameraMotionPrompt: "Smooth cinematic hold.",
          videoUrl: chosenVideoUrl,
          thumbnailUrl: chosenThumbnailUrl,
          duration: 15,
          votingWindowSeconds: 10,
          options: [
            { ...chosenOptions[0], votes: 0 },
            { ...chosenOptions[1], votes: 0 }
          ],
          activeCharacters: currentStep.activeCharacters || [],
          activeProps: currentStep.activeProps || [],
          environment: currentStep.environment || '',
          createdAt: new Date().toISOString()
        };

        this.movie.steps.push(replayStep);
        this.movie.currentStep = replayStepNumber;

        // Persist movie and replay step to Supabase
        await persistMovie(this.movie);
        await persistMovieStep(this.movie.id, replayStep);

        this.addSystemMessage(`🎲 [ARCHIVE REPLAY] Generación IA pausada. Reproduciendo clip #${replayStepNumber}: "${replayStep.title}" (sin gasto de créditos).`);

        this.setPhase('PLAYING', 15);
        broadcastCinemaEvent('new_step', {
          step: replayStep,
          currentStep: replayStepNumber,
          phaseDuration: 15,
          phaseStartedAt: this.phaseStartedAt,
          phaseEndsAt: this.phaseEndsAt
        });

        // Reset voting
        this.votesA = 0;
        this.votesB = 0;
        this.userVotes.clear();

        await this.broadcastStateSnapshot(workerId);
        return;
      }

      // Extract recent (last 30 seconds) and top-voted chat comments to inspire DeepSeek
      const audienceComments = this.getRecentAndTopChatComments(30);

      // Generate step n + 1 with DeepSeek and fal.ai MiniMax H3-Max in 480p 16:9
      let nextStep: MovieStep | null = null;
      try {
        const nextStepRaw = await generateNextStepWithDeepSeek(this.movie, chosenOption, currentStep, audienceComments);

        if (audienceComments.length > 0 && (audienceComments[0].votesCount || 0) > 0) {
          const topIdea = audienceComments[0];
          this.addSystemMessage(`💡 Narrative twist influenced by @${topIdea.userName}'s top idea (${topIdea.votesCount} votes): "${topIdea.text}"`);
        }
        
        // PROPS SE CREAN SÓLO CUANDO EL LLM DEBE INTEGRAR UN NUEVO PERSONAJE
        if (nextStepRaw.newCharacter) {
          const charExists = this.movie.bible.characters.some(c => c.id === nextStepRaw.newCharacter?.id);
          if (!charExists) {
            this.movie.bible.characters.push(nextStepRaw.newCharacter);
          }

          if (nextStepRaw.newProp) {
            // Generate and store reference image in Supabase Storage for the newly introduced prop
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

        // Ensure all active props have their reference assets stored in Supabase Storage
        for (const propId of (nextStepRaw.activeProps || [])) {
          const p = this.movie.bible.props.find(x => x.id === propId);
          if (p && (!p.imageUrl || !p.imageUrl.includes('supabase.co/storage'))) {
            try {
              p.imageUrl = await generateAndStorePropReferenceImage(p);
              await persistProp(this.movie.id, p);
            } catch (err) {
              console.warn(`[Cinema] Error uploading active prop image to Supabase Storage:`, err);
            }
          }
        }

        // Collect prop reference images for active props (hosted in Supabase Storage)
        const activePropImages = this.movie.bible.props
          .filter(p => (nextStepRaw.activeProps || []).includes(p.id))
          .map(p => p.imageUrl)
          .filter(Boolean) as string[];

        console.log(`[Cinema] Step ${nextStepRaw.stepNumber} active prop reference images (Supabase Storage):`, activePropImages);

        // Generate video sending previous video as reference and prop images as references.
        // If we just came from a COMMERCIAL_BREAK, use preAdVideoUrl (the clip before the ad)
        // instead of the last step's videoUrl, so the ad has zero influence on narrative continuity.
        const storyReferenceUrl = this.preAdVideoUrl ?? currentStep.videoUrl;
        const videoRes = await generateVideoWithFal({
          prompt: nextStepRaw.visualPrompt,
          cameraMotion: nextStepRaw.cameraMotionPrompt,
          stepNumber: nextStepRaw.stepNumber,
          previousVideoUrl: storyReferenceUrl,
          propReferenceImages: activePropImages,
          voiceDirection: nextStepRaw.voiceDirection
        });

        // Consume and reset preAdVideoUrl — it must never persist past this step
        this.preAdVideoUrl = null;

        
        nextStep = {
          ...nextStepRaw,
          videoUrl: videoRes.videoUrl,
          thumbnailUrl: videoRes.thumbnailUrl,
          referenceVideoUrl: storyReferenceUrl, // Tracks the actual story clip used — never the ad
          propReferenceImages: activePropImages
        };

        this.movie.steps.push(nextStep);
        this.movie.currentStep = nextStep.stepNumber;

        // Persist update in Supabase
        await persistMovie(this.movie);
        await persistMovieStep(this.movie.id, nextStep);

        this.setPhase('PLAYING', 15);
        // Realtime broadcast of new clip
        broadcastCinemaEvent('new_step', {
          step: nextStep,
          currentStep: nextStep.stepNumber,
          phaseDuration: 15,
          phaseStartedAt: this.phaseStartedAt,
          phaseEndsAt: this.phaseEndsAt
        });
      } catch (err) {
        console.error("Error generating next step:", err);
      }

      // Reset voting
      this.votesA = 0;
      this.votesB = 0;
      this.userVotes.clear();

      this.setPhase('PLAYING', 15);
      await this.broadcastStateSnapshot(workerId);
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

    if (userName) {
      this.addChatMessage({
        id: `vote_${Date.now()}_${Math.random()}`,
        userId,
        userName,
        text: `Votó por la Opción ${optionId}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        votedOption: optionId
      });
    }

    return { success: true, votesA: this.votesA, votesB: this.votesB };
  }

  /**
   * Extract recent comments (default last 30 seconds) and top-voted chat ideas
   * to influence the next narrative scene.
   */
  public getRecentAndTopChatComments(seconds: number = 30): ChatMessage[] {
    const cutoff = Date.now() - seconds * 1000;
    const userComments = this.chatMessages.filter(m => !m.isSystem && m.text.trim().length > 0);

    const candidates = userComments.filter(m => {
      const isRecent = (m.createdAtMs && m.createdAtMs >= cutoff) || true;
      const hasVotes = (m.votesCount && m.votesCount > 0);
      return isRecent || hasVotes;
    });

    return candidates
      .sort((a, b) => {
        const diffVotes = (b.votesCount || 0) - (a.votesCount || 0);
        if (diffVotes !== 0) return diffVotes;
        return (b.createdAtMs || 0) - (a.createdAtMs || 0);
      })
      .slice(0, 8);
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

  private injectSimulatedAudienceActivity() {
    const audienceNames = ["NeoViewer_99", "SarahCyber", "ZeroCool", "Elena_Films", "LucasSciFi", "Cinephile2099", "PixelRider"];
    const reactions = [
      "Noooo, watch out for the ambush!",
      "Vote A! It's the only way to safeguard the neural prism",
      "Option B is definitely going to have way more firefights 🔥",
      "The anamorphic lighting in this clip is incredible",
      "Kael's voice direction is super consistent!",
      "Look at the new character who just entered the scene!",
      "Key milestone coming up, let's go!"
    ];

    const randomName = audienceNames[Math.floor(Math.random() * audienceNames.length)];
    const randomText = reactions[Math.floor(Math.random() * reactions.length)];

    this.addChatMessage({
      id: `sim_${Date.now()}`,
      userId: `user_${randomName.toLowerCase()}`,
      userName: randomName,
      text: randomText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // In voting phase, sometimes simulated viewers also vote
    if (this.phase === 'VOTING' && Math.random() > 0.4) {
      const voteChoice: 'A' | 'B' = Math.random() > 0.5 ? 'A' : 'B';
      if (voteChoice === 'A') this.votesA++;
      else this.votesB++;

      broadcastCinemaEvent('vote_update', {
        votesA: this.votesA,
        votesB: this.votesB,
        totalVotes: this.votesA + this.votesB,
        timeRemaining: this.timeRemaining,
        totalAudience: this.totalAudience
      });
    }
  }

  /**
   * Trigger an immersive commercial break.
   *
   * Flow:
   *  1. Capture the last story clip URL as preAdVideoUrl (preserved for the NEXT story step).
   *  2. Switch phase to COMMERCIAL_BREAK immediately so clients show the break screen.
   *  3. Generate the ad clip via fal.ai using the story clip as visual reference and
   *     the ad's cinematicPrompt as the screenplay — so the ad feels like it continues
   *     the film world, not an external interruption.
   *  4. Broadcast the generated ad video to all connected clients.
   *  5. The NEXT story step generation will use preAdVideoUrl (not the ad clip), ensuring
   *     the commercial has zero influence on future narrative direction.
   */
  public async triggerCommercialBreak(customAd?: ImmersiveAd, nextPhase: PlaybackPhase = 'VOTING'): Promise<boolean> {
    const activeAds = this.adsList.filter(a => a.isActive && a.type === 'commercial_break');
    const adToPlay = customAd || activeAds[Math.floor(Math.random() * activeAds.length)] || DEFAULT_IMMERSIVE_ADS[0];

    if (!adToPlay) return false;

    // ── Step 1: Capture pre-ad story clip before switching phase ──────────────
    const lastStoryStep = this.movie?.steps[this.movie.steps.length - 1];
    this.preAdVideoUrl = lastStoryStep?.videoUrl || null;

    // ── Step 2: Switch phase immediately so UI enters COMMERCIAL_BREAK ────────
    this.returnPhaseAfterAd = nextPhase;
    this.activeAd = adToPlay;
    adToPlay.duration = 15;
    this.setPhase('COMMERCIAL_BREAK', 15);

    // Track impression
    adToPlay.impressions = (adToPlay.impressions || 0) + 1;
    recordAdMetric(adToPlay.id, 'impression');

    this.addSystemMessage(`📺 INCOMING SPONSOR TRANSMISSION: "${adToPlay.brandName}" presents: ${adToPlay.title}`);

    // Broadcast initial break — clients show placeholder or static videoUrl while fal.ai renders
    broadcastCinemaEvent('ad_break_started', {
      ad: adToPlay,
      timeRemaining: this.timeRemaining,
      phaseDuration: 15,
      phaseStartedAt: this.phaseStartedAt,
      phaseEndsAt: this.phaseEndsAt,
      phase: 'COMMERCIAL_BREAK'
    });
    await this.broadcastStateSnapshot();

    // ── Step 3: Handle ad playback — Replay previous versions if paused, or generate with fal.ai ──
    if (this.isGenerationPaused) {
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
      const rawPrompt = adToPlay.cinematicPrompt
        || `A character naturally interacts with or observes "${adToPlay.brandName}". ${adToPlay.tagline || ''}. Maintain identical cinematic lighting, colors, lens flare, and environment as the previous shot.`;

      const promptPrefix = "Continúa la escena e integra este anuncio de forma natural en la historia: ";
      const adPrompt = rawPrompt.startsWith(promptPrefix) ? rawPrompt : `${promptPrefix}${rawPrompt}`;

      generateVideoWithFal({
        prompt: adPrompt,
        cameraMotion: "Smooth dolly or static hold, matching the previous scene's camera language",
        stepNumber: this.movie?.steps.length ?? 0,
        previousVideoUrl: this.preAdVideoUrl || undefined,
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
  public async startNextBlockbusterMovie(customGenreOrPrompt?: string): Promise<Movie> {
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
  public async forceReset(customPrompt?: string): Promise<Movie> {
    // Stop the current engine loop
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isRunning = false;

    // Clear in-memory state
    this.movie = null;
    this.phase = 'PLAYING';
    this.timeRemaining = 15;
    this.votesA = 0;
    this.votesB = 0;
    this.userVotes.clear();
    this.activeAd = null;

    // Archive old movie(s) in Supabase so they won't be restored
    await archiveAllStreamingMovies();

    this.addSystemMessage('🔄 Cinema engine reset. Generating new film with real AI...');

    // Now initialize fresh with real AI (customPrompt bypasses Supabase restore)
    const freshPrompt = customPrompt || `force_reset_${Date.now()}`;
    const newMovie = await this.initializeMovie(freshPrompt);
    broadcastCinemaEvent('new_movie_started', { movie: newMovie });
    return newMovie;
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
      activeAd: this.activeAd,
      adsConfig: this.adsConfig,
      apiStatus: {
        hasDeepseek: Boolean(process.env.DEEPSEEK_API_KEY),
        hasFal: Boolean(process.env.FAL_KEY),
        isMockMode: !process.env.DEEPSEEK_API_KEY || !process.env.FAL_KEY
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
   * Load all available movies across memory and database for director selection.
   */
  public async loadAllAvailableMovies(): Promise<Movie[]> {
    const moviesMap = new Map<string, Movie>();

    if (this.movie) {
      moviesMap.set(this.movie.id, this.movie);
    }

    for (const m of this.completedMovies) {
      if (!moviesMap.has(m.id)) {
        moviesMap.set(m.id, m);
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const dbMovies = await loadAllMoviesFromDb();
        for (const m of dbMovies) {
          if (!moviesMap.has(m.id)) {
            moviesMap.set(m.id, m);
          }
        }
      } catch (err) {
        console.warn("[Cinema] Error loading all movies from db:", err);
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
        activeAd: this.activeAd,
        adsConfig: this.adsConfig,
        selectedOption: currentStepObj?.selectedOption,
        wasRandomPick: currentStepObj?.wasRandomPick,
        phaseStartedAt: this.phaseStartedAt,
        phaseEndsAt: this.phaseEndsAt,
        phaseDuration: this.phaseDuration,
        workerId: workerId
      });
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
      isGenerationPaused: state.isGenerationPaused
    });
  }
}

export const cinemaEngine = CinemaOrchestrator.getInstance();

