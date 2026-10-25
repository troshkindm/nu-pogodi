const VOWELS = new Set('аеёиоуыэюя');
const SIGNS = new Set('йьъ');
const LETTER = /[а-яё]/i;
const MIN_PART = 2;

const isVowel = (char: string) => VOWELS.has(char.toLowerCase());
const isSign = (char: string) => SIGNS.has(char.toLowerCase());
const isConsonant = (char: string) => LETTER.test(char) && !isVowel(char) && !isSign(char);
const hasVowel = (part: string) => [...part].some(isVowel);

const allowedBetween = (previous: string, before: string, after: string, next: string) =>
  isSign(before) ||
  (isVowel(before) && isConsonant(after) && isVowel(next)) ||
  (isVowel(previous) && isConsonant(before) && isConsonant(after)) ||
  (isVowel(before) && isVowel(after));

export function breakPoints(word: string): number[] {
  const start = word.search(LETTER);
  if (start < 0) return [];
  const letters = word.slice(start).match(/^[а-яё]+/i)?.[0] ?? '';
  const points: number[] = [];
  for (let i = MIN_PART; i <= letters.length - MIN_PART; i += 1) {
    const left = letters.slice(0, i);
    const right = letters.slice(i);
    if (
      hasVowel(left) &&
      hasVowel(right) &&
      !isSign(letters[i]) &&
      allowedBetween(letters[i - 2], letters[i - 1], letters[i], letters[i + 1] ?? '')
    )
      points.push(start + i);
  }
  return points;
}
