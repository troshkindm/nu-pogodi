import { useCallback, useEffect, useRef, useState } from 'react';

import type { Beeper } from '../../audio/beeper';
import { isRinging, parseClock, pressClockKey, serializeClock, tickClock } from '../../game/clock';
import type { ClockKey, ClockState } from '../../game/clock';
import { SOUND_CONFIG } from '../../game/config';

import { browserStorage } from './storage';

const STORAGE_KEY = 'nupogodi.clock';
const TICK_MS = 250;

const loadClock = () => {
  try {
    return parseClock(browserStorage()?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return parseClock(null);
  }
};

const saveClock = (clock: ClockState) => {
  try {
    browserStorage()?.setItem(STORAGE_KEY, serializeClock(clock));
  } catch {
    return false;
  }
  return true;
};

const useAlarmSound = (ringing: boolean, beeper: Beeper) => {
  useEffect(() => {
    if (!ringing) return undefined;
    beeper.ring();
    const timer = window.setInterval(() => beeper.ring(), SOUND_CONFIG.alarm.interval * 1000);
    return () => window.clearInterval(timer);
  }, [ringing, beeper]);
};

export function useClock(beeper: Beeper, active: boolean) {
  const [clock, setClock] = useState(loadClock);
  const lastTick = useRef(new Date());

  useEffect(() => {
    saveClock(clock);
  }, [clock]);

  useEffect(() => {
    if (!active) return undefined;
    lastTick.current = new Date();
    const timer = window.setInterval(() => {
      const previous = lastTick.current;
      const now = new Date();
      lastTick.current = now;
      setClock((current) => tickClock(current, previous, now));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [active]);

  useAlarmSound(active && isRinging(clock), beeper);

  const press = useCallback((key: ClockKey) => setClock((current) => pressClockKey(current, key, new Date())), []);
  return { clock, press };
}
