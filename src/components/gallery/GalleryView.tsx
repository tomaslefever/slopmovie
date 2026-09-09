'use client';

import React, { useState, useEffect } from 'react';
import { Movie, MovieStep } from '@/types/cinema';
import { Film, Play, ArrowLeft, Users, GitBranch, Calendar, CheckCircle2, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { audioCues } from '@/lib/audio-cues';

interface GalleryViewProps {
  onBackToLive: () => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ onBackToLive }) => {
  const [completedMovies, setCompletedMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [playbackStepIndex, setPlaybackStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);

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
  };

  const handleStepChange = (index: number) => {
    audioCues.playClick();
    setPlaybackStepIndex(index);
  };

  // If a movie is selected for continuous playback
  if (selectedMovie) {
    const currentStep: MovieStep = selectedMovie.steps[playbackStepIndex] || selectedMovie.steps[0];

    return (
      <div className="w-full h-full bg-[#050608] flex flex-col select-none overflow-hidden">
        {/* Playback Header */}
        <div className="p-4 bg-black/60 border-b border-white/10 flex items-center justify-between z-30">
          <button
            onClick={() => { audioCues.playClick(); setSelectedMovie(null); }}
            className="flex items-center space-x-2 text-xs font-mono text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg bg-neutral-900 border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Galería</span>
          </button>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> PELÍCULA COMPLETA (100 PASOS)
            </span>
            <h2 className="text-sm font-bold text-white hidden md:block">
              {selectedMovie.title}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => { setIsMuted(!isMuted); audioCues.playClick(); }}
              className="p-2 rounded-lg bg-neutral-900 border border-white/10 text-neutral-300 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Video Stage */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          <video
            key={currentStep.stepNumber}
            src={currentStep.videoUrl}
            poster={currentStep.thumbnailUrl}
            autoPlay={isPlaying}
            playsInline
            loop
            muted={isMuted}
            className="w-full h-full object-cover"
          />

          {/* Step Info Overlay */}
          <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none">
            <div className="bg-black/75 border border-white/10 p-4 rounded-xl backdrop-blur-md max-w-2xl">
              <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1">
                <span>PASO {currentStep.stepNumber} / 100</span>
                <span>•</span>
                <span className="text-amber-400">Voto Ganador: Opción {currentStep.selectedOption}</span>
              </div>
              <h3 className="text-base font-bold text-white mb-1">{currentStep.title}</h3>
              <p className="text-xs text-neutral-300 line-clamp-2">{currentStep.synopsis}</p>
            </div>
          </div>
        </div>

        {/* 100 Steps Scrubber Bar */}
        <div className="p-4 bg-[#08090d] border-t border-white/10">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-2">
            <span>Línea Temporal de Decisiones (100 Pasos de 15 segundos)</span>
            <span className="text-cyan-400 font-bold">Paso {playbackStepIndex + 1} de {selectedMovie.steps.length}</span>
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-800">
            {selectedMovie.steps.map((step, idx) => (
              <button
                key={step.stepNumber}
                onClick={() => handleStepChange(idx)}
                title={`Paso ${step.stepNumber}: ${step.title}`}
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
      </div>
    );
  }

  // Gallery Catalog Grid
  return (
    <div className="w-full h-full bg-[#050608] overflow-y-auto p-6 md:p-10 select-none scrollbar-thin scrollbar-thumb-neutral-800">
      {/* Top Banner */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => { audioCues.playClick(); onBackToLive(); }}
            className="flex items-center space-x-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Transmisión en Vivo</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-white flex items-center gap-3">
            <Film className="w-7 h-7 text-cyan-400" />
            Galería de Películas Terminadas
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl font-mono">
            Obras cinematográficas completas de 100 pasos creadas y votadas enteramente por la audiencia en directo.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-neutral-900/80 border border-white/10 px-4 py-2.5 rounded-xl font-mono text-xs">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-neutral-300">Total Películas:</span>
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
                  100 PASOS COMPLETADOS
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
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
                  {movie.title}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2 mb-3">
                  {movie.tagline || movie.initialPlot}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-white/5">
                  <div className="flex items-center space-x-2 text-neutral-400">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{movie.totalVotesCast || 14820} votos emitidos</span>
                  </div>
                  <div className="flex items-center space-x-2 text-neutral-400">
                    <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                    <span>100 bifurcaciones</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSelectMovie(movie)}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-mono text-xs font-semibold flex items-center justify-center space-x-2 transition-colors border border-white/5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Reproducir Película Completa</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
