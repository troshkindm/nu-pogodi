import { EGG_STEPS, GAME_CONFIG, TICK_ORDER } from './config';
import type { Chute, GameMode } from './config';
import type { Random } from './random';

export interface Egg {
  chute: Chute;
  step: number;
}

export interface Miss {
  chute: Chute;
  half: boolean;
  startedAt: number;
}

export type Phase = 'playing' | 'miss' | 'bonus' | 'over';

export type GameEvent =
  | { type: 'step'; chute: Chute }
  | { type: 'catch'; chute: Chute }
  | { type: 'miss'; chute: Chute; half: boolean }
  | { type: 'chick' }
  | { type: 'bonus' }
  | { type: 'over'; score: number };

interface Pulse {
  event: 'chick' | 'bonus';
  at: number;
  left: number;
  interval: number;
}

export interface GameState {
  mode: GameMode;
  phase: Phase;
  time: number;
  nextTickAt: number;
  phaseEndsAt: number;
  score: number;
  laps: number;
  penalty: number;
  wolf: Chute;
  eggs: Egg[];
  lastChute: Chute | null;
  idleTick: boolean;
  hare: boolean;
  miss: Miss | null;
  pulse: Pulse | null;
  events: GameEvent[];
}

export function createGame(mode: GameMode): GameState {
  return {
    mode,
    phase: 'playing',
    time: 0,
    nextTickAt: GAME_CONFIG.firstEggDelay,
    phaseEndsAt: 0,
    score: 0,
    laps: 0,
    penalty: 0,
    wolf: 0,
    eggs: [],
    lastChute: null,
    idleTick: false,
    hare: false,
    miss: null,
    pulse: null,
    events: [],
  };
}

export function tickInterval(score: number, laps: number, mode: GameMode): number {
  const { speed } = GAME_CONFIG;
  const inHundred = score % 100;
  if (score >= 900) {
    const { from, to } = speed.finalHundred;
    return from - ((from - to) * (score - 900)) / 99;
  }
  if (laps > 0) return speed.afterWrap.start - speed.afterWrap.perPoint * inHundred;
  const curve = speed[mode];
  const hundredStart = Math.max(curve.start - curve.perHundred * Math.floor(score / 100), curve.floor);
  return hundredStart - speed.perPoint * inHundred;
}

export function eggCap(score: number): number {
  return GAME_CONFIG.eggCaps.reduce((cap, level) => (score >= level.from ? level.cap : cap), 1);
}

export function isHareVisible(time: number): boolean {
  return Math.floor(time / GAME_CONFIG.harePeriod) % 2 === 1;
}

export function activeChutes(mode: GameMode, penalty: number): Chute[] {
  if (mode === 'B') return [...TICK_ORDER];
  const idle = GAME_CONFIG.idleChuteByPenalty[Math.min(penalty, GAME_CONFIG.idleChuteByPenalty.length - 1)];
  return TICK_ORDER.filter((chute) => chute !== idle);
}

export function moveWolf(state: GameState, wolf: Chute): GameState {
  return state.phase === 'over' ? state : { ...state, wolf };
}

export function advance(state: GameState, dt: number, random: Random): GameState {
  const next: GameState = { ...state, eggs: state.eggs.map((egg) => ({ ...egg })), events: [] };
  const target = state.time + dt;
  for (;;) {
    const at = nextEventAt(next);
    if (at === null || at > target) break;
    next.time = at;
    if (next.pulse && next.pulse.at === at) firePulse(next);
    else if (next.phase === 'playing') tick(next, random);
    else endPhase(next);
  }
  next.time = target;
  return next;
}

function nextEventAt(state: GameState): number | null {
  if (state.phase === 'over') return null;
  if (state.phase === 'playing') return state.nextTickAt;
  return state.pulse ? Math.min(state.pulse.at, state.phaseEndsAt) : state.phaseEndsAt;
}

