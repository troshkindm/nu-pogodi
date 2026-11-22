import { describe, expect, it } from 'vitest';

import { detectLanguage, isLanguage } from './language';

describe('language', () => {
  it('speaks Russian to Russian readers and English to everyone else', () => {
    expect(detectLanguage(['ru-RU', 'en'])).toBe('ru');
    expect(detectLanguage(['uk'])).toBe('ru');
    expect(detectLanguage(['en-GB', 'ru'])).toBe('en');
    expect(detectLanguage(['de-DE'])).toBe('en');
    expect(detectLanguage([])).toBe('ru');
  });

  it('accepts only known languages', () => {
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });
});
