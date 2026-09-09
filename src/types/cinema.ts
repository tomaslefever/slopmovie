export interface Character {
  id: string;
  name: string;
  role: string; // e.g. "Protagonista", "Antagonista", "Aliado", "Informante"
  visualTraits: string; // Immutable facial & physical traits for AI consistency
  clothing: string;
  personality: string;
  voiceStyle?: string;
  voicePrompt: string; // Detailed voice prompt (timbre, tone, cadence, accent) to maintain consistent vocal audio
  avatarUrl?: string;
  referenceImages?: string[];
  stepIntroduced?: number; // Step number when introduced by LLM
}

export interface Prop {
  id: string;
  name: string;
  description: string;
  visualAppearance: string; // Immutable visual appearance for AI consistency
  narrativeSignificance: string;
  imageUrl?: string; // Reference image sent to video models
  stepIntroduced?: number; // Step number when introduced
  ownerCharacterId?: string; // ID of the character who owns/introduces this prop
  ownerCharacterName?: string;
  icon?: string;
}

export interface SceneEnvironment {
  id: string;
  name: string;
  lighting: string;
  atmosphere: string;
  colorPalette: string;
  architecturalStyle: string;
}

export interface DecisionOption {
  id: 'A' | 'B';
  title: string;
  text: string;
  dramaticHook: string;
  expectedConsequence: string;
  votes: number;
}

export interface MovieStep {
  stepNumber: number; // 1 to 100
  title: string;
  synopsis: string;
  dialogueSnippet?: string;
  voiceDirection?: string; // Character voice prompt and emotional direction for consistent audio
  visualPrompt: string; // Detailed Image prompt with character & prop consistency anchors
  cameraMotionPrompt: string; // Camera movement & cinematography prompt
  videoUrl: string; // 15-second video clip URL
  thumbnailUrl?: string;
  duration: number; // exactly 15 seconds
  votingWindowSeconds: number; // exactly 10 seconds
  options: [DecisionOption, DecisionOption];
  selectedOption?: 'A' | 'B';
  wasRandomPick?: boolean;
  activeCharacters: string[];
  activeProps: string[];
  newCharacter?: Character; // New character introduced in this step by the LLM
  newProp?: Prop; // Associated signature prop created specifically with this new character
  referenceVideoUrl?: string; // Previous video URL passed as continuity reference
  propReferenceImages?: string[]; // Prop image URLs passed as references to fal.ai
  environment: string;
  createdAt: string;
}

export interface MovieBible {
  characters: Character[];
  props: Prop[];
  environments: SceneEnvironment[];
  cinematicStyle: string; // e.g. "Anamorphic 35mm Panavision, Dark Cyberpunk, Moody Teals and Neon Amber"
  targetTheme: string;
}

export interface Movie {
  id: string;
  title: string;
  genre: string;
  tagline: string;
  initialPlot: string; // Generated master story & arc by the LLM
  masterArcThread: string;
  status: 'streaming' | 'completed' | 'paused';
  currentStep: number;
  totalSteps: number; // 100 steps total
  bible: MovieBible;
  steps: MovieStep[];
  createdAt: string;
  completedAt?: string;
  totalVotesCast: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
  votedOption?: 'A' | 'B';
}

export type PlaybackPhase = 'PLAYING' | 'VOTING' | 'GENERATING';

export interface CinemaState {
  movie: Movie;
  phase: PlaybackPhase;
  timeRemaining: number; // in seconds
  totalAudience: number;
  votesA: number;
  votesB: number;
  hasUserVoted?: 'A' | 'B' | null;
  activeStep: MovieStep;
  isLive: boolean;
  apiStatus: {
    hasDeepseek: boolean;
    hasFal: boolean;
    isMockMode: boolean;
  };
}
