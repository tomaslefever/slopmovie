'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CinemaState, ChatMessage, PlaybackPhase, MovieStep, ImmersiveAd } from '@/types/cinema';
import { CinemaPlayer } from '@/components/cinema/CinemaPlayer';
import { VotingOverlay } from '@/components/cinema/VotingOverlay';
import { BlockbusterVoting } from '@/components/cinema/BlockbusterVoting';
import { AudienceChat } from '@/components/cinema/AudienceChat';
import { GalleryView } from '@/components/gallery/GalleryView';
import { Navbar } from '@/components/layout/Navbar';
import { BuyAdsModal } from '@/components/cinema/BuyAdsModal';
import { ContactModal } from '@/components/cinema/ContactModal';
import { getSupabaseBrowserClient, initSupabaseBrowserClient } from '@/lib/supabase/client';
import { isRealGeneratedVideoUrl } from '@/lib/fal-video';

// Stable module-level fallback ad (identity must not change between renders,
// otherwise CinemaPlayer's memoization is defeated every render).
const FALLBACK_IN_SCENE_AD: ImmersiveAd = {
  id: "ad_suntory_reserve",
  brandName: "Suntory Orbital",
  title: "Zero-Gravity Single Malt",
  tagline: "Distilled aboard the Lunar Spire",
  type: "in_scene_overlay",
  imageUrl: "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=800&auto=format&fit=crop&q=80",
  ctaText: "Inspect Vintage",
  ctaUrl: "https://example.com/suntory",
  duration: 15,
  isActive: true,
  impressions: 0,
  clicks: 0
};

