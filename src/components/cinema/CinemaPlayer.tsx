'use client';

import React, { useRef, useEffect, useState } from 'react';
import { MovieStep, PlaybackPhase } from '@/types/cinema';
import { Volume2, VolumeX, Maximize2, Minimize2, Radio, Sparkles, Film, Clock } from 'lucide-react';
import { audioCues } from '@/lib/audio-cues';

interface CinemaPlayerProps {
  movieTitle: string;
  genre: string;
  activeStep: MovieStep;
  phase: PlaybackPhase;
  timeRemaining: number;
  totalSteps: number;
}

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  movieTitle,
  genre,
  activeStep,
  phase,
  timeRemaining,
  totalSteps
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Auto-play and handle video src change
  useEffect(() => {
    if (videoRef.current && activeStep.videoUrl) {
      setIsVideoLoading(true);
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Handled by muted autoplay
      });
    }
  }, [activeStep.videoUrl, activeStep.stepNumber]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
      audioCues.toggleMute();
      audioCues.playClick();
    }
  };

  const toggleFullscreen = () => {
    audioCues.playClick();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Calculate percentage of the 15s clip played
  const progressPercent = phase === 'PLAYING' 
    ? Math.max(0, Math.min(100, ((15 - timeRemaining) / 15) * 100))
    : 100;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#050608] flex items-center justify-center overflow-hidden select-none group"
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-radial from-cyan-950/20 via-transparent to-black pointer-events-none" />

      {/* Main Video Element */}
      {activeStep.videoUrl && (
        <video
          ref={videoRef}
          src={activeStep.videoUrl}
          poster={activeStep.thumbnailUrl}
          autoPlay
          playsInline
          loop
          muted={isMuted}
          onCanPlay={() => setIsVideoLoading(false)}
          onWaiting={() => setIsVideoLoading(true)}
          className="w-full h-full object-cover object-center"
        />
      )}

      {/* Generating Phase Overlay */}
      {phase === 'GENERATING' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30 transition-opacity">
          <div className="relative flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <Sparkles className="w-8 h-8 text-cyan-400 absolute animate-pulse" />
          </div>
          <h3 className="text-xl font-bold tracking-wider text-white uppercase mb-2">
            Sintetizando Siguiente Clip
          </h3>
          <p className="text-xs text-neutral-400 max-w-md text-center font-mono">
            fal.ai MiniMax H3-Max (480p 16:9) procesando continuidad con video anterior y referencias de props...
          </p>
        </div>
      )}

      {/* Subtle Grain Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '4px 4px' }}
      />

      {/* Top Cinema HUD */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
        <div className="flex items-center space-x-3">
          {/* Live Indicator */}
          <div className="flex items-center space-x-2 bg-red-950/60 border border-red-500/30 px-3 py-1 rounded-full backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
              <Radio className="w-3 h-3" /> EN VIVO
            </span>
          </div>

          {/* Step Badge */}
          <div className="flex items-center space-x-2 bg-neutral-900/70 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md">
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono font-semibold text-neutral-200">
              PASO {activeStep.stepNumber} / {totalSteps}
            </span>
          </div>

          {/* Genre Tag */}
          <span className="hidden sm:inline-block text-[11px] text-neutral-400 bg-black/40 border border-white/5 px-2.5 py-1 rounded-full">
            {genre}
          </span>
        </div>

        {/* Video Controls (Mute & Fullscreen) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-full bg-black/60 hover:bg-neutral-800 text-neutral-200 border border-white/10 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            title={isMuted ? "Activar Sonido" : "Silenciar"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-black/60 hover:bg-neutral-800 text-neutral-200 border border-white/10 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Subtitle / Narrative Ticker */}
      <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none flex flex-col items-center">
        {activeStep.dialogueSnippet && (
          <div className="mb-3 px-5 py-2 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md max-w-2xl text-center shadow-2xl">
            <p className="text-sm font-medium text-cyan-300 italic tracking-wide">
              {activeStep.dialogueSnippet}
            </p>
          </div>
        )}

        <div className="w-full flex items-center justify-between text-xs text-neutral-400 font-mono px-2 mb-1.5">
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            <span>CLIP 15s {phase === 'PLAYING' ? `(${timeRemaining}s restantes)` : ''}</span>
          </div>
          <span className="text-neutral-300 font-semibold truncate max-w-md">
            {activeStep.title}
          </span>
        </div>

        {/* 15s Progress Bar */}
        <div className="w-full h-1.5 bg-neutral-900/90 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-400 transition-all duration-1000 ease-linear rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
