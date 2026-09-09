// Synthesized micro-sound effects and dynamic cinematic soundtrack using native Web Audio API
class AudioCueManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Dynamic Tension Music Engine
  private tensionGain: GainNode | null = null;
  private tensionNodes: { stop: () => void }[] = [];
  private tensionInterval: NodeJS.Timeout | null = null;
  private isTensionPlaying: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.tensionGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.tensionGain.gain.cancelScheduledValues(now);
      this.tensionGain.gain.setValueAtTime(this.isMuted ? 0.0001 : 0.28, now);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Procedural Cinematic Tension Music Generator
   * Generates a Christopher Nolan / Hans Zimmer style ticking suspense soundtrack:
   * 1. Sub-bass atmospheric drone with acoustic beating and LFO breathing filter
   * 2. Rhythmic clock tick and adrenaline heartbeat pulse on each second
   * 3. Syncopated double-time urgency in final seconds
   */
  public startTensionMusic() {
    if (this.isTensionPlaying) return;
    this.stopTensionMusic();
    const ctx = this.getContext();
    if (!ctx) return;

    this.isTensionPlaying = true;
    const now = ctx.currentTime;

    try {
      // Master gain for tension music with smooth fade-in
      const masterGain = ctx.createGain();
      const targetGain = this.isMuted ? 0.0001 : 0.28;
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(targetGain, now + 0.6);
      masterGain.connect(ctx.destination);
      this.tensionGain = masterGain;

      // 1. Dark Tension Sub-Drone (Lowpass filtered detuned sawtooths)
      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(140, now);
      droneFilter.Q.setValueAtTime(3.5, now);
      droneFilter.connect(masterGain);

      // Low Frequency Oscillator for breathing ominous filter sweep
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.2, now); // ~5-second cycle
      lfoGain.gain.setValueAtTime(65, now);
      lfo.connect(lfoGain);
      lfoGain.connect(droneFilter.frequency);
      lfo.start(now);

      // Dual detuned oscillators creating acoustic throbbing / tension
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55, now); // A1 (55 Hz)
      osc1.connect(droneFilter);
      osc1.start(now);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(57.5, now); // Slight detune for pulsing drone
      osc2.connect(droneFilter);
      osc2.start(now);

      // High fifth overtone drone for eerie suspense
      const osc3 = ctx.createOscillator();
      const osc3Gain = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(165, now); // E3 (fifth)
      osc3Gain.gain.setValueAtTime(0.1, now);
      osc3.connect(osc3Gain);
      osc3Gain.connect(droneFilter);
      osc3.start(now);

      this.tensionNodes.push(
        { stop: () => { try { osc1.stop(); osc1.disconnect(); } catch {} } },
        { stop: () => { try { osc2.stop(); osc2.disconnect(); } catch {} } },
        { stop: () => { try { osc3.stop(); osc3.disconnect(); } catch {} } },
        { stop: () => { try { lfo.stop(); lfo.disconnect(); } catch {} } }
      );

      // 2. Rhythmic Clock Tick & Heartbeat Generator
      const playPulse = (isUrgent: boolean = false) => {
        if (!this.isTensionPlaying || this.isMuted) return;
        const currentCtx = this.getContext();
        if (!currentCtx || !this.tensionGain) return;

        try {
          const t = currentCtx.currentTime;

          // Heartbeat sub thump
          const kickOsc = currentCtx.createOscillator();
          const kickGain = currentCtx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(isUrgent ? 110 : 85, t);
          kickOsc.frequency.exponentialRampToValueAtTime(32, t + (isUrgent ? 0.12 : 0.18));

          kickGain.gain.setValueAtTime(isUrgent ? 0.35 : 0.22, t);
          kickGain.gain.exponentialRampToValueAtTime(0.001, t + (isUrgent ? 0.15 : 0.22));

          kickOsc.connect(kickGain);
          kickGain.connect(this.tensionGain);

          kickOsc.start(t);
          kickOsc.stop(t + 0.25);

          // Metallic clock tick
          const tickOsc = currentCtx.createOscillator();
          const tickGain = currentCtx.createGain();
          tickOsc.type = 'triangle';
          tickOsc.frequency.setValueAtTime(isUrgent ? 1800 : 1200, t);
          tickOsc.frequency.exponentialRampToValueAtTime(isUrgent ? 3600 : 2400, t + 0.03);

          tickGain.gain.setValueAtTime(isUrgent ? 0.08 : 0.045, t);
          tickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

          tickOsc.connect(tickGain);
          tickGain.connect(this.tensionGain);

          tickOsc.start(t);
          tickOsc.stop(t + 0.05);
        } catch {}
      };

      // Play initial pulse immediately
      playPulse();

      // Interval for periodic 1-second ticks
      this.tensionInterval = setInterval(() => {
        playPulse();
      }, 1000);

    } catch (err) {
      console.warn("Could not start Web Audio tension music:", err);
    }
  }

  /**
   * Update tension soundtrack intensity as voting countdown drops.
   * Kept safe as a no-op to prevent scheduling duplicate out-of-sync ticks.
   */
  public updateTensionTimer(_timeRemaining: number) {
    // No-op: eliminates conflicting syncopated timeouts
  }

  /**
   * Stop tension music immediately with total cleanup of intervals and audio nodes
   */
  public stopTensionMusic() {
    if (this.tensionInterval) {
      clearInterval(this.tensionInterval);
      this.tensionInterval = null;
    }

    this.isTensionPlaying = false;

    // Immediately stop and disconnect all tension oscillators
    this.tensionNodes.forEach(node => {
      try { node.stop(); } catch {}
    });
    this.tensionNodes = [];

    if (this.tensionGain) {
      try {
        if (this.ctx) {
          const now = this.ctx.currentTime;
          this.tensionGain.gain.cancelScheduledValues(now);
          this.tensionGain.gain.setValueAtTime(0.0001, now);
        }
        this.tensionGain.disconnect();
      } catch {}
      this.tensionGain = null;
    }
  }

  // Futuristic click on button hover/select
  public playClick() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Confirmation sound for vote selection or ad interactions
  public playVoteConfirm() {
    this.playClick();
  }

  // High tension beep when voting window opens
  public playVotingAlert() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  // Deep cinematic bass drop on vote cast
  public playVoteCast() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  // Celebratory resonant chime when voting concludes and winning option is centered
  public playWinnerReveal() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);

        gain.gain.setValueAtTime(0, now + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.09, now + i * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.6);
      });
    } catch {}
  }
}

export const audioCues = new AudioCueManager();
