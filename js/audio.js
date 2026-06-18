// ============================================================================
//  audio.js — AudioManager
//  All sound is synthesized procedurally with the Web Audio API, so the game
//  needs no external audio files. Includes a mute toggle (persisted).
// ============================================================================

import { MUTE_KEY } from './constants.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = localStorage.getItem(MUTE_KEY) === 'true';
    this._unlocked = false;
  }

  // Audio contexts must be created/resumed after a user gesture.
  unlock() {
    if (this._unlocked) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    this._unlocked = true;
  }

  setMuted(muted) {
    this.muted = muted;
    localStorage.setItem(MUTE_KEY, String(muted));
    if (this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.9, now + 0.08);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // --- Low-level helpers -----------------------------------------------------

  _tone({ freq = 440, type = 'sine', start = 0, dur = 0.2, gain = 0.3,
          attack = 0.005, release = 0.08, freqEnd = null, dest = null }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.now + start;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    osc.connect(g);
    g.connect(dest || this.master);
    osc.start(t0);
    osc.stop(t0 + dur + release + 0.02);
  }

  _noise({ start = 0, dur = 0.3, gain = 0.3, type = 'highpass', freq = 1000, dest = null }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.now + start;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest || this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // --- Game sound effects ----------------------------------------------------

  flap() {
    // Soft wing whoosh — filtered noise sweep.
    this._noise({ dur: 0.18, gain: 0.18, type: 'bandpass', freq: 700 });
    this._tone({ freq: 320, freqEnd: 180, type: 'sine', dur: 0.12, gain: 0.12 });
  }

  screech() {
    // Majestic eagle screech accent — bright descending warble.
    const base = 1700;
    for (let i = 0; i < 4; i++) {
      this._tone({
        freq: base - i * 60 + (i % 2 ? 120 : 0),
        freqEnd: base - 700 - i * 60,
        type: 'sawtooth',
        start: i * 0.04,
        dur: 0.1,
        gain: 0.07,
      });
    }
    this._noise({ dur: 0.25, gain: 0.05, type: 'highpass', freq: 2500 });
  }

  score() {
    // Bright chime + short fanfare note.
    this._tone({ freq: 880, type: 'triangle', dur: 0.1, gain: 0.22 });
    this._tone({ freq: 1320, type: 'sine', start: 0.06, dur: 0.14, gain: 0.18 });
  }

  milestone() {
    // Fanfare burst + firework crackle + crowd cheer.
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this._tone({
      freq: f, type: 'square', start: i * 0.09, dur: 0.16, gain: 0.16,
    }));
    this.fireworkCrackle(0.15);
    this.crowdCheer(0.2);
  }

  fireworkCrackle(start = 0) {
    if (!this.ctx || this.muted) return;
    this._tone({ freq: 180, freqEnd: 60, type: 'sine', start, dur: 0.25, gain: 0.25 }); // boom
    for (let i = 0; i < 10; i++) {
      this._noise({
        start: start + 0.12 + Math.random() * 0.4,
        dur: 0.05,
        gain: 0.06 + Math.random() * 0.06,
        type: 'highpass',
        freq: 3000 + Math.random() * 3000,
      });
    }
  }

  crowdCheer(start = 0) {
    // Pink-ish noise swell.
    if (!this.ctx || this.muted) return;
    const t0 = this.now + start;
    const dur = 0.9;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.sin((i / len) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.value = 0.18;
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur);
  }

  newRecord() {
    // Triumphant brass flourish.
    const seq = [392, 523, 659, 784, 1047];
    seq.forEach((f, i) => {
      this._tone({ freq: f, type: 'sawtooth', start: i * 0.11, dur: 0.18, gain: 0.13 });
      this._tone({ freq: f / 2, type: 'square', start: i * 0.11, dur: 0.18, gain: 0.07 });
    });
    this.fireworkCrackle(0.5);
    this.crowdCheer(0.3);
  }

  coin() {
    // Bright two-note coin ping.
    this._tone({ freq: 1320, type: 'square', dur: 0.06, gain: 0.12 });
    this._tone({ freq: 1760, type: 'square', start: 0.05, dur: 0.1, gain: 0.12 });
  }

  purchase() {
    // Cha-ching: ascending sparkle.
    [880, 1175, 1568].forEach((f, i) => this._tone({
      freq: f, type: 'triangle', start: i * 0.07, dur: 0.14, gain: 0.16,
    }));
    this._tone({ freq: 2349, type: 'sine', start: 0.18, dur: 0.18, gain: 0.1 });
  }

  denied() {
    this._tone({ freq: 220, freqEnd: 160, type: 'sawtooth', dur: 0.15, gain: 0.14 });
  }

  collision() {
    this._tone({ freq: 200, freqEnd: 50, type: 'sawtooth', dur: 0.25, gain: 0.3 });
    this._noise({ dur: 0.3, gain: 0.25, type: 'lowpass', freq: 800 });
  }

  gameOver() {
    const seq = [523, 466, 392, 311];
    seq.forEach((f, i) => this._tone({
      freq: f, type: 'triangle', start: i * 0.16, dur: 0.22, gain: 0.16,
    }));
  }

  fanfare() {
    // Title intro fanfare.
    const seq = [
      [392, 0.0], [392, 0.12], [392, 0.24], [523, 0.42],
      [659, 0.62], [523, 0.78], [659, 0.92], [784, 1.12],
    ];
    seq.forEach(([f, t]) => {
      this._tone({ freq: f, type: 'sawtooth', start: t, dur: 0.2, gain: 0.12 });
      this._tone({ freq: f * 1.5, type: 'triangle', start: t, dur: 0.2, gain: 0.06 });
    });
    this.screech();
  }
}
