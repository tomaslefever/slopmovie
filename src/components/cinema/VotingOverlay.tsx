'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DecisionOption, PlaybackPhase } from '@/types/cinema';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Dices, Sparkles, Timer, Trophy, Flame, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioCues } from '@/lib/audio-cues';

interface VotingOverlayProps {
  isVisible: boolean;
  phase?: PlaybackPhase;
  timeRemaining: number;
  options: [DecisionOption, DecisionOption];
  votesA: number;
  votesB: number;
  userVoted: 'A' | 'B' | null;
  selectedOption?: 'A' | 'B' | null;
  wasRandomPick?: boolean;
  onVote: (optionId: 'A' | 'B') => void;
  onVotingEnded?: () => void;
}

export const VotingOverlay: React.FC<VotingOverlayProps> = ({
  isVisible,
  phase = 'VOTING',
  timeRemaining,
  options,
  votesA,
  votesB,
  userVoted,
  selectedOption,
  wasRandomPick = false,
  onVote
}) => {
  // Exact 10s countdown from client timeRemaining prop without any database lookups
  const currentSeconds = Math.max(0, Math.min(10, timeRemaining));
  const isVotingEnded = phase === 'GENERATING' || currentSeconds <= 0;
  const totalVotes = votesA + votesB;
  const percentA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
  const percentB = totalVotes > 0 ? Math.round((votesB / totalVotes) * 100) : 50;

  // Resolve winner
  const winnerId: 'A' | 'B' = selectedOption || (
    votesA > votesB ? 'A' : (
      votesB > votesA ? 'B' : (
        options[0].votes >= options[1].votes ? 'A' : 'B'
      )
    )
  );
  const winnerOption = winnerId === 'A' ? options[0] : options[1];
  const winnerPercent = winnerId === 'A' ? percentA : percentB;
  const winnerVotes = winnerId === 'A' ? votesA : votesB;

  const handleCastVote = useCallback((optionId: 'A' | 'B') => {
    if (isVotingEnded) return;
    if (userVoted === optionId) return;

    audioCues.playVoteCast();
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.8, x: optionId === 'A' ? 0.35 : 0.65 },
      colors: optionId === 'A' ? ['#00f0ff', '#0070f3'] : ['#ff0055', '#ffaa00']
    });

    onVote(optionId);
  }, [isVotingEnded, userVoted, onVote]);

  // Keyboard shortcut listeners (1 and 2)
  useEffect(() => {
    if (!isVisible || isVotingEnded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' || e.key === 'a' || e.key === 'A') {
        handleCastVote('A');
      } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
        handleCastVote('B');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isVotingEnded, handleCastVote]);

  // Play alert chime ONCE when voting opens
  const hasAlertPlayedRef = useRef(false);
  useEffect(() => {
    if (isVisible && phase === 'VOTING' && !isVotingEnded) {
      if (!hasAlertPlayedRef.current) {
        hasAlertPlayedRef.current = true;
        audioCues.playVotingAlert();
      }
    } else {
      hasAlertPlayedRef.current = false;
    }
  }, [isVisible, phase, isVotingEnded]);

  // Cinematic tension music lifecycle during voting: exactly one instance per round
  const hasMusicStartedRef = useRef(false);
  useEffect(() => {
    if (isVisible && phase === 'VOTING' && !isVotingEnded) {
      if (!hasMusicStartedRef.current) {
        hasMusicStartedRef.current = true;
        audioCues.startTensionMusic();
      }
    } else {
      hasMusicStartedRef.current = false;
      audioCues.stopTensionMusic();
    }

    return () => {
      hasMusicStartedRef.current = false;
      audioCues.stopTensionMusic();
    };
  }, [isVisible, phase, isVotingEnded]);

  // Celebrate winner when voting closes
  const hasCelebratedRef = useRef(false);
  useEffect(() => {
    if (isVisible && isVotingEnded && !hasCelebratedRef.current) {
      hasCelebratedRef.current = true;
      audioCues.playWinnerReveal();
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.5, x: 0.5 },
        colors: winnerId === 'A' ? ['#00f0ff', '#0070f3', '#ffffff'] : ['#ffaa00', '#ff0055', '#ffffff']
      });
    } else if (!isVotingEnded) {
      hasCelebratedRef.current = false;
    }
  }, [isVisible, isVotingEnded, winnerId]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35 }}
        className="absolute inset-0 z-40 bg-black/75 md:bg-black/65 md:backdrop-blur-[6px] flex flex-col items-center justify-center p-3 md:p-6 overflow-y-auto"
      >
        <AnimatePresence mode="wait">
          {!isVotingEnded ? (
            /* ACTIVE VOTING VIEW */
            <motion.div
              key="active-voting-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col items-center"
            >
              {/* Glowing Top Countdown Header */}
              <div className="flex flex-col items-center mb-3 md:mb-8 text-center">
                <div className="relative flex items-center justify-center mb-2 md:mb-3">
                  {/* Pulsing Timer Circle */}
                  <svg className="w-20 h-20 md:w-24 md:h-24 transform -rotate-90" viewBox="0 0 96 96">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="4"
                      fill="transparent"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke={currentSeconds <= 3 ? "#ef4444" : "#00f0ff"}
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 * (1 - Math.min(1, Math.max(0, currentSeconds / 10)))}
                      className="drop-shadow-[0_0_12px_rgba(0,240,255,0.8)] transition-[stroke-dashoffset] duration-200"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl md:text-3xl font-black font-mono tracking-tighter ${
                      currentSeconds <= 3 ? "text-red-500 animate-pulse" : "text-white"
                    }`}>
                      {currentSeconds}
                    </span>
                    <span className="text-[9px] md:text-[10px] text-neutral-400 font-mono uppercase tracking-widest">
                      SEC
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Timer className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-400" />
                  <h2 className="text-lg md:text-2xl font-black uppercase tracking-widest text-white">
                    Audience Vote
                  </h2>
                  <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400" />
                </div>
                <p className="hidden md:block text-xs text-neutral-400 mt-1 max-w-md">
                  Choose the next story continuation. Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-white font-mono">1</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-white font-mono">2</kbd> to vote instantly.
                </p>
              </div>

              {/* 2 Options Cards Grid */}
              <div className="grid grid-cols-2 gap-2 md:gap-6 w-full max-w-4xl">
                {/* OPTION A */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCastVote('A')}
                  className={`relative p-3 md:p-4 rounded-2xl cursor-pointer border transition-all duration-300 overflow-hidden group ${
                    userVoted === 'A'
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.3)]'
                      : 'bg-neutral-900/60 hover:bg-neutral-900/80 border-white/10 hover:border-cyan-500/50'
                  }`}
                >
                  {/* Top Tag & Hotkey */}
                  <div className="flex items-center justify-between mb-1.5 md:mb-3">
                    <div className="flex items-center space-x-1.5 md:space-x-2 min-w-0">
                      <span className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 font-black flex items-center justify-center text-xs md:text-sm shadow-[0_0_10px_rgba(0,240,255,0.4)] shrink-0">
                        A
                      </span>
                      <span className="text-[9px] md:text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest truncate">
                        OPTION A
                      </span>
                    </div>
                    <span className="hidden md:inline-block text-[11px] font-mono text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-white/5">
                      Key [1]
                    </span>
                  </div>

                  <h3 className="text-sm md:text-base font-bold text-white mb-1 md:mb-2 group-hover:text-cyan-300 transition-colors">
                    {options[0].title}
                  </h3>

                  <p className="text-[10px] md:text-xs text-neutral-300 mb-2 md:mb-4 leading-relaxed line-clamp-2 md:line-clamp-3">
                    {options[0].text}
                  </p>

                  {options[0].dramaticHook && (
                    <div className="text-[9px] md:text-[11px] text-cyan-400/90 font-mono bg-cyan-950/50 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-cyan-800/40 mb-2 md:mb-4 line-clamp-2 md:line-clamp-none">
                      ⚡ {options[0].dramaticHook}
                    </div>
                  )}

                  {/* Percentage Bar & Votes */}
                  <div className="space-y-1 md:space-y-1.5 pt-1.5 md:pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] md:text-xs font-mono">
                      <span className="text-neutral-400">{votesA} votes</span>
                      <span className="font-bold text-cyan-400">{percentA}%</span>
                    </div>
                    <div className="w-full h-1.5 md:h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentA}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
                      />
                    </div>
                  </div>

                  {userVoted === 'A' && (
                    <div className="absolute top-2 right-2 md:top-4 md:right-4 flex items-center space-x-1 text-[9px] md:text-xs text-cyan-400 font-bold bg-cyan-950/90 border border-cyan-400 px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-full">
                      <Check className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      <span>YOUR VOTE</span>
                    </div>
                  )}
                </motion.div>

                {/* OPTION B */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCastVote('B')}
                  className={`relative p-3 md:p-4 rounded-2xl cursor-pointer border transition-all duration-300 overflow-hidden group ${
                    userVoted === 'B'
                      ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)]'
                      : 'bg-neutral-900/60 hover:bg-neutral-900/80 border-white/10 hover:border-amber-500/50'
                  }`}
                >
                  {/* Top Tag & Hotkey */}
                  <div className="flex items-center justify-between mb-1.5 md:mb-3">
                    <div className="flex items-center space-x-1.5 md:space-x-2 min-w-0">
                      <span className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-400 font-black flex items-center justify-center text-xs md:text-sm shadow-[0_0_10px_rgba(251,191,36,0.4)] shrink-0">
                        B
                      </span>
                      <span className="text-[9px] md:text-xs font-mono font-bold text-amber-400 uppercase tracking-widest truncate">
                        OPTION B
                      </span>
                    </div>
                    <span className="hidden md:inline-block text-[11px] font-mono text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-white/5">
                      Key [2]
                    </span>
                  </div>

                  <h3 className="text-sm md:text-base font-bold text-white mb-1 md:mb-2 group-hover:text-amber-300 transition-colors">
                    {options[1].title}
                  </h3>

                  <p className="text-[10px] md:text-xs text-neutral-300 mb-2 md:mb-4 leading-relaxed line-clamp-2 md:line-clamp-3">
                    {options[1].text}
                  </p>

                  {options[1].dramaticHook && (
                    <div className="text-[9px] md:text-[11px] text-amber-400/90 font-mono bg-amber-950/50 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-amber-800/40 mb-2 md:mb-4 line-clamp-2 md:line-clamp-none">
                      🔥 {options[1].dramaticHook}
                    </div>
                  )}

                  {/* Percentage Bar & Votes */}
                  <div className="space-y-1 md:space-y-1.5 pt-1.5 md:pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] md:text-xs font-mono">
                      <span className="text-neutral-400">{votesB} votes</span>
                      <span className="font-bold text-amber-400">{percentB}%</span>
                    </div>
                    <div className="w-full h-1.5 md:h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentB}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                      />
                    </div>
                  </div>

                  {userVoted === 'B' && (
                    <div className="absolute top-2 right-2 md:top-4 md:right-4 flex items-center space-x-1 text-[9px] md:text-xs text-amber-400 font-bold bg-amber-950/90 border border-amber-400 px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-full">
                      <Check className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      <span>YOUR VOTE</span>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Tie-breaker Rule Footer */}
              <div className="flex items-center space-x-2 mt-3 md:mt-6 text-[10px] md:text-xs text-neutral-400 font-mono bg-neutral-900/60 border border-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-full">
                <Dices className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-400 shrink-0" />
                <span>In the event of a tie or zero votes, the system automatically picks at random.</span>
              </div>
            </motion.div>
          ) : (
            /* VOTING ENDED: SELECTED OPTION CENTERED UNTIL NEXT CLIP STARTS */
            <motion.div
              key="selected-option-centered-view"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl flex flex-col items-center text-center my-auto"
            >
              {/* Header Status Badge */}
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 via-amber-500/20 to-cyan-500/20 border border-white/15 backdrop-blur-md mb-3 shadow-[0_0_25px_rgba(0,240,255,0.25)]">
                {wasRandomPick ? (
                  <>
                    <Dices className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-300">
                      Random Tie-Breaker • Fate Decision
                    </span>
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-bold tracking-widest uppercase text-cyan-300">
                      Audience Final Decision
                    </span>
                  </>
                )}
              </div>

              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white mb-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                Selected Option
              </h2>
              <p className="text-xs text-neutral-300 max-w-md font-mono mb-6">
                The story will proceed down this narrative branch. The next scene is being synthesized.
              </p>

              {/* The Hero Centered Card */}
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className={`relative w-full p-6 md:p-8 rounded-3xl border backdrop-blur-2xl text-left overflow-hidden shadow-2xl transition-all duration-500 ${
                  winnerId === 'A'
                    ? 'bg-gradient-to-b from-cyan-950/70 via-neutral-900/90 to-black/95 border-cyan-400 shadow-[0_0_50px_rgba(0,240,255,0.35)]'
                    : 'bg-gradient-to-b from-amber-950/70 via-neutral-900/90 to-black/95 border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.35)]'
                }`}
              >
                {/* Background Ambient Spotlight */}
                <div 
                  className={`absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl pointer-events-none opacity-40 ${
                    winnerId === 'A' ? 'bg-cyan-500' : 'bg-amber-500'
                  }`}
                />

                {/* Card Top Meta */}
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center space-x-3">
                    <span className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-base border shadow-lg ${
                      winnerId === 'A'
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.5)]'
                        : 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                    }`}>
                      {winnerId}
                    </span>
                    <div>
                      <span className={`text-xs font-mono font-bold uppercase tracking-widest block ${
                        winnerId === 'A' ? 'text-cyan-400' : 'text-amber-400'
                      }`}>
                        WINNING OPTION {winnerId}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {winnerPercent}% of votes ({winnerVotes} {winnerVotes === 1 ? 'vote' : 'votes'})
                      </span>
                    </div>
                  </div>

                  {/* User Vote Status Pill */}
                  {userVoted === winnerId ? (
                    <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-400 text-emerald-300 text-xs font-mono font-semibold shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>YOUR VOTE WON!</span>
                    </div>
                  ) : userVoted ? (
                    <div className="px-3 py-1 rounded-full bg-neutral-800/80 border border-white/10 text-neutral-300 text-xs font-mono">
                      You voted Option {userVoted}
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-full bg-neutral-800/80 border border-white/10 text-neutral-300 text-xs font-mono">
                      Audience choice
                    </div>
                  )}
                </div>

                {/* Option Title */}
                <h3 className="text-xl md:text-2xl font-black text-white mb-3 tracking-wide leading-snug relative z-10">
                  {winnerOption.title}
                </h3>

                {/* Option Narrative Body */}
                <p className="text-sm text-neutral-200 leading-relaxed mb-5 relative z-10">
                  {winnerOption.text}
                </p>

                {/* Dramatic Hook Pill */}
                {winnerOption.dramaticHook && (
                  <div className={`text-xs font-mono px-3.5 py-2 rounded-xl border mb-5 flex items-center space-x-2 relative z-10 ${
                    winnerId === 'A'
                      ? 'text-cyan-300 bg-cyan-950/60 border-cyan-800/60 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      : 'text-amber-300 bg-amber-950/60 border-amber-800/60 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                  }`}>
                    {winnerId === 'A' ? (
                      <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                    ) : (
                      <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="font-semibold">{winnerOption.dramaticHook}</span>
                  </div>
                )}

                {/* Full-width Winning Percentage Bar */}
                <div className="space-y-1.5 pt-3 border-t border-white/10 relative z-10">
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                    <span>Audience Consensus</span>
                    <span className={`font-bold ${winnerId === 'A' ? 'text-cyan-400' : 'text-amber-400'}`}>
                      {winnerPercent}% ({winnerVotes}/{totalVotes || 1})
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${winnerPercent}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        winnerId === 'A'
                          ? 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                          : 'bg-gradient-to-r from-amber-600 to-amber-400'
                      }`}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Kinetic Synthesis Continuity Indicator Beneath the Centered Card */}
              <div className="w-full mt-6 flex flex-col items-center space-y-2.5">
                <div className="flex items-center space-x-2.5 text-xs font-mono text-neutral-300">
                  <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <span className="tracking-wider uppercase font-semibold text-cyan-300">
                    Synthesizing Scene Continuation...
                  </span>
                </div>

                {/* Animated Pulsing Continuity Track */}
                <div className="w-full max-w-sm h-1.5 bg-neutral-900 rounded-full overflow-hidden relative border border-white/10">
                  <motion.div
                    className="absolute inset-y-0 bg-gradient-to-r from-cyan-500 via-sky-300 to-amber-400 rounded-full shadow-[0_0_10px_rgba(0,240,255,0.8)]"
                    animate={{
                      x: ['-100%', '200%']
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.6,
                      ease: "easeInOut"
                    }}
                    style={{ width: '45%' }}
                  />
                </div>

                <p className="text-[11px] text-neutral-400 font-mono">
                  fal.ai MiniMax H3-Max generating 15s clip • Begins automatically
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
