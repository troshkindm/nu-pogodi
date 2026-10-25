import { useEffect, useRef, useState } from 'react';

import { createLayers } from '../../render/paper/inks';
import { createPaperRenderer } from '../../render/paper/renderer';
import type { PaperRenderer } from '../../render/paper/renderer';
import { PAGE } from '../../render/paper/typesetter';

import { CORNER } from './content';
import type { SheetContent } from './content';
import { CONSOLE_DIAGRAM_URL } from './diagram';

const FONTS = ['400 40px Jost', '600 40px Jost', '700 40px Jost', '600 40px Caveat'];
const FIRST_SPREAD = 3;
const SPREAD_ASPECT = 1.45;

const nextFrame = () =>
  new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });

export const pageScale = () => {
  const spreadWidth = Math.min(window.innerWidth - 132, window.innerHeight * 0.9 * SPREAD_ASPECT);
  const pixels = (spreadWidth / 2) * Math.min(window.devicePixelRatio || 1, 2.5);
  return Math.min(1.15, Math.max(0.42, pixels / PAGE.width));
};

export async function loadBookletAssets() {
  const diagram = new Image();
  diagram.src = CONSOLE_DIAGRAM_URL;
  await Promise.all([diagram.decode(), ...FONTS.map((font) => document.fonts.load(font, 'АаQq←'))]);
  return { diagram };
}

export function useSheets(contents: SheetContent[] | null, scale: number) {
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const rendered = useRef<string[]>([]);
  const renderer = useRef<PaperRenderer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(
    () => () => {
      renderer.current?.dispose();
      renderer.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!contents) return undefined;
    let cancelled = false;
    renderer.current ??= createPaperRenderer();
    const paper = renderer.current;
    const renderSheet = async (content: SheetContent, index: number) => {
      const key = `${content.key}@${scale}`;
      const target = canvases.current[index];
      if (cancelled || !target || rendered.current[index] === key) return;
      const layers = createLayers(scale);
      content.draw(layers);
      paper.render(
        {
          layers,
          spine: index % 2 === 0 ? 'left' : 'right',
          cover: index === 0,
          corner: index === 0 ? 0 : CORNER,
          seed: index * 1.37 + 0.5,
        },
        target,
      );
      rendered.current[index] = key;
      await nextFrame();
    };
    const run = () =>
      contents.reduce(
        (chain, content, index) =>
          chain.then(async () => {
            await renderSheet(content, index);
            if (index + 1 === FIRST_SPREAD && !cancelled) setReady(true);
          }),
        Promise.resolve(),
      );
    run().catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, [contents, scale]);

  return { canvases, ready };
}
