import { describe, expect, it } from 'vitest';

import { CHUTE } from '../game/config';
import { createGame } from '../game/engine';

import { FILM_PATHS, SEGMENT_PATHS } from './art';
import { COLON, EGG_SEGMENTS, LEADING_ONE, MERIDIEM, clockSegments, gameSegments, numberSegments } from './segments';

const allIds = new Set(SEGMENT_PATHS.keys());

describe('lcd segments', () => {
  it('loads all 72 segments and four film layers', () => {
    expect(SEGMENT_PATHS.size).toBe(72);
    expect(FILM_PATHS.map((path) => path.id)).toEqual(['film-green', 'film-rail', 'film-red', 'film-ink']);
  });

  it('maps every id to existing art', () => {
    const ids = [
      ...Object.values(EGG_SEGMENTS).flat(),
      ...numberSegments('1888'),
      ...gameSegments({ ...createGame('B'), hare: true, penalty: 5 }),
    ];
    ids.forEach((id) => expect(allIds.has(id)).toBe(true));
  });

  it('lights the leading one only for hours from ten to twelve', () => {
    expect(numberSegments('1205')).toContain(LEADING_ONE);
    expect(numberSegments('905')).not.toContain(LEADING_ONE);
  });

  it('shows the clock with colon and meridiem', () => {
    const evening = clockSegments(new Date(2026, 9, 25, 21, 7));
    expect(evening).toContain(COLON);
    expect(evening).toContain(MERIDIEM.pm);
    expect(evening).not.toContain(LEADING_ONE);
  });

  it('draws eggs where the engine puts them', () => {
    const state = { ...createGame('A'), eggs: [{ chute: CHUTE.topRight, step: 2 }] };
    expect(gameSegments(state)).toContain(EGG_SEGMENTS[CHUTE.topRight][2]);
  });
});
