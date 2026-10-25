import { CHUTE, EGG_STEPS, GAME_CONFIG, TICK_ORDER } from '../game/config';
import type { Chute, GameMode } from '../game/config';
import type { GameState } from '../game/engine';

type Side = 0 | 1;

export const EGG_SEGMENTS: Record<Chute, string[]> = {
  [CHUTE.topLeft]: ['3.0.1', '3.0.0', '3.1.0', '3.1.1', '3.2.1'],
  [CHUTE.bottomLeft]: ['3.2.0', '3.3.0', '3.3.1', '2.0.1', '2.0.0'],
  [CHUTE.topRight]: ['7.0.1', '8.3.1', '8.3.0', '8.2.0', '8.2.1'],
  [CHUTE.bottomRight]: ['8.1.0', '8.1.1', '8.0.0', '8.0.1', '0.3.1'],
};
export const WOLF_BODY: readonly string[] = ['1.1.0', '1.2.1'];
export const WOLF_ARMS: Record<Chute, string> = {
  [CHUTE.topLeft]: '1.1.1',
  [CHUTE.bottomLeft]: '1.0.0',
  [CHUTE.topRight]: '1.3.1',
  [CHUTE.bottomRight]: '1.3.0',
};
export const HARE = { body: '4.3.1', armDown: '4.3.0', armUp: '4.2.1', bellUp: '4.2.0' };
export const PENALTY_MARKS = ['4.0.1', '4.1.1', '6.0.1'];
export const SPLAT: readonly string[][] = [
  ['2.3.1', '2.3.0'],
  ['0.0.0', '0.0.1'],
];
export const RUNNING_CHICK: readonly string[][] = [
  ['1.0.1', '2.2.1', '2.1.1', '2.1.0'],
  ['0.3.0', '0.1.0', '0.2.0', '0.2.1'],
];
export const MODE_LABEL: Record<GameMode, string> = { A: '2.2.0', B: '0.1.1' };
export const MERIDIEM = { am: '4.1.0', pm: '1.2.0' };
export const LEADING_ONE = '4.0.0';
export const COLON = '5.0.1';
export const DIGITS = ['5', '6', '7'].map((n) => ({
  a: `${n}.1.0`,
  b: `${n}.0.0`,
  c: `${n}.3.0`,
  d: `${n}.3.1`,
  e: `${n}.2.1`,
  f: `${n}.1.1`,
  g: `${n}.2.0`,
}));

const SEVEN_SEGMENT = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];

const sideOf = (chute: Chute): Side => (chute === CHUTE.topLeft || chute === CHUTE.bottomLeft ? 0 : 1);
const blinkOn = (time: number, period: number) => Math.floor(time / period) % 2 === 0;

export function numberSegments(text: string): string[] {
  const padded = text.padStart(4, ' ').slice(-4);
  const lit = padded[0] === '1' ? [LEADING_ONE] : [];
  DIGITS.forEach((digit, index) => {
    const char = padded[index + 1];
    const shape = char === ' ' ? '' : SEVEN_SEGMENT[Number(char)];
    lit.push(...[...shape].map((name) => digit[name as keyof typeof digit]));
  });
  return lit;
}

export function clockSegments(date: Date): string[] {
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return [...numberSegments(`${hours}${minutes}`), COLON, date.getHours() < 12 ? MERIDIEM.am : MERIDIEM.pm];
}

function penaltySegments(state: GameState): string[] {
  const full = Math.floor(state.penalty / 2);
  const half = state.penalty % 2 === 1;
  const blinking = state.phase === 'bonus' && !blinkOn(state.time, GAME_CONFIG.bonus.beepInterval / 2);
  if (blinking) return [];
  const marks = PENALTY_MARKS.slice(0, full);
  if (half && blinkOn(state.time, 0.39)) marks.push(PENALTY_MARKS[full]);
  return marks;
}

function missSegments(state: GameState): string[] {
  if (!state.miss) return [];
  const side = sideOf(state.miss.chute);
  const elapsed = state.time - state.miss.startedAt;
  if (!state.miss.half) return elapsed < GAME_CONFIG.miss.brokenEggTime ? SPLAT[side] : [];
  const step = Math.floor(elapsed / GAME_CONFIG.miss.chickStepTime);
  return step < RUNNING_CHICK[side].length ? [RUNNING_CHICK[side][step]] : [];
}

export function gameSegments(state: GameState): string[] {
  const lit = [
    WOLF_BODY[sideOf(state.wolf)],
    WOLF_ARMS[state.wolf],
    MODE_LABEL[state.mode],
    ...numberSegments(String(state.score)),
    ...state.eggs.map((egg) => EGG_SEGMENTS[egg.chute][egg.step]),
    ...penaltySegments(state),
    ...missSegments(state),
  ];
  if (state.hare && state.phase !== 'over') lit.push(HARE.body, HARE.armDown);
  if (state.phase === 'over' && !blinkOn(state.time, 0.5))
    return lit.filter((id) => !numberSegments(String(state.score)).includes(id));
  return lit;
}

const LOADER_STEPS = EGG_STEPS + 1;

export function loaderSegments(frame: number): string[] {
  const chute = TICK_ORDER[Math.floor(frame / LOADER_STEPS) % TICK_ORDER.length];
  const step = frame % LOADER_STEPS;
  const egg = step < EGG_STEPS ? [EGG_SEGMENTS[chute][step]] : [];
  return [
    WOLF_BODY[sideOf(chute)],
    WOLF_ARMS[chute],
    ...egg,
    ...numberSegments(String(Math.floor(frame / LOADER_STEPS))),
  ];
}
