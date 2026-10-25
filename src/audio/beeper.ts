import { KEY_FEEL_CONFIG, SOUND_CONFIG } from '../game/config';
import type { GameEvent } from '../game/engine';

import { playPaper } from './paper';
import type { PaperSound } from './paper';

const VOLUME = 0.05;

export type ClickKind = 'round' | 'pill';

export interface Beeper {
  unlock(): void;
  play(events: GameEvent[]): void;
  click(kind: ClickKind, down: boolean): void;
  ring(): void;
  paper(sound: PaperSound): void;
  setMuted(muted: boolean): void;
}

const NOISE_SECONDS = 1;

function noiseBuffer(context: AudioContext) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * NOISE_SECONDS), context.sampleRate);
  const samples = buffer.getChannelData(0);
  samples.forEach((_, i) => {
    samples[i] = Math.random() * 2 - 1;
  });
  return buffer;
}

function decayingGain(context: AudioContext, level: number, start: number, length: number) {
  const { attack } = KEY_FEEL_CONFIG.click;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + length);
  gain.connect(context.destination);
  return gain;
}

function plasticClick(context: AudioContext, noise: AudioBuffer, kind: ClickKind, down: boolean) {
  const { resonance, snap, thump, thumpLevel } = KEY_FEEL_CONFIG.click;
  const { band, body, level } = KEY_FEEL_CONFIG.click[kind][down ? 'press' : 'release'];
  const start = context.currentTime + 0.002;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  source.buffer = noise;
  filter.type = 'bandpass';
  filter.frequency.value = band;
  filter.Q.value = resonance;
  source.connect(filter).connect(decayingGain(context, level, start, snap));
  source.start(start);
  source.stop(start + snap + 0.01);
  const knock = context.createOscillator();
  knock.frequency.setValueAtTime(body, start);
  knock.frequency.exponentialRampToValueAtTime(body * 0.6, start + thump);
  knock.connect(decayingGain(context, level * thumpLevel, start, thump));
  knock.start(start);
  knock.stop(start + thump + 0.01);
}

export function createBeeper(): Beeper {
  let context: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  let muted = false;

  const tone = (frequency: number, duration: number, delay = 0) => {
    if (!context || muted) return;
    const start = context.currentTime + 0.005 + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(VOLUME, start + 0.001);
    gain.gain.setValueAtTime(VOLUME, start + duration - 0.001);
    gain.gain.linearRampToValueAtTime(0, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  };

  const gameOver = () => {
    const { cells, notes } = SOUND_CONFIG.gameOver;
    const cellLength = notes.reduce((sum, note) => sum + note.duration, 0);
    Array.from({ length: cells }).forEach((_, cell) => {
      notes.reduce((offset, { frequency, duration }) => {
        tone(frequency, duration, offset);
        return offset + duration;
      }, cell * cellLength);
    });
  };

  const playEvent = (event: GameEvent) => {
    switch (event.type) {
      case 'step':
        tone(SOUND_CONFIG.stepTone[event.chute], SOUND_CONFIG.stepClick);
        break;
      case 'catch':
        tone(SOUND_CONFIG.catch.frequency, SOUND_CONFIG.catch.duration);
        break;
      case 'miss':
      case 'bonus':
        tone(SOUND_CONFIG.miss.frequency, SOUND_CONFIG.miss.duration);
        break;
      case 'chick':
        tone(SOUND_CONFIG.chickStep.frequency, SOUND_CONFIG.chickStep.duration);
        break;
      case 'over':
        gameOver();
        break;
      default:
        break;
    }
  };

  return {
    unlock() {
      if (!context) context = new AudioContext();
      if (context.state === 'suspended') context.resume().catch(() => undefined);
    },
    play(events) {
      events.forEach(playEvent);
    },
    paper(sound) {
      if (!context || muted) return;
      noise ??= noiseBuffer(context);
      playPaper(context, noise, sound);
    },
    ring() {
      tone(SOUND_CONFIG.alarm.frequency, SOUND_CONFIG.alarm.duration);
    },
    click(kind, down) {
      if (!context || muted) return;
      noise ??= noiseBuffer(context);
      plasticClick(context, noise, kind, down);
    },
    setMuted(value) {
      muted = value;
    },
  };
}
