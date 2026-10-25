import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { createBeeper } from '../../audio/beeper';
import { CHUTE, KEY_BINDINGS } from '../../game/config';
import type { Chute } from '../../game/config';
import { createSession } from '../../game/session';
import type { Session } from '../../game/session';
import { clockSegments, gameSegments } from '../../lcd/segments';
import type { KeyKind } from '../../render/renderer';
import { RENDER_PRESETS } from '../../render/settings';
import { Console } from '../Console';
import type { HeldKey } from '../Console';

import style from './App.module.less';

const ROUND_CHUTES: readonly Chute[] = [CHUTE.topLeft, CHUTE.bottomLeft, CHUTE.topRight, CHUTE.bottomRight];
const PILL_SHORTCUTS = new Map<string, number>([
  ['enter', 0],
  ['1', 0],
  ['2', 1],
  ['t', 2],
]);

const shortcutKey = (key: string): HeldKey | undefined => {
  if (key in KEY_BINDINGS) return { kind: 'round', index: ROUND_CHUTES.indexOf(KEY_BINDINGS[key]) };
  const pill = PILL_SHORTCUTS.get(key);
  return pill === undefined ? undefined : { kind: 'pill', index: pill };
};

const pillActions = (session: Session) => [() => session.start('A'), () => session.start('B'), session.showClock];

const useLitSegments = (session: Session) => {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const segments = snapshot.game ? gameSegments(snapshot.game) : clockSegments(snapshot.now);
  const signature = segments.join();
  return useMemo(() => new Set(signature ? signature.split(',') : []), [signature]);
};

export const App = () => {
  const beeper = useMemo(createBeeper, []);
  const [session] = useState(() => createSession((events) => beeper.play(events)));
  const [held, setHeld] = useState<HeldKey[]>([]);
  const [settings] = useState(RENDER_PRESETS.photo);
  const lit = useLitSegments(session);

  useEffect(() => session.run(), [session]);

  const press = useCallback(
    (kind: KeyKind, index: number) => {
      beeper.unlock();
      if (kind === 'round') session.move(ROUND_CHUTES[index]);
      else pillActions(session)[index]();
      setHeld((keys) => [...keys.filter((key) => key.kind !== kind || key.index !== index), { kind, index }]);
    },
    [session, beeper],
  );
  const release = useCallback((kind: KeyKind, index: number) => {
    setHeld((keys) => keys.filter((key) => key.kind !== kind || key.index !== index));
  }, []);

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      const target = shortcutKey(event.key.toLowerCase());
      if (target && !event.repeat) press(target.kind, target.index);
    };
    const onUp = (event: KeyboardEvent) => {
      const target = shortcutKey(event.key.toLowerCase());
      if (target) release(target.kind, target.index);
    };
    const releaseAll = () => setHeld([]);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', releaseAll);
    };
  }, [press, release]);

  return (
    <main className={style.app}>
      <Console lit={lit} settings={settings} held={held} onPress={press} onRelease={release} />
    </main>
  );
};
