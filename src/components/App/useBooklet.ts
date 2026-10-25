import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { loadRecords, saveRecords, withScore } from '../../game/records';
import type { RecordStorage, Records } from '../../game/records';
import type { SessionSnapshot } from '../../game/session';
import type { BookletView, GameResult } from '../Booklet';

const INTRO_DELAY_MS = 350;
const RESULTS_DELAY_MS = 1800;

const browserStorage = (): RecordStorage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const useFinishedGame = (snapshot: SessionSnapshot) => {
  const game = snapshot.game?.phase === 'over' ? snapshot.game : null;
  const mode = game?.mode;
  const score = game?.score;
  return useMemo(() => (mode === undefined || score === undefined ? null : { mode, score }), [mode, score]);
};

const useRecords = () => {
  const [records, setRecords] = useState<Records>(() => loadRecords(browserStorage()));
  const latest = useRef(records);
  const submit = useCallback((mode: GameResult['mode'], score: number) => {
    const before = latest.current;
    latest.current = withScore(before, mode, score);
    saveRecords(browserStorage(), latest.current);
    setRecords(latest.current);
    return latest.current !== before;
  }, []);
  return [records, submit] as const;
};

export function useBooklet(snapshot: SessionSnapshot) {
  const [view, setView] = useState<BookletView>('closed');
  const [result, setResult] = useState<GameResult | null>(null);
  const dismissed = useRef(false);
  const finished = useFinishedGame(snapshot);
  const [records, submitScore] = useRecords();
  const idle = !snapshot.game || snapshot.game.phase === 'over';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!dismissed.current) setView(prefersReducedMotion() ? 'welcome' : 'cover');
    }, INTRO_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!finished) return undefined;
    const timer = window.setTimeout(() => {
      setResult({ ...finished, isRecord: submitScore(finished.mode, finished.score), date: new Date() });
      setView('results');
    }, RESULTS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [finished, submitScore]);

  const open = useCallback(() => {
    if (idle) setView('welcome');
  }, [idle]);
  const close = useCallback(() => {
    dismissed.current = true;
    setView('closed');
  }, []);

  return { view, result, records, open, close };
}
