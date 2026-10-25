export interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type Point = readonly [number, number];

export const VIEW = { x: -10, y: -4, w: 1036, h: 612 };
export const MAP_SIZE = { width: 2072, height: 1224 };
export const MAP_SCALE = MAP_SIZE.width / VIEW.w;

export const CASE: Rect = { x1: -5.5, y1: 0.6, x2: 1016, y2: 605 };
export const PLATE: Rect = { x1: 18, y1: 32, x2: 992, y2: 563 };
export const TRAY_OUTER: Rect = { x1: 189, y1: 49, x2: 811, y2: 537 };
export const TRAY_FLOOR: Rect = { x1: 213, y1: 80, x2: 789, y2: 502 };
export const LIP: Rect = { x1: 240, y1: 119, x2: 762, y2: 465 };
export const WINDOW: Rect = { x1: 250, y1: 130, x2: 752, y2: 457 };
export const LEDGE: Rect = { x1: 256, y1: 138, x2: 749, y2: 452 };
export const LCD_RECT: Rect = { x1: 266, y1: 149, x2: 743, y2: 444 };
export const LCD_ART_TRANSFORM = 'translate(273.4 151.95) scale(0.295)';

export const ROUND_KEYS: readonly Point[] = [
  [115, 397.6],
  [113.5, 500],
  [894, 395.5],
  [894, 500],
];
export const PILL_KEYS: readonly Point[] = [
  [878.5, 84],
  [878.5, 150],
  [878.5, 216],
];
export const LED_HOLES: readonly Point[] = [
  [946, 118],
  [946, 184],
];
export const ROUND_CAP_RADIUS = 23.5;
export const PILL_HALF_LENGTH = 22.5;

export const width = (rect: Rect) => rect.x2 - rect.x1;
export const height = (rect: Rect) => rect.y2 - rect.y1;
export const contains = (rect: Rect, x: number, y: number) => x > rect.x1 && x < rect.x2 && y > rect.y1 && y < rect.y2;
export const toMap = ([x, y]: Point): Point => [(x - VIEW.x) * MAP_SCALE, (y - VIEW.y) * MAP_SCALE];
export const toViewFraction = ([x, y]: Point): Point => [(x - VIEW.x) / VIEW.w, (y - VIEW.y) / VIEW.h];