export default function CinemaStreamingPage() {
  const [cinemaState, setCinemaState] = useState<CinemaState | null>(null);
  const [userVoted, setUserVoted] = useState<'A' | 'B' | null>(null);
  const [blockbusterUserVoted, setBlockbusterUserVoted] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [nickname, setNickname] = useState<string | null>(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(true);
  const [subtitleLanguage, setSubtitleLanguage] = useState<'en' | 'es'>('en');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [isBuyAdsModalOpen, setIsBuyAdsModalOpen] = useState<boolean>(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState<boolean>(false);
  const [topVotedMessages, setTopVotedMessages] = useState<ChatMessage[]>([]);
  // Wraps CinemaPlayer + voting overlays so fullscreen keeps the vote cards visible
  const stageContainerRef = useRef<HTMLDivElement>(null);

  // On mobile the chat starts collapsed (the video needs the full width)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsChatOpen(false);
    }
  }, []);

  // Fetch chat messages and top-voted comments from Supabase / API
  const fetchChatAndTopVoted = async () => {
    try {
      const res = await fetch('/api/cinema/chat');
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          setChatMessages(data.messages);
        }
        if (data.topVoted && Array.isArray(data.topVoted)) {
          setTopVotedMessages(data.topVoted);
        }
      }
    } catch {
      // Ignored on transient network blip
    }
  };

  // Initial state hydration on mount (fetches live cinema state, session identity, and viewer preferences from Supabase)
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const res = await fetch('/api/cinema/state');
        if (res.ok) {
          const data = await res.json();
          setCinemaState(data);
          if (data.userId) {
            setUserId(data.userId);
            fetchChatAndTopVoted();
          }
          if (data.hasUserVoted) {
            setUserVoted(data.hasUserVoted);
          }
          if (data.blockbusterUserVoted) {
            setBlockbusterUserVoted(data.blockbusterUserVoted);
          }
          if (data.viewerPreferences) {
            setSubtitlesEnabled(data.viewerPreferences.subtitlesEnabled !== false);
            setSubtitleLanguage(data.viewerPreferences.subtitleLanguage === 'es' ? 'es' : 'en');
            if (data.viewerPreferences.nickname) {
              setNickname(data.viewerPreferences.nickname);
            }
          }
          if (data.chatMessages) {
            setChatMessages(data.chatMessages.filter((m: ChatMessage) => !m.isSystem && !m.votedOption));
          }
          // Dynamically initialize Supabase browser client if credentials returned at runtime
          if (data.supabaseConfig?.url && data.supabaseConfig?.anonKey) {
            initSupabaseBrowserClient(data.supabaseConfig.url, data.supabaseConfig.anonKey);
            setSupabaseReady(true);
          }
        }
      } catch (err) {
        console.error("Error fetching initial cinema state:", err);
      }
    };

    fetchInitialState();
  }, []);

  // Stage completion handler: requests to Supabase/API happen ONLY when an actual stage finishes in the client.
  // This eliminates arbitrary periodic polling and prevents scene cutting/overlap.
  const isCompletingStageRef = useRef<boolean>(false);
  // Set by CinemaPlayer's onPlaybackEnded when the scene clip actually reaches
  // its end. The stage timer must NEVER advance while this is false (the video
  // is still playing), except for the stalled-media grace fallback.
  const videoEndedRef = useRef<boolean>(false);
  const videoStartedRef = useRef<boolean>(false);
  const currentStepRef = useRef<number>(-1);

  // Compute the REAL remaining seconds of the current phase from the server's
  // phaseEndsAt. Falls back to the fixed duration when the timestamp is missing
  // or already expired (optimistic local transitions, fresh states, restarts).
  // A late-joining viewer then syncs to the true counter instead of restarting
  // the full phase duration.
  const getSyncedPhaseRemaining = (phaseEndsAt: string | number | undefined, fallbackSeconds: number): number => {
    if (!phaseEndsAt) return fallbackSeconds;
    const endsAtMs = typeof phaseEndsAt === 'number' ? phaseEndsAt : new Date(phaseEndsAt).getTime();
    if (!Number.isFinite(endsAtMs) || endsAtMs <= 0) return fallbackSeconds;
    const remaining = Math.ceil((endsAtMs - Date.now()) / 1000);
    return remaining > 0 ? Math.min(fallbackSeconds, remaining) : fallbackSeconds;
  };

  const handleStageComplete = async (completedPhase: PlaybackPhase) => {
    if (!cinemaState || isCompletingStageRef.current) return;
    if (cinemaState.phase !== completedPhase) return;

    isCompletingStageRef.current = true;
    const currentStepNum = cinemaState.movie?.currentStep;

    console.log(`[CinemaPage] Stage finished on client: ${completedPhase} (Step ${currentStepNum}). Requesting transition from Supabase...`);

    // 1. Optimistic UI transition: advance locally for seamless, hitch-free continuity
    if (completedPhase === 'PLAYING') {
      setUserVoted(null);
      const stepCount = currentStepNum;
      // First-shot uninterrupted playback: steps 1, 2, 3 advance directly to next scene without voting pause
      const hasNextFirstShotStep = stepCount < 4 && Boolean(cinemaState?.movie?.steps?.some(s => s.stepNumber === stepCount + 1));

      if (hasNextFirstShotStep) {
        const nextStepNum = stepCount + 1;
        const nextStepObj = cinemaState?.movie?.steps?.find(s => s.stepNumber === nextStepNum);
        setCinemaState((prev) => prev ? {
          ...prev,
          movie: { ...prev.movie, currentStep: nextStepNum },
          activeStep: nextStepObj || prev.activeStep,
          phase: 'PLAYING',
          timeRemaining: 15,
          phaseEndsAt: Date.now() + 15000,
          votesA: 0,
          votesB: 0,
          hasUserVoted: null
        } : null);
      } else {
        const adsConfig = cinemaState?.adsConfig;
        const isAdDue = Boolean(
          adsConfig?.autoAdsEnabled &&
          stepCount > 0 &&
          stepCount % (adsConfig.adIntervalSteps || 5) === 0 &&
          stepCount !== adsConfig.lastAdStep &&
          stepCount < 97
        );

        if (isAdDue) {
          setCinemaState((prev) => prev ? {
            ...prev,
            phase: 'COMMERCIAL_BREAK',
            timeRemaining: 15,
            phaseEndsAt: Date.now() + 15000
          } : null);
        } else {
          setCinemaState((prev) => prev ? {
            ...prev,
            phase: 'VOTING',
            timeRemaining: 10,
            phaseEndsAt: Date.now() + 10000,
            votesA: 0,
            votesB: 0
          } : null);
        }
      }
    } else if (completedPhase === 'COMMERCIAL_BREAK') {
      setUserVoted(null);
      setCinemaState((prev) => prev ? {
        ...prev,
        phase: 'VOTING',
        timeRemaining: 10,
        phaseEndsAt: Date.now() + 10000,
        votesA: 0,
        votesB: 0
      } : null);
    } else if (completedPhase === 'VOTING') {
      setCinemaState((prev) => prev ? {
        ...prev,
        phase: 'GENERATING',
        timeRemaining: 4,
        phaseEndsAt: Date.now() + 4000
      } : null);
    } else if (completedPhase === 'BLOCKBUSTER_VOTING') {
      setBlockbusterUserVoted(null);
      setCinemaState((prev) => prev ? {
        ...prev,
        phase: 'GENERATING',
        timeRemaining: 4,
        phaseEndsAt: Date.now() + 4000,
        blockbusterCandidates: []
      } : null);
    }

    // 2. Report stage completion to Supabase and retrieve updated state
    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_stage',
          stage: completedPhase,
          stepNumber: currentStepNum,
          userId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setCinemaState((prev) => {
            if (!prev) return data.state;
            const isSameStep = prev.activeStep?.stepNumber === data.state.activeStep?.stepNumber;
            return {
              ...prev,
              ...data.state,
              movie: data.state.movie ?? prev.movie,
              activeStep: (isSameStep && prev.activeStep?.videoUrl === data.state.activeStep?.videoUrl)
                ? prev.activeStep
                : data.state.activeStep,
              phase: data.state.phase ?? prev.phase,
              timeRemaining: (prev.phase === data.state.phase) ? prev.timeRemaining : (data.state.timeRemaining ?? prev.timeRemaining),
              votesA: data.state.votesA ?? prev.votesA,
              votesB: data.state.votesB ?? prev.votesB,
              totalAudience: data.state.totalAudience ?? prev.totalAudience,
              isPaused: data.state.isPaused ?? prev.isPaused,
              isGenerationPaused: data.state.isGenerationPaused ?? prev.isGenerationPaused,
              apiStatus: data.state.apiStatus ?? prev.apiStatus
            };
          });
        }
      }
    } catch (err) {
      console.error(`Error completing stage ${completedPhase}:`, err);
    } finally {
      setTimeout(() => {
        isCompletingStageRef.current = false;
      }, 800);
    }
  };

  // 1. Playback timer for PLAYING stage.
  // - Starts counting down when the video actually starts playing.
  // - The transition triggers immediately when the video finishes (onPlaybackEnded).
  // - If the countdown reaches 0 while the video is still playing, it does NOT reset to 15s.
  //   It stays at 0s and smoothly completes the stage as soon as the video ends.
  useEffect(() => {
    if (!cinemaState || cinemaState.phase !== 'PLAYING' || cinemaState.isPaused) return;

    const stepNum = cinemaState.movie?.currentStep;
    if (stepNum === undefined) return;

    // Reset video flags when entering a new step
    if (currentStepRef.current !== stepNum) {
      currentStepRef.current = stepNum;
      videoEndedRef.current = false;
      videoStartedRef.current = false;
    }

    console.log(`[CinemaPage] Scene active (Step ${stepNum}). Waiting for video playback...`);

    let timer: ReturnType<typeof setInterval> | null = null;
    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;
    const durationSec = 15;
    let remaining = durationSec;

    const startCountdown = () => {
      if (timer) return;
      videoStartedRef.current = true;
      const startTime = Date.now();

      timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        remaining = Math.max(0, durationSec - elapsed);

        setCinemaState(prev => {
          if (!prev || prev.phase !== 'PLAYING') return prev;
          if (prev.timeRemaining === remaining) return prev;
          return { ...prev, timeRemaining: remaining };
        });

        if (remaining <= 0) {
          if (timer) clearInterval(timer);
          if (videoEndedRef.current) {
            console.log(`[CinemaPage] Playback and countdown both finished for Step ${stepNum}. Transitioning to VOTING.`);
            handleStageComplete('PLAYING');
          } else {
            console.log(`[CinemaPage] 15s countdown elapsed for Step ${stepNum} but video is still playing. Waiting for onPlaybackEnded...`);
            // Safety fallback: if video is frozen or stalled, advance after 3.5s grace
            fallbackTimeout = setTimeout(() => {
              console.log(`[CinemaPage] Safety fallback elapsed for Step ${stepNum}. Advancing to VOTING.`);
              handleStageComplete('PLAYING');
            }, 3500);
          }
        }
      }, 1000);
    };

    // If playback already marked as started, begin immediately; otherwise wait max 2.5s before beginning countdown
    const maxStartDelay = setTimeout(() => {
      startCountdown();
    }, 2500);

    return () => {
      clearTimeout(maxStartDelay);
      if (timer) clearInterval(timer);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [cinemaState?.phase, cinemaState?.movie?.currentStep, cinemaState?.isPaused]);

  // 2. Fixed 10-second timeout for VOTING stage.
  // Triggers when VOTING starts, counts down 10s locally, and requests transition to GENERATING.
  useEffect(() => {
    if (!cinemaState || cinemaState.phase !== 'VOTING' || cinemaState.isPaused) return;

    console.log('[CinemaPage] Voting started. Running voting timeout...');

    const startTime = Date.now();
    const durationSec = getSyncedPhaseRemaining(cinemaState.phaseEndsAt, 10);

    setCinemaState(prev => prev ? { ...prev, timeRemaining: durationSec } : prev);

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, durationSec - elapsed);

      setCinemaState(prev => {
        if (!prev || prev.phase !== 'VOTING') return prev;
        if (prev.timeRemaining === remaining) return prev;
        return { ...prev, timeRemaining: remaining };
      });

      if (remaining <= 0) {
        clearInterval(timer);
        console.log('[CinemaPage] 10s voting window elapsed. Transitioning to GENERATING...');
        handleStageComplete('VOTING');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [cinemaState?.phase, cinemaState?.isPaused]);

  // 3. Fixed 15-second timeout for COMMERCIAL_BREAK stage.
  // The ad player notifies completion when its video ends (or the countdown for
  // image-only ads). This timer only drives the HUD countdown and acts as a
  // last-resort fallback when the ad never completes (stalled/broken media).
  useEffect(() => {
    if (!cinemaState || cinemaState.phase !== 'COMMERCIAL_BREAK' || cinemaState.isPaused) return;

    console.log('[CinemaPage] Commercial break started. Running commercial timeout...');

    const startTime = Date.now();
    const durationSec = getSyncedPhaseRemaining(cinemaState.phaseEndsAt, 15);

    setCinemaState(prev => prev ? { ...prev, timeRemaining: durationSec } : prev);

    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, durationSec - elapsed);

      setCinemaState(prev => {
        if (!prev || prev.phase !== 'COMMERCIAL_BREAK') return prev;
        if (prev.timeRemaining === remaining) return prev;
        return { ...prev, timeRemaining: remaining };
      });

      // Never cut the ad video short: the transition is driven by onAdCompleted
      // (ad video 'ended'). Fall back only if nothing completes well past the window.
      if (remaining <= 0 && !fallbackTimeout) {
        fallbackTimeout = setTimeout(() => {
          console.log('[CinemaPage] Commercial break window exceeded without ad completion — advancing with grace.');
          handleStageComplete('COMMERCIAL_BREAK');
        }, 12000);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [cinemaState?.phase, cinemaState?.isPaused]);

  // 3b. Fixed 60-second timeout for BLOCKBUSTER_VOTING stage.
  // Audience picks the next film from 4 candidates; when time runs out the winner resolves.
  useEffect(() => {
    if (!cinemaState || cinemaState.phase !== 'BLOCKBUSTER_VOTING' || cinemaState.isPaused) return;

    console.log('[CinemaPage] Next-blockbuster vote started. Running voting timeout...');

    const startTime = Date.now();
    // CRITICAL SYNC: a viewer joining mid-vote must count down the REAL
    // remaining time (server phaseEndsAt), not a fresh 60s.
    const durationSec = getSyncedPhaseRemaining(cinemaState.phaseEndsAt, 60);

    setCinemaState(prev => prev ? { ...prev, timeRemaining: durationSec } : prev);

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, durationSec - elapsed);

      setCinemaState(prev => {
        if (!prev || prev.phase !== 'BLOCKBUSTER_VOTING') return prev;
        if (prev.timeRemaining === remaining) return prev;
        return { ...prev, timeRemaining: remaining };
      });

      if (remaining <= 0) {
        clearInterval(timer);
        console.log('[CinemaPage] 60s blockbuster vote elapsed. Resolving winner...');
        handleStageComplete('BLOCKBUSTER_VOTING');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [cinemaState?.phase, cinemaState?.isPaused]);

  // 3c. Preload the NEXT known scene's video in the background so the cut at
  // scene start doesn't stall buffering on mid-range devices (helps the
  // first-shot prologue and any step whose URL is already known). Only real
  // generated clips are preloaded — the giant sample mocks would waste data.
  useEffect(() => {
    const currentStepNum = cinemaState?.activeStep?.stepNumber;
    const nextStep = cinemaState?.movie?.steps?.find(s => s.stepNumber === (currentStepNum ?? -1) + 1);
    if (!nextStep?.videoUrl || !isRealGeneratedVideoUrl(nextStep.videoUrl)) return;

    const preloader = document.createElement('video');
    preloader.preload = 'auto';
    preloader.muted = true;
    preloader.src = nextStep.videoUrl;
    preloader.load();
  }, [cinemaState?.movie?.steps, cinemaState?.activeStep?.stepNumber]);

  // 4. Dedicated polling ONLY while in GENERATING state until the next scene is synthesized and ready.
  // Stops immediately as soon as the response carries the new generated video link (or the phase leaves GENERATING).
  useEffect(() => {
    if (cinemaState?.phase !== 'GENERATING') return;

    let isSubscribed = true;
    let stopped = false;
    const generatingStepNum = cinemaState.movie?.currentStep;
    console.log('[CinemaPage] Phase is GENERATING: polling until new scene video link arrives...');

    const applyReadyState = (data: any) => {
      console.log(`[CinemaPage] Scene ready! Generated video link received (Step ${data.activeStep?.stepNumber}). Stopping GENERATING polling.`);
      setCinemaState((prev) => {
        if (!prev) return data;
        return {
          ...prev,
          ...data,
          movie: data.movie ?? prev.movie,
          activeStep: data.activeStep ?? prev.activeStep,
          phase: data.phase,
          timeRemaining: 15,
          votesA: 0,
          votesB: 0,
          hasUserVoted: null
        };
      });
      setUserVoted(null);
    };

    const pollUntilReady = async () => {
      if (stopped || !isSubscribed) return;
      try {
        const res = await fetch('/api/cinema/state');
        if (res.ok && isSubscribed && !stopped) {
          const data = await res.json();
          // Stop polling as soon as the response includes the newly generated video link
          const newVideoLinkReady = Boolean(
            data.activeStep?.videoUrl &&
            data.activeStep.stepNumber !== generatingStepNum
          );
          // Or as soon as generation completed and phase is no longer GENERATING
          if (newVideoLinkReady || (data.phase && data.phase !== 'GENERATING')) {
            stopped = true;
            clearInterval(interval);
            clearTimeout(initialCheck);
            applyReadyState(data);
          }
        }
      } catch (err) {
        console.warn('[CinemaPage] Error polling during GENERATING:', err);
      }
    };

    const interval = setInterval(pollUntilReady, 2000);
    const initialCheck = setTimeout(pollUntilReady, 1200);

    return () => {
      isSubscribed = false;
      stopped = true;
      clearInterval(interval);
      clearTimeout(initialCheck);
    };
  }, [cinemaState?.phase, cinemaState?.movie?.currentStep]);

  // SUPABASE REALTIME SUBSCRIPTION
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase.channel('cinema_live_sync', {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'state_snapshot' }, (payload: { payload: Partial<CinemaState> }) => {
        setCinemaState((prev) => {
          const snapshot = payload.payload;
          const defaultApiStatus = { hasDeepseek: false, hasFal: false, isMockMode: true };
          if (!prev) {
            return snapshot ? {
              ...snapshot,
              apiStatus: snapshot.apiStatus || defaultApiStatus
            } as CinemaState : null;
          }

          // Do not cut video playback if client is currently in PLAYING
          const isPlaying = prev.phase === 'PLAYING';
          return {
            ...prev,
            ...snapshot,
            apiStatus: snapshot.apiStatus ?? prev.apiStatus ?? defaultApiStatus,
            movie: snapshot.movie ?? prev.movie,
            activeStep: (isPlaying && prev.activeStep) ? prev.activeStep : (snapshot.activeStep ?? prev.activeStep),
            phase: (isPlaying && snapshot.phase !== 'PLAYING') ? prev.phase : (snapshot.phase ?? prev.phase),
            timeRemaining: isPlaying ? prev.timeRemaining : (snapshot.timeRemaining ?? prev.timeRemaining),
            votesA: snapshot.votesA ?? prev.votesA,
            votesB: snapshot.votesB ?? prev.votesB,
            totalAudience: snapshot.totalAudience ?? prev.totalAudience,
            activeAd: snapshot.activeAd !== undefined ? snapshot.activeAd : prev.activeAd,
            adsConfig: snapshot.adsConfig ?? prev.adsConfig,
            isLive: snapshot.isLive ?? prev.isLive,
            isPaused: snapshot.isPaused !== undefined ? snapshot.isPaused : prev.isPaused,
            isGenerationPaused: snapshot.isGenerationPaused !== undefined ? snapshot.isGenerationPaused : prev.isGenerationPaused,
            blockbusterCandidates: snapshot.blockbusterCandidates ?? prev.blockbusterCandidates,
            blockbusterVoteCounts: snapshot.blockbusterVoteCounts ?? prev.blockbusterVoteCounts
          };
        });
      })
      .on('broadcast', { event: 'time_tick' }, (payload: { payload: { timeRemaining?: number; phase?: PlaybackPhase; votesA?: number; votesB?: number; totalAudience?: number; selectedOption?: 'A' | 'B'; wasRandomPick?: boolean } }) => {
        setCinemaState((prev) => {
          if (!prev) return prev;
          // In client-driven mode, scene video & voting timers run on the client.
          // time_tick only updates live audience and votes counters without disrupting playback.
          // Bail out when nothing changed — otherwise the whole page re-renders every second
          // (noticeable frame drops on mobile).
          const votesA = payload.payload.votesA ?? prev.votesA;
          const votesB = payload.payload.votesB ?? prev.votesB;
          const totalAudience = payload.payload.totalAudience ?? prev.totalAudience;
          if (votesA === prev.votesA && votesB === prev.votesB && totalAudience === prev.totalAudience) {
            return prev;
          }
          return {
            ...prev,
            votesA,
            votesB,
            totalAudience
          };
        });
      })
      .on('broadcast', { event: 'phase_change' }, (payload: { payload: { phase: PlaybackPhase; timeRemaining?: number; votesA?: number; votesB?: number; selectedOption?: 'A' | 'B'; wasRandomPick?: boolean } }) => {
        if (payload.payload.phase === 'VOTING') {
          setUserVoted(null);
        }
        setCinemaState((prev) => {
          if (!prev) return prev;
          const updatedStep = payload.payload.selectedOption ? {
            ...prev.activeStep,
            selectedOption: payload.payload.selectedOption,
            wasRandomPick: payload.payload.wasRandomPick ?? prev.activeStep.wasRandomPick
          } : prev.activeStep;

          return {
            ...prev,
            phase: payload.payload.phase,
            timeRemaining: payload.payload.timeRemaining ?? prev.timeRemaining,
            phaseDuration: (payload.payload as any).phaseDuration ?? prev.phaseDuration,
            votesA: payload.payload.votesA ?? prev.votesA,
            votesB: payload.payload.votesB ?? prev.votesB,
            blockbusterCandidates: (payload.payload as any).blockbusterCandidates ?? prev.blockbusterCandidates,
            blockbusterVoteCounts: (payload.payload as any).blockbusterVoteCounts ?? prev.blockbusterVoteCounts,
            activeStep: updatedStep
          };
        });
      })
      .on('broadcast', { event: 'vote_update' }, (payload: { payload: { votesA: number; votesB: number; totalVotes?: number; timeRemaining?: number; totalAudience?: number } }) => {
        setCinemaState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            votesA: payload.payload.votesA,
            votesB: payload.payload.votesB,
            timeRemaining: payload.payload.timeRemaining ?? prev.timeRemaining,
            totalAudience: payload.payload.totalAudience ?? prev.totalAudience
          };
        });
      })
      .on('broadcast', { event: 'new_step' }, (payload: { payload: { step: MovieStep; currentStep: number; phaseEndsAt?: string | number } }) => {
        setUserVoted(null);
        if (payload.payload.step) {
          setCinemaState((prev) => {
            if (!prev) return prev;
            const existingStepIndex = prev.movie.steps.findIndex(s => s.stepNumber === payload.payload.step.stepNumber);
            const updatedSteps = existingStepIndex >= 0
              ? prev.movie.steps.map((s, idx) => idx === existingStepIndex ? payload.payload.step : s)
              : [...prev.movie.steps, payload.payload.step];

            const updatedMovie = {
              ...prev.movie,
              currentStep: payload.payload.currentStep,
              steps: updatedSteps
            };
            return {
              ...prev,
              movie: updatedMovie,
              activeStep: payload.payload.step,
              phase: 'PLAYING',
              timeRemaining: payload.payload.step.duration || 15,
              phaseEndsAt: payload.payload.phaseEndsAt || Date.now() + ((payload.payload.step.duration || 15) * 1000),
              votesA: 0,
              votesB: 0,
              hasUserVoted: null
            };
          });
        }
      })
      .on('broadcast', { event: 'chat_message' }, (payload: { payload: ChatMessage }) => {
        if (payload.payload && !payload.payload.isSystem && !payload.payload.votedOption) {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === payload.payload.id)) return prev;
            return [...prev.slice(-99), payload.payload];
          });
        }
      })
      .on('broadcast', { event: 'comment_voted' }, (payload: { payload: { commentId: string; votesCount: number; userId: string; userVoted: boolean } }) => {
        if (!payload.payload) return;
        const { commentId, votesCount } = payload.payload;
        setChatMessages((prev) =>
          prev.map(m => m.id === commentId ? { ...m, votesCount } : m)
        );
        setTopVotedMessages((prev) => {
          const exists = prev.some(m => m.id === commentId);
          if (exists) {
            return prev
              .map(m => m.id === commentId ? { ...m, votesCount } : m)
              .sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
          }
          return prev;
        });
        fetchChatAndTopVoted();
      })
      .on('broadcast', { event: 'ad_break_started' }, (payload: any) => {
        setCinemaState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            phase: 'COMMERCIAL_BREAK',
            activeAd: payload.payload.ad,
            timeRemaining: payload.payload.timeRemaining || 10
          };
        });
      })
      .on('broadcast', { event: 'ad_video_generated' }, (payload: any) => {
        setCinemaState((prev) => {
          if (!prev || !prev.activeAd || prev.activeAd.id !== payload.payload.adId) return prev;
          return {
            ...prev,
            activeAd: {
              ...prev.activeAd,
              generatedAdVideoUrl: payload.payload.generatedAdVideoUrl
            }
          };
        });
      })
      .on('broadcast', { event: 'blockbuster_vote_update' }, (payload: any) => {
        if (payload.payload?.counts) {
          setCinemaState((prev) => prev ? { ...prev, blockbusterVoteCounts: payload.payload.counts } : prev);
        }
      })
      .on('broadcast', { event: 'blockbuster_vote_started' }, (payload: any) => {
        setUserVoted(null);
        setBlockbusterUserVoted(null);
        if (payload.payload?.candidates) {
          setCinemaState((prev) => prev ? {
            ...prev,
            phase: 'BLOCKBUSTER_VOTING',
            timeRemaining: 60,
            phaseEndsAt: payload.payload.phaseEndsAt || Date.now() + 60000,
            blockbusterCandidates: payload.payload.candidates,
            blockbusterVoteCounts: { A: 0, B: 0, C: 0, D: 0 },
            activeAd: null
          } : null);
        }
      })
      .on('broadcast', { event: 'ad_break_ended' }, (payload: any) => {
        setCinemaState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            phase: payload.payload.phase || 'PLAYING',
            activeAd: null,
            timeRemaining: payload.payload.timeRemaining || 15
          };
        });
      })
      .on('broadcast', { event: 'cinema_paused' }, () => {
        setCinemaState(prev => prev ? { ...prev, isPaused: true } : prev);
      })
      .on('broadcast', { event: 'cinema_resumed' }, () => {
        setCinemaState(prev => prev ? { ...prev, isPaused: false } : prev);
      })
      .on('broadcast', { event: 'generation_paused' }, () => {
        setCinemaState(prev => prev ? { ...prev, isGenerationPaused: true } : prev);
      })
      .on('broadcast', { event: 'generation_resumed' }, () => {
        setCinemaState(prev => prev ? { ...prev, isGenerationPaused: false } : prev);
      })
      .on('broadcast', { event: 'new_movie_started' }, (payload: any) => {
        setUserVoted(null);
        setBlockbusterUserVoted(null);
        if (payload.payload?.movie) {
          setCinemaState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              movie: payload.payload.movie,
              activeStep: payload.payload.movie.steps[0],
              phase: 'PLAYING',
              timeRemaining: 15,
              phaseEndsAt: Date.now() + 15000,
              votesA: 0,
              votesB: 0,
              hasUserVoted: null
            };
          });
        }
      })
      .subscribe();

    // TOP VOTED COMMENTS REALTIME SUBSCRIPTION
    const topCommentsChannel = supabase
      .channel('schema_top_comments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'top_voted_comments' },
        () => {
          fetchChatAndTopVoted();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(topCommentsChannel);
    };
  }, [supabaseReady]);

  // Subtitle preference handlers synced with Supabase (zero browser localStorage)
  const handleToggleSubtitles = async (enabled: boolean) => {
    setSubtitlesEnabled(enabled);
    if (userId) {
      try {
        await fetch('/api/cinema/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, subtitlesEnabled: enabled })
        });
      } catch (err) {
        console.error("Error saving subtitle preference:", err);
      }
    }
  };

  const handleChangeSubtitleLanguage = async (lang: 'en' | 'es') => {
    setSubtitleLanguage(lang);
    setSubtitlesEnabled(true);
    if (userId) {
      try {
        await fetch('/api/cinema/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, subtitleLanguage: lang, subtitlesEnabled: true })
        });
      } catch (err) {
        console.error("Error saving subtitle language preference:", err);
      }
    }
  };

  // Nickname preference handler synced with Supabase (zero browser localStorage)
  const handleSetNickname = async (newNick: string) => {
    const trimmed = newNick.trim().replace(/^@+/, '');
    if (!trimmed || trimmed.length < 2) return false;
    setNickname(trimmed);
    if (userId) {
      try {
        await fetch('/api/cinema/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, nickname: trimmed })
        });
        return true;
      } catch (err) {
        console.error("Error saving nickname to Supabase:", err);
      }
    }
    return false;
  };

  // Cast vote handler
  const handleVote = async (optionId: 'A' | 'B') => {
    if (!cinemaState || userVoted) return;

    // Optimistically update local user vote state immediately
    setUserVoted(optionId);

    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote',
          optionId,
          userId,
          userName: nickname || `Viewer_${userId.slice(-4)}`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCinemaState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            votesA: data.votesA,
            votesB: data.votesB
          };
        });
      }
    } catch (err) {
      console.error("Error casting vote:", err);
    }
  };

  // Vote for the next blockbuster movie during the 60s BLOCKBUSTER_VOTING stage
  const handleBlockbusterVote = async (candidateId: 'A' | 'B' | 'C' | 'D') => {
    if (!cinemaState || cinemaState.phase !== 'BLOCKBUSTER_VOTING') return;
    if (blockbusterUserVoted === candidateId) return;

    const previousPick = blockbusterUserVoted;
    setBlockbusterUserVoted(candidateId);

    // Optimistic local counts update
    setCinemaState((prev) => {
      if (!prev) return prev;
      const counts = { ...(prev.blockbusterVoteCounts || { A: 0, B: 0, C: 0, D: 0 }) };
      if (previousPick) counts[previousPick] = Math.max(0, counts[previousPick] - 1);
      counts[candidateId]++;
      return { ...prev, blockbusterVoteCounts: counts };
    });

    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'blockbuster_vote',
          optionId: candidateId,
          userId,
          movieId: cinemaState.movie?.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.counts) {
          setCinemaState((prev) => prev ? { ...prev, blockbusterVoteCounts: data.counts } : prev);
        }
        if (data.userVoted) {
          setBlockbusterUserVoted(data.userVoted);
        }
      }
    } catch (err) {
      console.error('Error casting blockbuster vote:', err);
    }
  };

  // Send chat message handler (requires nickname)
  const handleSendMessage = async (text: string) => {    if (!nickname) return;

    try {
      await fetch('/api/cinema/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userName: nickname,
          text
        })
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Upvote comment handler (requires userId session)
  const handleVoteComment = async (commentId: string) => {
    if (!userId) return;

    // Optimistically toggle vote state locally
    const updater = (prev: ChatMessage[]) =>
      prev.map((m) => {
        if (m.id === commentId) {
          const wasVoted = Boolean(m.hasUserVoted);
          return {
            ...m,
            hasUserVoted: !wasVoted,
            votesCount: Math.max(0, (m.votesCount || 0) + (wasVoted ? -1 : 1))
          };
        }
        return m;
      });

    setChatMessages(updater);
    setTopVotedMessages(updater);

    try {
      const res = await fetch('/api/cinema/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote_comment',
          commentId,
          userId
        })
      });

      if (res.ok) {
        const data = await res.json();
        const serverUpdater = (prev: ChatMessage[]) =>
          prev.map((m) =>
            m.id === commentId ? { ...m, votesCount: data.votesCount, hasUserVoted: data.userVoted } : m
          );
        setChatMessages(serverUpdater);
        setTopVotedMessages((prev) => {
          const updated = serverUpdater(prev);
          return updated.sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
        });
      }
    } catch (err) {
      console.error("Error voting on comment:", err);
    }
  };

  if (!cinemaState || !cinemaState.movie) {
    return (
      <div className="w-screen h-screen bg-[#050608] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
        <h2 className="text-sm font-mono tracking-widest text-neutral-400 uppercase">
          Tuning into Live Interactive Cinema Stream...
        </h2>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-[#050608] flex flex-col overflow-hidden text-neutral-100 font-sans">
      {/* Top Navigation */}
      <Navbar
        movieTitle={cinemaState.movie.title}
        isMockMode={cinemaState.apiStatus?.isMockMode ?? false}
        onToggleGallery={() => setIsGalleryOpen(!isGalleryOpen)}
        isGalleryOpen={isGalleryOpen}
        currentStep={cinemaState.movie.currentStep}
        totalSteps={cinemaState.movie.totalSteps}
        onOpenBuyAds={() => setIsBuyAdsModalOpen(true)}
        onOpenContact={() => setIsContactModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {isGalleryOpen ? (
          <GalleryView 
            onBackToLive={() => setIsGalleryOpen(false)} 
            activeMovie={cinemaState.movie} 
          />
        ) : (
          <>
            {/* Screen Video Stage */}
            <div ref={stageContainerRef} className="flex-1 relative h-full flex items-center justify-center overflow-hidden">
              <CinemaPlayer
                movieTitle={cinemaState.movie.title}
                genre={cinemaState.movie.genre}
                activeStep={cinemaState.activeStep}
                phase={cinemaState.phase}
                totalSteps={cinemaState.movie.totalSteps}
                activeAd={cinemaState.activeAd}
                isPaused={cinemaState.isPaused}
                isGenerationPaused={cinemaState.isGenerationPaused}
                subtitlesEnabled={subtitlesEnabled}
                subtitleLanguage={subtitleLanguage}
                onToggleSubtitles={handleToggleSubtitles}
                onChangeSubtitleLanguage={handleChangeSubtitleLanguage}
                onPlaybackStarted={() => {
                  videoStartedRef.current = true;
                }}
                onAdCompleted={() => handleStageComplete('COMMERCIAL_BREAK')}
                onPlaybackEnded={() => {
                  console.log(`[CinemaPage] Video playback finished for Step ${cinemaState.movie?.currentStep}. Advancing to VOTING...`);
                  videoEndedRef.current = true;
                  handleStageComplete('PLAYING');
                }}
                fullscreenContainerRef={stageContainerRef}
                inSceneAd={
                  cinemaState.activeAd?.type === 'in_scene_overlay'
                    ? cinemaState.activeAd
                    : (cinemaState.movie.currentStep % 2 === 0 ? FALLBACK_IN_SCENE_AD : null)
                }
                onOpenBuyAds={() => setIsBuyAdsModalOpen(true)}
              />

              {/* Voting & Decision Overlay (stays centered until next clip starts) */}
              <VotingOverlay
                isVisible={cinemaState.phase === 'VOTING' || cinemaState.phase === 'GENERATING'}
                phase={cinemaState.phase}
                timeRemaining={cinemaState.timeRemaining}
                options={cinemaState.activeStep.options}
                votesA={cinemaState.votesA}
                votesB={cinemaState.votesB}
                userVoted={userVoted}
                selectedOption={cinemaState.activeStep.selectedOption}
                wasRandomPick={cinemaState.activeStep.wasRandomPick}
                onVote={handleVote}
              />

              {/* Next Blockbuster Audience Vote (60s, 4 candidate films) */}
              {cinemaState.phase === 'BLOCKBUSTER_VOTING' && (
                <BlockbusterVoting
                  candidates={cinemaState.blockbusterCandidates || []}
                  counts={cinemaState.blockbusterVoteCounts || { A: 0, B: 0, C: 0, D: 0 }}
                  timeRemaining={cinemaState.timeRemaining}
                  userVoted={blockbusterUserVoted}
                  onVote={handleBlockbusterVote}
                />
              )}
            </div>

            {/* Right Live Audience Chat */}
            <AudienceChat
              messages={chatMessages}
              totalAudience={cinemaState.totalAudience}
              onSendMessage={handleSendMessage}
              nickname={nickname}
              onSetNickname={handleSetNickname}
              isOpen={isChatOpen}
              onToggle={() => setIsChatOpen(!isChatOpen)}
              onVoteComment={handleVoteComment}
              topVotedMessages={topVotedMessages}
            />
          </>
        )}
      </main>

      {/* Buy Ads Modal (Immersive Ads Explanation & Showcase Checkout) */}
      <BuyAdsModal 
        isOpen={isBuyAdsModalOpen} 
        onClose={() => setIsBuyAdsModalOpen(false)} 
      />

      {/* Contact Modal (Direct Dispatch / Feedback / Webhook) */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
}
