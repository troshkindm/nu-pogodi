export type Random = () => number;

const MODULUS = 2147483647;
const MULTIPLIER = 48271;

export function seededRandom(seed: number): Random {
  let state = (Math.abs(Math.floor(seed)) % (MODULUS - 1)) + 1;
  return () => {
    state = (state * MULTIPLIER) % MODULUS;
    return (state - 1) / (MODULUS - 1);
  };
}
