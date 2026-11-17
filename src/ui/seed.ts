import { seedFromNumbers } from '../engine';

/** A fresh random seed code. Randomness for new seeds comes from the browser, never the engine. */
export function randomSeed(): string {
  const words = new Uint32Array(2);
  crypto.getRandomValues(words);
  return seedFromNumbers(words[0] ?? 0, words[1] ?? 0);
}
