'use client';

import React, { useState, useEffect } from 'react';
import { CinemaState, ChatMessage } from '@/types/cinema';
import { CinemaPlayer } from '@/components/cinema/CinemaPlayer';
import { VotingOverlay } from '@/components/cinema/VotingOverlay';
import { AudienceChat } from '@/components/cinema/AudienceChat';
import { CharacterBibleModal } from '@/components/cinema/CharacterBibleModal';
import { DecisionTreeModal } from '@/components/cinema/DecisionTreeModal';
import { NewMovieDialog } from '@/components/cinema/NewMovieDialog';
import { GalleryView } from '@/components/gallery/GalleryView';
import { Navbar } from '@/components/layout/Navbar';

export default function CinemaStreamingPage() {
  const [cinemaState, setCinemaState] = useState<CinemaState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [isBibleOpen, setIsBibleOpen] = useState<boolean>(false);
  const [isDecisionTreeOpen, setIsDecisionTreeOpen] = useState<boolean>(false);
  const [isNewMovieOpen, setIsNewMovieOpen] = useState<boolean>(false);

  // Initialize or retrieve persistent user ID in browser
  useEffect(() => {
    let storedId = localStorage.getItem('kinetic_user_id');
    if (!storedId) {
      storedId = `user_${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem('kinetic_user_id', storedId);
    }
    setUserId(storedId);
  }, []);

  // Poll state every 1 second
  useEffect(() => {
    if (!userId) return;

    const fetchState = async () => {
      try {
        const res = await fetch(`/api/cinema/state?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setCinemaState(data);
          if (data.chatMessages) {
            setChatMessages(data.chatMessages);
          }
        }
      } catch (err) {
        console.error("Error fetching cinema state:", err);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [userId]);

  // Cast vote handler
  const handleVote = async (optionId: 'A' | 'B') => {
    if (!cinemaState) return;

    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote',
          optionId,
          userId,
          userName: `Espectador_${userId.slice(-4)}`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCinemaState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            votesA: data.votesA,
            votesB: data.votesB,
            hasUserVoted: optionId
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
          userName: `Espectador_${userId.slice(-4)}`,
          text
        })
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Start new movie handler
  const handleStartNewMovie = async (prompt?: string) => {
    try {
      const res = await fetch('/api/cinema/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'init',
          prompt
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Trigger fresh state poll immediately
        const stateRes = await fetch(`/api/cinema/state?userId=${userId}`);
        const stateData = await stateRes.json();
        setCinemaState(stateData);
        setIsGalleryOpen(false);
      }
    } catch (err) {
      console.error("Error starting new movie:", err);
    }
  };

  if (!cinemaState || !cinemaState.movie) {
    return (
      <div className="w-screen h-screen bg-[#050608] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
        <h2 className="text-sm font-mono tracking-widest text-neutral-400 uppercase">
          Sintonizando Transmisión de Cine Interactivo...
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
        onOpenBible={() => setIsBibleOpen(true)}
        onOpenDecisionTree={() => setIsDecisionTreeOpen(true)}
        onOpenNewMovie={() => setIsNewMovieOpen(true)}
        onToggleGallery={() => setIsGalleryOpen(!isGalleryOpen)}
        isGalleryOpen={isGalleryOpen}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {isGalleryOpen ? (
          <GalleryView onBackToLive={() => setIsGalleryOpen(false)} />
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
              />

              {/* 10s Voting Overlay */}
              <VotingOverlay
                isVisible={cinemaState.phase === 'VOTING'}
                timeRemaining={cinemaState.timeRemaining}
                options={cinemaState.activeStep.options}
                votesA={cinemaState.votesA}
                votesB={cinemaState.votesB}
                userVoted={cinemaState.hasUserVoted || null}
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

      {/* Modals */}
      <CharacterBibleModal
        bible={cinemaState.movie.bible}
        masterArcThread={cinemaState.movie.masterArcThread}
        initialPlot={cinemaState.movie.initialPlot}
        isOpen={isBibleOpen}
        onClose={() => setIsBibleOpen(false)}
      />

      <DecisionTreeModal
        steps={cinemaState.movie.steps}
        currentStep={cinemaState.movie.currentStep}
        isOpen={isDecisionTreeOpen}
        onClose={() => setIsDecisionTreeOpen(false)}
      />

      <NewMovieDialog
        isOpen={isNewMovieOpen}
        onClose={() => setIsNewMovieOpen(false)}
        onStartNewMovie={handleStartNewMovie}
      />
    </div>
  );
}
