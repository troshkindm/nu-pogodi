import { SEGMENT_INK, SEGMENT_PATHS } from '../../lcd/art';
import { LCD_ART, LCD_RECT, MAP_SCALE, height, width } from '../device/geometry';

import { GHOST_OPACITY } from './layers';

const CORNER_RADIUS = 1.5;

export function createSegmentRaster(size: { width: number; height: number }) {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const paths = [...SEGMENT_PATHS].map(([id, d]) => [id, new Path2D(d)] as const);

  return (lit: ReadonlySet<string>): HTMLCanvasElement => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.setTransform(MAP_SCALE, 0, 0, MAP_SCALE, -LCD_RECT.x1 * MAP_SCALE, -LCD_RECT.y1 * MAP_SCALE);
    ctx.beginPath();
    ctx.roundRect(LCD_RECT.x1, LCD_RECT.y1, width(LCD_RECT), height(LCD_RECT), CORNER_RADIUS);
    ctx.clip();
    ctx.translate(LCD_ART.x, LCD_ART.y);
    ctx.scale(LCD_ART.scale, LCD_ART.scale);
    ctx.fillStyle = SEGMENT_INK;
    paths.forEach(([id, path]) => {
      ctx.globalAlpha = lit.has(id) ? 1 : GHOST_OPACITY;
      ctx.fill(path);
    });
    ctx.restore();
    return canvas;
  };
}
