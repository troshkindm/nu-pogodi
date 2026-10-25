import { describe, expect, it } from 'vitest';

import { CHUTE } from '../game/config';
import { createGame } from '../game/engine';

import { FILM_PATHS, SEGMENT_PATHS } from './art';
import {
  COLON,
  EGG_SEGMENTS,
  HARE,
  LEADING_ONE,
  MERIDIEM,
  clockSegments,
  gameSegments,
  loaderSegments,
  numberSegments,
} from './segments';

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
    const evening = clockSegments({ minutes: 21 * 60 + 7, colon: true, digits: true, hare: 'none', bellUp: false });
    expect(evening).toContain(COLON);
    expect(evening).toContain(MERIDIEM.pm);
    expect(evening).not.toContain(LEADING_ONE);
  });

  it('draws the hare with the bell and swings it while ringing', () => {
    const resting = clockSegments({ minutes: 7 * 60, colon: false, digits: true, hare: 'rest', bellUp: false });
    const swinging = clockSegments({ minutes: 7 * 60, colon: false, digits: false, hare: 'ring', bellUp: true });
    expect(resting).toEqual(expect.arrayContaining([HARE.body, HARE.armDown]));
    expect(swinging).toEqual(expect.arrayContaining([HARE.body, HARE.armUp, HARE.bellUp]));
    expect(swinging).not.toContain(COLON);
    expect(swinging).toContain(MERIDIEM.am);
  });

  it('draws eggs where the engine puts them', () => {
    const state = { ...createGame('A'), eggs: [{ chute: CHUTE.topRight, step: 2 }] };
    expect(gameSegments(state)).toContain(EGG_SEGMENTS[CHUTE.topRight][2]);
  });

  it('rolls a loader egg down each chute and lets the wolf catch it', () => {
    const frames = Array.from({ length: 6 }, (_, frame) => loaderSegments(frame));
    expect(frames[0]).toContain(EGG_SEGMENTS[CHUTE.topLeft][0]);
    expect(frames[4]).toContain(EGG_SEGMENTS[CHUTE.topLeft][4]);
    expect(frames[5].some((id) => EGG_SEGMENTS[CHUTE.topLeft].includes(id))).toBe(false);
    expect(loaderSegments(6)).toContain(EGG_SEGMENTS[CHUTE.topRight][0]);
    frames.flat().forEach((id) => expect(allIds.has(id)).toBe(true));
  });
});
