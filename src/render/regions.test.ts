import { describe, expect, it } from 'vitest';

import { LCD_RECT, MAP_SIZE, ROUND_CAP_RADIUS, ROUND_KEYS, toMap } from './device/geometry';
import { FULL_REGION, LCD_REGION, SHADING_REACH, expand, keyRegion, scissorBox } from './regions';

describe('render regions', () => {
  it('maps the LCD to whole map pixels', () => {
    const [x1, y1] = toMap([LCD_RECT.x1, LCD_RECT.y1]);
    expect(LCD_REGION).toEqual({ x: x1, y: y1, width: 954, height: 590 });
  });

  it('covers a key together with the shading it casts', () => {
    const [x, y] = toMap(ROUND_KEYS[0]);
    const region = keyRegion(ROUND_KEYS[0], ROUND_CAP_RADIUS);
    expect(region.x).toBeLessThanOrEqual(x - ROUND_CAP_RADIUS * 2 - SHADING_REACH);
    expect(region.y + region.height).toBeGreaterThanOrEqual(y + ROUND_CAP_RADIUS * 2 + SHADING_REACH);
  });

  it('flips regions into bottom-up scissor boxes', () => {
    expect(scissorBox({ x: 5, y: 0, width: 30, height: 10 })).toEqual([5, MAP_SIZE.height - 10, 30, 10]);
    expect(scissorBox({ x: 0, y: MAP_SIZE.height - 4, width: 8, height: 4 })).toEqual([0, 0, 8, 4]);
  });

  it('clamps expanded regions to the map', () => {
    expect(expand(FULL_REGION, 40)).toEqual(FULL_REGION);
    expect(expand({ x: 10, y: MAP_SIZE.height - 5, width: 20, height: 5 }, 30)).toEqual({
      x: 0,
      y: MAP_SIZE.height - 35,
      width: 60,
      height: 35,
    });
  });
});
