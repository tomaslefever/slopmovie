'use client';

import React, { useState, useEffect } from 'react';
import { CinemaState, ChatMessage, PlaybackPhase, MovieStep } from '@/types/cinema';
import { CinemaPlayer } from '@/components/cinema/CinemaPlayer';
import { VotingOverlay } from '@/components/cinema/VotingOverlay';
import { AudienceChat } from '@/components/cinema/AudienceChat';
import { GalleryView } from '@/components/gallery/GalleryView';
import { Navbar } from '@/components/layout/Navbar';
import { getSupabaseBrowserClient, initSupabaseBrowserClient } from '@/lib/supabase/client';

export default function CinemaStreamingPage() {
  const [cinemaState, setCinemaState] = useState<CinemaState | null>(null);
  const [userVoted, setUserVoted] = useState<'A' | 'B' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [nickname, setNickname] = useState<string | null>(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(true);
  const [subtitleLanguage, setSubtitleLanguage] = useState<'en' | 'es'>('en');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [topVotedMessages, setTopVotedMessages] = useState<ChatMessage[]>([]);

  // Fetch chat messages and top-voted comments from Supabase / API
  const fetchChatAndTopVoted = async (uId?: string) => {
    try {
      const targetUserId = uId || userId;
      const url = targetUserId ? `/api/cinema/chat?userId=${encodeURIComponent(targetUserId)}` : '/api/cinema/chat';
      const res = await fetch(url);
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
            fetchChatAndTopVoted(data.userId);
          }
          if (data.hasUserVoted) {
            setUserVoted(data.hasUserVoted);
          }
          if (data.viewerPreferences) {
            setSubtitlesEnabled(data.viewerPreferences.subtitlesEnabled !== false);
            setSubtitleLanguage(data.viewerPreferences.subtitleLanguage === 'es' ? 'es' : 'en');
            if (data.viewerPreferences.nickname) {
              setNickname(data.viewerPreferences.nickname);
            }
          }
          if (data.chatMessages) {
            setChatMessages(data.chatMessages);
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

  // Resilient Polling Heartbeat (guarantees continuous live advancement even if Realtime drops or is unbuilt)
  useEffect(() => {
    const heartbeat = setInterval(async () => {
      try {
        const url = userId ? `/api/cinema/state?userId=${userId}` : '/api/cinema/state';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (!userId && data.userId) {
            setUserId(data.userId);
            fetchChatAndTopVoted(data.userId);
          }
          if (!nickname && data.viewerPreferences?.nickname) {
            setNickname(data.viewerPreferences.nickname);
          }
          setCinemaState((prev) => {
            if (!prev) return data;
            // When step advances, reset vote state
            if (data.activeStep?.stepNumber !== prev.activeStep?.stepNumber) {
              setUserVoted(data.hasUserVoted || null);
            }
            return {
              ...prev,
              ...data,
              movie: data.movie,
              activeStep: data.activeStep,
              phase: data.phase,
              // Keep timeRemaining if phase is identical so timers animate smoothly without discrete jumps
              timeRemaining: (prev && prev.phase === data.phase) ? prev.timeRemaining : data.timeRemaining,
              votesA: data.votesA,
              votesB: data.votesB,
              totalAudience: data.totalAudience,
              isPaused: data.isPaused,
              isGenerationPaused: data.isGenerationPaused
            };
          });

          if (data.chatMessages && Array.isArray(data.chatMessages)) {
            setChatMessages((prev) => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMsgs = data.chatMessages.filter((m: ChatMessage) => !existingIds.has(m.id));
              if (newMsgs.length === 0) return prev;
              return [...prev, ...newMsgs].slice(-99);
            });
          }

          if (!supabaseReady && data.supabaseConfig?.url && data.supabaseConfig?.anonKey) {
            initSupabaseBrowserClient(data.supabaseConfig.url, data.supabaseConfig.anonKey);
            setSupabaseReady(true);
          }
        }
      } catch {
        // Ignored on transient network blip
      }
    }, 2500);

    return () => clearInterval(heartbeat);
  }, [userId, supabaseReady]);

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
          if (!prev) return (payload.payload as CinemaState) || null;
          const snapshot = payload.payload;
          return {
            ...prev,
            ...snapshot,
            movie: snapshot.movie ?? prev.movie,
            activeStep: snapshot.activeStep ?? prev.activeStep,
            phase: snapshot.phase ?? prev.phase,
            timeRemaining: snapshot.timeRemaining ?? prev.timeRemaining,
            votesA: snapshot.votesA ?? prev.votesA,
            votesB: snapshot.votesB ?? prev.votesB,
            totalAudience: snapshot.totalAudience ?? prev.totalAudience,
            activeAd: snapshot.activeAd !== undefined ? snapshot.activeAd : prev.activeAd,
            adsConfig: snapshot.adsConfig ?? prev.adsConfig,
            isLive: snapshot.isLive ?? prev.isLive,
            isPaused: snapshot.isPaused !== undefined ? snapshot.isPaused : prev.isPaused,
            isGenerationPaused: snapshot.isGenerationPaused !== undefined ? snapshot.isGenerationPaused : prev.isGenerationPaused
          };
        });
      })
      .on('broadcast', { event: 'time_tick' }, (payload: { payload: { timeRemaining?: number; phase?: PlaybackPhase; votesA?: number; votesB?: number; totalAudience?: number; selectedOption?: 'A' | 'B'; wasRandomPick?: boolean } }) => {
        setCinemaState((prev) => {
          if (!prev) return prev;
          const updatedStep = payload.payload.selectedOption ? {
            ...prev.activeStep,
            selectedOption: payload.payload.selectedOption,
            wasRandomPick: payload.payload.wasRandomPick ?? prev.activeStep.wasRandomPick
          } : prev.activeStep;

          return {
            ...prev,
            timeRemaining: payload.payload.timeRemaining ?? prev.timeRemaining,
            phase: payload.payload.phase ?? prev.phase,
            votesA: payload.payload.votesA ?? prev.votesA,
            votesB: payload.payload.votesB ?? prev.votesB,
            totalAudience: payload.payload.totalAudience ?? prev.totalAudience,
            activeStep: updatedStep
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
            votesA: payload.payload.votesA ?? prev.votesA,
            votesB: payload.payload.votesB ?? prev.votesB,
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
      .on('broadcast', { event: 'new_step' }, (payload: { payload: { step: MovieStep; currentStep: number } }) => {
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
              votesA: 0,
              votesB: 0,
              hasUserVoted: null
            };
          });
        }
      })
      .on('broadcast', { event: 'chat_message' }, (payload: { payload: ChatMessage }) => {
        if (payload.payload) {
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
        fetchChatAndTopVoted(userId);
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
        if (payload.payload?.movie) {
          setCinemaState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              movie: payload.payload.movie,
              activeStep: payload.payload.movie.steps[0],
              phase: 'PLAYING',
              timeRemaining: 15,
              votesA: 0,
              votesB: 0,
              hasUserVoted: null
            };
          });
        }
      })
      .subscribe();

    // POSTGRES CDC REALTIME SUBSCRIPTIONS
    const moviesChannel = supabase
      .channel('schema_movies_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movies' },
        (payload) => {
          if (payload.new && (payload.new as any).bible?.liveState) {
            const live = (payload.new as any).bible.liveState;
            setCinemaState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                phase: live.phase ?? prev.phase,
                timeRemaining: live.timeRemaining ?? prev.timeRemaining,
                votesA: live.votesA ?? prev.votesA,
                votesB: live.votesB ?? prev.votesB,
                totalAudience: live.totalAudience ?? prev.totalAudience,
                isPaused: live.isPaused ?? prev.isPaused,
                isGenerationPaused: live.isGenerationPaused ?? prev.isGenerationPaused
              };
            });
          }
        }
      )
      .subscribe();

    const cinemaStateChannel = supabase
      .channel('schema_cinema_state_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cinema_state' },
        (payload) => {
          if (payload.new) {
            const row = payload.new as any;
            setCinemaState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                phase: row.phase ?? prev.phase,
                timeRemaining: row.time_remaining ?? prev.timeRemaining,
                votesA: row.votes_a ?? prev.votesA,
                votesB: row.votes_b ?? prev.votesB,
                totalAudience: row.total_audience ?? prev.totalAudience,
                isPaused: row.is_paused ?? prev.isPaused,
                isGenerationPaused: row.is_generation_paused ?? prev.isGenerationPaused
              };
            });
          }
        }
      )
      .subscribe();

    const topCommentsChannel = supabase
      .channel('schema_top_comments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'top_voted_comments' },
        () => {
          fetchChatAndTopVoted(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(moviesChannel);
      supabase.removeChannel(cinemaStateChannel);
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

  // Send chat message handler (requires nickname)
  const handleSendMessage = async (text: string) => {
    if (!nickname) return;

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

  // Toggle pause generation handler (Zero credit mode)
  const handleTogglePauseGeneration = async () => {
    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_pause_generation' })
      });
      if (res.ok) {
        const data = await res.json();
        setCinemaState((prev) => prev ? { ...prev, isGenerationPaused: data.isGenerationPaused } : prev);
      }
    } catch (err) {
      console.error("Error toggling pause generation:", err);
    }
  };

  // Keyboard shortcut listener: Alt+P to toggle pause generation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.altKey || e.shiftKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handleTogglePauseGeneration();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        isMockMode={cinemaState.apiStatus.isMockMode}
        onToggleGallery={() => setIsGalleryOpen(!isGalleryOpen)}
        isGalleryOpen={isGalleryOpen}
        currentStep={cinemaState.movie.currentStep}
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
            <div className="flex-1 relative h-full flex items-center justify-center overflow-hidden">
              <CinemaPlayer
                movieTitle={cinemaState.movie.title}
                genre={cinemaState.movie.genre}
                activeStep={cinemaState.activeStep}
                phase={cinemaState.phase}
                timeRemaining={cinemaState.timeRemaining}
                totalSteps={cinemaState.movie.totalSteps}
                activeAd={cinemaState.activeAd}
                isPaused={cinemaState.isPaused}
                isGenerationPaused={cinemaState.isGenerationPaused}
                onTogglePauseGeneration={handleTogglePauseGeneration}
                subtitlesEnabled={subtitlesEnabled}
                subtitleLanguage={subtitleLanguage}
                onToggleSubtitles={handleToggleSubtitles}
                onChangeSubtitleLanguage={handleChangeSubtitleLanguage}
                inSceneAd={
                  cinemaState.activeAd?.type === 'in_scene_overlay'
                    ? cinemaState.activeAd
                    : (cinemaState.movie.currentStep % 2 === 0 ? {
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
                      } : null)
                }
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
    </div>
  );
}
