import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { createBeeper } from '../../audio/beeper';
import { createSession } from '../../game/session';
import type { SessionSnapshot } from '../../game/session';
import { clockSegments, gameSegments } from '../../lcd/segments';
import { Booklet } from '../Booklet';
import { Console } from '../Console';
import { Loader, RotateHint } from '../Loader';
import { Toolbar } from '../Toolbar';

import style from './App.module.less';
import { useBooklet } from './useBooklet';
import { useControls } from './useControls';
import { useKeyboard } from './useKeyboard';
import { supportedLightMode, useLight } from './useLight';
import { useLoading } from './useLoading';
import { usePreferences } from './usePreferences';

const useLitSegments = (snapshot: SessionSnapshot) => {
  const segments = snapshot.game ? gameSegments(snapshot.game) : clockSegments(snapshot.now);
  const signature = segments.join();
  return useMemo(() => new Set(signature ? signature.split(',') : []), [signature]);
};

export const App = () => {
  const beeper = useMemo(createBeeper, []);
  const [session] = useState(() => createSession((events) => beeper.play(events)));
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [preferences, setPreferences] = usePreferences();
  const light = useLight(supportedLightMode(preferences.light));
  const lit = useLitSegments(snapshot);
  const booklet = useBooklet(snapshot);
  const loading = useLoading();
  const controls = useControls(session, beeper, booklet.close);
  const bookletOpen = booklet.view !== 'closed';
  const playing = Boolean(snapshot.game) && snapshot.game?.phase !== 'over';

  useEffect(() => session.run(), [session]);
  useEffect(() => beeper.setMuted(!preferences.sound), [beeper, preferences.sound]);
  useEffect(() => session.setPaused(bookletOpen), [session, bookletOpen]);

  const toggleBooklet = bookletOpen ? booklet.close : booklet.open;
  const toggleSound = useCallback(
    () => setPreferences((current) => ({ ...current, sound: !current.sound })),
    [setPreferences],
  );
  useKeyboard({ ...controls, openBooklet: booklet.open, closeBooklet: booklet.close, toggleSound });

  return (
    <main className={style.app}>
      <Console
        lit={lit}
        settings={preferences.render}
        light={light}
        held={controls.held}
        onPress={controls.press}
        onRelease={controls.release}
        onReady={loading.onConsoleReady}
        dimmed={bookletOpen && loading.revealed}
      />
      <Booklet
        view={booklet.view}
        result={booklet.result}
        records={booklet.records}
        hold={!loading.revealed}
        onStart={controls.start}
        onClose={booklet.close}
        onReady={loading.onBookletReady}
      />
      <Toolbar
        preferences={preferences}
        playing={playing}
        bookletOpen={bookletOpen}
        onChange={setPreferences}
        onBooklet={toggleBooklet}
      />
      <Loader done={loading.done} onGone={loading.onRevealed} />
      <RotateHint />
    </main>
  );
};
