import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { createBeeper } from '../../audio/beeper';
import { clockDisplay } from '../../game/clock';
import type { ClockState } from '../../game/clock';
import { createSession } from '../../game/session';
import type { SessionSnapshot } from '../../game/session';
import { clockSegments, gameSegments } from '../../lcd/segments';
import { Booklet } from '../Booklet';
import { Console } from '../Console';
import { Credit } from '../Credit';
import { Loader, RotateHint } from '../Loader';
import { Toolbar } from '../Toolbar';

import style from './App.module.less';
import { useBooklet } from './useBooklet';
import { useClock } from './useClock';
import { useControls } from './useControls';
import { useKeyboard } from './useKeyboard';
import { supportedLightMode, useLight } from './useLight';
import { useLoading } from './useLoading';
import { usePreferences } from './usePreferences';

const useLitSegments = (snapshot: SessionSnapshot, clock: ClockState) => {
  const segments = snapshot.game ? gameSegments(snapshot.game) : clockSegments(clockDisplay(clock, snapshot.now));
  const signature = segments.join();
  return useMemo(() => new Set(signature ? signature.split(',') : []), [signature]);
};

export const App = () => {
  const beeper = useMemo(createBeeper, []);
  const [session] = useState(() => createSession((events) => beeper.play(events)));
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [preferences, setPreferences] = usePreferences();
  const light = useLight(supportedLightMode(preferences.light));
  const clock = useClock(beeper, !snapshot.game);
  const lit = useLitSegments(snapshot, clock.clock);
  const booklet = useBooklet(snapshot);
  const loading = useLoading();
  const playing = Boolean(snapshot.game) && snapshot.game?.phase !== 'over';
  const controls = useControls(session, beeper, {
    gameActive: Boolean(snapshot.game),
    onPill: booklet.close,
    onClockKey: clock.press,
  });
  const bookletOpen = booklet.view !== 'closed';

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
        onHole={controls.pressHole}
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
      <Credit />
      <Loader done={loading.done} onGone={loading.onRevealed} />
      <RotateHint />
    </main>
  );
};
