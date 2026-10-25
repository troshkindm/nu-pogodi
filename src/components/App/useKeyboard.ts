import { useEffect } from 'react';

import { KEY_BINDINGS } from '../../game/config';
import type { KeyKind } from '../../render/renderer';
import type { HeldKey } from '../Console';

import { ROUND_CHUTES } from './keys';

const PILL_SHORTCUTS = new Map<string, number>([
  ['enter', 0],
  ['1', 0],
  ['2', 1],
  ['t', 2],
  ['е', 2],
]);
const HELP_KEYS = new Set(['h', 'р', '?']);

const shortcutKey = (key: string): HeldKey | undefined => {
  if (key in KEY_BINDINGS) return { kind: 'round', index: ROUND_CHUTES.indexOf(KEY_BINDINGS[key]) };
  const pill = PILL_SHORTCUTS.get(key);
  return pill === undefined ? undefined : { kind: 'pill', index: pill };
};

const isButtonActivation = (event: KeyboardEvent, key: string) =>
  (key === 'enter' || key === ' ') && event.target instanceof HTMLButtonElement;

export interface KeyboardActions {
  press(kind: KeyKind, index: number): void;
  release(kind: KeyKind, index: number): void;
  releaseAll(): void;
  openBooklet(): void;
  closeBooklet(): void;
}

export function useKeyboard({ press, release, releaseAll, openBooklet, closeBooklet }: KeyboardActions) {
  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const target = shortcutKey(key);
      if (key === 'escape') closeBooklet();
      else if (HELP_KEYS.has(key)) openBooklet();
      else if (target && !event.repeat && !isButtonActivation(event, key)) press(target.kind, target.index);
    };
    const onUp = (event: KeyboardEvent) => {
      const target = shortcutKey(event.key.toLowerCase());
      if (target) release(target.kind, target.index);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', releaseAll);
    };
  }, [press, release, releaseAll, openBooklet, closeBooklet]);
}
