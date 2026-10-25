import { describe, expect, it } from 'vitest';

import { NO_RECORDS, loadRecords, parseRecords, saveRecords, withScore } from './records';

const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
};

describe('records', () => {
  it('keeps the best score per mode', () => {
    const records = withScore(withScore(NO_RECORDS, 'A', 120), 'A', 80);
    expect(records).toEqual({ A: 120, B: 0 });
    expect(withScore(records, 'B', 45)).toEqual({ A: 120, B: 45 });
  });

  it('returns the same object when the score is not a record', () => {
    const records = { A: 300, B: 10 };
    expect(withScore(records, 'A', 300)).toBe(records);
  });

  it('ignores broken or tampered storage', () => {
    expect(parseRecords(null)).toEqual(NO_RECORDS);
    expect(parseRecords('{oops')).toEqual(NO_RECORDS);
    expect(parseRecords('[1,2]')).toEqual(NO_RECORDS);
    expect(parseRecords('{"A":5000,"B":-3}')).toEqual(NO_RECORDS);
    expect(parseRecords('{"A":12.5,"B":"7"}')).toEqual(NO_RECORDS);
    expect(parseRecords('{"A":250}')).toEqual({ A: 250, B: 0 });
  });

  it('round-trips through storage and survives a throwing one', () => {
    const storage = memoryStorage();
    saveRecords(storage, { A: 42, B: 7 });
    expect(loadRecords(storage)).toEqual({ A: 42, B: 7 });

    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadRecords(blocked)).toEqual(NO_RECORDS);
    expect(saveRecords(blocked, { A: 1, B: 1 })).toBe(false);
  });
});
