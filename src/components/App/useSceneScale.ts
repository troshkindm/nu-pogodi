import { useEffect, useState } from 'react';

import { autoSceneScale } from './preferences';

const CONSOLE_ASPECT = 1036 / 612;
const SIDE_GUTTERS = 132;

const availableWidth = () => Math.min(window.innerWidth - SIDE_GUTTERS, window.innerHeight * CONSOLE_ASPECT);

export function useSceneScale(preferred: number | null) {
  const [touch] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  const [available, setAvailable] = useState(availableWidth);

  useEffect(() => {
    const onResize = () => setAvailable(availableWidth());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const scale = touch ? 1 : preferred ?? autoSceneScale(available);
  useEffect(() => document.documentElement.style.setProperty('--scene-scale', String(scale)), [scale]);
  return { scale, scalable: !touch };
}
