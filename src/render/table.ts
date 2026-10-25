import { seededRandom } from '../game/random';

const TILE = 384;
const LATTICE = 128;
const OCTAVES = [
  { period: 3, weight: 0.42 },
  { period: 8, weight: 0.26 },
  { period: 24, weight: 0.18 },
  { period: 96, weight: 0.14 },
];
const BASE = [30, 27, 24];

const smooth = (t: number) => t * t * (3 - 2 * t);

const latticeNoise = (values: Float32Array) => (x: number, y: number, period: number) => {
  const gx = (x / TILE) * period;
  const gy = (y / TILE) * period;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const at = (cx: number, cy: number) => values[((cy % period) * LATTICE + (cx % period)) % values.length];
  const fx = smooth(gx - ix);
  const fy = smooth(gy - iy);
  const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * fx;
  const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * fx;
  return top + (bottom - top) * fy;
};

export function tableTexture(): string {
  const canvas = document.createElement('canvas');
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'none';
  const random = seededRandom(1984);
  const noise = latticeNoise(Float32Array.from({ length: LATTICE * LATTICE }, random));
  const image = ctx.createImageData(TILE, TILE);
  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) {
      const mottle = OCTAVES.reduce((sum, { period, weight }) => sum + noise(x, y, period) * weight, 0);
      const grain = (random() - 0.5) * 7;
      const shade = 0.78 + mottle * 0.42;
      const offset = (y * TILE + x) * 4;
      BASE.forEach((channel, i) => {
        image.data[offset + i] = channel * shade + grain;
      });
      image.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return `url(${canvas.toDataURL('image/png')})`;
}
