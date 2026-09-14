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
  movieTitle,
  activeStep,
  phase,
  totalSteps = 8,
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
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(false);
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
  // 15s Prologue scenes (Steps 1-4): ONLY [Shot 1 (Opening 15s)] — all 4 sum to 1 minute total
  // Normal dual-shot scene (30s): [Shot 1 (Opening 15s), Shot 2 (Climax 15s)]
  // Mid-roll ad scene (45s): [Shot 1 (Opening 15s), Sponsor Ad (15s), Shot 2 (Climax 15s)]
  const segments = React.useMemo<PlaybackSegment[]>(() => {
    const list: PlaybackSegment[] = [];

    // 1. Shot 1: Opening / Action (15s)
    list.push({
      type: 'shot1',
      url: getSanitizedVideoUrl(activeStep.videoUrl, 0)
    });

    // 2. Optional Mid-roll Sponsor Ad in Block 2 (15s) — Strictly forbidden during prologue (steps 1-4)
    if (activeStep.stepNumber > 4 && activeStep.hasMidRollAd && activeStep.adVideoUrl) {
      list.push({
        type: 'ad',
        url: getSanitizedVideoUrl(activeStep.adVideoUrl, 2)
      });
    }

    // 3. Shot 2: Climax / Consequence (15s) — ONLY for dual-shot scenes (steps > 4 AND duration > 15)
    if (activeStep.stepNumber > 4 && activeStep.duration > 15 && activeStep.videoUrl2) {
      list.push({
        type: 'shot2',
        url: getSanitizedVideoUrl(activeStep.videoUrl2, 1)
      });
    }

    return list;
  }, [activeStep.stepNumber, activeStep.duration, activeStep.videoUrl, activeStep.videoUrl2, activeStep.hasMidRollAd, activeStep.adVideoUrl, getSanitizedVideoUrl]);

  // dual-Buffer Seamless A/B Player state
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);
  const [slotSrcA, setSlotSrcA] = useState<string>(() => segments[0]?.url || fallbackUrl);
  const [slotSrcB, setSlotSrcB] = useState<string>(() => segments[1]?.url || segments[0]?.url || fallbackUrl);

  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;
  const hasUserInteractedRef = useRef<boolean>(false);

  const isMountedRef = useRef<boolean>(false);
  const lastHandledStepKeyRef = useRef<string>('');
  const playbackEndedNotifiedRef = useRef<boolean>(false);
  const activeSlotRef = useRef<'A' | 'B'>('A');
  activeSlotRef.current = activeSlot;
  const currentSegmentIndexRef = useRef<number>(0);
  currentSegmentIndexRef.current = currentSegmentIndex;
  const segmentsRef = useRef<PlaybackSegment[]>(segments);
  segmentsRef.current = segments;

  // 15s Clip Playback Timer
  const [clipSeconds, setClipSeconds] = useState<number>(0);

  const handleTimeUpdate = React.useCallback((e: React.SyntheticEvent<HTMLVideoElement>, slot: 'A' | 'B') => {
    if (slot !== activeSlotRef.current) return;
    const v = e.currentTarget;
    if (phase === 'PLAYING') {
      const rawSec = v.currentTime || 0;
      setClipSeconds(Math.min(15, Math.floor(rawSec)));
    }
  }, [phase]);

  // Teardown all videos on component unmount
  useEffect(() => {
    return () => {
      if (videoRefA.current) {
        videoRefA.current.pause();
        videoRefA.current.muted = true;
        videoRefA.current.removeAttribute('src');
        videoRefA.current.load();
      }
      if (videoRefB.current) {
        videoRefB.current.pause();
        videoRefB.current.muted = true;
        videoRefB.current.removeAttribute('src');
        videoRefB.current.load();
      }
    };
  }, []);

  const isOptionVoting = phase === 'VOTING' || phase === 'OPTION_VOTING';

  // Helper to safely play video handling browser autoplay and unmuting policies
  const safePlayVideo = React.useCallback(async (video: HTMLVideoElement | null, shouldMute: boolean) => {
    if (!video) return;

    // STRICT SAFETY: Never play a video if it is NOT the active slot!
    const activeVideo = activeSlotRef.current === 'A' ? videoRefA.current : videoRefB.current;
    if (video !== activeVideo) {
      video.pause();
      video.muted = true;
      return;
    }

    const hasInteracted = hasUserInteractedRef.current || (typeof navigator !== 'undefined' && Boolean((navigator as any).userActivation?.hasBeenActive));
    const effectiveMuted = shouldMute || (!hasInteracted && isAutoplayBlocked);
    video.muted = effectiveMuted;
    video.volume = 1.0;
    try {
      await video.play();
      if (!shouldMute && video.muted && hasInteracted && !isOptionVoting) {
        video.muted = false;
        setIsAutoplayBlocked(false);
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        // Browser blocked audio autoplay: immediately play muted so video NEVER freezes!
        console.warn('[CinemaPlayer] Browser autoplay policy restricted audio; playing muted until user interaction');
        setIsAutoplayBlocked(true);
        video.muted = true;
        try {
          await video.play();
        } catch (retryErr) {
          console.warn('[CinemaPlayer] Muted playback retry failed:', retryErr);
        }
      } else if (err?.name !== 'AbortError') {
        console.warn('[CinemaPlayer] Video playback error:', err);
      }
    }
  }, [isAutoplayBlocked, isOptionVoting]);

  // Global user interaction listener to permanently unlock audio as soon as the user touches/clicks anywhere
  useEffect(() => {
    const unlockAudio = () => {
      hasUserInteractedRef.current = true;
      setIsAutoplayBlocked(false);
      if (!isMutedRef.current && !isOptionVoting && phase === 'PLAYING') {
        const activeVideo = activeSlotRef.current === 'A' ? videoRefA.current : videoRefB.current;
        const standbyVideo = activeSlotRef.current === 'A' ? videoRefB.current : videoRefA.current;
        if (standbyVideo) {
          standbyVideo.muted = true;
          standbyVideo.pause();
        }
        if (activeVideo) {
          activeVideo.muted = false;
          activeVideo.volume = 1.0;
        }
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [phase, isOptionVoting]);

  // Step transition key: changes whenever step number or primary videoUrl changes
  const stepKey = `${movieTitle}_${activeStep.stepNumber}_${activeStep.videoUrl || ''}`;

  // Reset clip seconds on step/segment transition
  useEffect(() => {
    setClipSeconds(0);
  }, [stepKey, currentSegmentIndex]);

  // Initialize or seamlessly transition slots when scene / activeStep changes
  useEffect(() => {
    if (lastHandledStepKeyRef.current === stepKey) return;
    lastHandledStepKeyRef.current = stepKey;

    playbackEndedNotifiedRef.current = false;
    setCurrentSegmentIndex(0);

    const src0 = segments[0]?.url || fallbackUrl;
    const src1 = segments[1]?.url || src0;

    if (!isMountedRef.current) {
      // First mount: Slot A starts
      isMountedRef.current = true;
      setActiveSlot('A');
      setSlotSrcA(src0);
      setSlotSrcB(src1);
      return;
    }

    // Subsequent step change: alternate to the standby slot seamlessly without freezing the current one
    const currentSlot = activeSlotRef.current;
    const nextSlot: 'A' | 'B' = currentSlot === 'A' ? 'B' : 'A';

    // Immediately stop and mute old slot so its audio NEVER bleeds into the next clip
    const oldVideo = currentSlot === 'A' ? videoRefA.current : videoRefB.current;
    if (oldVideo) {
      oldVideo.pause();
      oldVideo.muted = true;
      oldVideo.currentTime = 0;
    }

    if (nextSlot === 'A') {
      setSlotSrcA(src0);
    } else {
      setSlotSrcB(src0);
    }

    setActiveSlot(nextSlot);

    // Preload next segment (if dual-shot) into the now standby old slot
    if (segments[1]?.url) {
      if (currentSlot === 'A') {
        setSlotSrcA(segments[1].url);
      } else {
        setSlotSrcB(segments[1].url);
      }
    }
  }, [stepKey, segments, fallbackUrl]);

  // Handle seamless transition when a slot finishes playing
  const handleSlotEnded = React.useCallback((finishedSlot: 'A' | 'B') => {
    // Only process end event from the active slot
    if (finishedSlot !== activeSlotRef.current) return;

    const currentIdx = currentSegmentIndexRef.current;
    const allSegments = segmentsRef.current;

    if (phase === 'PLAYING') {
      if (currentIdx < allSegments.length - 1) {
        // Next segment exists (e.g. shot 1 -> shot 2 or ad): Switch slots instantly
        const nextIdx = currentIdx + 1;
        const nextSlot = finishedSlot === 'A' ? 'B' : 'A';
        const targetVideo = nextSlot === 'A' ? videoRefA.current : videoRefB.current;
        const oldVideo = finishedSlot === 'A' ? videoRefA.current : videoRefB.current;
        const isNextAd = allSegments[nextIdx]?.type === 'ad';

        if (oldVideo) {
          oldVideo.pause();
          oldVideo.muted = true;
        }

        if (targetVideo) {
          const targetMuted = isNextAd ? false : isMutedRef.current;
          safePlayVideo(targetVideo, targetMuted);
        }

        setActiveSlot(nextSlot);
        setCurrentSegmentIndex(nextIdx);

        // Preload subsequent segment (if any) into the now standby slot
        const subsequentIdx = nextIdx + 1;
        if (subsequentIdx < allSegments.length) {
          const subsequentUrl = allSegments[subsequentIdx].url;
          if (finishedSlot === 'A') {
            setSlotSrcA(subsequentUrl);
          } else {
            setSlotSrcB(subsequentUrl);
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
  }, [phase, onPlaybackEnded, safePlayVideo]);

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
      if (slot === activeSlotRef.current) {
        const targetMuted = isOptionVoting ? true : isMutedRef.current;
        safePlayVideo(video, targetMuted);
      }
    }
  }, [fallbackUrl, isOptionVoting, safePlayVideo]);

  // Phase changes (Muting & Pausing)
  useEffect(() => {
    const activeVideo = activeSlot === 'A' ? videoRefA.current : videoRefB.current;
    const standbyVideo = activeSlot === 'A' ? videoRefB.current : videoRefA.current;

    if (standbyVideo) {
      standbyVideo.pause();
      standbyVideo.muted = true;
      standbyVideo.currentTime = 0;
    }

    if (!activeVideo) return;

    const currentSegment = segments[currentSegmentIndex];
    const isAdSegment = currentSegment?.type === 'ad';

    if (phase === 'COMMERCIAL_BREAK') {
      activeVideo.pause();
      activeVideo.muted = true;
      if (standbyVideo) {
        standbyVideo.pause();
        standbyVideo.muted = true;
      }
    } else if (isOptionVoting) {
      activeVideo.muted = true;
      activeVideo.loop = true;
      if (activeVideo.paused && !isPaused) {
        activeVideo.play().catch(() => {});
      }
    } else if (phase === 'PLAYING') {
      activeVideo.loop = false;
      const targetMuted = isAdSegment ? false : isMutedRef.current;
      activeVideo.muted = targetMuted;
      activeVideo.volume = 1.0;
      if (activeVideo.paused && !isPaused) {
        safePlayVideo(activeVideo, targetMuted);
      }
    }
  }, [phase, activeSlot, isMuted, isPaused, isOptionVoting, currentSegmentIndex, segments, safePlayVideo]);

  // Pause / resume stream
  useEffect(() => {
    const activeVideo = activeSlot === 'A' ? videoRefA.current : videoRefB.current;
    if (!activeVideo) return;

    if (isPaused) {
      activeVideo.pause();
    } else if (activeVideo.paused && phase === 'PLAYING') {
      const targetMuted = isMutedRef.current;
      safePlayVideo(activeVideo, targetMuted);
    }
  }, [isPaused, phase, activeSlot, safePlayVideo]);

  // Tab visibility change: auto-resume if browser paused background video
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && phase === 'PLAYING' && !isPaused) {
        const activeVideo = activeSlotRef.current === 'A' ? videoRefA.current : videoRefB.current;
        if (activeVideo && activeVideo.paused) {
          safePlayVideo(activeVideo, isOptionVoting ? true : isMutedRef.current);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [phase, isPaused, isOptionVoting, safePlayVideo]);

  const toggleMute = () => {
    hasUserInteractedRef.current = true;
    setIsAutoplayBlocked(false);
    const nextMuted = audioCues.toggleMute();
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;
    const activeVideo = activeSlotRef.current === 'A' ? videoRefA.current : videoRefB.current;
    const standbyVideo = activeSlotRef.current === 'A' ? videoRefB.current : videoRefA.current;
    if (activeVideo) {
      activeVideo.muted = isOptionVoting ? true : nextMuted;
      activeVideo.volume = 1.0;
    }
    if (standbyVideo) {
      standbyVideo.muted = true;
      standbyVideo.pause();
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
  // 15s Clip Playback Timer Calculations (Clips only, each clip = 15s)
  const currentStepNum = Math.max(1, activeStep?.stepNumber || 1);
  const effectiveTotalSteps = Math.max(currentStepNum, totalSteps || 8);
  const totalMovieSeconds = effectiveTotalSteps * 15;

  const isDualShotStep = Boolean(activeStep?.duration > 15 && activeStep?.videoUrl2);
  const isSecondShotActive = isDualShotStep && currentSegmentIndex > 0 && segments[currentSegmentIndex]?.type === 'shot2';

  const completedBaseClipsSec = (currentStepNum - 1) * 15;
  const stepExtraSec = isSecondShotActive ? 15 : 0;
  const currentClipElapsedSec = Math.max(0, Math.min(15, clipSeconds));

  let elapsedClipsSeconds = completedBaseClipsSec + stepExtraSec + currentClipElapsedSec;
  if (phase === 'VOTING' || phase === 'OPTION_VOTING') {
    // Scene clip playback finished, holding at completed scene runtime during voting
    elapsedClipsSeconds = Math.min(totalMovieSeconds, currentStepNum * 15);
  }
  elapsedClipsSeconds = Math.max(0, Math.min(totalMovieSeconds, elapsedClipsSeconds));

  const formatTime = (secs: number) => {
    const c = Math.max(0, Math.floor(secs));
    const m = Math.floor(c / 60);
    const s = Math.floor(c % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#050608] flex items-center justify-center overflow-hidden select-none group"
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-radial from-cyan-950/20 via-transparent to-black pointer-events-none" />

      {/* Dual Video Buffer: Slot A */}
      <video
        key={`slot-A-${slotSrcA}`}
        ref={videoRefA}
        src={slotSrcA}
        poster={activeSlot === 'A' ? activeStep.thumbnailUrl : undefined}
        preload="auto"
        autoPlay={activeSlot === 'A'}
        playsInline
        muted={activeSlot === 'A' ? (isOptionVoting || phase === 'COMMERCIAL_BREAK' ? true : (isMuted || isAutoplayBlocked)) : true}
        onError={() => handleVideoError('A')}
        onEnded={() => handleSlotEnded('A')}
        onTimeUpdate={(e) => handleTimeUpdate(e, 'A')}
        onCanPlay={(e) => {
          const video = e.currentTarget;
          if (activeSlotRef.current !== 'A') {
            video.pause();
            video.muted = true;
            return;
          }
          if (phase === 'PLAYING' && !isPaused && video.paused) {
            safePlayVideo(video, isOptionVoting ? true : isMutedRef.current);
          }
        }}
        onLoadedData={(e) => {
          const video = e.currentTarget;
          if (activeSlotRef.current !== 'A') {
            video.pause();
            video.muted = true;
            return;
          }
          if (phase === 'PLAYING' && !isPaused && video.paused) {
            safePlayVideo(video, isOptionVoting ? true : isMutedRef.current);
          }
        }}
        onPause={(e) => {
          const video = e.currentTarget;
          if (activeSlotRef.current !== 'A') {
            video.muted = true;
            return;
          }
          if (phase === 'PLAYING' && !isPaused && !video.ended) {
            safePlayVideo(video, isOptionVoting ? true : isMutedRef.current);
          }
        }}
        onPlaying={(e) => {
          const video = e.currentTarget;
          if (activeSlotRef.current !== 'A') {
            video.pause();
            video.muted = true;
            return;
          }
          const hasInteracted = hasUserInteractedRef.current || (typeof navigator !== 'undefined' && Boolean((navigator as any).userActivation?.hasBeenActive));
          if (!isOptionVoting && phase === 'PLAYING' && !isMutedRef.current && hasInteracted) {
            video.muted = false;
            video.volume = 1.0;
            setIsAutoplayBlocked(false);
          }
          onPlaybackStarted?.();
        }}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 ${
          phase === 'COMMERCIAL_BREAK'
            ? 'opacity-0 invisible pointer-events-none'
            : (activeSlot === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none')
        }`}
      />

      {/* Dual Video Buffer: Slot B (Standby / Preloading / Seamless Switch) */}
      <video
        key={`slot-B-${slotSrcB}`}
        ref={videoRefB}
        src={slotSrcB}
        poster={activeSlot === 'B' ? activeStep.thumbnailUrl : undefined}
        preload="auto"
        autoPlay={activeSlot === 'B'}
        playsInline
        muted={activeSlot === 'B' ? (isOptionVoting || phase === 'COMMERCIAL_BREAK' ? true : (isMuted || isAutoplayBlocked)) : true}
        onError={() => handleVideoError('B')}
        onEnded={() => handleSlotEnded('B')}
        onTimeUpdate={(e) => handleTimeUpdate(e, 'B')}
        onCanPlay={(e) => {
          const video = e.currentTarget;
          if (activeSlotRef.current !== 'B') {
            video.pause();
            video.muted = true;
            return;
          }
          if (phase === 'PLAYING' && !isPaused && video.paused) {
            safePlayVideo(video, isOptionVoting ? true : isMutedRef.current);
          }
        }}
        onLoadedData={(e) => {
          const video = e.currentTarget;
          if (activeSlotRef.current !== 'B') {
            video.pause();
            video.muted = true;
            return;
          }
          if (phase === 'PLAYING' && !isPaused && video.paused) {
            safePlayVideo(video, isOptionVoting ? true : isMutedRef.current);
          }
        }}
        onPause={(e) => {
          const video = e.currentTarget;
          if (activeSlotRef.current !== 'B') {
            video.muted = true;
            return;
          }
          if (phase === 'PLAYING' && !isPaused && !video.ended) {
            safePlayVideo(video, isOptionVoting ? true : isMutedRef.current);
          }
        }}
        onPlaying={(e) => {
          const video = e.currentTarget;
          if (activeSlotRef.current !== 'B') {
            video.pause();
            video.muted = true;
            return;
          }
          const hasInteracted = hasUserInteractedRef.current || (typeof navigator !== 'undefined' && Boolean((navigator as any).userActivation?.hasBeenActive));
          if (!isOptionVoting && phase === 'PLAYING' && !isMutedRef.current && hasInteracted) {
            video.muted = false;
            video.volume = 1.0;
            setIsAutoplayBlocked(false);
          }
          onPlaybackStarted?.();
        }}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 ${
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

      {/* Interactive Unmute Banner (Shown ONLY when browser autoplay policy blocks sound before user clicks) */}
      <AnimatePresence>
        {isAutoplayBlocked && !isMuted && phase === 'PLAYING' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto cursor-pointer"
            onClick={() => {
              hasUserInteractedRef.current = true;
              setIsAutoplayBlocked(false);
              const activeVideo = activeSlot === 'A' ? videoRefA.current : videoRefB.current;
              if (activeVideo) {
                activeVideo.muted = false;
                activeVideo.volume = 1.0;
              }
              audioCues.playClick();
            }}
          >
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-cyan-950/90 border border-cyan-400/60 text-cyan-200 text-xs font-mono font-bold tracking-wider uppercase shadow-[0_0_25px_rgba(6,182,212,0.4)] backdrop-blur-md hover:bg-cyan-900 transition-all hover:scale-105 active:scale-95">
              <Volume2 className="w-4 h-4 text-cyan-400 animate-bounce" />
              <span>Tap anywhere to enable movie audio</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Top Cinema Controls (LIVE on the left, Timer, Volume & Fullscreen on the right) */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 pt-3 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none">
        <div className="flex items-center space-x-2.5 sm:space-x-3 pointer-events-auto">
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
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1 font-mono">
                <Radio className="w-3 h-3" /> LIVE
              </span>
            </div>
          )}

          {/* 15s Clips Playback Timer HUD */}
          <div className="flex items-center space-x-2 bg-black/75 border border-cyan-500/30 px-3 py-1 rounded-full md:backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)] text-neutral-200">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div className="flex items-center space-x-1.5 font-mono text-xs">
              <span className="font-bold text-white tracking-wider">
                {formatTime(elapsedClipsSeconds)}
              </span>
              <span className="text-neutral-500 font-normal">/</span>
              <span className="text-neutral-400 font-normal">
                {formatTime(totalMovieSeconds)}
              </span>
              <span className="text-[10px] text-cyan-400/90 tracking-widest pl-2 border-l border-white/15 hidden sm:inline uppercase">
                Clip {currentStepNum}/{effectiveTotalSteps} ({formatTime(currentClipElapsedSec)}/00:15)
              </span>
            </div>
          </div>
        </div>

        {/* Video Controls (Mute & Fullscreen ONLY) */}
        <div className="flex items-center space-x-2 relative pointer-events-auto">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-full bg-black/70 hover:bg-neutral-800 text-neutral-200 border border-white/10 md:backdrop-blur-md transition-all hover:scale-105 active:scale-95"
            title={(isMuted || isAutoplayBlocked) ? "Unmute" : "Mute"}
          >
            {(isMuted || isAutoplayBlocked) ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
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
  prev.movieTitle === next.movieTitle &&
  prev.activeStep === next.activeStep &&
  prev.phase === next.phase &&
  prev.totalSteps === next.totalSteps &&
  prev.isPaused === next.isPaused &&
  prev.isGenerationPaused === next.isGenerationPaused &&
  prev.activeAd === next.activeAd &&
  prev.inSceneAd === next.inSceneAd &&
  prev.fullscreenContainerRef === next.fullscreenContainerRef
);
