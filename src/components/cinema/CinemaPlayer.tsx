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

interface PlaybackSegment {
  type: 'shot1' | 'ad' | 'shot2';
  url: string;
  label: string;
  durationEst: number;
}

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

  const getSanitizedVideoUrl = (url?: string, fallbackIndexOffset: number = 0) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url.startsWith('/videos/')) {
      const idx = Math.abs((activeStep.stepNumber || 1) - 1 + fallbackIndexOffset) % CINEMA_FALLBACK_VIDEOS.length;
      return CINEMA_FALLBACK_VIDEOS[idx];
    }
    return url;
  };

  // Construct sequential segments for this scene:
  // Normal scene (30s): [Shot 1 (Opening), Shot 2 (Climax)]
  // Mid-roll ad scene (45s): [Shot 1 (Opening), Sponsor Ad (Block 2), Shot 2 (Climax)]
  const segments = React.useMemo<PlaybackSegment[]>(() => {
    const list: PlaybackSegment[] = [];

    // 1. Shot 1: Opening / Action
    list.push({
      type: 'shot1',
      url: getSanitizedVideoUrl(activeStep.videoUrl, 0),
      label: 'Shot 1 • Apertura',
      durationEst: 15
    });

    // 2. Optional Mid-roll Sponsor Ad in Block 2 (15s)
    if (activeStep.hasMidRollAd && activeStep.adVideoUrl) {
      list.push({
        type: 'ad',
        url: getSanitizedVideoUrl(activeStep.adVideoUrl, 2),
        label: 'Patrocinador • Interludio',
        durationEst: 15
      });
    }

    // 3. Shot 2: Climax / Consequence (15s)
    if (activeStep.videoUrl2) {
      list.push({
        type: 'shot2',
        url: getSanitizedVideoUrl(activeStep.videoUrl2, 1),
        label: 'Shot 2 • Desenlace',
        durationEst: 15
      });
    }

    return list;
  }, [activeStep.videoUrl, activeStep.videoUrl2, activeStep.hasMidRollAd, activeStep.adVideoUrl, activeStep.stepNumber]);

  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);

  // Reset to segment 0 whenever activeStep transitions
  useEffect(() => {
    setCurrentSegmentIndex(0);
    playbackEndedNotifiedRef.current = false;
  }, [activeStep.stepNumber, activeStep.videoUrl]);

  const currentSegment = segments[currentSegmentIndex] || segments[0];
  const currentVideoSrc = currentSegment.url;

  // Consecutive load errors without a successful play. Bounds the fallback
  // rotation so a fully offline client cannot remount the video forever.
  const errorStreakRef = useRef<number>(0);
  const MAX_CONSECUTIVE_ERRORS = CINEMA_FALLBACK_VIDEOS.length + 3;

  const handleVideoError = () => {
    console.warn(`[CinemaPlayer] Video failed to load from "${currentVideoSrc}". Switching to fallback video.`);
    if (errorStreakRef.current >= MAX_CONSECUTIVE_ERRORS) {
      console.warn('[CinemaPlayer] Every fallback video failed repeatedly. Stopping rotation.');
      return;
    }
    errorStreakRef.current += 1;
    const fallbackIndex = CINEMA_FALLBACK_VIDEOS.indexOf(currentVideoSrc);
    const nextSrc = fallbackIndex >= 0
      ? CINEMA_FALLBACK_VIDEOS[(fallbackIndex + 1) % CINEMA_FALLBACK_VIDEOS.length]
      : fallbackUrl;
    if (nextSrc !== currentVideoSrc && videoRef.current) {
      videoRef.current.src = nextSrc;
      videoRef.current.play().catch(() => {});
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
  const lastPlayedSegmentRef = useRef<number>(currentSegmentIndex);
  const lastVideoSrcRef = useRef<string>(currentVideoSrc);
  const lastEmittedSecondRef = useRef<number>(-1);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  const playbackEndedNotifiedRef = useRef<boolean>(false);

  // Seamless auto-play and transition between segments without looping
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideoSrc) return;

    const isDifferentStep = lastPlayedStepRef.current !== activeStep.stepNumber;
    const isDifferentSegment = lastPlayedSegmentRef.current !== currentSegmentIndex;
    const isDifferentSrc = lastVideoSrcRef.current !== currentVideoSrc;

    if (isDifferentStep || isDifferentSegment || isDifferentSrc) {
      lastPlayedStepRef.current = activeStep.stepNumber;
      lastPlayedSegmentRef.current = currentSegmentIndex;
      lastVideoSrcRef.current = currentVideoSrc;
      video.currentTime = 0;
      video.loop = false; // Never loop during sequential movie playback
      video.muted = phase === 'VOTING' ? true : isMuted;
      video.play().catch((err) => {
        // Autoplay policy fallback: mute and retry
        video.muted = true;
        video.play().catch(() => {});
      });
    } else if (video.paused && phase === 'PLAYING' && !isPaused) {
      video.play().catch(() => {});
    }
  }, [currentVideoSrc, currentSegmentIndex, activeStep.stepNumber, phase, isMuted, isPaused]);

  // Enforce scene repeating without sound during VOTING phase, and completely pause/mute during COMMERCIAL_BREAK
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (phase === 'COMMERCIAL_BREAK') {
      video.pause();
      video.muted = true;
    } else if (phase === 'VOTING') {
      video.muted = true;
      video.loop = true;
      if (video.paused && !isPaused) {
        video.play().catch(() => {});
      }
    } else if (phase === 'PLAYING') {
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

  // Handle video end: advance to next segment or notify step completion
  const handleEnded = () => {
    if (phase === 'PLAYING') {
      // If there is another segment in this scene (e.g. Shot 1 -> Ad, or Shot 1 -> Shot 2, or Ad -> Shot 2):
      if (currentSegmentIndex < segments.length - 1) {
        console.log(`[CinemaPlayer] Segment ${currentSegmentIndex} (${currentSegment.type}) ended. Seamlessly playing next segment ${currentSegmentIndex + 1} (${segments[currentSegmentIndex + 1].type}).`);
        setCurrentSegmentIndex(prev => prev + 1);
        return;
      }

      // All segments for this scene have completed:
      // Hold on the final frame (no loop, no rewinding) and notify orchestrator
      if (!playbackEndedNotifiedRef.current) {
        playbackEndedNotifiedRef.current = true;
        onPlaybackEnded?.();
      }
      return;
    }

    if (phase === 'VOTING' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const currentVideoTime = video.currentTime;

    // Compute global timeline position in this scene
    let globalTime = currentVideoTime;
    if (currentSegment.type === 'ad') {
      globalTime = 15 + currentVideoTime;
    } else if (currentSegment.type === 'shot2') {
      globalTime = (activeStep.hasMidRollAd ? 30 : 15) + currentVideoTime;
    }

    const sec = Math.floor(globalTime);
    if (sec !== lastEmittedSecondRef.current) {
      lastEmittedSecondRef.current = sec;
      setCurrentPlaybackTime(globalTime);
    }
  };

  // Subtitle cue matching for the current global timeline position
  const currentSubtitle = React.useMemo(() => {
    if (!subtitlesEnabled || phase !== 'PLAYING' || currentSegment.type === 'ad') return null;
    if (!activeStep.subtitles || activeStep.subtitles.length === 0) return null;
    return activeStep.subtitles.find(
      sub => currentPlaybackTime >= sub.start && currentPlaybackTime <= sub.end
    );
  }, [subtitlesEnabled, phase, currentSegment.type, activeStep.subtitles, currentPlaybackTime]);

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

        {/* Video Controls (Subtitles, Mute & Fullscreen) */}
        <div className="flex items-center space-x-2 relative">
          {/* Subtitles Toggle Button */}
          <button
            onClick={() => {
              const nextVal = !subtitlesEnabled;
              setSubtitlesEnabled(nextVal);
              onToggleSubtitles?.(nextVal);
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border md:backdrop-blur-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${
              subtitlesEnabled
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-black/70 text-neutral-400 border-white/10 hover:text-neutral-200'
            }`}
            title={subtitlesEnabled ? "Subtítulos activados (clic para desactivar)" : "Activar subtítulos"}
          >
            <span>CC</span>
            {subtitlesEnabled && (
              <span className="text-[10px] text-cyan-400 font-sans">
                {subtitleLanguage.toUpperCase()}
              </span>
            )}
          </button>

          {subtitlesEnabled && (
            <button
              onClick={() => {
                const nextLang = subtitleLanguage === 'en' ? 'es' : 'en';
                setSubtitleLanguage(nextLang);
                onChangeSubtitleLanguage?.(nextLang);
              }}
              className="px-2 py-1 rounded-full text-[10px] font-mono font-semibold bg-black/70 text-neutral-300 border border-white/10 hover:text-cyan-300 hover:border-cyan-500/40 transition-all"
              title="Alternar idioma (EN / ES)"
            >
              {subtitleLanguage === 'en' ? 'ES' : 'EN'}
            </button>
          )}

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

      {/* Mid-Roll Sponsor Badge Overlay (Block 2) */}
      {currentSegment.type === 'ad' && phase === 'PLAYING' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-16 right-6 z-20 pointer-events-none"
        >
          <div className="flex items-center space-x-2 bg-amber-950/90 border border-amber-500/50 px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.35)] md:backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-widest">
              PATROCINADOR EXCLUSIVO // BLOQUE 2
            </span>
          </div>
        </motion.div>
      )}

      {/* Subtitles Overlay */}
      <AnimatePresence>
        {currentSubtitle && (
          <motion.div
            key={currentSubtitle.text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center max-w-2xl px-4 w-full"
          >
            <div className="inline-block bg-black/85 md:backdrop-blur-md border border-white/15 px-4 py-2 rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.85)]">
              {currentSubtitle.speaker && (
                <span className="text-[11px] font-mono font-bold text-cyan-400 mr-2 uppercase tracking-wider">
                  {currentSubtitle.speaker}:
                </span>
              )}
              <span className="text-sm md:text-base font-medium text-white tracking-wide">
                {subtitleLanguage === 'es' ? (currentSubtitle.textEs || currentSubtitle.text) : currentSubtitle.text}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Clip HUD Meta Info */}
      <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none flex flex-col items-center">

        {/* Clip HUD Meta Info */}
        <div className="w-full flex items-center justify-between text-xs text-neutral-400 font-mono px-2 mb-1.5">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {phase === 'PLAYING' 
                ? `${activeStep.duration || 30}s • [${currentSegment.label}] • LIVE` 
                : 'PAUSED / TRANSITION'}
            </span>
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
