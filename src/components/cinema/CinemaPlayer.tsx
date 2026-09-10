'use client';

import React, { useRef, useEffect, useState } from 'react';
import { MovieStep, PlaybackPhase, ImmersiveAd } from '@/types/cinema';
import { Volume2, VolumeX, Maximize2, Minimize2, Radio, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioCues } from '@/lib/audio-cues';
import { ImmersiveAdPlayer } from './ImmersiveAdPlayer';
import { InSceneProductHotspot } from './InSceneProductHotspot';

interface CinemaPlayerProps {
  movieTitle: string;
  genre: string;
  activeStep: MovieStep;
  phase: PlaybackPhase;
  totalSteps: number;
  activeAd?: ImmersiveAd | null;
  inSceneAd?: ImmersiveAd | null;
  isPaused?: boolean;
  isGenerationPaused?: boolean;
  subtitlesEnabled?: boolean;
  subtitleLanguage?: 'en' | 'es';
  onToggleSubtitles?: (enabled: boolean) => void;
  onChangeSubtitleLanguage?: (lang: 'en' | 'es') => void;
  onPlaybackStarted?: () => void;
  onPlaybackEnded?: () => void;
  onAdCompleted?: () => void;
  onOpenBuyAds?: () => void;
  /**
   * Optional outer container to fullscreen (e.g. the stage wrapper that also
   * holds the voting overlays). When provided, fullscreen targets it so the
   * vote cards remain visible in fullscreen mode.
   */
  fullscreenContainerRef?: React.RefObject<HTMLDivElement | null>;
}

const CINEMA_FALLBACK_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
];

