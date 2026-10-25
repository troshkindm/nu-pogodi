import { describe, expect, it } from 'vitest';

import { RENDER_PRESETS, presetOf } from '../../render/settings';

import { defaultPreferences, loadPreferences, parsePreferences, savePreferences } from './preferences';

const fallback = defaultPreferences(false);

describe('preferences', () => {
  it('picks the fast preset for software rendering', () => {
    expect(presetOf(defaultPreferences(true).render)).toBe('fast');
    expect(presetOf(fallback.render)).toBe('photo');
  });

  it('keeps valid fields and falls back for the rest', () => {
    const parsed = parsePreferences(
      JSON.stringify({ sound: false, light: 'disco', render: { shadows: false, bloom: 'yes' } }),
      fallback,
    );
    expect(parsed.sound).toBe(false);
    expect(parsed.light).toBe('static');
    expect(parsed.render.shadows).toBe(false);
    expect(parsed.render.bloom).toBe(true);
    expect(presetOf(parsed.render)).toBeNull();
  });

  it('ignores broken storage', () => {
    expect(parsePreferences('{nope', fallback)).toBe(fallback);
    expect(parsePreferences('42', fallback)).toBe(fallback);
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadPreferences(blocked, fallback)).toBe(fallback);
    expect(savePreferences(blocked, fallback)).toBe(false);
  });

  it('round-trips through storage', () => {
    const items = new Map<string, string>();
    const storage = {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (k: string, v: string) => items.set(k, v),
    };
    const preferences = { sound: false, light: 'pointer' as const, render: RENDER_PRESETS.clean };
    savePreferences(storage, preferences);
    expect(loadPreferences(storage, fallback)).toEqual(preferences);
  });
});
