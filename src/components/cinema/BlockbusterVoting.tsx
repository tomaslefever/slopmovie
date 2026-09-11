'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BlockbusterCandidate, PlaybackPhase } from '@/types/cinema';
import { motion } from 'framer-motion';
import { Clapperboard, Timer, Trophy, Radio, Check, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioCues } from '@/lib/audio-cues';

interface BlockbusterVotingProps {
  candidates: BlockbusterCandidate[];
  counts: Record<'A' | 'B' | 'C' | 'D', number>;
  timeRemaining: number;
  userVoted: 'A' | 'B' | 'C' | 'D' | null;
  phase?: PlaybackPhase;
  winner?: { id?: 'A' | 'B' | 'C' | 'D'; title: string; logline?: string; genre?: string } | null;
  onVote: (candidateId: 'A' | 'B' | 'C' | 'D') => void;
}

const GENRE_COLORS = [
  'text-cyan-300 bg-cyan-500/10 border-cyan-400/30',
  'text-amber-300 bg-amber-500/10 border-amber-400/30',
  'text-purple-300 bg-purple-500/10 border-purple-400/30',
  'text-emerald-300 bg-emerald-500/10 border-emerald-400/30'
];

export const BlockbusterVoting: React.FC<BlockbusterVotingProps> = ({
  candidates,
  counts,
  timeRemaining,
  userVoted,
  phase = 'BLOCKBUSTER_VOTING',
  winner,
  onVote
}) => {
  const currentSeconds = phase === 'GENERATING' ? 0 : Math.max(0, Math.min(60, timeRemaining));
  const isTimeExpired = currentSeconds <= 0;
  const isAuthoritativeWinnerReady = Boolean(winner?.id || winner?.title);
  const isVotingEnded = phase === 'GENERATING' || isAuthoritativeWinnerReady;
  const isInteractionDisabled = isTimeExpired || isVotingEnded;

  const safeCounts: Record<'A' | 'B' | 'C' | 'D', number> = {
    A: Number(counts?.A) || 0,
    B: Number(counts?.B) || 0,
    C: Number(counts?.C) || 0,
    D: Number(counts?.D) || 0,
  };
  const totalVotes = safeCounts.A + safeCounts.B + safeCounts.C + safeCounts.D;

  // Resolve winner candidate strictly from authoritative winner
  const winningId: 'A' | 'B' | 'C' | 'D' | null = winner?.id || null;
  const winningCandidate = (winningId ? candidates.find(c => c.id === winningId) : null) || candidates[0];

  // Stage transition: when authoritative winner arrives, show results for 1.4s, then animate zoom-out for losers and zoom-in for winner
  const [isZoomTransitionActive, setIsZoomTransitionActive] = useState(false);
  useEffect(() => {
    if (isAuthoritativeWinnerReady) {
      const timer = setTimeout(() => {
        setIsZoomTransitionActive(true);
      }, 1400);
      return () => clearTimeout(timer);
    } else {
      setIsZoomTransitionActive(false);
    }
  }, [isAuthoritativeWinnerReady]);

  const handleCastVote = (candidateId: 'A' | 'B' | 'C' | 'D') => {
    if (isVotingEnded || userVoted === candidateId) return;
    audioCues.playVoteCast();
    confetti({
      particleCount: 30,
      spread: 55,
      origin: { y: 0.7, x: 0.5 },
      colors: ['#00f0ff', '#f5a623', '#a855f7', '#10b981']
    });
    onVote(candidateId);
  };

  // Alert chime once when the blockbuster vote opens
  const hasAlertPlayedRef = useRef(false);
  useEffect(() => {
    if (!isVotingEnded && !hasAlertPlayedRef.current) {
      hasAlertPlayedRef.current = true;
      audioCues.playVotingAlert();
    }
  }, [isVotingEnded]);

  // Winner celebration sound & confetti when voting concludes
  const hasCelebratedRef = useRef(false);
  useEffect(() => {
    if (isVotingEnded && !hasCelebratedRef.current) {
      hasCelebratedRef.current = true;
      audioCues.playWinnerReveal();
      confetti({
        particleCount: 80,
        spread: 85,
        origin: { y: 0.45, x: 0.5 },
        colors: ['#a855f7', '#ec4899', '#3b82f6', '#ffd700']
      });
    } else if (!isVotingEnded) {
      hasCelebratedRef.current = false;
    }
  }, [isVotingEnded]);

  // Keyboard shortcuts 1-4 (only active during voting)
  useEffect(() => {
    if (isVotingEnded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const map: Record<string, 'A' | 'B' | 'C' | 'D'> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
      const target = map[e.key];
      if (target && candidates.some(c => c.id === target) && userVoted !== target) {
        audioCues.playVoteCast();
        onVote(target);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [candidates, userVoted, onVote, isVotingEnded]);

  return (
    <div className="absolute inset-0 z-40 bg-[#030407]/95 md:backdrop-blur-md flex flex-col overflow-hidden select-none">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-radial from-purple-500/10 via-transparent to-black pointer-events-none" />

      {/* Scrollable content (mobile scrolls, desktop centers) */}
      <div className="relative z-10 w-full h-full overflow-y-auto flex flex-col">
        <div className="m-auto w-full flex flex-col items-center px-3 md:px-4 py-4 md:py-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 text-center space-y-1.5 md:space-y-2 mb-3 md:mb-6"
          >
            <div className="flex items-center justify-center gap-2">
              <span className={`px-2.5 py-0.5 md:px-3 md:py-1 rounded-full border text-[9px] md:text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 transition-colors ${
                isVotingEnded
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  : 'bg-purple-500/20 border-purple-400/40 text-purple-300'
              }`}>
                {isVotingEnded ? (
                  <>
                    <Trophy className="w-3 h-3 text-amber-400" />
                    Audience Decision Locked
                  </>
                ) : (
                  <>
                    <Radio className="w-3 h-3 animate-pulse" />
                    Next Blockbuster Vote
                  </>
                )}
              </span>
            </div>

            <h2 className="text-base md:text-xl lg:text-3xl font-black text-white tracking-tight uppercase">
              {isVotingEnded ? (
                <>The Winning Film: <span className="text-purple-400">{winningCandidate?.title}</span></>
              ) : (
                <>The Next Film Is In <span className="text-purple-400">Your Hands</span></>
              )}
            </h2>

            <p className="text-[9px] md:text-[11px] text-neutral-400 font-mono uppercase tracking-widest">
              {isVotingEnded
                ? 'Audience vote concluded · Synthesizing screenplay and visuals'
                : '4 candidates · 60 seconds · secret ballot · majority rules'}
            </p>
          </motion.div>

          {/* Countdown or Status Badge */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 mb-3 md:mb-6 flex items-center gap-2 bg-neutral-900/90 border border-white/15 px-3 py-1 md:px-4 md:py-2 rounded-full backdrop-blur-md shadow-xl"
          >
            {isVotingEnded ? (
              <>
                <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400 animate-spin" />
                <span className="font-mono text-[11px] md:text-sm text-purple-300 font-bold tracking-wider">
                  PRE-PRODUCTION & SYNTHESIS
                </span>
              </>
            ) : (
              <>
                <Timer className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-400" />
                <span className="font-mono text-[11px] md:text-sm text-neutral-200">VOTE CLOSES IN</span>
                <span className={`font-mono font-black text-sm md:text-lg ${currentSeconds <= 10 ? 'text-red-400 animate-pulse' : 'text-purple-300'}`}>
                  {currentSeconds}s
                </span>
              </>
            )}
          </motion.div>

          {/* Candidates grid */}
          <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
            {candidates.map((candidate, idx) => {
              const votes = safeCounts[candidate.id] || 0;
              const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const isSelected = userVoted === candidate.id;
              const isWinner = candidate.id === winningId;

              // Animation states based on stage:
              // Active voting: normal layout
              // Results reveal: cards stay, counts appear
              // Zoom transition: losers zoom out & fade with blur, winner zooms in with glowing aura!
              const animationVariant = !isVotingEnded
                ? { scale: 1, opacity: 1, y: 0, filter: 'blur(0px)' }
                : !isZoomTransitionActive
                  ? { scale: isWinner ? 1.02 : 1, opacity: 1, y: 0, filter: 'blur(0px)' }
                  : isWinner
                    ? { scale: 1.08, opacity: 1, y: 0, filter: 'blur(0px)', zIndex: 20 }
                    : { scale: 0.65, opacity: 0, y: 35, filter: 'blur(10px)', pointerEvents: 'none' as const };

              return (
                <motion.div
                  key={candidate.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={animationVariant}
                  transition={{
                    duration: isZoomTransitionActive ? 0.85 : 0.35,
                    delay: isVotingEnded ? (isWinner ? 0 : 0.05) : 0.08 * idx,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  onClick={() => handleCastVote(candidate.id)}
                  className={`relative group text-left p-3 md:p-4 rounded-2xl border backdrop-blur-xl transition-all duration-500 flex flex-col gap-2 md:gap-3 ${
                    !isVotingEnded ? 'cursor-pointer' : ''
                  } ${
                    isVotingEnded && isWinner
                      ? 'bg-gradient-to-b from-purple-950/80 via-neutral-900/95 to-black/95 border-purple-400 shadow-[0_0_60px_rgba(168,85,247,0.5)] ring-2 ring-purple-400/60'
                      : isSelected
                        ? 'bg-purple-500/15 border-purple-400/70 shadow-[0_0_30px_rgba(168,85,247,0.35)] ring-1 ring-purple-400/50'
                        : 'bg-neutral-950/70 border-white/10 hover:border-purple-400/50 hover:bg-neutral-900/80'
                  }`}
                >
                  {/* Option letter + genre badge */}
                  <div className="flex items-start justify-between gap-2">
                    <span className={`w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs md:text-sm ${
                      isVotingEnded && isWinner
                        ? 'bg-purple-500 text-black shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                        : isSelected
                          ? 'bg-purple-500 text-black'
                          : 'bg-white/10 text-neutral-300'
                    }`}>
                      {candidate.id}
                    </span>
                    <span className={`text-[8px] md:text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 md:px-2 md:py-1 rounded-full border ${GENRE_COLORS[idx % GENRE_COLORS.length]}`}>
                      {candidate.genre}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs md:text-sm font-black text-white leading-snug group-hover:text-purple-200 transition-colors">
                      {candidate.title}
                    </h3>
                    <p className="text-[10px] md:text-[11px] text-neutral-400 leading-relaxed mt-1 md:mt-2 line-clamp-2 md:line-clamp-4">
                      {candidate.logline}
                    </p>
                  </div>

                  {/* Secret Ballot / Results Footer */}
                  <div className="pt-1.5 md:pt-2 border-t border-white/10 space-y-1.5 md:space-y-2">
                    {/* ONLY SHOW VOTE BARS AND NUMBERS WHEN VOTING HAS ENDED */}
                    {isVotingEnded ? (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-1.5"
                      >
                        <div className="h-1 md:h-1.5 rounded-full bg-black/60 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className={`h-full ${
                              isWinner
                                ? 'bg-gradient-to-r from-purple-500 via-fuchsia-400 to-amber-300 shadow-[0_0_10px_rgba(168,85,247,0.8)]'
                                : 'bg-neutral-600'
                            }`}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] md:text-[10px] font-mono text-neutral-300 flex items-center gap-1">
                            <Clapperboard className="w-3 h-3" /> {votes} {votes === 1 ? 'vote' : 'votes'}
                            <span className="font-bold text-purple-300">({percent}%)</span>
                            {isWinner && (
                              <span className="text-amber-300 font-bold flex items-center gap-0.5 ml-1">
                                <Trophy className="w-3 h-3" /> WINNER
                              </span>
                            )}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] md:text-[10px] font-mono font-bold text-emerald-300 flex items-center gap-1">
                              <Check className="w-3 h-3" /> {isWinner ? 'YOUR PICK WON!' : 'YOUR PICK'}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      /* ACTIVE VOTING: SECRET BALLOT (NO BARS, NO NUMBERS) */
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] md:text-[10px] font-mono text-neutral-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                          {isSelected ? 'Vote recorded • Secret ballot' : `Click or Press [${candidate.id}] to vote`}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] md:text-[10px] font-mono font-bold text-purple-300 flex items-center gap-1 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-400/40">
                            <Check className="w-3 h-3" /> YOUR PICK
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Underneath: Hint or AI Synthesis Continuity Track */}
          {isVotingEnded ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-full max-w-md mt-6 flex flex-col items-center space-y-2.5 text-center"
            >
              <div className="flex items-center space-x-2.5 text-xs font-mono text-purple-300">
                <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                <span className="tracking-wider uppercase font-bold">
                  Synthesizing Next Blockbuster Premiere...
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden relative border border-white/10">
                <motion.div
                  className="absolute inset-y-0 bg-gradient-to-r from-purple-600 via-fuchsia-400 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                  style={{ width: '45%' }}
                />
              </div>
              <p className="text-[11px] text-neutral-400 font-mono">
                DeepSeek screenplay & fal.ai MiniMax generating Scene 1 • Premiere begins automatically
              </p>
            </motion.div>
          ) : (
            <p className="relative z-10 mt-3 md:mt-5 text-[9px] md:text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              Press 1 · 2 · 3 · 4 to vote instantly
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
