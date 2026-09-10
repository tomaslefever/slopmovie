'use client';

import React, { useState } from 'react';
import { MovieBible } from '@/types/cinema';
import { X, User, Box, Compass, Sparkles, Copy, Check, Volume2, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { audioCues } from '@/lib/audio-cues';

interface CharacterBibleModalProps {
  bible: MovieBible;
  masterArcThread: string;
  initialPlot: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CharacterBibleModal: React.FC<CharacterBibleModalProps> = ({
  bible,
  masterArcThread,
  initialPlot,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'props' | 'environments' | 'plot'>('characters');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = () => {
    audioCues.playClick();
    const exportData = JSON.stringify({ initialPlot, masterArcThread, bible }, null, 2);
    navigator.clipboard.writeText(exportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      <div className="bg-[#0a0b10] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide uppercase">
                Biblia de Arte, Voces & Consistencia Visual
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Tokens de personajes, prompts vocales y props asociados para MiniMax H3-Max (480p 16:9)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={copyToClipboard}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-xs font-mono text-neutral-300 hover:text-white flex items-center space-x-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copiado" : "Copiar JSON"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-white/5 flex items-center space-x-6 bg-black/20 text-xs font-mono uppercase tracking-wider">
          <button
            onClick={() => { audioCues.playClick(); setActiveTab('characters'); }}
            className={`py-3 flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'characters'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Personajes & Voces ({bible.characters.length})</span>
          </button>

          <button
            onClick={() => { audioCues.playClick(); setActiveTab('props'); }}
            className={`py-3 flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'props'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Props de Personajes ({bible.props.length})</span>
          </button>

          <button
            onClick={() => { audioCues.playClick(); setActiveTab('environments'); }}
            className={`py-3 flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'environments'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Escenarios ({bible.environments.length})</span>
          </button>

          <button
            onClick={() => { audioCues.playClick(); setActiveTab('plot'); }}
            className={`py-3 flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'plot'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Hilo Conductor (50 Pasos)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 scrollbar-thin scrollbar-thumb-neutral-800">
          {/* CHARACTERS TAB WITH VOICE PROMPTS */}
          {activeTab === 'characters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bible.characters.map((char) => (
                <div 
                  key={char.id}
                  className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 space-y-3"
                >
                  <div className="flex items-center space-x-3">
                    <img 
                      src={char.avatarUrl || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=120"} 
                      alt={char.name}
                      className="w-12 h-12 rounded-xl object-cover border border-cyan-500/30"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white">{char.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                          {char.role}
                        </span>
                        {char.stepIntroduced && (
                          <span className="text-[10px] font-mono text-neutral-400">
                            Paso #{char.stepIntroduced}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-neutral-400 font-mono block text-[10px] uppercase">Rasgos Visuales (Inmutables):</span>
                      <p className="text-neutral-200">{char.visualTraits}</p>
                    </div>
                    <div>
                      <span className="text-neutral-400 font-mono block text-[10px] uppercase">Vestimenta / Atuendo:</span>
                      <p className="text-neutral-200">{char.clothing}</p>
                    </div>
                    {/* Consistent Voice Prompt */}
                    <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 space-y-1">
                      <div className="flex items-center space-x-1.5 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                        <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Prompt de Consistencia de Voz (Audio):</span>
                      </div>
                      <p className="text-neutral-200 text-[11px] italic leading-relaxed">
                        "{char.voicePrompt}"
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PROPS TAB (CREATED ONLY WHEN LLM INTEGRATES A NEW CHARACTER) */}
          {activeTab === 'props' && (
            <div className="space-y-4">
              {/* Notice Banner explaining consistency rule */}
              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-white/10 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2 text-neutral-300">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>
                    Los props se integran automáticamente por el LLM junto a cada nuevo personaje para garantizar continuidad física.
                  </span>
                </div>
                <span className="text-neutral-400 bg-neutral-800 px-2.5 py-1 rounded text-[11px]">
                  {bible.props.length} Props Registrados
                </span>
              </div>

              {/* Props Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bible.props.map((prop) => (
                  <div 
                    key={prop.id}
                    className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <Box className="w-5 h-5 text-amber-400" />
                          <div>
                            <h4 className="text-sm font-bold text-white">{prop.name}</h4>
                            {prop.ownerCharacterName && (
                              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20 block mt-0.5">
                                Prop de: {prop.ownerCharacterName}
                              </span>
                            )}
                          </div>
                        </div>

                        {prop.imageUrl && (
                          <img 
                            src={prop.imageUrl} 
                            alt={prop.name}
                            className="w-12 h-12 rounded-lg object-cover border border-amber-500/30"
                          />
                        )}
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-neutral-400 font-mono block text-[10px] uppercase">Apariencia Visual en IA:</span>
                          <p className="text-neutral-200">{prop.visualAppearance}</p>
                        </div>
                        <div>
                          <span className="text-neutral-400 font-mono block text-[10px] uppercase">Significado Narrativo:</span>
                          <p className="text-neutral-300">{prop.narrativeSignificance}</p>
                        </div>
                      </div>
                    </div>

                    {prop.imageUrl && (
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-cyan-400">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5" /> Referencia visual para MiniMax H3-Max
                        </span>
                        {prop.stepIntroduced && (
                          <span className="text-neutral-400 text-[10px]">
                            Paso #{prop.stepIntroduced}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ENVIRONMENTS TAB */}
          {activeTab === 'environments' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bible.environments.map((env) => (
                <div 
                  key={env.id}
                  className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 space-y-3"
                >
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    {env.name}
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-neutral-400 font-mono block text-[10px] uppercase">Iluminación & Lente:</span>
                      <p className="text-neutral-200">{env.lighting}</p>
                    </div>
                    <div>
                      <span className="text-neutral-400 font-mono block text-[10px] uppercase">Atmósfera:</span>
                      <p className="text-neutral-300">{env.atmosphere}</p>
                    </div>
                    <div>
                      <span className="text-neutral-400 font-mono block text-[10px] uppercase">Paleta Cromática:</span>
                      <code className="text-cyan-300 font-mono text-[11px]">{env.colorPalette}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PLOT TAB */}
          {activeTab === 'plot' && (
            <div className="space-y-6 text-sm">
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 space-y-2">
                <span className="text-xs font-mono uppercase text-cyan-400 font-bold block">
                  Argumento Inicial Creado por DeepSeek:
                </span>
                <p className="text-neutral-200 leading-relaxed">{initialPlot}</p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 space-y-2">
                <span className="text-xs font-mono uppercase text-amber-400 font-bold block">
                  Hilo Conductor de los 50 Pasos:
                </span>
                <p className="text-neutral-300 leading-relaxed">{masterArcThread}</p>
              </div>

              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-neutral-300 font-mono space-y-1">
                <span className="text-cyan-400 font-bold block uppercase">
                  Estilo de Rodaje Cinematográfico (MiniMax H3-Max 480p 16:9):
                </span>
                <p>{bible.cinematicStyle}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
