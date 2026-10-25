import { useEffect, useMemo, useState } from 'react';

import { loaderSegments } from '../../lcd/segments';
import { Lcd } from '../Lcd';

import style from './Loader.module.less';

const FRAME_MS = 210;
const FADE_MS = 650;

interface LoaderProps {
  done: boolean;
  onGone(): void;
}

export const Loader = ({ done, onGone }: LoaderProps) => {
  const [frame, setFrame] = useState(0);
  const [gone, setGone] = useState(false);
  const lit = useMemo(() => new Set(loaderSegments(frame)), [frame]);

  useEffect(() => {
    const timer = window.setInterval(() => setFrame((current) => current + 1), FRAME_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!done) return undefined;
    const timer = window.setTimeout(() => {
      setGone(true);
      onGone();
    }, FADE_MS);
    return () => window.clearTimeout(timer);
  }, [done, onGone]);

  if (gone) return null;
  return (
    <div className={`${style.loader} ${done ? style.done : ''}`} role="status" aria-label="Загрузка">
      <div className={style.screen}>
        <Lcd lit={lit} />
      </div>
      <p className={style.caption}>Загрузка</p>
    </div>
  );
};
