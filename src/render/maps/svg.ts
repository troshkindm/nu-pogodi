import { LED_HOLES, MAP_SIZE, PILL_KEYS, ROUND_KEYS, VIEW, height, width } from '../device/geometry';
import type { Point, Rect } from '../device/geometry';

const FONTS =
  "<style>text{font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif}.rounded{font-family:'Arial Rounded MT Bold','Nunito','Segoe UI',sans-serif}</style>";

export const FULL_VIEW = `x="${VIEW.x - 20}" y="${VIEW.y - 20}" width="${VIEW.w + 40}" height="${VIEW.h + 40}"`;

export const svgDocument = (content: string, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${MAP_SIZE.width}" height="${MAP_SIZE.height}" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" preserveAspectRatio="none">${FONTS}<defs>${defs}</defs>${content}</svg>`;

export const rect = (r: Rect, radius: number, fill: string, extra = '') =>
  `<rect x="${r.x1}" y="${r.y1}" width="${width(r)}" height="${height(r)}" rx="${radius}" fill="${fill}" ${extra}/>`;

export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x1: a.x1 + (b.x1 - a.x1) * t,
  y1: a.y1 + (b.y1 - a.y1) * t,
  x2: a.x2 + (b.x2 - a.x2) * t,
  y2: a.y2 + (b.y2 - a.y2) * t,
});

const gray = (value: number) => {
  const hex = Math.round(value).toString(16).padStart(2, '0');
  return `#${hex}${hex}${hex}`;
};

interface SlopeTones {
  from: number;
  to: number;
  steps: number;
  radius: number;
}

export const steppedSlope = (outer: Rect, inner: Rect, { from, to, steps, radius }: SlopeTones) =>
  Array.from({ length: steps + 1 }, (_, i) =>
    rect(lerpRect(outer, inner, i / steps), radius, gray(from + ((to - from) * i) / steps)),
  ).join('');

export const polygon = (points: readonly Point[], fill: string, extra = '') =>
  `<path d="M${points.map((p) => p.join(' ')).join(' L')} Z" fill="${fill}" ${extra}/>`;

export const walls = (outer: Rect, inner: Rect) => ({
  top: [
    [outer.x1, outer.y1],
    [outer.x2, outer.y1],
    [inner.x2, inner.y1],
    [inner.x1, inner.y1],
  ] as Point[],
  right: [
    [outer.x2, outer.y1],
    [outer.x2, outer.y2],
    [inner.x2, inner.y2],
    [inner.x2, inner.y1],
  ] as Point[],
  bottom: [
    [inner.x1, inner.y2],
    [inner.x2, inner.y2],
    [outer.x2, outer.y2],
    [outer.x1, outer.y2],
  ] as Point[],
  left: [
    [outer.x1, outer.y1],
    [inner.x1, inner.y1],
    [inner.x1, inner.y2],
    [outer.x1, outer.y2],
  ] as Point[],
});

export const roundKeys = (radius: number, fill: string, extra = '') =>
  ROUND_KEYS.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" ${extra}/>`).join('');

export const pillKeys = (w: number, h: number, fill: string, extra = '') =>
  PILL_KEYS.map(
    ([cx, cy]) =>
      `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" ${extra}/>`,
  ).join('');

export const ledHoles = (fill: string, extra = '', radius = 12.5) =>
  LED_HOLES.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" ${extra}/>`).join('');
