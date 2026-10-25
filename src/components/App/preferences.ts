import { FEATURES, RENDER_PRESETS } from '../../render/settings';
import type { RenderSettings } from '../../render/settings';

import type { KeyValueStorage } from './storage';

export type LightMode = 'static' | 'pointer' | 'gyro';

export interface Preferences {
  sound: boolean;
  light: LightMode;
  render: RenderSettings;
  scale: number | null;
}

export const SCENE_SCALE = { min: 0.5, max: 1, step: 0.05, autoMin: 0.8, autoWidth: 1600 };

export const autoSceneScale = (available: number) =>
  Math.min(SCENE_SCALE.max, Math.max(SCENE_SCALE.autoMin, SCENE_SCALE.autoWidth / available));

const STORAGE_KEY = 'nupogodi.preferences';
const LIGHT_MODES: readonly LightMode[] = ['static', 'pointer', 'gyro'];

export const defaultPreferences = (softwareRendering: boolean): Preferences => ({
  sound: true,
  light: 'static',
  render: softwareRendering ? RENDER_PRESETS.fast : RENDER_PRESETS.photo,
  scale: null,
});

const validScale = (value: unknown, fallback: number | null) => {
  if (value === null) return null;
  return typeof value === 'number' && value >= SCENE_SCALE.min && value <= SCENE_SCALE.max ? value : fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const parseRender = (value: unknown, fallback: RenderSettings): RenderSettings => {
  if (!isRecord(value)) return fallback;
  return Object.fromEntries(
    FEATURES.map((feature) => [feature, typeof value[feature] === 'boolean' ? value[feature] : fallback[feature]]),
  ) as RenderSettings;
};

export function parsePreferences(text: string | null, fallback: Preferences): Preferences {
  try {
    const parsed: unknown = JSON.parse(text ?? 'null');
    if (!isRecord(parsed)) return fallback;
    const light = LIGHT_MODES.find((mode) => mode === parsed.light) ?? fallback.light;
    return {
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : fallback.sound,
      light,
      render: parseRender(parsed.render, fallback.render),
      scale: validScale(parsed.scale, fallback.scale),
    };
  } catch {
    return fallback;
  }
}

export function loadPreferences(storage: KeyValueStorage | undefined, fallback: Preferences): Preferences {
  try {
    return parsePreferences(storage?.getItem(STORAGE_KEY) ?? null, fallback);
  } catch {
    return fallback;
  }
}

export function savePreferences(storage: KeyValueStorage | undefined, preferences: Preferences): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(preferences));
    return Boolean(storage);
  } catch {
    return false;
  }
}
