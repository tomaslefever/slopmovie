'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [blockbusterWinner, setBlockbusterWinner] = useState<{ id?: 'A' | 'B' | 'C' | 'D'; title: string; logline?: string; genre?: string } | null>(null);
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
          if (data.blockbusterWinner) {
            setBlockbusterWinner(data.blockbusterWinner);
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

  // ── SERVER-AUTHORITATIVE ARCHITECTURE ─────────────────────────────────────────
  // The backend CinemaWorker (with leader election) is the SOLE authoritative
  // time engine. The browser client is a 100% reactive receiver of Supabase
  // Realtime broadcasts (time_tick, phase_change, new_step, state_snapshot).
  // The client NEVER sends complete_stage or runs independent state timers.


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
          if (data.blockbusterWinner) {
            setBlockbusterWinner(data.blockbusterWinner);
          }
          // Stop polling as soon as the response includes the newly generated video link or a new movie
          const newVideoLinkReady = Boolean(
            data.activeStep?.videoUrl &&
            (data.movie?.id !== cinemaState.movie?.id || data.activeStep.stepNumber !== generatingStepNum)
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
  }, [cinemaState?.phase, cinemaState?.movie?.currentStep, cinemaState?.movie?.id]);

  // ── LOCAL CLIENT COUNTDOWN TICK (1 second) ──────────────────────────────────
  // Ticks down the UI countdown smoothly every second in local state.
  // Performs ZERO network requests or streaming overhead.
  // Server-authoritative phase events are received via Realtime broadcasts.
  useEffect(() => {
    if (!cinemaState || cinemaState.isPaused || cinemaState.phase === 'GENERATING') return;

    const timer = setInterval(() => {
      setCinemaState((prev) => {
        if (!prev || prev.isPaused || prev.phase === 'GENERATING') return prev;

        // If phaseEndsAt is provided, calculate exact remaining seconds relative to wall-clock:
        if (prev.phaseEndsAt) {
          const endsAtMs = typeof prev.phaseEndsAt === 'string'
            ? new Date(prev.phaseEndsAt).getTime()
            : prev.phaseEndsAt;
          const calculatedRemaining = Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
          if (calculatedRemaining === prev.timeRemaining) return prev;
          return {
            ...prev,
            timeRemaining: calculatedRemaining
          };
        }

        // Fallback: decrement local seconds if remaining > 0
        if (prev.timeRemaining <= 0) return prev;
        return {
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cinemaState?.isPaused, cinemaState?.phaseEndsAt, cinemaState?.phase]);

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
          if (snapshot?.blockbusterWinner !== undefined) {
            setBlockbusterWinner(snapshot.blockbusterWinner);
          }
          if (!prev) {
            return snapshot ? {
              ...snapshot,
              apiStatus: snapshot.apiStatus || defaultApiStatus
            } as CinemaState : null;
          }

          // Authoritative state update: adopt server state directly
          return {
            ...prev,
            ...snapshot,
            apiStatus: snapshot.apiStatus ?? prev.apiStatus ?? defaultApiStatus,
            movie: snapshot.movie ?? prev.movie,
            activeStep: snapshot.activeStep ?? prev.activeStep,
            phase: snapshot.phase ?? prev.phase,
            // Only update phaseEndsAt and let local wall-clock timer drive countdown smoothly
            phaseEndsAt: snapshot.phaseEndsAt ?? prev.phaseEndsAt,
            votesA: snapshot.votesA ?? prev.votesA,
            votesB: snapshot.votesB ?? prev.votesB,
            totalAudience: snapshot.totalAudience ?? prev.totalAudience,
            activeAd: snapshot.activeAd !== undefined ? snapshot.activeAd : prev.activeAd,
            adsConfig: snapshot.adsConfig ?? prev.adsConfig,
            isLive: snapshot.isLive ?? prev.isLive,
            isPaused: snapshot.isPaused !== undefined ? snapshot.isPaused : prev.isPaused,
            isGenerationPaused: snapshot.isGenerationPaused !== undefined ? snapshot.isGenerationPaused : prev.isGenerationPaused,
            blockbusterCandidates: snapshot.blockbusterCandidates ?? prev.blockbusterCandidates,
            blockbusterVoteCounts: snapshot.blockbusterVoteCounts ?? prev.blockbusterVoteCounts,
            blockbusterWinner: snapshot.blockbusterWinner ?? prev.blockbusterWinner
          };
        });
      })
      .on('broadcast', { event: 'phase_change' }, (payload: { payload: { phase: PlaybackPhase; timeRemaining?: number; votesA?: number; votesB?: number; selectedOption?: 'A' | 'B'; wasRandomPick?: boolean; phaseEndsAt?: string | number; phaseDuration?: number; options?: any; winner?: any } }) => {
        if (payload.payload.phase === 'VOTING') {
          setUserVoted(null);
          setBlockbusterWinner(null);
        }
        if (payload.payload.selectedOption) {
          setBlockbusterWinner(null);
        }
        if (payload.payload.winner) {
          setBlockbusterWinner(payload.payload.winner);
        }
        setCinemaState((prev) => {
          if (!prev) return prev;
          const updatedStep = payload.payload.selectedOption ? {
            ...prev.activeStep,
            selectedOption: payload.payload.selectedOption,
            wasRandomPick: payload.payload.wasRandomPick ?? prev.activeStep.wasRandomPick
          } : (payload.payload.phase === 'VOTING' ? {
            ...prev.activeStep,
            selectedOption: undefined,
            wasRandomPick: undefined,
            options: payload.payload.options || prev.activeStep.options
          } : prev.activeStep);

          return {
            ...prev,
            phase: payload.payload.phase,
            timeRemaining: payload.payload.phase === 'VOTING' ? (payload.payload.timeRemaining ?? 10) : 0,
            phaseDuration: payload.payload.phaseDuration ?? (payload.payload as any).phaseDuration ?? prev.phaseDuration,
            phaseEndsAt: payload.payload.phaseEndsAt ?? prev.phaseEndsAt,
            votesA: payload.payload.votesA ?? (payload.payload.phase === 'VOTING' ? 0 : prev.votesA),
            votesB: payload.payload.votesB ?? (payload.payload.phase === 'VOTING' ? 0 : prev.votesB),
            blockbusterCandidates: (payload.payload as any).blockbusterCandidates ?? prev.blockbusterCandidates,
            blockbusterVoteCounts: (payload.payload as any).blockbusterVoteCounts ?? prev.blockbusterVoteCounts,
            blockbusterWinner: payload.payload.winner ?? prev.blockbusterWinner,
            activeStep: updatedStep
          };
        });
      })
      .on('broadcast', { event: 'vote_update' }, (payload: { payload: { votesA: number; votesB: number; totalVotes?: number; totalAudience?: number } }) => {
        setCinemaState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            votesA: payload.payload.votesA,
            votesB: payload.payload.votesB,
            totalAudience: payload.payload.totalAudience ?? prev.totalAudience
          };
        });
      })
      .on('broadcast', { event: 'new_step' }, (payload: { payload: { step: MovieStep; currentStep: number; phaseEndsAt?: string | number } }) => {
        setUserVoted(null);
        setBlockbusterWinner(null);
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
      .on('broadcast', { event: 'blockbuster_vote_ended' }, (payload: any) => {
        if (payload.payload?.winner) {
          setBlockbusterWinner(payload.payload.winner);
        }
        if (payload.payload?.counts) {
          setCinemaState((prev) => prev ? { ...prev, blockbusterVoteCounts: payload.payload.counts } : prev);
        }
        if (payload.payload?.candidates) {
          setCinemaState((prev) => prev ? { ...prev, blockbusterCandidates: payload.payload.candidates } : prev);
        }
      })
      .on('broadcast', { event: 'blockbuster_vote_started' }, (payload: any) => {
        setUserVoted(null);
        setBlockbusterUserVoted(null);
        setBlockbusterWinner(null);
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
        setBlockbusterWinner(null);
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

  // Immediate scene transition callback when video playback concludes (no loops, no pauses)
  const handleScenePlaybackEnded = useCallback(async () => {
    if (!cinemaState?.movie || cinemaState.phase !== 'PLAYING') return;
    const currentStepNum = cinemaState.movie.currentStep;

    try {
      await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_stage',
          stage: 'PLAYING',
          stepNumber: currentStepNum
        })
      });
    } catch (err) {
      console.warn('[Cinema] Error completing playback stage on video end:', err);
    }
  }, [cinemaState?.movie, cinemaState?.phase]);

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

  const isBlockbusterActive = Boolean(
    cinemaState && (
      cinemaState.phase === 'BLOCKBUSTER_VOTING' ||
      (cinemaState.phase === 'GENERATING' && (Boolean(blockbusterWinner) || Boolean(cinemaState.blockbusterWinner) || (cinemaState.blockbusterCandidates && cinemaState.blockbusterCandidates.length > 0)))
    )
  );

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
                fullscreenContainerRef={stageContainerRef}
                inSceneAd={
                  cinemaState.activeAd?.type === 'in_scene_overlay'
                    ? cinemaState.activeAd
                    : (cinemaState.movie.currentStep % 2 === 0 ? FALLBACK_IN_SCENE_AD : null)
                }
                onPlaybackEnded={handleScenePlaybackEnded}
                onOpenBuyAds={() => setIsBuyAdsModalOpen(true)}
              />

              {/* Next Blockbuster Audience Vote (60s vote + 15s reveal/synthesis, 4 candidate films) */}
              {isBlockbusterActive && (
                <BlockbusterVoting
                  candidates={cinemaState.blockbusterCandidates || []}
                  counts={cinemaState.blockbusterVoteCounts || { A: 0, B: 0, C: 0, D: 0 }}
                  timeRemaining={cinemaState.timeRemaining}
                  userVoted={blockbusterUserVoted}
                  phase={cinemaState.phase}
                  winner={blockbusterWinner}
                  onVote={handleBlockbusterVote}
                />
              )}

              {/* Scene Decision Overlay (hidden if blockbuster voting is active) */}
              {!isBlockbusterActive && (
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
                  stepNumber={cinemaState.activeStep.stepNumber}
                  onVote={handleVote}
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
