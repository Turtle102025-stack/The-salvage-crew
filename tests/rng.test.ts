import { describe, expect, it } from 'vitest';
import {
  createRng,
  createRngStreams,
  nextFloat,
  nextInt,
  nextUint32,
  normalizeSeed,
  pick,
  SEED_ALPHABET,
  seedFromNumbers,
  shuffleInPlace,
  weightedPick,
  type RngState,
} from '../src/engine';

const take = (s: RngState, n: number) => Array.from({ length: n }, () => nextUint32(s));

describe('seeded RNG', () => {
  it('gives the same sequence for the same seed and stream', () => {
    expect(take(createRng('ABCD-1234', 'map'), 20)).toEqual(take(createRng('ABCD-1234', 'map'), 20));
  });

  it('gives different sequences for different streams and seeds', () => {
    const base = take(createRng('ABCD-1234', 'map'), 5);
    expect(take(createRng('ABCD-1234', 'shuffle'), 5)).not.toEqual(base);
    expect(take(createRng('ABCD-1235', 'map'), 5)).not.toEqual(base);
  });

  it('treats differently typed versions of a seed as the same seed', () => {
    expect(take(createRng('abcd 1234', 'map'), 5)).toEqual(take(createRng('ABCD-1234', 'map'), 5));
  });

  it('streams are independent: using one does not change another', () => {
    const a = createRngStreams('SEED');
    const b = createRngStreams('SEED');
    take(a.shuffle, 100); // heavy use of one stream…
    expect(take(a.map, 10)).toEqual(take(b.map, 10)); // …leaves the others untouched
  });

  it('keeps producing the same numbers after a JSON save/load', () => {
    const s = createRng('SAVE-TEST', 'misc');
    take(s, 7);
    const loaded = JSON.parse(JSON.stringify(s)) as RngState;
    expect(take(loaded, 10)).toEqual(take(s, 10));
  });

  it('nextFloat stays in [0, 1) and nextInt stays in range and covers it', () => {
    const s = createRng('RANGE', 'misc');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const f = nextFloat(s);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = nextInt(s, 1, 6);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('shuffles into a permutation, deterministically', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const a = shuffleInPlace(createRng('SHUF', 'shuffle'), [...items]);
    const b = shuffleInPlace(createRng('SHUF', 'shuffle'), [...items]);
    expect(a).toEqual(b);
    expect(a).not.toEqual(items);
    expect([...a].sort((x, y) => x - y)).toEqual(items);
  });

  it('weightedPick never picks zero-weight entries and roughly follows weights', () => {
    const s = createRng('WEIGHTS', 'misc');
    const counts = { a: 0, b: 0, never: 0 };
    for (let i = 0; i < 4000; i++) counts[weightedPick(s, [['a', 3], ['b', 1], ['never', 0]] as const)]++;
    expect(counts.never).toBe(0);
    expect(counts.a / counts.b).toBeGreaterThan(2.4);
    expect(counts.a / counts.b).toBeLessThan(3.8);
  });

  it('pick refuses an empty list', () => {
    expect(() => pick(createRng('X', 'misc'), [])).toThrow();
  });
});

describe('seed codes', () => {
  it('normalizes typed seeds', () => {
    expect(normalizeSeed(' 7kq2 m9xa ')).toBe('7KQ2-M9XA');
    expect(normalizeSeed('7KQ2-M9XA')).toBe('7KQ2-M9XA');
    expect(normalizeSeed('abc')).toBe('ABC');
    expect(normalizeSeed('!!!')).toBe('');
  });

  it('builds readable 8-character codes from random numbers', () => {
    for (const [a, b] of [[0, 0], [123456789, 42], [0xffffffff, 0xffffffff]] as const) {
      const code = seedFromNumbers(a, b);
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      for (const ch of code.replace('-', '')) expect(SEED_ALPHABET).toContain(ch);
    }
    expect(seedFromNumbers(1, 2)).not.toBe(seedFromNumbers(2, 1));
  });
});
