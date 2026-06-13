/**
 * Bomb Party Sound Engine
 *
 * Lightweight Web Audio API synthesizer — generates all sounds procedurally
 * so no audio asset files are required. Respects a global mute flag persisted
 * in localStorage.
 */

let ctx: AudioContext | null = null;
let muted = false;
const MUTE_KEY = 'bombparty_muted';

if (typeof window !== 'undefined') {
  muted = localStorage.getItem(MUTE_KEY) === '1';
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Resume the audio context — must be called from a user gesture. */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setMuted(m: boolean): void {
  muted = m;
  if (typeof window !== 'undefined') {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  }
}

export function isMuted(): boolean {
  return muted;
}

interface ToneOptions {
  freq: number;
  type?: OscillatorType;
  duration?: number;
  volume?: number;
  freqEnd?: number;
  delay?: number;
}

function tone({ freq, type = 'sine', duration = 0.15, volume = 0.2, freqEnd, delay = 0 }: ToneOptions): void {
  const c = getCtx();
  if (!c || muted) return;
  const start = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), start + duration);
  }
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noiseBurst(duration = 0.5, volume = 0.4, lowpassStart = 1800, lowpassEnd = 120): void {
  const c = getCtx();
  if (!c || muted) return;
  const start = c.currentTime;
  const bufferSize = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // decaying noise
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(lowpassStart, start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, lowpassEnd), start + duration);
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  src.start(start);
  src.stop(start + duration + 0.02);
}

/** Soft tick every second; sharper/urgent when time is low. */
export function playTick(urgent = false): void {
  tone({ freq: urgent ? 1100 : 800, type: 'square', duration: urgent ? 0.07 : 0.04, volume: urgent ? 0.16 : 0.08 });
}

/** Turn passes to next player. */
export function playTurnChange(): void {
  tone({ freq: 520, type: 'triangle', duration: 0.09, volume: 0.16 });
  tone({ freq: 760, type: 'triangle', duration: 0.1, volume: 0.16, delay: 0.07 });
}

/** Valid word submitted. */
export function playWord(): void {
  tone({ freq: 600, type: 'sine', duration: 0.1, volume: 0.18 });
  tone({ freq: 900, type: 'sine', duration: 0.12, volume: 0.16, delay: 0.08 });
}

/** Invalid / rejected word. */
export function playError(): void {
  tone({ freq: 220, type: 'sawtooth', duration: 0.18, volume: 0.16, freqEnd: 110 });
}

/** Bomb explosion (a player lost a life). */
export function playExplosion(): void {
  noiseBurst(0.55, 0.5, 2000, 90);
  tone({ freq: 90, type: 'sine', duration: 0.4, volume: 0.3, freqEnd: 40 });
}

/** Shield / power-up acquired. */
export function playShield(): void {
  tone({ freq: 700, type: 'sine', duration: 0.18, volume: 0.16, freqEnd: 1300 });
}

/** Game over jingle. */
export function playGameOver(win: boolean): void {
  if (win) {
    tone({ freq: 523, type: 'square', duration: 0.13, volume: 0.18, delay: 0 });
    tone({ freq: 659, type: 'square', duration: 0.13, volume: 0.18, delay: 0.13 });
    tone({ freq: 784, type: 'square', duration: 0.13, volume: 0.18, delay: 0.26 });
    tone({ freq: 1046, type: 'square', duration: 0.25, volume: 0.2, delay: 0.39 });
  } else {
    tone({ freq: 392, type: 'sawtooth', duration: 0.18, volume: 0.16, delay: 0 });
    tone({ freq: 311, type: 'sawtooth', duration: 0.18, volume: 0.16, delay: 0.18 });
    tone({ freq: 233, type: 'sawtooth', duration: 0.35, volume: 0.18, delay: 0.36 });
  }
}

/** Game start whoosh. */
export function playStart(): void {
  tone({ freq: 300, type: 'sine', duration: 0.25, volume: 0.18, freqEnd: 800 });
}
