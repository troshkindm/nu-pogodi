import { useEffect, useState } from 'react';

import { LIGHTING, RESTING_POINTER, lightFromPointer } from '../../render/lighting';
import type { Vector3 } from '../../render/lighting';

import type { LightMode } from './preferences';

const TILT_RANGE = 28;

export const deviceLightModes = (): readonly LightMode[] =>
  window.matchMedia('(pointer: coarse)').matches ? ['static', 'gyro'] : ['static', 'pointer'];

export const supportedLightMode = (mode: LightMode) => (deviceLightModes().includes(mode) ? mode : 'static');

type Schedule = (light: Vector3) => void;

interface TiltPermission {
  requestPermission?: () => Promise<string>;
}

export async function requestTiltPermission(): Promise<boolean> {
  if (!('DeviceOrientationEvent' in window)) return false;
  const { requestPermission } = DeviceOrientationEvent as unknown as TiltPermission;
  if (!requestPermission) return true;
  try {
    return (await requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

const screenAxes = (beta: number, gamma: number): [number, number] => {
  const angle = window.screen.orientation?.angle ?? 0;
  if (angle === 90) return [beta, -gamma];
  if (angle === 270) return [-beta, gamma];
  if (angle === 180) return [-gamma, -beta];
  return [gamma, beta];
};

const followPointer = (schedule: Schedule) => {
  const onMove = (event: PointerEvent) =>
    schedule(
      lightFromPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1),
    );
  window.addEventListener('pointermove', onMove);
  return () => window.removeEventListener('pointermove', onMove);
};

const followTilt = (schedule: Schedule) => {
  let neutral: [number, number] | null = null;
  const onTilt = ({ beta, gamma }: DeviceOrientationEvent) => {
    if (beta === null || gamma === null) return;
    const [x, y] = screenAxes(beta, gamma);
    neutral ??= [x, y];
    schedule(
      lightFromPointer(
        RESTING_POINTER.x + (x - neutral[0]) / TILT_RANGE,
        RESTING_POINTER.y + (y - neutral[1]) / TILT_RANGE,
      ),
    );
  };
  window.addEventListener('deviceorientation', onTilt);
  return () => window.removeEventListener('deviceorientation', onTilt);
};

export function useLight(mode: LightMode): Vector3 {
  const [light, setLight] = useState<Vector3>(LIGHTING.key);

  useEffect(() => {
    if (mode === 'static') {
      setLight(LIGHTING.key);
      return undefined;
    }
    let frame = 0;
    let pending: Vector3 = LIGHTING.key;
    const schedule: Schedule = (next) => {
      pending = next;
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        setLight(pending);
      });
    };
    const stop = mode === 'pointer' ? followPointer(schedule) : followTilt(schedule);
    return () => {
      stop();
      cancelAnimationFrame(frame);
    };
  }, [mode]);

  return light;
}
