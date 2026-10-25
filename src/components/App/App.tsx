import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { createBeeper } from '../../audio/beeper';
import type { GameMode } from '../../game/config';
import { createSession } from '../../game/session';
import type { SessionSnapshot } from '../../game/session';
import { clockSegments, gameSegments } from '../../lcd/segments';
import type { KeyKind } from '../../render/renderer';
import { RENDER_PRESETS } from '../../render/settings';
import { Booklet } from '../Booklet';
import { Console } from '../Console';
import type { HeldKey } from '../Console';
import { Loader, RotateHint } from '../Loader';

import style from './App.module.less';
import { ROUND_CHUTES } from './keys';
import { useBooklet } from './useBooklet';
import { useKeyboard } from './useKeyboard';

const PILL_MODES: readonly (GameMode | null)[] = ['A', 'B', null];

const useLitSegments = (snapshot: SessionSnapshot) => {
  const segments = snapshot.game ? gameSegments(snapshot.game) : clockSegments(snapshot.now);
  const signature = segments.join();
  return useMemo(() => new Set(signature ? signature.split(',') : []), [signature]);
};

const LOADING_LIMIT_MS = 9000;

const useLoading = () => {
  const [consoleReady, setConsoleReady] = useState(false);
  const [bookletReady, setBookletReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), LOADING_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return {
    done: timedOut || (consoleReady && bookletReady),
    revealed,
    onConsoleReady: useCallback(() => setConsoleReady(true), []),
    onBookletReady: useCallback(() => setBookletReady(true), []),
    onRevealed: useCallback(() => setRevealed(true), []),
  };
};

const sameKey = (kind: KeyKind, index: number) => (key: HeldKey) => key.kind === kind && key.index === index;

export const App = () => {
  const beeper = useMemo(createBeeper, []);
  const [session] = useState(() => createSession((events) => beeper.play(events)));
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [held, setHeld] = useState<HeldKey[]>([]);
  const [settings] = useState(RENDER_PRESETS.photo);
  const lit = useLitSegments(snapshot);
  const booklet = useBooklet(snapshot);
  const loading = useLoading();
  const closeBooklet = booklet.close;

  useEffect(() => session.run(), [session]);

  const start = useCallback(
    (mode: GameMode | null) => {
      beeper.unlock();
      if (mode) session.start(mode);
      else session.showClock();
      closeBooklet();
    },
    [session, beeper, closeBooklet],
  );
  const press = useCallback(
    (kind: KeyKind, index: number) => {
      beeper.unlock();
      if (kind === 'round') session.move(ROUND_CHUTES[index]);
      else start(PILL_MODES[index]);
      setHeld((keys) => [...keys.filter((key) => !sameKey(kind, index)(key)), { kind, index }]);
    },
    [session, beeper, start],
  );
  const release = useCallback((kind: KeyKind, index: number) => {
    setHeld((keys) => keys.filter((key) => !sameKey(kind, index)(key)));
  }, []);
  const releaseAll = useCallback(() => setHeld([]), []);

  useKeyboard({ press, release, releaseAll, openBooklet: booklet.open, closeBooklet });

  return (
    <main className={style.app}>
      <Console
        lit={lit}
        settings={settings}
        held={held}
        onPress={press}
        onRelease={release}
        onReady={loading.onConsoleReady}
        dimmed={booklet.view !== 'closed' && loading.revealed}
      />
      <Booklet
        view={booklet.view}
        result={booklet.result}
        records={booklet.records}
        hold={!loading.revealed}
        onStart={start}
        onClose={closeBooklet}
        onReady={loading.onBookletReady}
      />
      <Loader done={loading.done} onGone={loading.onRevealed} />
      <RotateHint />
    </main>
  );
};
