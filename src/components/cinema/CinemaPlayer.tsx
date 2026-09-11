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
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);

  const [isMuted, setIsMuted] = useState(() => audioCues.getMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reliable Video Source Resolution (Fallbacks guarantee a video ALWAYS plays)
  const fallbackUrl = CINEMA_FALLBACK_VIDEOS[Math.abs((activeStep.stepNumber || 1) - 1) % CINEMA_FALLBACK_VIDEOS.length];

  const getSanitizedVideoUrl = React.useCallback((url?: string, fallbackIndexOffset: number = 0) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url.startsWith('/videos/')) {
      const idx = Math.abs((activeStep.stepNumber || 1) - 1 + fallbackIndexOffset) % CINEMA_FALLBACK_VIDEOS.length;
      return CINEMA_FALLBACK_VIDEOS[idx];
    }
    return url;
  }, [activeStep.stepNumber]);

  // Construct sequential segments for this scene:
  // Normal scene (30s): [Shot 1 (Opening), Shot 2 (Climax)]
  // Mid-roll ad scene (45s): [Shot 1 (Opening), Sponsor Ad (Block 2), Shot 2 (Climax)]
  const segments = React.useMemo<PlaybackSegment[]>(() => {
    const list: PlaybackSegment[] = [];

    // 1. Shot 1: Opening / Action (15s)
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

    // 3. Shot 2: Climax / Consequence (15s) - ALWAYS concatenated
    list.push({
      type: 'shot2',
      url: getSanitizedVideoUrl(activeStep.videoUrl2, 1)
    });

    return list;
  }, [activeStep.videoUrl, activeStep.videoUrl2, activeStep.hasMidRollAd, activeStep.adVideoUrl, getSanitizedVideoUrl]);

  // Dual-Buffer Seamless A/B Player state
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);
  const [slotSrcA, setSlotSrcA] = useState<string>(() => segments[0]?.url || fallbackUrl);
  const [slotSrcB, setSlotSrcB] = useState<string>(() => segments[1]?.url || segments[0]?.url || fallbackUrl);

  const playbackEndedNotifiedRef = useRef<boolean>(false);
  const activeSlotRef = useRef<'A' | 'B'>('A');
  activeSlotRef.current = activeSlot;
  const currentSegmentIndexRef = useRef<number>(0);
  currentSegmentIndexRef.current = currentSegmentIndex;
  const segmentsRef = useRef<PlaybackSegment[]>(segments);
  segmentsRef.current = segments;

  const isOptionVoting = phase === 'VOTING' || phase === 'OPTION_VOTING';

  // Initialize slots when scene / activeStep changes
  useEffect(() => {
    playbackEndedNotifiedRef.current = false;
    setCurrentSegmentIndex(0);
    setActiveSlot('A');

    const src0 = segments[0]?.url || fallbackUrl;
    const src1 = segments[1]?.url || src0;

    setSlotSrcA(src0);
    setSlotSrcB(src1);

    const videoA = videoRefA.current;
    const videoB = videoRefB.current;

    if (videoA) {
      videoA.src = src0;
      videoA.currentTime = 0;
      videoA.loop = false;
      videoA.muted = isOptionVoting ? true : isMuted;
      videoA.play().catch(() => {
        videoA.muted = true;
        videoA.play().catch(() => {});
      });
    }

    if (videoB) {
      videoB.src = src1;
      videoB.currentTime = 0;
      videoB.loop = false;
      videoB.muted = true;
      videoB.preload = "auto";
      videoB.load();
    }
  }, [activeStep.stepNumber, activeStep.videoUrl, activeStep.videoUrl2, isMuted, isOptionVoting, fallbackUrl, segments]);

  // Handle seamless transition when a slot finishes playing
  const handleSlotEnded = React.useCallback((finishedSlot: 'A' | 'B') => {
    // Only process end event from the active slot
    if (finishedSlot !== activeSlotRef.current) return;

    const currentIdx = currentSegmentIndexRef.current;
    const allSegments = segmentsRef.current;

    if (phase === 'PLAYING') {
      if (currentIdx < allSegments.length - 1) {
        // Next segment exists: Switch slots instantly
        const nextIdx = currentIdx + 1;
        const nextSlot = finishedSlot === 'A' ? 'B' : 'A';
        const targetVideo = nextSlot === 'A' ? videoRefA.current : videoRefB.current;
        const oldVideo = finishedSlot === 'A' ? videoRefA.current : videoRefB.current;

        if (oldVideo) {
          oldVideo.pause();
          oldVideo.muted = true;
        }

        if (targetVideo) {
          targetVideo.currentTime = 0;
          targetVideo.muted = isMuted;
          targetVideo.play().catch(() => {
            targetVideo.muted = true;
            targetVideo.play().catch(() => {});
          });
        }

        setActiveSlot(nextSlot);
        setCurrentSegmentIndex(nextIdx);

        // Preload subsequent segment (if any) into the now standby slot
        const subsequentIdx = nextIdx + 1;
        if (subsequentIdx < allSegments.length) {
          const subsequentUrl = allSegments[subsequentIdx].url;
          if (finishedSlot === 'A') {
            setSlotSrcA(subsequentUrl);
            if (videoRefA.current) {
              videoRefA.current.src = subsequentUrl;
              videoRefA.current.preload = "auto";
              videoRefA.current.load();
            }
          } else {
            setSlotSrcB(subsequentUrl);
            if (videoRefB.current) {
              videoRefB.current.src = subsequentUrl;
              videoRefB.current.preload = "auto";
              videoRefB.current.load();
            }
          }
        }
        return;
      }

      // All segments for this scene have completed
      if (!playbackEndedNotifiedRef.current) {
        playbackEndedNotifiedRef.current = true;
        onPlaybackEnded?.();
      }
      return;
    }

    // In VOTING phase, loop current video seamlessly without sound
    if (phase === 'VOTING' || phase === 'OPTION_VOTING') {
      const activeVideo = finishedSlot === 'A' ? videoRefA.current : videoRefB.current;
      if (activeVideo) {
        activeVideo.currentTime = 0;
        activeVideo.muted = true;
        activeVideo.play().catch(() => {});
      }
    }
  }, [phase, isMuted, onPlaybackEnded]);

  // Video error fallback rotation
  const handleVideoError = React.useCallback((slot: 'A' | 'B') => {
    const video = slot === 'A' ? videoRefA.current : videoRefB.current;
    if (!video) return;
    const currentSrc = video.src;
    console.warn(`[CinemaPlayer] Video failed in slot ${slot} ("${currentSrc}"). Loading fallback.`);
    const fallbackIndex = CINEMA_FALLBACK_VIDEOS.indexOf(currentSrc);
    const nextSrc = fallbackIndex >= 0
      ? CINEMA_FALLBACK_VIDEOS[(fallbackIndex + 1) % CINEMA_FALLBACK_VIDEOS.length]
      : fallbackUrl;
    if (nextSrc !== currentSrc) {
      if (slot === 'A') setSlotSrcA(nextSrc);
      else setSlotSrcB(nextSrc);
      video.src = nextSrc;
      video.load();
      if (slot === activeSlotRef.current) {
        video.play().catch(() => {});
      }
    }
  }, [fallbackUrl]);

  // Phase changes (Muting & Pausing)
  useEffect(() => {
    const activeVideo = activeSlot === 'A' ? videoRefA.current : videoRefB.current;
    const standbyVideo = activeSlot === 'A' ? videoRefB.current : videoRefA.current;

    if (standbyVideo) {
      standbyVideo.muted = true;
    }

    if (!activeVideo) return;

    if (phase === 'COMMERCIAL_BREAK') {
      activeVideo.pause();
      activeVideo.muted = true;
    } else if (isOptionVoting) {
      activeVideo.muted = true;
      activeVideo.loop = true;
      if (activeVideo.paused && !isPaused) {
        activeVideo.play().catch(() => {});
      }
    } else if (phase === 'PLAYING') {
      activeVideo.loop = false;
      activeVideo.muted = isMuted;
      if (activeVideo.paused && !isPaused) {
        activeVideo.play().catch(() => {});
      }
    }
  }, [phase, activeSlot, isMuted, isPaused, isOptionVoting]);

  // Pause / resume stream
  useEffect(() => {
    const activeVideo = activeSlot === 'A' ? videoRefA.current : videoRefB.current;
    if (!activeVideo) return;

    if (isPaused) {
      activeVideo.pause();
    } else if (activeVideo.paused && phase === 'PLAYING') {
      activeVideo.play().catch(() => {});
    }
  }, [isPaused, phase, activeSlot]);

  const toggleMute = () => {
    const nextMuted = audioCues.toggleMute();
    setIsMuted(nextMuted);
    const activeVideo = activeSlot === 'A' ? videoRefA.current : videoRefB.current;
    if (activeVideo) {
      activeVideo.muted = isOptionVoting ? true : nextMuted;
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
            const activeVideo = activeSlot === 'A' ? videoRefA.current : videoRefB.current;
            const video = activeVideo as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
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

      {/* Dual Video Buffer: Slot A */}
      <video
        ref={videoRefA}
        src={slotSrcA}
        poster={activeStep.thumbnailUrl}
        preload="auto"
        autoPlay
        playsInline
        muted={activeSlot === 'A' ? (isOptionVoting || phase === 'COMMERCIAL_BREAK' ? true : isMuted) : true}
        onError={() => handleVideoError('A')}
        onEnded={() => handleSlotEnded('A')}
        onPlaying={() => {
          if (activeSlot === 'A') onPlaybackStarted?.();
        }}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-200 ${
          phase === 'COMMERCIAL_BREAK'
            ? 'opacity-0 invisible pointer-events-none'
            : (activeSlot === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')
        }`}
      />

      {/* Dual Video Buffer: Slot B (Standby / Preloading / Seamless Switch) */}
      <video
        ref={videoRefB}
        src={slotSrcB}
        preload="auto"
        autoPlay={false}
        playsInline
        muted={activeSlot === 'B' ? (isOptionVoting || phase === 'COMMERCIAL_BREAK' ? true : isMuted) : true}
        onError={() => handleVideoError('B')}
        onEnded={() => handleSlotEnded('B')}
        onPlaying={() => {
          if (activeSlot === 'B') onPlaybackStarted?.();
        }}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-200 ${
          phase === 'COMMERCIAL_BREAK'
            ? 'opacity-0 invisible pointer-events-none'
            : (activeSlot === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')
        }`}
      />

      {/* Subtle Grain Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay hidden md:block z-10"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '4px 4px' }}
      />

      {/* In-Scene Product Hotspot (Diegetic AR Placement during PLAYING) */}
      {phase === 'PLAYING' && inSceneAd && (
        <div className="z-20">
          <InSceneProductHotspot ad={inSceneAd} />
        </div>
      )}

      {/* Commercial Break Holographic Interstitial */}
      {phase === 'COMMERCIAL_BREAK' && (
        <div className="z-30">
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
        </div>
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
