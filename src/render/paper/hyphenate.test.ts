import { describe, expect, it } from 'vitest';

import { breakPoints } from './hyphenate';

const hyphenated = (word: string) => {
  const points = breakPoints(word);
  return [...word].map((char, i) => (points.includes(i) ? `-${char}` : char)).join('');
};

describe('breakPoints', () => {
  it('splits Russian words by syllables', () => {
    expect(hyphenated('соперником')).toBe('со-пер-ни-ком');
    expect(hyphenated('гарантийного')).toBe('га-ран-тий-но-го');
    expect(hyphenated('является')).toBe('яв-ля-ет-ся');
    expect(hyphenated('неисправностей')).toBe('не-ис-прав-нос-тей');
    expect(hyphenated('сестра')).toBe('сес-тра');
  });

  it('never leaves a single letter or a sign at a line start', () => {
    expect(hyphenated('игра')).toBe('иг-ра');
    expect(hyphenated('объём')).not.toContain('-ъ');
    expect(breakPoints('он')).toEqual([]);
  });

  it('keeps punctuation attached and ignores non-Cyrillic words', () => {
    expect(hyphenated('«погоди!»')).toBe('«по-го-ди!»');
    expect(breakPoints('Enter')).toEqual([]);
    expect(breakPoints('12')).toEqual([]);
  });
});
