import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { createBeeper } from '../../audio/beeper';
import { CHUTE, KEY_BINDINGS } from '../../game/config';
import type { Chute, GameMode } from '../../game/config';
import { createSession } from '../../game/session';
import { clockSegments, gameSegments } from '../../lcd/segments';
import { Lcd } from '../Lcd';

import style from './App.module.less';

const START_KEYS = new Map<string, GameMode>([
  ['enter', 'A'],
  ['1', 'A'],
  ['2', 'B'],
]);

export const App = () => {
  const beeper = useMemo(createBeeper, []);
  const [session] = useState(() => createSession((events) => beeper.play(events)));
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const lit = useMemo(
    () => new Set(snapshot.game ? gameSegments(snapshot.game) : clockSegments(snapshot.now)),
    [snapshot],
  );

  useEffect(() => session.run(), [session]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      beeper.unlock();
      if (key in KEY_BINDINGS) session.move(KEY_BINDINGS[key]);
      else if (START_KEYS.has(key)) session.start(START_KEYS.get(key) as GameMode);
      else if (key === 't') session.showClock();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, beeper]);

  const press = (action: () => void) => () => {
    beeper.unlock();
    action();
  };
  const wolfButton = (chute: Chute, label: string) => (
    <button type="button" className={style.round} aria-label={label} onPointerDown={press(() => session.move(chute))} />
  );

  return (
    <main className={style.app}>
      <div className={style.console}>
        <div className={style.side}>
          {wolfButton(CHUTE.topLeft, 'Волк влево вверх')}
          {wolfButton(CHUTE.bottomLeft, 'Волк влево вниз')}
        </div>
        <div className={style.screen}>
          <Lcd lit={lit} />
        </div>
        <div className={style.side}>
          <div className={style.pills}>
            <button type="button" className={style.pill} onPointerDown={press(() => session.start('A'))}>
              игра А
            </button>
            <button type="button" className={style.pill} onPointerDown={press(() => session.start('B'))}>
              игра Б
            </button>
            <button type="button" className={style.pill} onPointerDown={press(session.showClock)}>
              время
            </button>
          </div>
          {wolfButton(CHUTE.topRight, 'Волк вправо вверх')}
          {wolfButton(CHUTE.bottomRight, 'Волк вправо вниз')}
        </div>
      </div>
    </main>
  );
};
