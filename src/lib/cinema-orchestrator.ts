import { Movie, MovieStep, CinemaState, ChatMessage, PlaybackPhase, Prop, Character } from '@/types/cinema';
import { generateStoryBibleWithDeepSeek, generateNextStepWithDeepSeek } from './deepseek';
import { generateVideoWithFal } from './fal-video';
import {
  persistMovie,
  persistMovieStep,
  persistChatMessage,
  persistAudienceVote,
  loadActiveMovieFromDb
} from './supabase/db';

// Singleton in-memory store for active cinema session
class CinemaOrchestrator {
  private static instance: CinemaOrchestrator;

  public movie: Movie | null = null;
  public completedMovies: Movie[] = [];
  public phase: PlaybackPhase = 'PLAYING';
  public timeRemaining: number = 15; // 15s clip
  public votesA: number = 0;
  public votesB: number = 0;
  public totalAudience: number = 142; // Dynamic audience count
  public chatMessages: ChatMessage[] = [];
  public isRunning: boolean = false;
  private timerInterval: NodeJS.Timeout | null = null;
  private userVotes: Map<string, 'A' | 'B'> = new Map();

  private constructor() {
    // Initial system message
    this.chatMessages.push({
      id: "sys_init",
      userId: "system",
      userName: "CINE AI",
      text: "🍿 ¡Bienvenidos a la sala de cine interactivo en vivo! El público decide el destino de la película en cada corte.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    });
  }

  public static getInstance(): CinemaOrchestrator {
    if (!CinemaOrchestrator.instance) {
      CinemaOrchestrator.instance = new CinemaOrchestrator();
    }
    return CinemaOrchestrator.instance;
  }

  public async initializeMovie(customPrompt?: string): Promise<Movie> {
    const generated = await generateStoryBibleWithDeepSeek(customPrompt);
    
    // Collect reference images of props for Step 1
    const initialPropImages = generated.bible.props
      .filter(p => generated.firstStep.activeProps.includes(p.id))
      .map(p => p.imageUrl)
      .filter(Boolean) as string[];

    // Generate initial video for Step 1 with Minimax H3-Max in 480p 16:9
    const videoResult = await generateVideoWithFal({
      prompt: generated.firstStep.visualPrompt,
      cameraMotion: generated.firstStep.cameraMotionPrompt,
      stepNumber: 1,
      propReferenceImages: initialPropImages,
      voiceDirection: generated.firstStep.voiceDirection
    });

    const firstStepWithVideo: MovieStep = {
      ...generated.firstStep,
      videoUrl: videoResult.videoUrl,
      thumbnailUrl: videoResult.thumbnailUrl,
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
      bible: generated.bible,
      steps: [firstStepWithVideo],
      createdAt: new Date().toISOString(),
      totalVotesCast: 0
    };

    this.phase = 'PLAYING';
    this.timeRemaining = 15;
    this.votesA = 0;
    this.votesB = 0;
    this.userVotes.clear();

    // Persist new movie and step 1 to Supabase
    persistMovie(this.movie).catch(() => {});
    persistMovieStep(this.movie.id, firstStepWithVideo).catch(() => {});

    this.addSystemMessage(`🎬 Iniciando nueva película interactiva: "${this.movie.title}"`);
    this.startEngineLoop();

    return this.movie;
  }

  public async restoreFromDatabase(): Promise<boolean> {
    if (this.movie) return true;
    try {
      const active = await loadActiveMovieFromDb();
      if (active && active.steps.length > 0) {
        this.movie = active;
        this.phase = 'PLAYING';
        this.timeRemaining = 15;
        this.startEngineLoop();
        this.addSystemMessage(`🔄 Película activa restaurada desde Supabase: "${this.movie.title}"`);
        return true;
      }
    } catch (err) {
      console.error("[Cinema] Error restoring from Supabase:", err);
    }
    return false;
  }

  public startEngineLoop() {
    if (this.isRunning && this.timerInterval) return;
    this.isRunning = true;

    this.timerInterval = setInterval(async () => {
      if (!this.movie) return;

      if (this.timeRemaining > 1) {
        this.timeRemaining -= 1;
        
        // Random viewer fluctuations
        if (Math.random() > 0.7) {
          this.totalAudience += Math.random() > 0.4 ? 1 : -1;
          if (this.totalAudience < 30) this.totalAudience = 45;
        }

        // Generate simulated audience chats occasionally
        if (Math.random() > 0.85) {
          this.injectSimulatedAudienceActivity();
        }

      } else {
        // Transition phase
        await this.handlePhaseTransition();
      }
    }, 1000);
  }

  private async handlePhaseTransition() {
    if (!this.movie) return;

    const currentStepIndex = this.movie.steps.length - 1;
    const currentStep = this.movie.steps[currentStepIndex];

    if (this.phase === 'PLAYING') {
      // 15 seconds clip has ended -> Enter 10-second VOTING phase!
      this.phase = 'VOTING';
      this.timeRemaining = 10;
      this.addSystemMessage(`⏳ ¡TIEMPO DE VOTACIÓN! Tienes 10 segundos para elegir la continuación.`);
    } 
    else if (this.phase === 'VOTING') {
      // 10-second voting has concluded -> Resolve winner
      this.phase = 'GENERATING';
      this.timeRemaining = 3; // Short generative transition buffer

      let chosenOption: 'A' | 'B';
      let wasRandomPick = false;

      if (this.votesA > this.votesB) {
        chosenOption = 'A';
      } else if (this.votesB > this.votesA) {
        chosenOption = 'B';
      } else {
        // Empate o sin votos -> Selección automática al azar
        chosenOption = Math.random() > 0.5 ? 'A' : 'B';
        wasRandomPick = true;
      }

      // Record selected option in step history
      currentStep.selectedOption = chosenOption;
      currentStep.wasRandomPick = wasRandomPick;
      currentStep.options[0].votes = this.votesA;
      currentStep.options[1].votes = this.votesB;
      this.movie.totalVotesCast += (this.votesA + this.votesB);

      // Persist completed step result to Supabase
      persistMovieStep(this.movie.id, currentStep).catch(() => {});
      persistMovie(this.movie).catch(() => {});

      const winningOption = currentStep.options.find(o => o.id === chosenOption)!;

      if (wasRandomPick) {
        this.addSystemMessage(`🎲 [EMPATE/AZAR] El destino eligió al azar: OPCIÓN ${chosenOption} ("${winningOption.title}")`);
      } else {
        const percent = Math.round((chosenOption === 'A' ? this.votesA : this.votesB) / (this.votesA + this.votesB) * 100);
        this.addSystemMessage(`🏆 ¡VOTACIÓN CERRADA! La audiencia eligió OPCIÓN ${chosenOption} ("${winningOption.title}") con el ${percent}% de los votos.`);
      }

      // Check if 100 steps completed
      if (this.movie.steps.length >= 100) {
        this.movie.status = 'completed';
        this.movie.completedAt = new Date().toISOString();
        this.completedMovies.push({ ...this.movie });
        persistMovie(this.movie).catch(() => {});
        this.addSystemMessage(`🌟 ¡FELICITACIONES! La película ha completado sus 100 pasos. Ya está disponible en la Galería.`);
        this.phase = 'PLAYING';
        this.timeRemaining = 15;
        return;
      }

      // Generate step n + 1 with DeepSeek and fal.ai MiniMax H3-Max in 480p 16:9
      try {
        const nextStepRaw = await generateNextStepWithDeepSeek(this.movie, chosenOption, currentStep);
        
        // PROPS SE CREAN SÓLO CUANDO EL LLM DEBE INTEGRAR UN NUEVO PERSONAJE
        if (nextStepRaw.newCharacter) {
          const charExists = this.movie.bible.characters.some(c => c.id === nextStepRaw.newCharacter?.id);
          if (!charExists) {
            this.movie.bible.characters.push(nextStepRaw.newCharacter);
          }

          if (nextStepRaw.newProp) {
            const propExists = this.movie.bible.props.some(p => p.id === nextStepRaw.newProp?.id);
            if (!propExists) {
              this.movie.bible.props.push(nextStepRaw.newProp);
            }
            this.addSystemMessage(`🎭 Nuevo personaje integrado por la narrativa: "${nextStepRaw.newCharacter.name}" (${nextStepRaw.newCharacter.role}) junto con su prop de consistencia: "${nextStepRaw.newProp.name}".`);
          }
        }

        // Collect prop reference images for active props
        const activePropImages = this.movie.bible.props
          .filter(p => (nextStepRaw.activeProps || []).includes(p.id))
          .map(p => p.imageUrl)
          .filter(Boolean) as string[];

        // Generate video sending previous video as reference and prop images as references
        const videoRes = await generateVideoWithFal({
          prompt: nextStepRaw.visualPrompt,
          cameraMotion: nextStepRaw.cameraMotionPrompt,
          stepNumber: nextStepRaw.stepNumber,
          previousVideoUrl: currentStep.videoUrl,
          propReferenceImages: activePropImages,
          voiceDirection: nextStepRaw.voiceDirection
        });
        
        const nextStep: MovieStep = {
          ...nextStepRaw,
          videoUrl: videoRes.videoUrl,
          thumbnailUrl: videoRes.thumbnailUrl,
          referenceVideoUrl: currentStep.videoUrl,
          propReferenceImages: activePropImages
        };

        this.movie.steps.push(nextStep);
        this.movie.currentStep = nextStep.stepNumber;

        // Persist newly generated step and updated movie state to Supabase
        persistMovieStep(this.movie.id, nextStep).catch(() => {});
        persistMovie(this.movie).catch(() => {});
      } catch (err) {
        console.error("Error generating next step:", err);
      }

      // Reset voting & start next 15s PLAYING phase
      this.votesA = 0;
      this.votesB = 0;
      this.userVotes.clear();
      this.phase = 'PLAYING';
      this.timeRemaining = 15;
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

    // Persist audience vote to Supabase
    if (this.movie) {
      persistAudienceVote(this.movie.id, this.movie.currentStep, userId, optionId, userName).catch(() => {});
    }

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

  public addChatMessage(message: ChatMessage) {
    this.chatMessages.push(message);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }
    // Persist chat message to Supabase
    if (this.movie) {
      persistChatMessage(this.movie.id, message).catch(() => {});
    }
  }

  public addSystemMessage(text: string) {
    this.addChatMessage({
      id: `sys_${Date.now()}`,
      userId: "system",
      userName: "SISTEMA",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    });
  }

  private injectSimulatedAudienceActivity() {
    const audienceNames = ["NeoViewer_99", "SarahCyber", "ZeroCool", "Elena_Films", "LucasSciFi", "Cinefilo2099", "PixelRider"];
    const reactions = [
      "¡Noooo, cuidado con la trampa!",
      "Voten por la A, es la única forma de salvar el prisma",
      "La B tiene más acción seguro 🔥",
      "Qué locura la iluminación anamórfica de este clip",
      "La voz de Kael está genial, súper consistente",
      "¡Atentos al nuevo personaje que acaba de entrar en escena!",
      "Se viene el paso clave señores..."
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
    }
  }

  public getState(userId?: string): CinemaState {
    const activeStep = this.movie?.steps[this.movie.steps.length - 1] || {
      stepNumber: 1,
      title: "Cargando clip...",
      synopsis: "Inicializando transmisión cinemática...",
      visualPrompt: "",
      cameraMotionPrompt: "",
      videoUrl: "",
      duration: 15,
      votingWindowSeconds: 10,
      options: [
        { id: "A", title: "Opción A", text: "Esperando inicio...", dramaticHook: "", expectedConsequence: "", votes: 0 },
        { id: "B", title: "Opción B", text: "Esperando inicio...", dramaticHook: "", expectedConsequence: "", votes: 0 }
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
      totalAudience: this.totalAudience,
      votesA: this.votesA,
      votesB: this.votesB,
      hasUserVoted,
      activeStep,
      isLive: true,
      apiStatus: {
        hasDeepseek: Boolean(process.env.DEEPSEEK_API_KEY),
        hasFal: Boolean(process.env.FAL_KEY),
        isMockMode: !process.env.DEEPSEEK_API_KEY || !process.env.FAL_KEY
      }
    };
  }
}

export const cinemaEngine = CinemaOrchestrator.getInstance();
