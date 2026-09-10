'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ImmersiveAd } from '@/types/cinema';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ExternalLink, Radio, Volume2, VolumeX, ShieldCheck, Gift } from 'lucide-react';
import { audioCues } from '@/lib/audio-cues';

interface ImmersiveAdPlayerProps {
  ad: ImmersiveAd;
  timeRemaining?: number;
  onAdCompleted?: () => void;
  onOpenBuyAds?: () => void;
}

export const ImmersiveAdPlayer: React.FC<ImmersiveAdPlayerProps> = ({
  ad,
  timeRemaining = 0,
  onAdCompleted,
  onOpenBuyAds
}) => {
  // Ads play WITH SOUND by default; browsers that block autoplay-with-sound fall back to muted.
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [adSeconds, setAdSeconds] = useState(ad.duration || 15);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasCompletedRef = useRef<boolean>(false);
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve the best available video source:
  //  1. generatedAdVideoUrl — fal.ai cinematic ad clip (visual continuation of the film)
  //  2. videoUrl            — static fallback while fal.ai is still generating
  const activeVideoSrc = ad.generatedAdVideoUrl || ad.videoUrl;
  const isCinematicAd = !!ad.generatedAdVideoUrl;

  // Keeps the countdown interval reading the CURRENT video source without
  // restarting the break window when the fal.ai clip arrives mid-break.
  const activeVideoSrcRef = useRef<string | undefined>(activeVideoSrc);

  useEffect(() => {
    hasCompletedRef.current = false;
  }, [ad.id]);

  const triggerCompleted = () => {
    if (!hasCompletedRef.current) {
      hasCompletedRef.current = true;
      console.log('[ImmersiveAdPlayer] Ad completed. Notifying completion.');
      onAdCompleted?.();
    }
  };

  useEffect(() => {
    return () => {
      if (graceTimeoutRef.current) clearTimeout(graceTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    activeVideoSrcRef.current = activeVideoSrc;
    // A new clip arriving mid-break restarts the video from 0: refresh any pending
    // grace timer so a "never ended" fallback cannot cut the new clip short.
    if (graceTimeoutRef.current) {
      clearTimeout(graceTimeoutRef.current);
      graceTimeoutRef.current = setTimeout(() => {
        console.warn('[ImmersiveAdPlayer] Ad video never ended after source swap — completing with grace.');
        triggerCompleted();
      }, 12000);
    }
  }, [activeVideoSrc]);

  useEffect(() => {
    setAdSeconds(ad.duration || 15);
    const start = performance.now();
    const total = ad.duration || 15;
    const timer = setInterval(() => {
      const elapsed = Math.floor((performance.now() - start) / 1000);
      const remaining = Math.max(0, total - elapsed);
      setAdSeconds(prev => Math.min(prev, remaining));
      if (remaining <= 0) {
        clearInterval(timer);
        const video = videoRef.current;
        const hasVideo = Boolean(activeVideoSrcRef.current);
        // NEVER cut an ad video short: completion waits for the video's 'ended'
        // event. Image-only ads (no video element) complete on the countdown.
        if (!hasVideo || (video && video.ended)) {
          triggerCompleted();
        } else if (!graceTimeoutRef.current) {
          // Safety net: stalled/broken media that never fires 'ended'.
          graceTimeoutRef.current = setTimeout(() => {
            console.warn('[ImmersiveAdPlayer] Ad countdown finished but video never ended — completing with grace.');
            triggerCompleted();
          }, 12000);
        }
      }
    }, 250);

    return () => clearInterval(timer);
  }, [ad.id, ad.duration]);

  // Auto-play video on mount and whenever the source changes (e.g. fal.ai clip arrives).
  // Ads are NOT muted: attempt sound-first playback, and only fall back to muted when
  // the browser blocks autoplay-with-sound (no user gesture yet).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.load();          // Force reload when src changes
    video.currentTime = 0;
    video.muted = false;
    setIsMuted(false);

    const playPromise = video.play();
    if (playPromise) {
      playPromise.then(() => {
        setIsMuted(false);
      }).catch(() => {
        // Autoplay with sound blocked — retry muted so the ad still plays
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {
          // Handled by muted autoplay
        });
      });
    }
    audioCues.playVoteConfirm();
  }, [ad.id, activeVideoSrc]);

  const handleCtaClick = async () => {
    audioCues.playClick();
    setHasInteracted(true);

    // Track click interaction via API
    try {
      await fetch('/api/cinema/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track_interaction',
          adId: ad.id,
          metric: 'click'
        })
      });
    } catch {
      // Non-blocking
    }

    if (ad.ctaUrl) {
      window.open(ad.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const progressPercent = Math.max(0, Math.min(100, (timeRemaining / (ad.duration || 10)) * 100));

  return (
    <div className="absolute inset-0 z-40 bg-[#030407] overflow-hidden select-none">
      {/* Background Media / Video */}
      {activeVideoSrc ? (
        <video
          ref={videoRef}
          src={activeVideoSrc}
          autoPlay
          loop={false}
          muted={isMuted}
          playsInline
          onEnded={triggerCompleted}
          className="w-full h-full object-cover object-center filter brightness-[0.85] contrast-[1.1]"
        />
      ) : ad.imageUrl ? (
        <img
          src={ad.imageUrl}
          alt={ad.brandName}
          className="w-full h-full object-cover object-center filter brightness-[0.85] contrast-[1.1]"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#0a0d18] via-[#05060a] to-[#12081f]" />
      )}

      {/* Cybernetic Scanlines & CRT Distortion Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.07] mix-blend-screen"
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%)',
          backgroundSize: '100% 4px'
        }}
      />
      
      {/* Radial Vignette & Chromatic Ambient Glow */}
      <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/90 pointer-events-none" />

      {/* AI-Generated badge or Archive Replay badge */}
      {isCinematicAd && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 bg-cyan-500/15 border border-cyan-400/30 px-3 py-1 rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.2)]">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-300 uppercase">
            {ad.isArchiveReplay ? 'Holo-Archive Ad Replay' : 'AI Cinematic Ad'}
          </span>
        </div>
      )}

      {/* Top HUD: Commercial Break Badge & Countdown */}
      <div className="absolute top-3 left-3 right-3 md:top-6 md:left-6 md:right-6 flex items-center justify-between z-50">
        <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
          <div className="flex items-center space-x-1.5 md:space-x-2 bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 md:px-3.5 md:py-1.5 rounded-full backdrop-blur-xl shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span className="text-[9px] md:text-[11px] font-mono font-bold tracking-widest text-amber-300 uppercase flex items-center gap-1 md:gap-1.5 truncate">
              <Radio className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" /> SPONSORED HOLO-BROADCAST
            </span>
          </div>

          <span className="hidden sm:inline-block text-[11px] font-mono text-neutral-400 bg-black/60 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
            IMMERSIVE COMMERCIAL BREAK
          </span>
        </div>

        {/* Right side: Countdown Timer & Audio Toggle */}
        <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
          {/* Circular Countdown Badge */}
          <div className="flex items-center space-x-1.5 md:space-x-2 bg-neutral-900/90 border border-white/15 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full backdrop-blur-md font-mono text-[10px] md:text-xs text-neutral-200 shadow-xl">
            <span className="text-neutral-400">RESUMES IN</span>
            <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold flex items-center justify-center text-[10px] md:text-xs">
              {adSeconds}s
            </span>
          </div>

          {/* Mute toggle for video */}
          {activeVideoSrc && (
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !videoRef.current.muted;
                  setIsMuted(videoRef.current.muted);
                  audioCues.playClick();
                }
              }}
              className="p-2 rounded-full bg-black/60 hover:bg-neutral-800 text-neutral-200 border border-white/15 backdrop-blur-md transition-all hover:scale-105"
              title={isMuted ? "Unmute Commercial" : "Mute Commercial"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-neutral-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Floating Minicard: Absolute Bottom-Left */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-5 left-4 sm:bottom-6 sm:left-6 z-50 w-[min(90vw,20rem)] sm:w-80 md:w-84 p-3 sm:p-3.5 rounded-2xl bg-neutral-950/90 border border-white/15 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col space-y-2 pointer-events-auto"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
          <div className="flex items-center space-x-1.5 min-w-0">
            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)] shrink-0" />
            <h4 className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase truncate">
              {ad.brandName}
            </h4>
          </div>

          <div className="flex items-center space-x-1 text-[9px] font-mono text-neutral-400 uppercase tracking-wider shrink-0">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>Sponsor</span>
          </div>
        </div>

        {/* Title */}
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-black text-white tracking-tight leading-snug line-clamp-2">
            {ad.title}
          </h2>
        </div>

        {/* Description */}
        {(ad.description || ad.tagline) && (
          <p className="text-[11px] text-neutral-300 font-sans leading-relaxed line-clamp-2">
            {ad.description || ad.tagline}
          </p>
        )}

        {/* Interactive Call to Action (CTA) */}
        <div className="pt-0.5 flex items-center gap-2">
          <button
            onClick={handleCtaClick}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-mono font-bold text-[10px] uppercase tracking-widest flex items-center justify-center space-x-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(245,158,11,0.4)]"
          >
            <Sparkles className="w-3 h-3 text-black shrink-0" />
            <span className="truncate">{ad.ctaText || 'Access Sponsor Terminal'}</span>
            <ExternalLink className="w-3 h-3 text-black ml-1 shrink-0" />
          </button>

          {hasInteracted && (
            <span className="text-[10px] font-mono text-green-400 font-semibold animate-pulse whitespace-nowrap shrink-0">
              ✓ Activated!
            </span>
          )}
        </div>

        {onOpenBuyAds && (
          <button
            type="button"
            onClick={() => {
              audioCues.playClick();
              onOpenBuyAds();
            }}
            className="text-[9px] font-mono text-neutral-400 hover:text-amber-300 underline underline-offset-4 transition-colors text-center w-full pt-0.5"
          >
            Want your brand here? Buy Ad Showcase
          </button>
        )}
      </motion.div>

      {/* Bottom Progress Bar for Ad with Initial-to-Final State Animation */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-neutral-950">
        <div 
          key={`ad_prog_${ad.id}`}
          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]"
          style={{ animation: `ad-countdown ${ad.duration || 15}s linear forwards` }}
        />
      </div>
    </div>
  );
};
