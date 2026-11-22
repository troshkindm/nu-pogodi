export type Language = 'ru' | 'en';

export const LANGUAGES: readonly Language[] = ['ru', 'en'];

const RUSSIAN_READERS = new Set(['ru', 'uk', 'be', 'kk']);

export const isLanguage = (value: unknown): value is Language => LANGUAGES.some((language) => language === value);

export const detectLanguage = (preferred: readonly string[]): Language => {
  const primary = preferred[0]?.toLowerCase().split('-')[0];
  return primary === undefined || RUSSIAN_READERS.has(primary) ? 'ru' : 'en';
};

export const browserLanguage = () =>
  detectLanguage(typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]);
