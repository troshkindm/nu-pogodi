export type Vector3 = readonly [number, number, number];

export const LIGHTING = {
  key: [-0.48, -0.55, 0.68] as Vector3,
  flash: [0.04, -0.12, 1] as Vector3,
  keyColor: [0.78, 0.76, 0.73] as Vector3,
  flashColor: [0.36, 0.36, 0.37] as Vector3,
  ambient: [0.17, 0.165, 0.17] as Vector3,
  heightScale: 90,
};

export const RESTING_POINTER = { x: -0.5, y: -0.58 };
const LIGHT_SPREAD = 0.95;
const LIGHT_HEIGHT = 0.72;

export function lightFromPointer(x: number, y: number): Vector3 {
  const clamp = (value: number) => Math.max(-1.2, Math.min(1.2, value));
  const vector = [clamp(x) * LIGHT_SPREAD, clamp(y) * LIGHT_SPREAD, LIGHT_HEIGHT];
  const length = Math.hypot(...vector);
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}
