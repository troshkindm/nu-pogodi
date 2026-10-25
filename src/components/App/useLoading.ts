import { useCallback, useEffect, useState } from 'react';

const LOADING_LIMIT_MS = 9000;

export function useLoading() {
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
}
