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
}

const CinemaPlayerBase: React.FC<CinemaPlayerProps> = ({
  activeStep,
  phase,
  activeAd,
  inSceneAd,
  isPaused = false,
  isGenerationPaused = false,
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
      url: getSanitizedVideoUrl(activeStep.videoUrl, 0)
    });

    // 2. Optional Mid-roll Sponsor Ad in Block 2 (15s)
    if (activeStep.hasMidRollAd && activeStep.adVideoUrl) {
      list.push({
        type: 'ad',
        url: getSanitizedVideoUrl(activeStep.adVideoUrl, 2)
      });
    }

    // 3. Shot 2: Climax / Consequence (15s) - ALWAYS included so 2 videos are concatenated
    list.push({
      type: 'shot2',
      url: getSanitizedVideoUrl(activeStep.videoUrl2, 1)
    });

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

  const lastPlayedStepRef = useRef<number>(activeStep.stepNumber);
  const lastPlayedSegmentRef = useRef<number>(currentSegmentIndex);
  const lastVideoSrcRef = useRef<string>(currentVideoSrc);
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
        setCurrentSegmentIndex(prev => prev + 1);
        return;
      }

      // All segments for this scene have completed: hold final frame and advance
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

  const toggleMute = () => {
    const nextMuted = audioCues.toggleMute();
    setIsMuted(nextMuted);
    if (videoRef.current) {
      if (phase !== 'VOTING') {
        videoRef.current.muted = nextMuted;
      } else {
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

      {/* Main Video Element */}
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

      {/* Subtle Grain Overlay */}
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

      {/* Top Cinema Controls (LIVE on the left, Volume & Fullscreen on the right) */}
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
        </div>

        {/* Video Controls (Mute & Fullscreen ONLY) */}
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

export const CinemaPlayer = React.memo(CinemaPlayerBase, (prev, next) =>
  prev.activeStep === next.activeStep &&
  prev.phase === next.phase &&
  prev.isPaused === next.isPaused &&
  prev.isGenerationPaused === next.isGenerationPaused &&
  prev.activeAd === next.activeAd &&
  prev.inSceneAd === next.inSceneAd &&
  prev.fullscreenContainerRef === next.fullscreenContainerRef
);
