import { seededRandom } from '../../game/random';

import { PAGE, fontOf } from './typesetter';

export const MARK_INK = { stamp: '#5e4f8c', pen: '#1d2d86' };

export interface PageLayers {
  print: CanvasRenderingContext2D;
  stamp: CanvasRenderingContext2D;
  pen: CanvasRenderingContext2D;
}

export function createLayers(scale: number): PageLayers {
  const layer = () => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(PAGE.width * scale);
    canvas.height = Math.round(PAGE.height * scale);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.scale(scale, scale);
    ctx.textBaseline = 'alphabetic';
    return ctx;
  };
  return { print: layer(), stamp: layer(), pen: layer() };
}

interface StampSpec {
  text: string;
  x: number;
  y: number;
  height: number;
  tilt: number;
  framed?: boolean;
  seed?: number;
}

export function stamp(
  ctx: CanvasRenderingContext2D,
  { text, x, y, height, tilt, framed = false, seed = 1 }: StampSpec,
) {
  const random = seededRandom(seed * 977 + text.length);
  const size = height * (framed ? 0.56 : 0.86);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((tilt * Math.PI) / 180);
  ctx.font = fontOf({ size, weight: 400 });
  const width = ctx.measureText(text).width * 0.86;
  ctx.fillStyle = MARK_INK.stamp;
  ctx.strokeStyle = MARK_INK.stamp;
  [...text].reduce((cursor, char) => {
    const advance = ctx.measureText(char).width * 0.86;
    ctx.save();
    ctx.translate(cursor + (random() - 0.5) * 2, (random() - 0.5) * size * 0.06);
    ctx.scale(0.86, 1);
    ctx.globalAlpha = 0.78 + random() * 0.22;
    ctx.fillText(char, 0, size * 0.35);
    ctx.restore();
    return cursor + advance;
  }, -width / 2);
  if (framed) {
    ctx.lineWidth = height * 0.05;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.roundRect(-width / 2 - height * 0.32, -height / 2, width + height * 0.64, height, height * 0.08);
    ctx.stroke();
  }
  ctx.restore();
  return width;
}

interface PenSpec {
  text: string;
  x: number;
  y: number;
  size: number;
  tilt?: number;
  seed?: number;
  align?: CanvasTextAlign;
}

export function handwriting(
  ctx: CanvasRenderingContext2D,
  { text, x, y, size, tilt = -3, seed = 1, align = 'left' }: PenSpec,
) {
  const random = seededRandom(seed * 131 + text.length * 7);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((tilt * Math.PI) / 180);
  ctx.font = fontOf({ size, weight: 600, family: 'Caveat' });
  const { width } = ctx.measureText(text);
  const start = align === 'center' ? -width / 2 : 0;
  ctx.fillStyle = MARK_INK.pen;
  [...text].reduce((cursor, char) => {
    ctx.globalAlpha = 0.9 + random() * 0.1;
    ctx.fillText(char, cursor, (random() - 0.5) * size * 0.06);
    return cursor + ctx.measureText(char).width;
  }, start);
  ctx.restore();
  return width;
}

export function underline(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, seed: number) {
  const random = seededRandom(seed);
  ctx.save();
  ctx.strokeStyle = MARK_INK.pen;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y);
  for (let x = x1; x < x2; x += 24) ctx.quadraticCurveTo(x + 12, y + (random() - 0.5) * 9, x + 24, y);
  ctx.stroke();
  ctx.restore();
}