function firePulse(state: GameState) {
  const pulse = state.pulse as Pulse;
  state.events.push({ type: pulse.event });
  state.pulse = pulse.left > 1 ? { ...pulse, at: pulse.at + pulse.interval, left: pulse.left - 1 } : null;
}

function tick(state: GameState, random: Random) {
  state.hare = isHareVisible(state.time);
  const active = activeChutes(state.mode, state.penalty);
  const occupied = active.filter((chute) => state.eggs.some((egg) => egg.chute === chute));
  let delay = tickInterval(state.score, state.laps, state.mode);

  if (occupied.length > 1 || (occupied.length === 1 && !state.idleTick)) {
    const chute = nextInOrder(occupied, state.lastChute);
    state.lastChute = chute;
    state.events.push({ type: 'step', chute });
    state.eggs.forEach((egg) => {
      if (egg.chute === chute) egg.step += 1;
    });
    const fallen = state.eggs.find((egg) => egg.step >= EGG_STEPS);
    if (fallen) {
      state.eggs = state.eggs.filter((egg) => egg !== fallen);
      if (state.wolf !== chute) {
        startMiss(state, chute);
        return;
      }
      state.events.push({ type: 'catch', chute });
      delay += GAME_CONFIG.catchDelay;
      if (scorePoint(state)) return;
    }
  }

  state.idleTick = occupied.length <= 1 ? !state.idleTick : false;
  spawnEgg(state, active, random);
  state.nextTickAt = state.time + delay;
}

function nextInOrder(chutes: Chute[], last: Chute | null): Chute {
  if (last === null) return chutes[0];
  const lastIndex = TICK_ORDER.indexOf(last);
  const after = chutes.find((chute) => TICK_ORDER.indexOf(chute) > lastIndex);
  return after ?? chutes[0];
}

function spawnEgg(state: GameState, active: Chute[], random: Random) {
  if (state.eggs.length >= eggCap(state.score) || random() >= GAME_CONFIG.spawnChance) return;
  const free = active.filter((chute) => !state.eggs.some((egg) => egg.chute === chute && egg.step <= 1));
  if (free.length === 0) return;
  state.eggs.push({ chute: free[Math.floor(random() * free.length)], step: 0 });
}

function scorePoint(state: GameState): boolean {
  state.score += 1;
  if (state.score > GAME_CONFIG.maxScore) {
    state.score = 0;
    state.laps += 1;
  }
  const { bonus } = GAME_CONFIG;
  if (state.penalty === 0 || !(bonus.scores as readonly number[]).includes(state.score)) return false;
  state.phase = 'bonus';
  state.phaseEndsAt = state.time + bonus.time;
  state.pulse = { event: 'bonus', at: state.time, left: bonus.beeps, interval: bonus.beepInterval };
  return true;
}

function startMiss(state: GameState, chute: Chute) {
  const { miss } = GAME_CONFIG;
  const half = state.hare;
  state.penalty += half ? 1 : 2;
  state.miss = { chute, half, startedAt: state.time };
  state.eggs = [];
  state.phase = 'miss';
  state.events.push({ type: 'miss', chute, half });
  const animation = half ? miss.chickSteps * miss.chickStepTime : miss.brokenEggTime;
  state.phaseEndsAt = state.time + animation + miss.resumeDelay;
  state.pulse = half
    ? { event: 'chick', at: state.time + miss.chickStepTime, left: miss.chickSteps, interval: miss.chickStepTime }
    : null;
}

function endPhase(state: GameState) {
  state.pulse = null;
  if (state.phase === 'bonus') {
    state.penalty = 0;
  } else {
    state.miss = null;
    if (state.penalty >= GAME_CONFIG.penaltyLimit) {
      state.phase = 'over';
      state.events.push({ type: 'over', score: state.score });
      return;
    }
  }
  state.phase = 'playing';
  state.nextTickAt = state.time;
}
