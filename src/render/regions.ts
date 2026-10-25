import { LCD_RECT, MAP_SCALE, MAP_SIZE, toMap } from './device/geometry';
import type { Point, Rect } from './device/geometry';

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SHADING_REACH = 56;
export const CAMERA_REACH = 56;

export const FULL_REGION: Region = { x: 0, y: 0, width: MAP_SIZE.width, height: MAP_SIZE.height };

function fromBounds(x1: number, y1: number, x2: number, y2: number): Region {
  const left = Math.max(0, Math.floor(x1));
  const top = Math.max(0, Math.floor(y1));
  const right = Math.min(MAP_SIZE.width, Math.ceil(x2));
  const bottom = Math.min(MAP_SIZE.height, Math.ceil(y2));
  return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

export const scissorBox = ({ x, y, width, height }: Region): [number, number, number, number] => [
  x,
  MAP_SIZE.height - y - height,
  width,
  height,
];

export const expand = (region: Region, by: number): Region =>
  fromBounds(region.x - by, region.y - by, region.x + region.width + by, region.y + region.height + by);

export function rectRegion(rect: Rect): Region {
  const [x1, y1] = toMap([rect.x1, rect.y1]);
  const [x2, y2] = toMap([rect.x2, rect.y2]);
  return fromBounds(x1, y1, x2, y2);
}

export function keyRegion(center: Point, halfSize: number): Region {
  const [x, y] = toMap(center);
  const half = halfSize * MAP_SCALE + SHADING_REACH;
  return fromBounds(x - half, y - half, x + half, y + half);
}

export const LCD_REGION = rectRegion(LCD_RECT);
