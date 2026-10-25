import { describe, expect, it } from 'vitest';

import { CHUTE, EGG_STEPS, GAME_CONFIG } from './config';
import type { Chute } from './config';
import { activeChutes, advance, createGame, eggCap, isHareVisible, moveWolf, tickInterval } from './engine';
import type { GameState } from './engine';
import { seededRandom } from './random';

const never = () => 0.999;

function withEggAboutToFall(state: GameState, chute: Chute = CHUTE.topLeft): GameState {
  return { ...state, eggs: [{ chute, step: EGG_STEPS - 1 }], nextTickAt: state.time, idleTick: false };
}

describe('tickInterval', () => {
  it('follows the ROM speed curve in game A', () => {
    expect(tickInterval(0, 0, 'A')).toBeCloseTo(0.402);
    expect(tickInterval(99, 0, 'A')).toBeCloseTo(0.402 - 0.0012 * 99);
    expect(tickInterval(150, 0, 'A')).toBeCloseTo(0.402 - 0.0222 - 0.06);
  });

  it('starts faster in game B and clamps each hundred', () => {
    expect(tickInterval(0, 0, 'B')).toBeCloseTo(0.336);
    expect(tickInterval(700, 0, 'B')).toBeCloseTo(0.193);
  });

  it('slows down at the start of every hundred', () => {
    expect(tickInterval(200, 0, 'A')).toBeGreaterThan(tickInterval(199, 0, 'A'));
  });

  it('speeds up from 0.12 to 0.1 in the last hundred and after a wrap', () => {
    expect(tickInterval(900, 0, 'A')).toBeCloseTo(0.12);
    expect(tickInterval(999, 3, 'B')).toBeCloseTo(0.1);
    expect(tickInterval(50, 1, 'A')).toBeCloseTo(0.146);
  });
});

describe('rules', () => {
  it('caps eggs on the board by score', () => {
    expect([0, 4, 5, 9, 10, 50, 90, 289, 290].map(eggCap)).toEqual([1, 1, 2, 2, 3, 4, 5, 5, 6]);
  });

  it('shows the hare every other five seconds', () => {
    expect([0, 4.9, 5, 9.9, 10].map(isHareVisible)).toEqual([false, false, true, true, false]);
  });

  it('leaves one chute idle in game A depending on penalties', () => {
    expect(activeChutes('B', 0)).toHaveLength(4);
    expect(activeChutes('A', 0)).not.toContain(CHUTE.bottomLeft);
    expect(activeChutes('A', 1)).not.toContain(CHUTE.bottomRight);
    expect(activeChutes('A', 3)).not.toContain(CHUTE.topLeft);
    expect(activeChutes('A', 5)).not.toContain(CHUTE.topRight);
  });
});

describe('advance', () => {
  it('scores a caught egg', () => {
    const state = advance(withEggAboutToFall(createGame('A')), 0.001, never);
    expect(state.score).toBe(1);
    expect(state.eggs).toHaveLength(0);
    expect(state.events).toContainEqual({ type: 'catch', chute: CHUTE.topLeft });
  });

  it('gives a full penalty for a miss without the hare and a half with it', () => {
    const missed = moveWolf(withEggAboutToFall(createGame('B')), CHUTE.bottomRight);
    expect(advance(missed, 0.001, never).penalty).toBe(2);
    const withHare = { ...missed, time: 6, nextTickAt: 6 };
    const half = advance(withHare, 0.001, never);
    expect(half.penalty).toBe(1);
    expect(half.miss?.half).toBe(true);
  });

  it('ends the game after three full misses', () => {
    let state = moveWolf(createGame('B'), CHUTE.bottomRight);
    for (let miss = 0; miss < 3; miss += 1) {
      state = advance(withEggAboutToFall({ ...state, time: miss * 2 * GAME_CONFIG.harePeriod }), 0.001, never);
      state = advance(state, GAME_CONFIG.miss.brokenEggTime + 1, never);
    }
    expect(state.phase).toBe('over');
    expect(state.events).toContainEqual({ type: 'over', score: 0 });
  });

  it('clears penalties at 200 points after the bonus pause', () => {
    const state = {
      ...withEggAboutToFall(moveWolf(createGame('A'), CHUTE.topRight), CHUTE.topRight),
      score: 199,
      penalty: 3,
    };
    const paused = advance(state, 0.001, never);
    expect(paused.phase).toBe('bonus');
    expect(paused.penalty).toBe(3);
    const resumed = advance(paused, GAME_CONFIG.bonus.time, never);
    expect(resumed.penalty).toBe(0);
    expect(resumed.phase).toBe('playing');
  });

  it('wraps the score after 999 and keeps penalties', () => {
    const state = advance({ ...withEggAboutToFall(createGame('A')), score: 999, penalty: 2 }, 0.001, never);
    expect(state.score).toBe(0);
    expect(state.laps).toBe(1);
    expect(state.penalty).toBe(2);
  });

  it('never spawns eggs in the idle chute of game A', () => {
    let state = createGame('A');
    const random = seededRandom(7);
    for (let i = 0; i < 2000 && state.phase !== 'over'; i += 1) {
      state = advance(moveWolf(state, state.eggs[0]?.chute ?? CHUTE.topLeft), 0.05, random);
      const idle = GAME_CONFIG.idleChuteByPenalty[state.penalty];
      expect(state.eggs.some((egg) => egg.chute === idle)).toBe(false);
    }
  });

  it('is deterministic for the same seed', () => {
    const run = () => {
      let state = createGame('B');
      const random = seededRandom(42);
      for (let i = 0; i < 400; i += 1) state = advance(state, 0.05, random);
      return state;
    };
    expect(run()).toEqual(run());
  });
});
