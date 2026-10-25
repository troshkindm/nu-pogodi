import { useCallback, useEffect, useRef, useState } from 'react';

import { LIGHTING, RESTING_POINTER, lightFromPointer } from '../../render/lighting';
import type { Vector3 } from '../../render/lighting';

import type { LightMode } from './preferences';

const TILT_RANGE = 40;
const POINTER_RANGE = 0.45;
const SMOOTHING_MS = 320;
const SETTLED = 0.0005;

export const deviceLightModes = (): readonly LightMode[] =>
  window.matchMedia('(pointer: coarse)').matches ? ['static', 'gyro'] : ['static', 'pointer'];

export const supportedLightMode = (mode: LightMode) => (deviceLightModes().includes(mode) ? mode : 'static');

type Aim = (light: Vector3) => void;

const towards = (from: Vector3, to: Vector3, amount: number): Vector3 => {
  const mixed = from.map((value, i) => value + (to[i] - value) * amount);
  const length = Math.hypot(...mixed);
  return [mixed[0] / length, mixed[1] / length, mixed[2] / length];
};

const distance = (a: Vector3, b: Vector3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

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

const followPointer = (aim: Aim) => {
  const onMove = (event: PointerEvent) =>
    aim(
      lightFromPointer(
        RESTING_POINTER.x + ((event.clientX / window.innerWidth) * 2 - 1) * POINTER_RANGE,
        RESTING_POINTER.y + ((event.clientY / window.innerHeight) * 2 - 1) * POINTER_RANGE,
      ),
    );
  window.addEventListener('pointermove', onMove);
  return () => window.removeEventListener('pointermove', onMove);
};

const followTilt = (aim: Aim) => {
  let neutral: [number, number] | null = null;
  const onTilt = ({ beta, gamma }: DeviceOrientationEvent) => {
    if (beta === null || gamma === null) return;
    const [x, y] = screenAxes(beta, gamma);
    neutral ??= [x, y];
    aim(
      lightFromPointer(
        RESTING_POINTER.x + (x - neutral[0]) / TILT_RANGE,
        RESTING_POINTER.y + (y - neutral[1]) / TILT_RANGE,
      ),
    );
  };
  window.addEventListener('deviceorientation', onTilt);
  return () => window.removeEventListener('deviceorientation', onTilt);
};

const useSmoothedLight = () => {
  const [light, setLight] = useState<Vector3>(LIGHTING.key);
  const motion = useRef({ current: LIGHTING.key, target: LIGHTING.key, frame: 0, last: 0 });

  const aim = useCallback<Aim>((target) => {
    const state = motion.current;
    state.target = target;
    if (state.frame) return;
    state.last = performance.now();
    const step = (now: number) => {
      state.current = towards(state.current, state.target, 1 - Math.exp(-(now - state.last) / SMOOTHING_MS));
      state.last = now;
      const settled = distance(state.current, state.target) < SETTLED;
      if (settled) state.current = state.target;
      setLight(state.current);
      state.frame = settled ? 0 : requestAnimationFrame(step);
    };
    state.frame = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => cancelAnimationFrame(motion.current.frame), []);
  return [light, aim] as const;
};

export function useLight(mode: LightMode): Vector3 {
  const [light, aim] = useSmoothedLight();

  useEffect(() => {
    if (mode === 'static') {
      aim(LIGHTING.key);
      return undefined;
    }
    return mode === 'pointer' ? followPointer(aim) : followTilt(aim);
  }, [mode, aim]);

  return light;
}
