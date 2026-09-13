'use client';

import React, { useState } from 'react';
import { Sparkles, Film, X, Loader2 } from 'lucide-react';
import { audioCues } from '@/lib/audio-cues';

interface NewMovieDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStartNewMovie: (prompt?: string) => Promise<void>;
}

export const NewMovieDialog: React.FC<NewMovieDialogProps> = ({
  isOpen,
  onClose,
  onStartNewMovie
}) => {
  const [promptText, setPromptText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleStart = async (useCustom: boolean) => {
    setIsLoading(true);
    audioCues.playClick();
    try {
      await onStartNewMovie(useCustom && promptText.trim() ? promptText.trim() : undefined);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#0c0d14] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                New Interactive Film (50 Steps)
              </h3>
              <p className="text-xs text-neutral-400">
                DeepSeek will generate the storyline, art bible, and premiere scene
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Premise Input */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-neutral-300 uppercase tracking-wider block">
            Premise or Worldbuilding (Optional):
          </label>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. A cybernetic detective and a rogue android discover an alien beacon on a Saturn mining outpost..."
            rows={3}
            className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => handleStart(Boolean(promptText.trim()))}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-black font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>DeepSeek Generating Story & Bible...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {promptText.trim() ? "Generate with this Premise" : "Generate Automatic Story with DeepSeek"}
                </span>
              </>
            )}
          </button>

          <p className="text-[11px] text-neutral-500 text-center font-mono">
            The film features 50 sequential 15s clips with live 10s branching votes.
          </p>
        </div>
      </div>
    </div>
  );
};
