import { SOUND_CONFIG } from '../game/config';
import type { GameEvent } from '../game/engine';

const VOLUME = 0.05;

export interface Beeper {
  unlock(): void;
  play(events: GameEvent[]): void;
  setMuted(muted: boolean): void;
}

export function createBeeper(): Beeper {
  let context: AudioContext | null = null;
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
    setMuted(value) {
      muted = value;
    },
  };
}
