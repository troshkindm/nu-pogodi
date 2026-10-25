import { GAME_CONFIG } from './config';
import type { GameMode } from './config';

export type Records = Readonly<Record<GameMode, number>>;
export type RecordStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const NO_RECORDS: Records = { A: 0, B: 0 };
const STORAGE_KEY = 'nupogodi.records';

const validScore = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= GAME_CONFIG.maxScore ? value : 0;

export function parseRecords(text: string | null): Records {
  try {
    const parsed: unknown = JSON.parse(text ?? 'null');
    if (typeof parsed !== 'object' || parsed === null) return NO_RECORDS;
    const { A, B } = parsed as Partial<Record<GameMode, unknown>>;
    return { A: validScore(A), B: validScore(B) };
  } catch {
    return NO_RECORDS;
  }
}

export const withScore = (records: Records, mode: GameMode, score: number): Records =>
  score > records[mode] ? { ...records, [mode]: score } : records;

export function loadRecords(storage: RecordStorage | undefined): Records {
  try {
    return parseRecords(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return NO_RECORDS;
  }
}

export function saveRecords(storage: RecordStorage | undefined, records: Records): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(records));
    return Boolean(storage);
  } catch {
    return false;
  }
}
