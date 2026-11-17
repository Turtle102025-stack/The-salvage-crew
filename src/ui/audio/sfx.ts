/**
 * Sound effects, synthesised with the Web Audio API (no audio files).
 * The audio context starts on the first user gesture (browser rule) and is
 * silent when sound is off. Repeats of the same sound are throttled so a burst
 * of events doesn't turn into noise.
 */

export type SfxName =
  | 'card'
  | 'hit'
  | 'hurt'
  | 'block'
  | 'blocked'
  | 'heal'
  | 'buff'
  | 'debuff'
  | 'death'
  | 'victory'
  | 'defeat'
  | 'coin'
  | 'click'
  | 'turn'
  | 'enemyTurn'
  | 'overheat'
  | 'shuffle'
  | 'relic'
  | 'spawn'
  | 'potion';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.6;
const lastPlayed = new Map<SfxName, number>();

export function setSfxSettings(on: boolean, vol: number): void {
  enabled = on;
  volume = vol;
  if (master) master.gain.value = volume * 0.5;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = volume * 0.5;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call from a user gesture to unlock audio on browsers that require it. */
export function unlockAudio(): void {
  audio();
}

function tone(a: AudioContext, opts: { type?: OscillatorType; from: number; to?: number; start?: number; dur: number; gain?: number }) {
  const t0 = a.currentTime + (opts.start ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.from, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.3, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g).connect(master!);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.02);
}

let noiseBuffer: AudioBuffer | null = null;
function noise(a: AudioContext, opts: { start?: number; dur: number; gain?: number; filter?: BiquadFilterType; freq?: number; q?: number; sweepTo?: number }) {
  if (!noiseBuffer) {
    noiseBuffer = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    // A fixed pattern is fine for noise and keeps this module free of Math.random.
    let seed = 1234567;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (seed / 0x7fffffff) * 2 - 1;
    }
  }
  const t0 = a.currentTime + (opts.start ?? 0);
  const src = a.createBufferSource();
  src.buffer = noiseBuffer;
  const f = a.createBiquadFilter();
  f.type = opts.filter ?? 'bandpass';
  f.frequency.setValueAtTime(opts.freq ?? 1000, t0);
  if (opts.sweepTo) f.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + opts.dur);
  f.Q.value = opts.q ?? 1;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.3, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t0);
  src.stop(t0 + opts.dur + 0.02);
}

const THROTTLE_MS: Partial<Record<SfxName, number>> = { hit: 60, hurt: 80, block: 70, blocked: 70, buff: 90, debuff: 90, coin: 60, card: 50, shuffle: 200 };

export function playSfx(name: SfxName): void {
  const a = audio();
  if (!a || !master) return;
  const now = performance.now();
  const gap = THROTTLE_MS[name] ?? 40;
  if (now - (lastPlayed.get(name) ?? -1e9) < gap) return;
  lastPlayed.set(name, now);
  switch (name) {
    case 'card':
      noise(a, { dur: 0.12, gain: 0.18, filter: 'highpass', freq: 1800, sweepTo: 5000 });
      tone(a, { type: 'triangle', from: 520, to: 880, dur: 0.07, gain: 0.08 });
      break;
    case 'hit':
      tone(a, { type: 'sine', from: 160, to: 55, dur: 0.18, gain: 0.5 });
      noise(a, { dur: 0.06, gain: 0.25, freq: 2500, q: 0.7 });
      break;
    case 'hurt':
      tone(a, { type: 'square', from: 110, to: 60, dur: 0.22, gain: 0.18 });
      noise(a, { dur: 0.12, gain: 0.3, filter: 'lowpass', freq: 900 });
      break;
    case 'block':
      tone(a, { type: 'triangle', from: 880, dur: 0.12, gain: 0.16 });
      tone(a, { type: 'triangle', from: 1320, dur: 0.1, gain: 0.1, start: 0.02 });
      break;
    case 'blocked':
      noise(a, { dur: 0.09, gain: 0.3, freq: 3000, q: 4 });
      tone(a, { type: 'square', from: 700, to: 500, dur: 0.08, gain: 0.08 });
      break;
    case 'heal':
      [523, 659, 784].forEach((f, i) => tone(a, { type: 'sine', from: f, dur: 0.18, gain: 0.16, start: i * 0.07 }));
      break;
    case 'buff':
      tone(a, { type: 'triangle', from: 440, to: 880, dur: 0.18, gain: 0.14 });
      break;
    case 'debuff':
      tone(a, { type: 'sawtooth', from: 520, to: 220, dur: 0.22, gain: 0.08 });
      break;
    case 'death':
      noise(a, { dur: 0.45, gain: 0.35, filter: 'lowpass', freq: 2400, sweepTo: 120 });
      tone(a, { type: 'sine', from: 220, to: 40, dur: 0.4, gain: 0.3 });
      break;
    case 'victory':
      [523, 659, 784, 1047].forEach((f, i) => tone(a, { type: 'triangle', from: f, dur: 0.32, gain: 0.18, start: i * 0.11 }));
      break;
    case 'defeat':
      [392, 330, 262, 196].forEach((f, i) => tone(a, { type: 'sine', from: f, dur: 0.4, gain: 0.2, start: i * 0.16 }));
      break;
    case 'coin':
      tone(a, { type: 'square', from: 988, dur: 0.06, gain: 0.08 });
      tone(a, { type: 'square', from: 1319, dur: 0.14, gain: 0.08, start: 0.06 });
      break;
    case 'click':
      tone(a, { type: 'triangle', from: 660, to: 520, dur: 0.04, gain: 0.06 });
      break;
    case 'turn':
      tone(a, { type: 'sine', from: 660, dur: 0.16, gain: 0.12 });
      tone(a, { type: 'sine', from: 990, dur: 0.22, gain: 0.08, start: 0.08 });
      break;
    case 'enemyTurn':
      tone(a, { type: 'sawtooth', from: 110, to: 98, dur: 0.25, gain: 0.07 });
      break;
    case 'overheat':
      for (let i = 0; i < 4; i++) tone(a, { type: 'square', from: i % 2 ? 620 : 880, dur: 0.1, gain: 0.12, start: i * 0.1 });
      noise(a, { dur: 0.4, gain: 0.25, filter: 'highpass', freq: 1500 });
      break;
    case 'shuffle':
      for (let i = 0; i < 5; i++) noise(a, { dur: 0.05, gain: 0.12, filter: 'highpass', freq: 3000, start: i * 0.04 });
      break;
    case 'relic':
      [784, 988, 1175, 1568].forEach((f, i) => tone(a, { type: 'sine', from: f, dur: 0.14, gain: 0.1, start: i * 0.05 }));
      break;
    case 'spawn':
      tone(a, { type: 'sawtooth', from: 180, to: 360, dur: 0.3, gain: 0.08 });
      noise(a, { dur: 0.3, gain: 0.15, freq: 600, sweepTo: 2400 });
      break;
    case 'potion':
      tone(a, { type: 'sine', from: 300, to: 900, dur: 0.2, gain: 0.14 });
      noise(a, { dur: 0.15, gain: 0.12, filter: 'highpass', freq: 2500, start: 0.05 });
      break;
  }
}