const CinemaPlayerBase: React.FC<CinemaPlayerProps> = ({
  movieTitle,
  genre,
  activeStep,
  phase,
  totalSteps,
  activeAd,
  inSceneAd,
  isPaused = false,
  isGenerationPaused = false,
  subtitlesEnabled: initialSubtitlesEnabled = true,
  subtitleLanguage: initialSubtitleLanguage = 'en',
  onToggleSubtitles,
  onChangeSubtitleLanguage,
  onPlaybackStarted,
  onPlaybackEnded,
  onAdCompleted,
  onOpenBuyAds,
  fullscreenContainerRef
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(() => audioCues.getMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reliable Video Source Resolution (Fallbacks guarantee a video ALWAYS plays)
  const fallbackUrl = CINEMA_FALLBACK_VIDEOS[Math.abs((activeStep.stepNumber || 1) - 1) % CINEMA_FALLBACK_VIDEOS.length];

  const getSanitizedVideoUrl = (url?: string) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url.startsWith('/videos/')) {
      return fallbackUrl;
    }
    return url;
  };

  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>(() => getSanitizedVideoUrl(activeStep.videoUrl));

  useEffect(() => {
    const nextSrc = getSanitizedVideoUrl(activeStep.videoUrl);
    setCurrentVideoSrc(prev => prev !== nextSrc ? nextSrc : prev);
  }, [activeStep.videoUrl, activeStep.stepNumber, fallbackUrl]);

  // Consecutive load errors without a successful play. Bounds the fallback
  // rotation so a fully offline client cannot remount the video forever.
  const errorStreakRef = useRef<number>(0);
  const MAX_CONSECUTIVE_ERRORS = CINEMA_FALLBACK_VIDEOS.length + 3;

  const handleVideoError = () => {
    console.warn(`[CinemaPlayer] Video failed to load from "${currentVideoSrc}". Switching to the next fallback video (never a static frame).`);
    if (errorStreakRef.current >= MAX_CONSECUTIVE_ERRORS) {
      console.warn('[CinemaPlayer] Every fallback video failed repeatedly. Stopping fallback rotation.');
      return;
    }
    errorStreakRef.current += 1;
    const fallbackIndex = CINEMA_FALLBACK_VIDEOS.indexOf(currentVideoSrc);
    const nextSrc = fallbackIndex >= 0
      ? CINEMA_FALLBACK_VIDEOS[(fallbackIndex + 1) % CINEMA_FALLBACK_VIDEOS.length]
      : fallbackUrl;
    if (nextSrc !== currentVideoSrc) {
      setCurrentVideoSrc(nextSrc);
    }
  };
  
  // Subtitle System States synced from Supabase
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(initialSubtitlesEnabled);
  const [subtitleLanguage, setSubtitleLanguage] = useState<'en' | 'es'>(initialSubtitleLanguage);

  useEffect(() => {
    setSubtitlesEnabled(initialSubtitlesEnabled);
  }, [initialSubtitlesEnabled]);

  useEffect(() => {
    setSubtitleLanguage(initialSubtitleLanguage);
  }, [initialSubtitleLanguage]);



  const lastPlayedStepRef = useRef<number>(activeStep.stepNumber);
  const lastVideoSrcRef = useRef<string>(currentVideoSrc);
  // Only re-render on whole-second changes: onTimeUpdate fires ~4x per second,
  // and each setState re-renders the player on top of video decode (dropped
  // frames on mid-range devices).
  const lastEmittedSecondRef = useRef<number>(-1);
  // Fired exactly once per scene clip: the page advances the stage only after
  // the video truly ended (never while it is still playing).
  const playbackEndedNotifiedRef = useRef<boolean>(false);

  // Auto-play and handle video src change ONLY when step number or video src actually transitions
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideoSrc) return;

    const isDifferentStep = lastPlayedStepRef.current !== activeStep.stepNumber;
    const isDifferentSrc = lastVideoSrcRef.current !== currentVideoSrc;

    if (isDifferentStep || isDifferentSrc) {
      lastPlayedStepRef.current = activeStep.stepNumber;
      lastVideoSrcRef.current = currentVideoSrc;
      playbackEndedNotifiedRef.current = false;
      video.currentTime = 0;
      video.muted = phase === 'VOTING' ? true : isMuted;
      video.play().catch(() => {});
    } else if (video.paused && phase === 'PLAYING' && !isPaused) {
      video.play().catch(() => {});
    }
  }, [currentVideoSrc, activeStep.stepNumber, phase, isMuted, isPaused]);

  // Enforce scene repeating without sound during VOTING phase, and completely pause/mute during COMMERCIAL_BREAK
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (phase === 'COMMERCIAL_BREAK') {
      // Completely pause and mute main video during sponsor ad break
      video.pause();
      video.muted = true;
    } else if (phase === 'VOTING') {
      // Replay scene continuously without sound during voting
      video.muted = true;
      video.loop = true;
      if (video.paused && !isPaused) {
        video.play().catch(() => {});
      }
    } else if (phase === 'PLAYING') {
      // Restore user sound preference during movie playback
      video.loop = false;
      video.muted = isMuted;
      if (video.paused && !isPaused) {
        video.play().catch(() => {});
      }
    }
  }, [phase, isMuted, isPaused]);

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

  const handleEnded = () => {
    if (phase === 'PLAYING') {
      // The scene clip truly ended: notify the page so the stage advances only
      // now — never while the video is still playing. Keep looping seamlessly
      // for clips shorter than the scene window.
      if (!playbackEndedNotifiedRef.current) {
        playbackEndedNotifiedRef.current = true;
        onPlaybackEnded?.();
      }
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
      return;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  // Only re-render on whole-second changes: onTimeUpdate fires ~4x per second,
  // and each setState re-renders the player on top of video decode (dropped
  // frames on mid-range devices).
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const sec = Math.floor(video.currentTime);
    if (sec !== lastEmittedSecondRef.current) {
      lastEmittedSecondRef.current = sec;
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
    const target = fullscreenContainerRef?.current ?? containerRef.current;
    if (!document.fullscreenElement) {
      const enterFullscreen = target?.requestFullscreen?.();
      if (enterFullscreen) {
        enterFullscreen
          .then(() => setIsFullscreen(true))
          .catch(() => {
            // iOS Safari only allows fullscreen on the video element itself
            const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
            if (video?.requestFullscreen) {
              video.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
            } else if (video?.webkitEnterFullscreen) {
              video.webkitEnterFullscreen();
              setIsFullscreen(true);
            }
          });
      }
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keep the icon in sync when fullscreen exits via Esc or platform UI
  useEffect(() => {
    const handleFullscreenChange = () => {
      const target = fullscreenContainerRef?.current ?? containerRef.current;
      setIsFullscreen(Boolean(document.fullscreenElement) && document.fullscreenElement === target);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [fullscreenContainerRef]);



  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#050608] flex items-center justify-center overflow-hidden select-none group"
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-radial from-cyan-950/20 via-transparent to-black pointer-events-none" />



      {/* Main Video Element (Always rendered with verified or fallback video) */}
      <video
        ref={videoRef}
        key={currentVideoSrc}
        src={currentVideoSrc}
        poster={activeStep.thumbnailUrl}
        preload="auto"
        autoPlay
        playsInline
        loop={phase === 'VOTING'}
        muted={phase === 'VOTING' || phase === 'COMMERCIAL_BREAK' ? true : isMuted}
        onTimeUpdate={handleTimeUpdate}
        onError={handleVideoError}
        onEnded={handleEnded}
        onPlaying={() => {
          errorStreakRef.current = 0;
          onPlaybackStarted?.();
        }}
        onCanPlay={() => {
          errorStreakRef.current = 0;
        }}
        className={`w-full h-full object-cover object-center transition-opacity duration-300 ${
          phase === 'COMMERCIAL_BREAK' ? 'opacity-0 invisible pointer-events-none' : 'opacity-100 visible'
        }`}
      />

      {/* Subtle Grain Overlay (desktop only — blend compositing over video is costly on mobile GPUs) */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay hidden md:block"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '4px 4px' }}
      />

      {/* In-Scene Product Hotspot (Diegetic AR Placement during PLAYING) */}
      {phase === 'PLAYING' && inSceneAd && (
        <InSceneProductHotspot ad={inSceneAd} />
      )}

      {/* Commercial Break Holographic Interstitial */}
      {phase === 'COMMERCIAL_BREAK' && (
        <ImmersiveAdPlayer 
          ad={activeAd || {
            id: 'ad_interstitial_default',
            brandName: 'Kinetic Cinema',
            title: 'Intermission Sponsor Showcase',
            tagline: 'High-Fidelity Neural Cinema',
            type: 'commercial_break',
            imageUrl: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=800&auto=format&fit=crop&q=80',
            ctaText: 'Explore Collection',
            duration: 15,
            isActive: true,
            impressions: 0,
            clicks: 0
          }} 
          onAdCompleted={onAdCompleted} 
          onOpenBuyAds={onOpenBuyAds}
        />
      )}

      {/* Top Cinema HUD */}
      <div className="absolute top-0 left-0 right-0 p-6 pt-3 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
        <div className="flex items-center space-x-3">
          {/* Live / Paused Indicator */}
          {isPaused ? (
            <div className="flex items-center space-x-2 bg-amber-950/80 border border-amber-500/40 px-3 py-1 rounded-full md:backdrop-blur-md shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest font-mono">
                PAUSED // DIRECTOR HOLD
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-red-950/60 border border-red-500/30 px-3 py-1 rounded-full md:backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
                <Radio className="w-3 h-3" /> LIVE
              </span>
            </div>
          )}

          {/* Genre Tag */}
          <span className="hidden sm:inline-block text-[11px] text-neutral-400 bg-black/40 border border-white/5 px-2.5 py-1 rounded-full">
            {genre}
          </span>
        </div>

        {/* Video Controls (Mute & Fullscreen) */}
        <div className="flex items-center space-x-2 relative">

          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-full bg-black/70 hover:bg-neutral-800 text-neutral-200 border border-white/10 md:backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-black/70 hover:bg-neutral-800 text-neutral-200 border border-white/10 md:backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Clip HUD Meta Info */}
      <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none flex flex-col items-center">

        {/* Clip HUD Meta Info */}
        <div className="w-full flex items-center justify-between text-xs text-neutral-400 font-mono px-2 mb-1.5">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{phase === 'PLAYING' ? `${activeStep.duration || 15}s SCENE • LIVE` : 'PAUSED / TRANSITION'}</span>
          </div>
          <span className="text-neutral-300 font-semibold truncate max-w-md">
            {movieTitle} — {activeStep.title}
          </span>
        </div>
      </div>

      {/* Stream Paused Director Hold Overlay */}
      {isPaused && (
        <div className="absolute inset-0 z-30 bg-black/75 md:bg-black/60 md:backdrop-blur-sm flex items-center justify-center select-none pointer-events-none">
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

/**
 * Memoized so the parent's per-second countdown re-renders skip the video
 * stage entirely. Only scene/phase-relevant props are compared — callbacks are
 * ignored (the parent re-creates them each render; the component uses the ones
 * from the render where the scene/phase changed, which is safe because their
 * closures read latest state via the parent's handlers).
 */
export const CinemaPlayer = React.memo(CinemaPlayerBase, (prev, next) =>
  prev.activeStep === next.activeStep &&
  prev.phase === next.phase &&
  prev.isPaused === next.isPaused &&
  prev.isGenerationPaused === next.isGenerationPaused &&
  prev.movieTitle === next.movieTitle &&
  prev.genre === next.genre &&
  prev.activeAd === next.activeAd &&
  prev.inSceneAd === next.inSceneAd &&
  prev.subtitlesEnabled === next.subtitlesEnabled &&
  prev.subtitleLanguage === next.subtitleLanguage &&
  prev.totalSteps === next.totalSteps &&
  prev.fullscreenContainerRef === next.fullscreenContainerRef
);
