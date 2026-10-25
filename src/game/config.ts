export type Chute = 0 | 1 | 2 | 3;
export type GameMode = 'A' | 'B';

export const CHUTE = { topLeft: 0, bottomLeft: 1, topRight: 2, bottomRight: 3 } as const satisfies Record<
  string,
  Chute
>;
export const TICK_ORDER: readonly Chute[] = [CHUTE.topLeft, CHUTE.topRight, CHUTE.bottomLeft, CHUTE.bottomRight];
export const EGG_STEPS = 5;

export const GAME_CONFIG = {
  firstEggDelay: 0.45,
  catchDelay: 0.084,
  spawnChance: 0.7,
  eggCaps: [
    { from: 0, cap: 1 },
    { from: 5, cap: 2 },
    { from: 10, cap: 3 },
    { from: 50, cap: 4 },
    { from: 90, cap: 5 },
    { from: 290, cap: 6 },
  ],
  speed: {
    A: { start: 0.402, perHundred: 0.0222, floor: 0 },
    B: { start: 0.336, perHundred: 0.0225, floor: 0.193 },
    perPoint: 0.0012,
    finalHundred: { from: 0.12, to: 0.1 },
    afterWrap: { start: 0.196, perPoint: 0.001 },
  },
  harePeriod: 5,
  miss: {
    brokenEggTime: 2.7,
    chickSteps: 4,
    chickStepTime: 0.555,
    resumeDelay: 0.4,
  },
  bonus: { scores: [200, 500], time: 5.7, beeps: 7, beepInterval: 0.81 },
  maxScore: 999,
  penaltyLimit: 6,
  idleChuteByPenalty: [
    CHUTE.bottomLeft,
    CHUTE.bottomRight,
    CHUTE.bottomRight,
    CHUTE.topLeft,
    CHUTE.topLeft,
    CHUTE.topRight,
  ],
} as const;

export const SOUND_CONFIG = {
  stepClick: 0.012,
  stepTone: { [CHUTE.topLeft]: 2650, [CHUTE.topRight]: 2000, [CHUTE.bottomRight]: 1950, [CHUTE.bottomLeft]: 1800 },
  catch: { frequency: 1010, duration: 0.063 },
  miss: { frequency: 810, duration: 0.157 },
  chickStep: { frequency: 2000, duration: 0.012 },
  gameOver: {
    cells: 8,
    notes: [
      { frequency: 1834, duration: 0.024 },
      { frequency: 2731, duration: 0.034 },
      { frequency: 2048, duration: 0.012 },
    ],
  },
  alarm: { frequency: 2048, duration: 0.2, interval: 1, length: 60 },
} as const;

export const KEY_FEEL_CONFIG = {
  click: {
    round: {
      press: { band: 1900, body: 140, level: 0.24 },
      release: { band: 2700, body: 190, level: 0.1 },
    },
    pill: {
      press: { band: 3300, body: 230, level: 0.17 },
      release: { band: 3900, body: 270, level: 0.08 },
    },
    resonance: 4.5,
    snap: 0.022,
    thump: 0.035,
  },
  vibrationMs: 9,
} as const;

export const KEY_BINDINGS: Record<string, Chute> = {
  q: CHUTE.topLeft,
  a: CHUTE.bottomLeft,
  p: CHUTE.topRight,
  l: CHUTE.bottomRight,
  й: CHUTE.topLeft,
  ф: CHUTE.bottomLeft,
  з: CHUTE.topRight,
  д: CHUTE.bottomRight,
  arrowup: CHUTE.topRight,
  arrowright: CHUTE.bottomRight,
  arrowleft: CHUTE.topLeft,
  arrowdown: CHUTE.bottomLeft,
};
