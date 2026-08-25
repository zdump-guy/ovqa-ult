/**
 * Zero-Latency Web Audio API Sound Synthesis Engine.
 * Synthesizes audio feedback on demand without external audio assets,
 * guaranteeing zero network load latency and instant user feedback.
 */

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterGain: GainNode | null = null;
  private volume = 0.3;

  constructor() {
    // Lazy initialization on first user interaction or call
  }

  /**
   * Initializes or returns the cached AudioContext.
   * Resumes the context if it was suspended due to browser autoplay policies.
   */
  private getContext(): AudioContext | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      if (!this.ctx) {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;

        if (AudioCtxClass) {
          this.ctx = new AudioCtxClass();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(
            this.muted ? 0 : this.volume,
            this.ctx.currentTime
          );
          this.masterGain.connect(this.ctx.destination);
        }
      }

      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {
          // Autoplay policy prevented immediate resume
        });
      }

      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Toggle mute state. Returns new muted status.
   */
  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Set mute state explicitly.
   */
  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        mute ? 0 : this.volume,
        this.ctx.currentTime
      );
    }
  }

  /**
   * Check if sound is currently muted.
   */
  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Set master volume (0.0 to 1.0).
   */
  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  /**
   * Get current master volume.
   */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * Synthesize a correct answer chime (pleasant ascending arpeggio C5 -> E5 -> G5).
   */
  public playCorrect(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.07);

        // Envelope: quick attack and smooth decay
        const startTime = now + index * 0.07;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(startTime);
        osc.stop(startTime + 0.23);
      });
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Synthesize a wrong answer buzzer (dissonant sawtooth tone).
   */
  public playWrong(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;

      // Dual oscillator for rich dissonant buzz
      const freqs = [164.81, 155.56]; // E3 and D#3 (minor second dissonance)

      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.25);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.29);
      });
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Synthesize a triumphant checkpoint unlock fanfare (C5 -> E5 -> G5 -> C6 with sustain).
   */
  public playCheckpointUnlock(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      // C5, E5, G5, C6, E6
      const fanfare = [
        { freq: 523.25, time: 0.0, duration: 0.12 },
        { freq: 659.25, time: 0.1, duration: 0.12 },
        { freq: 783.99, time: 0.2, duration: 0.15 },
        { freq: 1046.5, time: 0.32, duration: 0.45 },
        { freq: 1318.51, time: 0.42, duration: 0.55 },
      ];

      fanfare.forEach(({ freq, time, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + time);

        const noteStart = now + time;
        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.3, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(noteStart);
        osc.stop(noteStart + duration + 0.02);
      });
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Synthesize a checkpoint failure sound (descending minor chord).
   */
  public playCheckpointFail(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 392.0, time: 0.0 }, // G4
        { freq: 349.23, time: 0.12 }, // F4
        { freq: 311.13, time: 0.24 }, // Eb4
        { freq: 261.63, time: 0.38 }, // C4
      ];

      notes.forEach(({ freq, time }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + time);

        const start = now + time;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(start);
        osc.stop(start + 0.26);
      });
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Synthesize a crisp timer micro-tick.
   */
  public playTick(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Synthesize an urgent warning tick (higher pitch, sharper click for last 3 seconds).
   */
  public playWarningTick(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(1320, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Ignore audio synthesis errors
    }
  }
}

// Export singleton instance
export const soundEffects = new SoundEffectsEngine();

// Export direct convenience functions
export const playCorrect = () => soundEffects.playCorrect();
export const playWrong = () => soundEffects.playWrong();
export const playCheckpointUnlock = () => soundEffects.playCheckpointUnlock();
export const playCheckpointFail = () => soundEffects.playCheckpointFail();
export const playTick = () => soundEffects.playTick();
export const playWarningTick = () => soundEffects.playWarningTick();
export const toggleMute = () => soundEffects.toggleMute();
export const setMuted = (muted: boolean) => soundEffects.setMuted(muted);
export const isMuted = () => soundEffects.isMuted();
