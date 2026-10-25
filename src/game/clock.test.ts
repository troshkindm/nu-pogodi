import { describe, expect, it } from 'vitest';

import {
  clockDisplay,
  createClock,
  deviceMinutes,
  isRinging,
  parseClock,
  pressClockKey,
  serializeClock,
  tickClock,
} from './clock';

const at = (hours: number, minutes: number, secondsValue = 0) => new Date(2026, 9, 25, hours, minutes, secondsValue);

describe('clock', () => {
  it('shows real time until the owner sets another one', () => {
    expect(deviceMinutes(createClock(), at(21, 7))).toBe(21 * 60 + 7);
  });

  it('sets the time with the hour and minute keys like the manual says', () => {
    const now = at(10, 0, 30);
    let clock = pressClockKey(createClock(), 'time', now);
    clock = pressClockKey(clock, 'hour', now);
    clock = pressClockKey(clock, 'minute', now);
    clock = pressClockKey(clock, 'minute', now);
    clock = pressClockKey(clock, 'run', now);
    expect(clock.mode).toBe('run');
    expect(deviceMinutes(clock, now)).toBe(11 * 60 + 2);
    expect(deviceMinutes(clock, at(10, 1, 30))).toBe(11 * 60 + 3);
  });

  it('wraps hours past midnight', () => {
    const now = at(23, 30);
    const clock = pressClockKey(pressClockKey(createClock(), 'time', now), 'hour', now);
    expect(clockDisplay(clock, now).minutes).toBe(30);
  });

  it('toggles the alarm bell with a second press and rings for a minute', () => {
    const now = at(7, 0);
    let clock = pressClockKey(createClock(), 'alarm', now);
    expect(clock.alarm.enabled).toBe(true);
    clock = pressClockKey(clock, 'alarm', now);
    expect(clock.alarm.enabled).toBe(false);
    clock = pressClockKey(clock, 'alarm', now);
    clock = { ...clock, draft: 7 * 60 + 1 };
    clock = pressClockKey(clock, 'run', now);
    expect(clock.alarm).toEqual({ enabled: true, minutes: 7 * 60 + 1 });

    clock = tickClock(clock, at(7, 0, 59), at(7, 1, 0));
    expect(isRinging(clock)).toBe(true);
    expect(clockDisplay(clock, at(7, 1, 10)).hare).toBe('ring');
    clock = tickClock(clock, at(7, 1, 59), at(7, 2, 0));
    expect(isRinging(clock)).toBe(false);
  });

  it('stops ringing on the time key', () => {
    let clock = { ...createClock(), alarm: { enabled: true, minutes: 8 * 60 } };
    clock = tickClock(clock, at(7, 59, 59), at(8, 0, 0));
    clock = pressClockKey(clock, 'run', at(8, 0, 5));
    expect(isRinging(clock)).toBe(false);
  });

  it('ignores hour and minute keys while the clock runs', () => {
    const clock = createClock();
    expect(pressClockKey(clock, 'hour', at(9, 0))).toBe(clock);
  });

  it('survives storage round trips and bad data', () => {
    const clock = { ...createClock(), offsetSeconds: 3600, alarm: { enabled: true, minutes: 450 } };
    expect(parseClock(serializeClock(clock))).toMatchObject({
      offsetSeconds: 3600,
      alarm: { enabled: true, minutes: 450 },
    });
    expect(parseClock('{"alarm":{"minutes":5000}}').alarm.minutes).toBe(720);
    expect(parseClock('broken')).toEqual(createClock());
  });
});
