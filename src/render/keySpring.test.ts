import { describe, expect, it } from 'vitest';

import { createSpring, isSettled, stepSpring } from './keySpring';
import type { Spring } from './keySpring';

const FRAME = 1 / 60;

const run = (spring: Spring, frames: number) => {
  const path: number[] = [];
  let current = spring;
  for (let i = 0; i < frames; i += 1) {
    current = stepSpring(current, FRAME);
    path.push(current.position);
  }
  return { spring: current, path };
};

describe('key spring', () => {
  it('presses down fast without flying past the bottom', () => {
    const { spring, path } = run({ ...createSpring(), target: 1 }, 10);
    expect(path[2]).toBeGreaterThan(0.7);
    expect(Math.max(...path)).toBeLessThan(1.05);
    expect(isSettled(spring)).toBe(true);
  });

  it('springs back with a small bounce above rest and settles', () => {
    const { spring, path } = run({ position: 1, velocity: 0, target: 0 }, 40);
    const bounce = Math.min(...path);
    expect(bounce).toBeLessThan(-0.05);
    expect(bounce).toBeGreaterThan(-0.2);
    expect(spring.position).toBe(0);
  });

  it('stays stable when a frame is very long', () => {
    const next = stepSpring({ ...createSpring(), target: 1 }, 2);
    expect(Number.isFinite(next.position)).toBe(true);
    expect(next.position).toBeLessThan(1.05);
  });
});
