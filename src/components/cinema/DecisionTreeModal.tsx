'use client';

import React, { useState } from 'react';
import { MovieStep } from '@/types/cinema';
import { X, GitCommit, Dices, ChevronDown, ChevronUp, Eye, Video, Volume2, Link as LinkIcon, Box } from 'lucide-react';
import { audioCues } from '@/lib/audio-cues';

interface DecisionTreeModalProps {
  steps: MovieStep[];
  currentStep: number;
  isOpen: boolean;
  onClose: () => void;
}

export const DecisionTreeModal: React.FC<DecisionTreeModalProps> = ({
  steps,
  currentStep,
  isOpen,
  onClose
}) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      <div className="bg-[#0a0b10] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide uppercase">
                Árbol de Decisiones & Referencias de Video
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Ramas narrativas, referencias de video anterior y props enviados a MiniMax H3-Max (480p 16:9)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Timeline Feed */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 scrollbar-thin scrollbar-thumb-neutral-800">
          {steps.map((step) => {
            const isExpanded = expandedStep === step.stepNumber;
            const chosenOption = step.selectedOption;
            const isCurrent = step.stepNumber === currentStep;

            return (
              <div
                key={step.stepNumber}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent 
                    ? 'bg-neutral-900/90 border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                    : 'bg-neutral-900/40 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-lg bg-neutral-800 border border-white/10 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center">
                      #{step.stepNumber}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {step.title}
                        {isCurrent && (
                          <span className="text-[10px] font-mono text-red-400 bg-red-950/60 border border-red-500/30 px-2 py-0.2 rounded-full uppercase tracking-wider">
                            En Reproducción
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-neutral-400 line-clamp-1">{step.synopsis}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {chosenOption ? (
                      <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1 ${
                        chosenOption === 'A' 
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {step.wasRandomPick && <Dices className="w-3.5 h-3.5 text-amber-400" />}
                        Ganó Opción {chosenOption} {step.wasRandomPick ? '(Azar)' : ''}
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-neutral-500 bg-neutral-800 px-2.5 py-1 rounded">
                        Votando ahora...
                      </span>
                    )}

                    <button
                      onClick={() => {
                        audioCues.playClick();
                        setExpandedStep(isExpanded ? null : step.stepNumber);
                      }}
                      className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details: Branching Options & Prompts */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-in fade-in duration-200">
                    {/* References Badges */}
                    <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                      {step.referenceVideoUrl && (
                        <div className="flex items-center gap-1.5 bg-blue-950/40 border border-blue-500/30 text-blue-300 px-2.5 py-1 rounded-md">
                          <LinkIcon className="w-3 h-3 text-blue-400" />
                          <span>Video anterior referenciado</span>
                        </div>
                      )}

                      {step.propReferenceImages && step.propReferenceImages.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-md">
                          <Box className="w-3 h-3 text-amber-400" />
                          <span>{step.propReferenceImages.length} props referenciados</span>
                        </div>
                      )}

                      {step.voiceDirection && (
                        <div className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 px-2.5 py-1 rounded-md">
                          <Volume2 className="w-3 h-3 text-cyan-400" />
                          <span>Consistencia de voz activa</span>
                        </div>
                      )}
                    </div>

                    {/* Branching options comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {step.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-lg border ${
                            chosenOption === opt.id
                              ? 'bg-cyan-950/40 border-cyan-500/40'
                              : 'bg-black/30 border-white/5 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono font-bold mb-1">
                            <span className={opt.id === 'A' ? 'text-cyan-400' : 'text-amber-400'}>
                              Opción {opt.id}: {opt.title}
                            </span>
                            <span className="text-neutral-400">{opt.votes} votos</span>
                          </div>
                          <p className="text-neutral-300 mb-1">{opt.text}</p>
                          <span className="text-[10px] text-neutral-400 italic block">
                            Efecto: {opt.expectedConsequence}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Prompts Inspection */}
                    <div className="p-3.5 rounded-lg bg-black/40 border border-white/5 space-y-2.5 text-xs font-mono">
                      <div>
                        <span className="text-cyan-400 font-bold flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Prompt de Consistencia Visual (MiniMax H3-Max 480p 16:9):
                        </span>
                        <p className="text-neutral-300 text-[11px] mt-0.5">{step.visualPrompt}</p>
                      </div>

                      {step.voiceDirection && (
                        <div>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Volume2 className="w-3.5 h-3.5" /> Directiva de Voz & Audio:
                          </span>
                          <p className="text-neutral-300 text-[11px] mt-0.5 italic">{step.voiceDirection}</p>
                        </div>
                      )}

                      <div>
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Video className="w-3.5 h-3.5" /> Prompt de Movimiento de Cámara:
                        </span>
                        <p className="text-neutral-300 text-[11px] mt-0.5">{step.cameraMotionPrompt}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
