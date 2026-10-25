import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { GameMode } from '../../game/config';
import type { Records } from '../../game/records';
import { cssVariables } from '../style';

import style from './Booklet.module.less';
import { CORNER, KEYS_TOP, sheetContents } from './content';
import type { ContentData, GameResult, SheetContent } from './content';
import { LaunchKeys } from './LaunchKeys';
import { loadBookletAssets, pageScale, useSheets } from './useSheets';

export type BookletView = 'closed' | 'cover' | 'welcome' | 'results';

const VIEW_POSITION: Record<BookletView, number | null> = { closed: null, cover: 0, welcome: 1, results: 2 };
const LEAVES = 4;
const COVER_PAUSE_MS = 1100;
const LAST_POSITION = LEAVES - 1;
const KEY_SHEETS = new Map<number, 'welcome' | 'results'>([
  [2, 'welcome'],
  [4, 'results'],
]);

interface BookletProps {
  view: BookletView;
  result: GameResult | null;
  records: Records;
  hold: boolean;
  onStart(mode: GameMode): void;
  onClose(): void;
  onReady(): void;
}

const usePosition = (view: BookletView) => {
  const [position, setPosition] = useState(0);
  const [syncedView, setSyncedView] = useState(view);
  if (view !== syncedView) {
    setSyncedView(view);
    const target = VIEW_POSITION[view];
    if (target !== null) setPosition(target);
  }
  return [position, setPosition] as const;
};

const useContents = (result: GameResult | null, records: Records) => {
  const [assets, setAssets] = useState<{ diagram: HTMLImageElement } | null>(null);
  const [touch] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  useEffect(() => {
    let active = true;
    loadBookletAssets()
      .then((loaded) => active && setAssets(loaded))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return useMemo<SheetContent[] | null>(() => {
    if (!assets) return null;
    const data: ContentData = { result, records, touch, diagram: assets.diagram };
    return sheetContents(data);
  }, [assets, result, records, touch]);
};

const useScale = () => {
  const [scale, setScale] = useState(pageScale);
  useEffect(() => {
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () =>
          setScale((current) => {
            const next = pageScale();
            return Math.abs(next - current) / current > 0.2 ? next : current;
          }),
        300,
      );
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
};

const usePageKeys = (shown: boolean, turn: (step: number) => void) => {
  useEffect(() => {
    if (!shown) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'PageDown') turn(1);
      else if (event.key === 'PageUp') turn(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, turn]);
};

const SWIPE_DISTANCE = 40;

const useSwipe = (turn: (step: number) => void) => {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (event: React.PointerEvent) => {
      start.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: React.PointerEvent) => {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) turn(dx < 0 ? 1 : -1);
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
};

const useAutoOpen = (waiting: boolean, setPosition: (position: number) => void) => {
  const opened = useRef(false);
  useEffect(() => {
    if (!waiting || opened.current) return undefined;
    const timer = window.setTimeout(() => {
      opened.current = true;
      setPosition(1);
    }, COVER_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [waiting, setPosition]);
};

const keysTop = cssVariables({ keysTop: `${(KEYS_TOP / 1380) * 100}%`, corner: `${(CORNER / 1000) * 140}%` });

export const Booklet = memo(({ view, result, records, hold, onStart, onClose, onReady }: BookletProps) => {
  const book = useRef<HTMLDivElement>(null);
  const [position, setPosition] = usePosition(view);
  const contents = useContents(result, records);
  const { canvases, ready } = useSheets(contents, useScale());
  const shown = view !== 'closed' && ready && !hold;
  const turn = useCallback(
    (step: number) => setPosition((current) => Math.min(LAST_POSITION, Math.max(0, current + step))),
    [setPosition],
  );
  const swipe = useSwipe(turn);

  useEffect(() => {
    if (ready) onReady();
  }, [ready, onReady]);
  usePageKeys(shown, turn);
  useAutoOpen(shown && view === 'cover', setPosition);

  useEffect(() => {
    if (shown && (view === 'welcome' || view === 'results'))
      book.current?.querySelector<HTMLElement>('[data-autofocus]:not([inert] *)')?.focus({ preventScroll: true });
  }, [shown, view]);

  const face = (sheet: number, visible: boolean): ReactNode => {
    if (sheet >= (contents?.length ?? 7)) return <div className={style.endpaper} />;
    const back = sheet % 2 === 1;
    const canvas = (
      <canvas
        ref={(node) => {
          canvases.current[sheet] = node;
        }}
        className={style.sheet}
      />
    );
    if (sheet === 0)
      return (
        <button
          type="button"
          className={`${style.face} ${style.cover}`}
          onClick={() => setPosition(1)}
          tabIndex={position === 0 ? 0 : -1}
          aria-label="Открыть руководство"
        >
          {canvas}
        </button>
      );
    const keys = KEY_SHEETS.get(sheet);
    const isLast = sheet === (contents?.length ?? 7) - 1;
    return (
      <section
        className={`${style.face} ${back ? style.back : style.front}`}
        inert={!visible}
        aria-label={contents?.[sheet].label}
      >
        {canvas}
        {keys && <LaunchKeys preferred={keys === 'results' ? result?.mode ?? 'A' : 'A'} onStart={onStart} />}
        {!(isLast && !back) && (
          <button
            type="button"
            className={style.corner}
            onClick={() => turn(back ? -1 : 1)}
            aria-label={back ? 'Предыдущая страница' : 'Следующая страница'}
          />
        )}
      </section>
    );
  };

  const leaves = Array.from({ length: LEAVES }, (_, leaf) => {
    const turned = leaf < position;
    const depth = turned ? leaf + 1 : LEAVES - leaf;
    return (
      <div
        key={leaf}
        className={`${style.leaf} ${turned ? style.turned : ''}`}
        style={cssVariables({ depth: String(depth) })}
      >
        {face(leaf * 2, !turned && leaf === position)}
        {face(leaf * 2 + 1, turned && leaf === position - 1)}
      </div>
    );
  });

  const classes = [style.stage, shown && style.shown, position > 0 && style.open].filter(Boolean).join(' ');
  return (
    <div className={classes} role="dialog" aria-modal="true" aria-label="Руководство по эксплуатации" inert={!shown}>
      <div className={style.backdrop} onClick={onClose} aria-hidden="true" />
      <div ref={book} className={style.book} style={keysTop} {...swipe}>
        {leaves}
      </div>
    </div>
  );
});
