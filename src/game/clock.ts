import { SOUND_CONFIG } from './config';

export type ClockMode = 'run' | 'setTime' | 'setAlarm';
export type ClockKey = 'time' | 'alarm' | 'hour' | 'minute' | 'run';

export interface Alarm {
  enabled: boolean;
  minutes: number;
}

export interface ClockState {
  mode: ClockMode;
  offsetSeconds: number;
  draft: number;
  alarm: Alarm;
  ringingSince: number | null;
  alarmPreviewUntil: number | null;
}

export interface ClockDisplay {
  minutes: number;
  colon: boolean;
  digits: boolean;
  hare: 'none' | 'rest' | 'ring';
  bellUp: boolean;
}

const DAY = 24 * 60;
const MINUTE = 60;
const ALARM_PREVIEW_SECONDS = 1.5;
const BELL_SWINGS_PER_SECOND = 3;
const DEFAULT_ALARM_MINUTES = 12 * 60;

export const createClock = (): ClockState => ({
  mode: 'run',
  offsetSeconds: 0,
  draft: 0,
  alarm: { enabled: false, minutes: DEFAULT_ALARM_MINUTES },
  ringingSince: null,
  alarmPreviewUntil: null,
});

const wrap = (minutes: number) => ((minutes % DAY) + DAY) % DAY;

const secondsOfDay = (now: Date) => now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

const deviceSeconds = (state: ClockState, now: Date) =>
  (((secondsOfDay(now) + state.offsetSeconds) % (DAY * MINUTE)) + DAY * MINUTE) % (DAY * MINUTE);

export const deviceMinutes = (state: ClockState, now: Date) => Math.floor(deviceSeconds(state, now) / MINUTE);

const seconds = (now: Date) => now.getTime() / 1000;

const adjust = (state: ClockState, step: number): ClockState =>
  state.mode === 'run' ? state : { ...state, draft: wrap(state.draft + step) };

const commit = (state: ClockState, now: Date): ClockState => {
  const base = { ...state, mode: 'run' as const, ringingSince: null };
  if (state.mode === 'setTime')
    return {
      ...base,
      offsetSeconds: state.draft * MINUTE - secondsOfDay(now),
      alarmPreviewUntil: seconds(now) + ALARM_PREVIEW_SECONDS,
    };
  if (state.mode === 'setAlarm') return { ...base, alarm: { ...state.alarm, minutes: state.draft } };
  return { ...base, alarmPreviewUntil: state.ringingSince === null ? seconds(now) + ALARM_PREVIEW_SECONDS : null };
};

export function pressClockKey(state: ClockState, key: ClockKey, now: Date): ClockState {
  switch (key) {
    case 'time':
      return { ...state, mode: 'setTime', draft: deviceMinutes(state, now), ringingSince: null };
    case 'alarm':
      return state.mode === 'setAlarm'
        ? { ...state, alarm: { ...state.alarm, enabled: !state.alarm.enabled } }
        : {
            ...state,
            mode: 'setAlarm',
            draft: state.alarm.minutes,
            alarm: { ...state.alarm, enabled: true },
            ringingSince: null,
          };
    case 'hour':
      return adjust(state, 60);
    case 'minute':
      return adjust(state, 1);
    case 'run':
      return commit(state, now);
    default:
      return state;
  }
}

export function tickClock(state: ClockState, previous: Date, now: Date): ClockState {
  if (state.ringingSince !== null && seconds(now) - state.ringingSince >= SOUND_CONFIG.alarm.length)
    return { ...state, ringingSince: null };
  const crossed = deviceMinutes(state, previous) !== deviceMinutes(state, now);
  if (state.mode === 'run' && state.alarm.enabled && crossed && deviceMinutes(state, now) === state.alarm.minutes)
    return { ...state, ringingSince: seconds(now) };
  return state;
}

export const isRinging = (state: ClockState) => state.ringingSince !== null;

const harePose = (state: ClockState): ClockDisplay['hare'] => {
  if (state.ringingSince !== null) return 'ring';
  const bellShown = state.mode === 'setAlarm' || (state.alarm.enabled && state.mode !== 'setTime');
  return bellShown ? 'rest' : 'none';
};

export function clockDisplay(state: ClockState, now: Date): ClockDisplay {
  const time = seconds(now);
  const halfSecond = Math.floor(time * 2) % 2 === 0;
  const previewing = state.alarmPreviewUntil !== null && time < state.alarmPreviewUntil;
  const bell = {
    hare: harePose(state),
    bellUp: state.ringingSince !== null && Math.floor(time * BELL_SWINGS_PER_SECOND * 2) % 2 === 0,
  };
  if (state.mode === 'setTime') return { minutes: state.draft, colon: true, digits: halfSecond, ...bell };
  if (state.mode === 'setAlarm') return { minutes: state.draft, colon: true, digits: true, ...bell };
  if (previewing) return { minutes: state.alarm.minutes, colon: true, digits: true, ...bell };
  return { minutes: deviceMinutes(state, now), colon: true, digits: true, ...bell };
}

export function parseClock(text: string | null): ClockState {
  try {
    const parsed: unknown = JSON.parse(text ?? 'null');
    if (typeof parsed !== 'object' || parsed === null) return createClock();
    const { offsetSeconds, alarm } = parsed as {
      offsetSeconds?: unknown;
      alarm?: { enabled?: unknown; minutes?: unknown };
    };
    const minutes = Number(alarm?.minutes);
    return {
      ...createClock(),
      offsetSeconds: Number.isFinite(Number(offsetSeconds)) ? Math.round(Number(offsetSeconds)) % (DAY * MINUTE) : 0,
      alarm: {
        enabled: alarm?.enabled === true,
        minutes: Number.isInteger(minutes) && minutes >= 0 && minutes < DAY ? minutes : DEFAULT_ALARM_MINUTES,
      },
    };
  } catch {
    return createClock();
  }
}

export const serializeClock = ({ offsetSeconds, alarm }: ClockState) => JSON.stringify({ offsetSeconds, alarm });
