'use client';

import React, { useState, useEffect } from 'react';
import { CinemaState, ChatMessage, PlaybackPhase, MovieStep } from '@/types/cinema';
import { CinemaPlayer } from '@/components/cinema/CinemaPlayer';
import { VotingOverlay } from '@/components/cinema/VotingOverlay';
import { AudienceChat } from '@/components/cinema/AudienceChat';
import { GalleryView } from '@/components/gallery/GalleryView';
import { Navbar } from '@/components/layout/Navbar';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function CinemaStreamingPage() {
  const [cinemaState, setCinemaState] = useState<CinemaState | null>(null);
  const [userVoted, setUserVoted] = useState<'A' | 'B' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      let storedId = localStorage.getItem('kinetic_user_id');
      if (!storedId) {
        storedId = `user_${Math.floor(1000 + Math.random() * 9000)}`;
        localStorage.setItem('kinetic_user_id', storedId);
      }
      return storedId;
    } catch {
      return '';
    }
  });
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);

  // Initial state hydration on mount (streaming via Supabase Realtime replaces polling)
  useEffect(() => {
    if (!userId) return;

    const fetchInitialState = async () => {
      try {
        const res = await fetch(`/api/cinema/state?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setCinemaState(data);
          if (data.hasUserVoted) {
            setUserVoted(data.hasUserVoted);
          }
          if (data.chatMessages) {
            setChatMessages(data.chatMessages);
          }
        }
      } catch (err) {
        console.error("Error fetching initial cinema state:", err);
      }
    };

    fetchInitialState();
  }, [userId]);

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
            const updatedMovie = {
              ...prev.movie,
              currentStep: payload.payload.currentStep,
              steps: [...prev.movie.steps, payload.payload.step]
            };
            return {
              ...prev,
              movie: updatedMovie,
              activeStep: payload.payload.step,
              phase: 'PLAYING',
              timeRemaining: 15,
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
          userName: `Viewer_${userId.slice(-4)}`
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

  // Send chat message handler
  const handleSendMessage = async (text: string) => {
    try {
      await fetch('/api/cinema/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userName: `Viewer_${userId.slice(-4)}`,
          text
        })
      });
    } catch (err) {
      console.error("Error sending message:", err);
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
              isOpen={isChatOpen}
              onToggle={() => setIsChatOpen(!isChatOpen)}
            />
          </>
        )}
      </main>
    </div>
  );
}
