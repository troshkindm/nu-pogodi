import type { Chute, GameMode } from './config';
import { advance, createGame, moveWolf } from './engine';
import type { GameEvent, GameState } from './engine';
import type { Random } from './random';

export interface SessionSnapshot {
  game: GameState | null;
  now: Date;
}

export interface Session {
  subscribe(listener: () => void): () => void;
  getSnapshot(): SessionSnapshot;
  start(mode: GameMode): void;
  move(chute: Chute): void;
  showClock(): void;
  run(): () => void;
}

const MAX_FRAME_STEP = 0.1;

export function createSession(onEvents: (events: GameEvent[]) => void, random: Random = Math.random): Session {
  const listeners = new Set<() => void>();
  let game: GameState | null = null;
  let snapshot: SessionSnapshot = { game, now: new Date() };
  let lastFrame = 0;
  let frame = 0;

  const publish = () => {
    snapshot = { game, now: new Date() };
    listeners.forEach((listener) => listener());
  };

  const loop = (time: number) => {
    const dt = lastFrame ? Math.min((time - lastFrame) / 1000, MAX_FRAME_STEP) : 0;
    lastFrame = time;
    if (game && game.phase !== 'over') {
      game = advance(game, dt, random);
      if (game.events.length) onEvents(game.events);
    } else if (game) {
      game = { ...game, time: game.time + dt, events: [] };
    }
    publish();
    frame = requestAnimationFrame(loop);
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    start(mode) {
      game = createGame(mode);
      publish();
    },
    move(chute) {
      if (game) game = moveWolf(game, chute);
      publish();
    },
    showClock() {
      game = null;
      publish();
    },
    run() {
      lastFrame = 0;
      frame = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(frame);
    },
  };
}
