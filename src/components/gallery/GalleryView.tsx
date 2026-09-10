'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Movie, MovieStep, SubtitleCue } from '@/types/cinema';
import { Film, Play, ArrowLeft, Users, CheckCircle2, Volume2, VolumeX, Sparkles, Radio, BookOpen, ChevronRight, Box, Subtitles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioCues } from '@/lib/audio-cues';

interface GalleryViewProps {
  onBackToLive: () => void;
  activeMovie?: Movie | null;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ onBackToLive, activeMovie }) => {
  const [completedMovies, setCompletedMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [playbackStepIndex, setPlaybackStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  // Subtitles in Gallery Player
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(true);
  const [subtitleLanguage, setSubtitleLanguage] = useState<'en' | 'es'>('en');
  const [showSubtitleMenu, setShowSubtitleMenu] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetch('/api/cinema/gallery')
      .then((res) => res.json())
      .then((data) => {
        if (data.completedMovies) {
          setCompletedMovies(data.completedMovies);
        }
      })
      .catch((err) => console.error("Error loading gallery:", err));
  }, []);

  const handleSelectMovie = (movie: Movie) => {
    audioCues.playClick();
    setSelectedMovie(movie);
    setPlaybackStepIndex(0);
    setIsPlaying(true);
    setCurrentTime(0);
  };

  const handleStepChange = (index: number) => {
    audioCues.playClick();
    setPlaybackStepIndex(index);
    setCurrentTime(0);
  };

  // If a movie is selected for continuous playback
  if (selectedMovie) {
    const currentStep: MovieStep = selectedMovie.steps[playbackStepIndex] || selectedMovie.steps[0];

    // Current subtitle calculation
    const activeCue: SubtitleCue | undefined = currentStep.subtitles?.find(
      c => currentTime >= c.start && currentTime <= c.end
    );
    const subtitleText = activeCue
      ? (subtitleLanguage === 'es' && activeCue.textEs ? activeCue.textEs : activeCue.text)
      : (currentStep.dialogueSnippet || null);

    return (
      <div className="w-full h-full bg-[#050608] flex flex-col select-none overflow-hidden">
        {/* Playback Header */}
        <div className="p-4 bg-black/60 border-b border-white/10 flex items-center justify-between z-30">
          <button
            onClick={() => { audioCues.playClick(); setSelectedMovie(null); }}
            className="flex items-center space-x-2 text-xs font-mono text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg bg-neutral-900 border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Cinema Archive</span>
          </button>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> FULL FILM (50 STEPS)
            </span>
            <h2 className="text-sm font-bold text-white hidden md:block">
              {selectedMovie.title}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            {/* Subtitle Selector */}
            <div className="relative">
              <button
                onClick={() => { audioCues.playClick(); setShowSubtitleMenu(!showSubtitleMenu); }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors ${
                  subtitlesEnabled 
                    ? 'bg-cyan-950/80 text-cyan-400 border-cyan-500/40' 
                    : 'bg-neutral-900 text-neutral-400 border-white/10'
                }`}
                title="Subtitles (CC)"
              >
                <Subtitles className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-mono">{subtitlesEnabled ? subtitleLanguage.toUpperCase() : 'OFF'}</span>
              </button>

              <AnimatePresence>
                {showSubtitleMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-44 bg-[#0b0c12] border border-white/15 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1"
                  >
                    <button
                      onClick={() => { setSubtitleLanguage('en'); setSubtitlesEnabled(true); setShowSubtitleMenu(false); }}
                      className={`w-full px-2 py-1.5 rounded text-left flex items-center justify-between ${
                        subtitlesEnabled && subtitleLanguage === 'en' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <span>English (CC)</span>
                      {subtitlesEnabled && subtitleLanguage === 'en' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                    <button
                      onClick={() => { setSubtitleLanguage('es'); setSubtitlesEnabled(true); setShowSubtitleMenu(false); }}
                      className={`w-full px-2 py-1.5 rounded text-left flex items-center justify-between ${
                        subtitlesEnabled && subtitleLanguage === 'es' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <span>Spanish (ES)</span>
                      {subtitlesEnabled && subtitleLanguage === 'es' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                    <button
                      onClick={() => { setSubtitlesEnabled(!subtitlesEnabled); setShowSubtitleMenu(false); }}
                      className="w-full px-2 py-1 rounded text-left text-neutral-400 hover:bg-neutral-800 text-[11px] pt-1 border-t border-white/5"
                    >
                      {subtitlesEnabled ? 'Turn Off Subtitles' : 'Turn On Subtitles'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {selectedMovie.finalSummary && (
              <button
                onClick={() => { audioCues.playClick(); setShowSummaryModal(true); }}
                className="px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-500/30 text-xs font-mono text-cyan-300 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>View Master Synopsis & Retrospective</span>
              </button>
            )}

            <button
              onClick={() => { setIsMuted(!isMuted); audioCues.playClick(); }}
              className="p-2 rounded-lg bg-neutral-900 border border-white/10 text-neutral-300 hover:text-white"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Video Stage */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            key={currentStep.stepNumber}
            src={currentStep.videoUrl}
            poster={currentStep.thumbnailUrl}
            autoPlay={isPlaying}
            playsInline
            loop
            muted={isMuted}
            onTimeUpdate={() => {
              if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
            }}
            className="w-full h-full object-cover"
          />

          {/* Subtitles Overlay */}
          {subtitlesEnabled && subtitleText && (
            <div className="absolute bottom-24 left-6 right-6 z-20 pointer-events-none flex flex-col items-center">
              <div className="px-6 py-2.5 rounded-2xl bg-black/85 border border-white/15 backdrop-blur-md max-w-2xl text-center shadow-2xl">
                <p className="text-sm sm:text-base font-medium text-white tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {activeCue?.speaker && (
                    <span className="font-bold text-cyan-400 uppercase tracking-wider font-mono text-xs mr-2 border-r border-white/20 pr-2">
                      {activeCue.speaker}
                    </span>
                  )}
                  <span className="italic">{subtitleText}</span>
                </p>
              </div>
            </div>
          )}

          {/* Step Info Overlay */}
          <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none">
            <div className="bg-black/80 border border-white/10 p-4 rounded-2xl backdrop-blur-md max-w-2xl shadow-2xl">
              <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1.5">
                <span>STEP {currentStep.stepNumber} / {selectedMovie.totalSteps || 50}</span>
                <span>•</span>
                <span className="text-amber-400">Audience Choice: Option {currentStep.selectedOption}</span>
                {currentStep.newCharacter && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400">Introduced: {currentStep.newCharacter.name}</span>
                  </>
                )}
              </div>
              <h3 className="text-base font-bold text-white mb-1">{currentStep.title}</h3>
              <p className="text-xs text-neutral-300 line-clamp-2">{currentStep.synopsis}</p>
            </div>
          </div>
        </div>

        {/* 50 Steps Scrubber Bar */}
        <div className="p-4 bg-[#08090d] border-t border-white/10">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-2">
            <span>Audience Timeline (50 Steps of 15 seconds)</span>
            <span className="text-cyan-400 font-bold">Step {playbackStepIndex + 1} of {selectedMovie.steps.length}</span>
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-800">
            {selectedMovie.steps.map((step, idx) => (
              <button
                key={step.stepNumber}
                onClick={() => handleStepChange(idx)}
                title={`Step ${step.stepNumber}: ${step.title}`}
                className={`h-7 min-w-[28px] rounded px-1 text-[10px] font-mono font-bold transition-all ${
                  idx === playbackStepIndex
                    ? 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(0,240,255,0.8)] scale-110 z-10'
                    : step.selectedOption === 'A'
                    ? 'bg-cyan-950/60 text-cyan-400 hover:bg-cyan-900/60 border border-cyan-500/20'
                    : 'bg-amber-950/60 text-amber-400 hover:bg-amber-900/60 border border-amber-500/20'
                }`}
              >
                {step.stepNumber}
              </button>
            ))}
          </div>
        </div>

        {/* Retrospective Summary Modal */}
        {showSummaryModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-[#0b0c12] border border-white/15 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">
                      50-Step Retrospective & Master Synopsis
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      Synthesized by DeepSeek analyzing every audience branch decision
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-200 leading-relaxed scrollbar-thin scrollbar-thumb-neutral-800">
                {selectedMovie.finalSynopsis && (
                  <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-2">
                    <span className="text-[11px] font-mono uppercase text-cyan-400 font-bold block tracking-wider">
                      Definitive Master Synopsis:
                    </span>
                    <p className="text-sm text-neutral-100 leading-relaxed">{selectedMovie.finalSynopsis}</p>
                  </div>
                )}

                {selectedMovie.finalSummary && (
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/10 space-y-3 whitespace-pre-line">
                    <span className="text-[11px] font-mono uppercase text-amber-400 font-bold block tracking-wider">
                      Complete Narrative Retrospective:
                    </span>
                    <div className="text-neutral-300 space-y-2 leading-relaxed">
                      {selectedMovie.finalSummary}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Gallery Catalog Grid
  return (
    <div className="w-full h-full bg-[#050608] overflow-y-auto p-6 md:p-10 select-none scrollbar-thin scrollbar-thumb-neutral-800">
      {/* 🔴 BIG PROMINENT BUTTON: GO TO CURRENT LIVE STREAMING MOVIE */}
      <div className="max-w-6xl mx-auto mb-10">
        <button
          onClick={() => { audioCues.playClick(); onBackToLive(); }}
          className="w-full relative group overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-[#07131d] border-2 border-red-500/40 hover:border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.2)] hover:shadow-[0_0_50px_rgba(239,68,68,0.4)] transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="flex items-center space-x-5">
            {/* Live Indicator Icon */}
            <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center relative shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              <span className="w-4 h-4 rounded-full bg-red-500 animate-ping absolute" />
              <Radio className="w-7 h-7 text-red-400 relative z-10" />
            </div>

            <div>
              <div className="flex items-center space-x-2.5 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-black text-[10px] font-mono font-black uppercase tracking-widest animate-pulse">
                  LIVE STREAMING NOW
                </span>
                <span className="text-xs font-mono text-cyan-400">
                  Supabase Realtime Synchronized
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white group-hover:text-cyan-300 transition-colors">
                {activeMovie ? activeMovie.title : "Live Interactive Cinema"}
              </h2>
              <p className="text-xs text-neutral-300 max-w-xl line-clamp-1 mt-0.5">
                {activeMovie?.tagline || "Audience members are deciding next scene continuations in real-time. Click to enter the screening."}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end md:self-center">
            <span className="px-5 py-3 rounded-xl bg-red-500 group-hover:bg-red-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-500/30 transition-all">
              <span>Enter Live Cinema Room</span>
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </button>
      </div>

      {/* Catalog Section Header */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white flex items-center gap-3">
            <Film className="w-6 h-6 text-cyan-400" />
            Completed Films (50 Steps)
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl font-mono">
            Full narrative archives with definitive synopses and audience decision retrospectives.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-neutral-900/80 border border-white/10 px-4 py-2 rounded-xl font-mono text-xs text-neutral-300">
          <span>Completed Films:</span>
          <span className="text-cyan-400 font-bold">{completedMovies.length}</span>
        </div>
      </div>

      {/* Grid of Completed Movies */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {completedMovies.map((movie) => (
          <div
            key={movie.id}
            className="rounded-2xl bg-neutral-900/40 border border-white/10 hover:border-cyan-500/50 transition-all duration-300 overflow-hidden flex flex-col group shadow-xl hover:shadow-cyan-500/10"
          >
            {/* Movie Thumbnail / Cover */}
            <div className="relative h-56 bg-neutral-950 overflow-hidden">
              <img
                src={movie.steps[0]?.thumbnailUrl || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800"}
                alt={movie.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-transparent to-black/60" />

              {/* Badges */}
              <div className="absolute top-4 left-4 flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/30 text-[11px] font-mono font-bold text-cyan-300 backdrop-blur-md">
                  50 STEPS COMPLETED
                </span>
                <span className="px-2.5 py-1 rounded-full bg-black/60 text-[11px] text-neutral-300 border border-white/10">
                  {movie.genre}
                </span>
              </div>

              {/* Play Overlay Button */}
              <button
                onClick={() => handleSelectMovie(movie)}
                className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-black flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.6)] transform group-hover:scale-110 transition-all active:scale-95"
              >
                <Play className="w-6 h-6 fill-black ml-0.5" />
              </button>
            </div>

            {/* Movie Details */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
                  {movie.title}
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed line-clamp-3 mb-3">
                  {movie.finalSynopsis || movie.tagline || movie.initialPlot}
                </p>

                {/* Props count & characters */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <div className="flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{movie.bible.characters.length} characters</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Box className="w-3.5 h-3.5 text-amber-400" />
                    <span>{movie.bible.props.length} persisted props</span>
                  </div>
                  <div className="text-neutral-500">
                    {movie.totalVotesCast || 14820} votes
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => handleSelectMovie(movie)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-mono text-xs font-semibold flex items-center justify-center space-x-2 transition-colors border border-white/5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play 50 Steps</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
