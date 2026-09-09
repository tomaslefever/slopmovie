'use client';

import React, { useRef, useEffect, useState } from 'react';
import { MovieStep, PlaybackPhase, SubtitleCue, ImmersiveAd } from '@/types/cinema';
import { Volume2, VolumeX, Maximize2, Minimize2, Radio, Film, Clock, Subtitles, Check, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioCues } from '@/lib/audio-cues';
import { ImmersiveAdPlayer } from './ImmersiveAdPlayer';
import { InSceneProductHotspot } from './InSceneProductHotspot';

interface CinemaPlayerProps {
  movieTitle: string;
  genre: string;
  activeStep: MovieStep;
  phase: PlaybackPhase;
  timeRemaining: number;
  totalSteps: number;
  activeAd?: ImmersiveAd | null;
  inSceneAd?: ImmersiveAd | null;
  isPaused?: boolean;
  isGenerationPaused?: boolean;
  onTogglePauseGeneration?: () => void;
}

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  movieTitle,
  genre,
  activeStep,
  phase,
  timeRemaining,
  totalSteps,
  activeAd,
  inSceneAd,
  isPaused = false,
  isGenerationPaused = false,
  onTogglePauseGeneration
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(() => audioCues.getMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [, setIsVideoLoading] = useState(false);
  
  // Subtitle System States with persistent defaults
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem('kinetic_subtitles_enabled');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [subtitleLanguage, setSubtitleLanguage] = useState<'en' | 'es'>(() => {
    if (typeof window === 'undefined') return 'en';
    try {
      const stored = localStorage.getItem('kinetic_subtitles_lang');
      return stored === 'es' || stored === 'en' ? stored : 'en';
    } catch {
      return 'en';
    }
  });

  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);

  const toggleSubtitlesEnabled = (val: boolean) => {
    setSubtitlesEnabled(val);
    try {
      localStorage.setItem('kinetic_subtitles_enabled', String(val));
    } catch {}
  };

  const changeSubtitleLanguage = (lang: 'en' | 'es') => {
    setSubtitleLanguage(lang);
    setSubtitlesEnabled(true);
    try {
      localStorage.setItem('kinetic_subtitles_lang', lang);
      localStorage.setItem('kinetic_subtitles_enabled', 'true');
    } catch {}
    setShowSubtitleMenu(false);
  };

  // Auto-play and handle video src change
  useEffect(() => {
    if (videoRef.current && activeStep.videoUrl) {
      setIsVideoLoading(true);
      videoRef.current.currentTime = 0;
      setVideoCurrentTime(0);
      videoRef.current.muted = phase === 'VOTING' ? true : isMuted;
      videoRef.current.play().catch(() => {
        // Handled by muted autoplay
      });
    }
  }, [activeStep.videoUrl, activeStep.stepNumber, phase, isMuted]);

  // Enforce scene repeating without sound during VOTING phase
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (phase === 'VOTING') {
      // Replay scene continuously without sound during voting
      video.muted = true;
      video.loop = true;
      if (video.paused) {
        video.play().catch(() => {});
      }
    } else if (phase === 'PLAYING') {
      // Restore user sound preference during movie playback
      video.muted = isMuted;
    }
  }, [phase, isMuted]);

  // Pause or resume HTML video playback when stream is paused/resumed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPaused) {
      video.pause();
    } else {
      if (video.paused && phase === 'PLAYING') {
        video.play().catch(() => {});
      }
    }
  }, [isPaused, phase]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setVideoCurrentTime(videoRef.current.currentTime);
    }
  };

  const toggleMute = () => {
    const nextMuted = audioCues.toggleMute();
    setIsMuted(nextMuted);
    if (videoRef.current) {
      if (phase !== 'VOTING') {
        videoRef.current.muted = nextMuted;
      } else {
        // Video must remain strictly silent during voting
        videoRef.current.muted = true;
      }
    }
    audioCues.playClick();
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

  // Active Subtitle Resolution
  const currentPlaybackSecond = videoCurrentTime > 0 
    ? videoCurrentTime 
    : Math.max(0, 15 - timeRemaining);

  const activeCue: SubtitleCue | undefined = activeStep.subtitles?.find(
    cue => currentPlaybackSecond >= cue.start && currentPlaybackSecond <= cue.end
  );

  const currentSubtitleText = activeCue
    ? (subtitleLanguage === 'es' && activeCue.textEs ? activeCue.textEs : activeCue.text)
    : (activeStep.dialogueSnippet || null);

  const currentSpeaker = activeCue?.speaker;

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
          muted={phase === 'VOTING' ? true : isMuted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.play().catch(() => {});
            }
          }}
          onCanPlay={() => setIsVideoLoading(false)}
          onWaiting={() => setIsVideoLoading(true)}
          className="w-full h-full object-cover object-center"
        />
      )}

      {/* Subtle Grain Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '4px 4px' }}
      />

      {/* In-Scene Product Hotspot (Diegetic AR Placement during PLAYING) */}
      {phase === 'PLAYING' && inSceneAd && (
        <InSceneProductHotspot ad={inSceneAd} />
      )}

      {/* Commercial Break Holographic Interstitial */}
      {phase === 'COMMERCIAL_BREAK' && activeAd && (
        <ImmersiveAdPlayer ad={activeAd} timeRemaining={timeRemaining} />
      )}

      {/* Top Cinema HUD */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
        <div className="flex items-center space-x-3">
          {/* Live / Paused Indicator */}
          {isPaused ? (
            <div className="flex items-center space-x-2 bg-amber-950/80 border border-amber-500/40 px-3 py-1 rounded-full backdrop-blur-md shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest font-mono">
                PAUSED // DIRECTOR HOLD
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-red-950/60 border border-red-500/30 px-3 py-1 rounded-full backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
                <Radio className="w-3 h-3" /> LIVE
              </span>
            </div>
          )}

          {/* AI Generation Paused / Archive Replay Badge & Controls */}
          {isGenerationPaused ? (
            <button
              onClick={() => onTogglePauseGeneration?.()}
              className="flex items-center space-x-2 bg-purple-950/90 hover:bg-purple-900 border border-purple-500/50 px-3 py-1 rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(168,85,247,0.4)] animate-pulse transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Generación IA pausada (Modo repetición de archivo para proteger créditos). Haz clic para reanudar."
            >
              <Shuffle className="w-3 h-3 text-purple-400" />
              <span className="text-[11px] font-bold text-purple-300 uppercase tracking-widest font-mono">
                REPLAY LOOP // AI PAUSED
              </span>
            </button>
          ) : (
            onTogglePauseGeneration && (
              <button
                onClick={() => onTogglePauseGeneration()}
                className="hidden sm:flex items-center space-x-1.5 bg-neutral-900/70 hover:bg-purple-950/60 border border-white/10 hover:border-purple-500/40 px-3 py-1 rounded-full backdrop-blur-md text-[11px] font-mono text-neutral-400 hover:text-purple-300 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Pausar generación de video IA (Modo ahorro de créditos)"
              >
                <Shuffle className="w-3 h-3 text-purple-400/80" />
                <span>PAUSE AI GEN</span>
              </button>
            )
          )}

          {/* Step Badge */}
          <div className="flex items-center space-x-2 bg-neutral-900/70 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md">
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono font-semibold text-neutral-200">
              STEP {activeStep.stepNumber} / {totalSteps}
            </span>
          </div>

          {/* Genre Tag */}
          <span className="hidden sm:inline-block text-[11px] text-neutral-400 bg-black/40 border border-white/5 px-2.5 py-1 rounded-full">
            {genre}
          </span>
        </div>

        {/* Video Controls (Subtitles [CC], Mute & Fullscreen) */}
        <div className="flex items-center space-x-2 relative">
          {/* Subtitles CC Toggle & Menu */}
          <div className="relative">
            <button
              onClick={() => {
                audioCues.playClick();
                setShowSubtitleMenu(!showSubtitleMenu);
              }}
              className={`px-2.5 py-2 rounded-full border text-xs font-mono font-bold flex items-center space-x-1.5 backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${
                subtitlesEnabled 
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.3)]' 
                  : 'bg-black/60 hover:bg-neutral-800 text-neutral-400 border-white/10'
              }`}
              title="Subtitle Settings (CC)"
            >
              <Subtitles className="w-4 h-4" />
              <span className="text-[10px] uppercase font-mono tracking-wider">
                {subtitlesEnabled ? subtitleLanguage.toUpperCase() : 'OFF'}
              </span>
            </button>

            {/* Subtitle Dropdown Menu */}
            <AnimatePresence>
              {showSubtitleMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 bg-[#0b0c12]/95 border border-white/15 rounded-xl shadow-2xl p-2 z-50 backdrop-blur-xl space-y-1 font-sans text-xs"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-neutral-400 border-b border-white/5">
                    Subtitle Settings
                  </div>

                  <button
                    onClick={() => changeSubtitleLanguage('en')}
                    className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors ${
                      subtitlesEnabled && subtitleLanguage === 'en'
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                    }`}
                  >
                    <span>English (Original CC)</span>
                    {subtitlesEnabled && subtitleLanguage === 'en' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>

                  <button
                    onClick={() => changeSubtitleLanguage('es')}
                    className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between transition-colors ${
                      subtitlesEnabled && subtitleLanguage === 'es'
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                    }`}
                  >
                    <span>Spanish (Subtítulos ES)</span>
                    {subtitlesEnabled && subtitleLanguage === 'es' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>

                  <div className="pt-1 border-t border-white/5">
                    <button
                      onClick={() => {
                        toggleSubtitlesEnabled(!subtitlesEnabled);
                        setShowSubtitleMenu(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-neutral-400 hover:bg-neutral-800/80 hover:text-white text-[11px] transition-colors"
                    >
                      {subtitlesEnabled ? 'Turn Subtitles Off' : 'Turn Subtitles On'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-full bg-black/60 hover:bg-neutral-800 text-neutral-200 border border-white/10 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-black/60 hover:bg-neutral-800 text-neutral-200 border border-white/10 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Subtitle / Narrative Display */}
      <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none flex flex-col items-center">
        {/* Cinematic Subtitles Component */}
        <AnimatePresence mode="wait">
          {subtitlesEnabled && currentSubtitleText && phase === 'PLAYING' && (
            <motion.div
              key={currentSubtitleText}
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="mb-4 px-6 py-2.5 rounded-2xl bg-black/85 border border-white/15 backdrop-blur-md max-w-3xl text-center shadow-[0_10px_40px_rgba(0,0,0,0.9)] select-none"
            >
              <p className="text-sm sm:text-base font-medium text-white tracking-wide leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {currentSpeaker && (
                  <span className="font-bold text-cyan-400 uppercase tracking-widest font-mono text-xs mr-2 border-r border-white/20 pr-2">
                    {currentSpeaker}
                  </span>
                )}
                <span className="italic">{currentSubtitleText}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clip HUD Meta Info */}
        <div className="w-full flex items-center justify-between text-xs text-neutral-400 font-mono px-2 mb-1.5">
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            <span>15s CLIP {phase === 'PLAYING' ? `(${timeRemaining}s remaining)` : ''}</span>
          </div>
          <span className="text-neutral-300 font-semibold truncate max-w-md">
            {movieTitle} — {activeStep.title}
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

      {/* Stream Paused Director Hold Overlay */}
      {isPaused && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center select-none pointer-events-none">
          <div className="p-6 rounded-2xl bg-neutral-950/90 border border-amber-500/40 text-center space-y-2 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
            <div className="inline-flex p-3 rounded-full bg-amber-500/20 text-amber-400 border border-amber-400/40 animate-pulse">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-mono font-bold uppercase tracking-widest text-white">
              STREAM PAUSED // DIRECTOR HOLD
            </h4>
            <p className="text-xs text-neutral-400 font-mono">
              Live generation and scene advancement are paused by the Director.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
