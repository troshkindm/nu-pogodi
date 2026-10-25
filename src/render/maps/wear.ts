import { seededRandom } from '../../game/random';
import { ROUND_KEYS } from '../device/geometry';
import type { Rect } from '../device/geometry';

const nearRoundKey = (x: number, y: number, distance: number) =>
  ROUND_KEYS.some(([cx, cy]) => Math.hypot(x - cx, y - cy) < distance);
const insideTray = (x: number, y: number) => x > 183 && x < 817 && y > 43 && y < 541;
const nearPills = (x: number, y: number) => x > 838 && y > 52 && y < 262;
const fixed = (value: number, digits = 1) => value.toFixed(digits);

export function scratches(): string {
  const random = seededRandom(1984);
  const strokes: string[] = [];
  for (let attempt = 0; attempt < 260 && strokes.length < 22; attempt += 1) {
    const x = 24 + random() * 955;
    const y = 40 + random() * 512;
    const length = 10 + random() * 22;
    const angle = -0.35 + (random() - 0.5) * 1.1;
    const bend = (random() - 0.5) * 1.2;
    const strokeWidth = 0.8 + random() * 0.35;
    const opacity = (0.2 + random() * 0.14) * 1.7;
    if (!nearRoundKey(x, y, 42) && !nearPills(x, y) && !insideTray(x, y)) {
      const x2 = x + Math.cos(angle) * length;
      const y2 = y + Math.sin(angle) * length;
      strokes.push(
        `<path d="M${fixed(x)} ${fixed(y)} Q${fixed((x + x2) / 2 + bend)} ${fixed((y + y2) / 2 - bend)} ${fixed(
          x2,
        )} ${fixed(y2)}" stroke="#fbf5f8" stroke-width="${fixed(strokeWidth, 2)}" opacity="${fixed(opacity, 2)}"/>`,
      );
    }
  }
  return `<g fill="none" stroke-linecap="round">${strokes.join('')}</g>`;
}

export function nicks(): string {
  const random = seededRandom(2024);
  const marks: string[] = [];
  for (let i = 0; i < 420; i += 1) {
    const x = 24 + random() * 960;
    const y = 36 + random() * 518;
    const kind = random();
    const a = random();
    const b = random();
    const c = random();
    if (!insideTray(x, y) && !nearPills(x, y) && !nearRoundKey(x, y, 40)) {
      if (kind < 0.45) {
        const length = 3 + a * 7;
        const angle = b * Math.PI;
        marks.push(
          `<path d="M${fixed(x)} ${fixed(y)} l${fixed(Math.cos(angle) * length)} ${fixed(
            Math.sin(angle) * length,
          )}" stroke="#fffcfe" stroke-width="${fixed(0.6 + c * 0.5, 2)}" stroke-linecap="round" opacity="${fixed(
            0.4 + a * 0.35,
            2,
          )}"/>`,
        );
      } else if (kind < 0.8) {
        marks.push(
          `<circle cx="${fixed(x)}" cy="${fixed(y)}" r="${fixed(0.5 + a * 0.8, 2)}" fill="#4a3a40" opacity="${fixed(
            0.25 + b * 0.3,
            2,
          )}"/>`,
        );
      } else {
        marks.push(
          `<ellipse cx="${fixed(x)}" cy="${fixed(y)}" rx="${fixed(3 + a * 8)}" ry="${fixed(
            2 + b * 4,
          )}" fill="#a08a7a" opacity="${fixed(0.05 + c * 0.06, 2)}" filter="url(#blur2)"/>`,
        );
      }
    }
  }
  return marks.join('');
}

interface SpeckleStyle {
  colors: readonly string[];
  sizes: readonly [number, number];
  opacities: readonly [number, number];
  skip?: (x: number, y: number) => boolean;
}

export function speckles(seed: number, count: number, area: Rect, style: SpeckleStyle): string {
  const random = seededRandom(seed);
  const dots: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = area.x1 + random() * (area.x2 - area.x1);
    const y = area.y1 + random() * (area.y2 - area.y1);
    const color = style.colors[Math.floor(random() * style.colors.length)];
    const radius = style.sizes[0] + random() ** 3 * (style.sizes[1] - style.sizes[0]);
    const opacity = style.opacities[0] + random() * (style.opacities[1] - style.opacities[0]);
    if (!style.skip?.(x, y)) {
      dots.push(
        `<circle cx="${fixed(x)}" cy="${fixed(y)}" r="${fixed(radius, 2)}" fill="${color}" opacity="${fixed(
          opacity,
          2,
        )}"/>`,
      );
    }
  }
  return dots.join('');
}
