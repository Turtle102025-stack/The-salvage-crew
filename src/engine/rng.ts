/**
 * Seeded random numbers. Every random choice in the game goes through here.
 *
 * - A run has one seed, shown to players as a short code like "7KQ2-M9XA".
 * - The seed is split into independent named streams (map, rewards, shuffle…),
 *   so e.g. playing a fight differently never changes the map or later rewards.
 * - A stream's state is a plain array of four 32-bit numbers. It lives inside
 *   the game state, so saving and loading reproduces the exact same future.
 *
 * Generator: sfc32 (fast, good quality, 128-bit state), seeded with cyrb128.
 */

export type RngState = [number, number, number, number];

export const RNG_STREAMS = ['map', 'rewards', 'shuffle', 'enemyAI', 'events', 'shop', 'potions', 'misc'] as const;
export type RngStream = (typeof RNG_STREAMS)[number];

/** Seed-code alphabet: no 0/O or 1/I so codes are easy to read aloud. */
export const SEED_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function cyrb128(str: string): RngState {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/**
 * Turns whatever a player typed into a canonical seed code:
 * upper-case letters and digits only, grouped in fours ("7kq2 m9xa" → "7KQ2-M9XA").
 * Returns '' if nothing usable is left.
 */
export function normalizeSeed(input: string): string {
  const clean = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);
  return clean.match(/.{1,4}/g)?.join('-') ?? '';
}

/**
 * Builds an 8-character seed code from two random 32-bit numbers.
 * The UI supplies the randomness (crypto); the engine never invents seeds.
 */
export function seedFromNumbers(a: number, b: number): string {
  let out = '';
  let hi = a >>> 0;
  let lo = b >>> 0;
  for (let i = 0; i < 8; i++) {
    const source = i < 6 ? hi : lo;
    out += SEED_ALPHABET[source % 32];
    if (i < 6) hi = Math.floor(hi / 32);
    else lo = Math.floor(lo / 32);
  }
  return normalizeSeed(out);
}

/** Creates the state for one named stream of a seed. */
export function createRng(seed: string, stream: string): RngState {
  const state = cyrb128(`${normalizeSeed(seed)}/${stream}`);
  // Warm up so similar seeds diverge quickly.
  for (let i = 0; i < 12; i++) nextUint32(state);
  return state;
}

/** Creates every named stream for a seed. */
export function createRngStreams(seed: string): Record<RngStream, RngState> {
  const out = {} as Record<RngStream, RngState>;
  for (const name of RNG_STREAMS) out[name] = createRng(seed, name);
  return out;
}

/** Next raw 32-bit value. Advances (mutates) the state. */
export function nextUint32(s: RngState): number {
  let [a, b, c, d] = s;
  const t0 = (a + b) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  d = (d + 1) | 0;
  const t = (t0 + d) | 0;
  c = (c + t) | 0;
  s[0] = a >>> 0;
  s[1] = b >>> 0;
  s[2] = c >>> 0;
  s[3] = d >>> 0;
  return t >>> 0;
}

/** Float in [0, 1). */
export function nextFloat(s: RngState): number {
  return nextUint32(s) / 4294967296;
}

/** Integer in [min, max], both inclusive. */
export function nextInt(s: RngState, min: number, max: number): number {
  if (max < min) throw new Error(`nextInt: max (${max}) < min (${min})`);
  return min + Math.floor(nextFloat(s) * (max - min + 1));
}

export function pick<T>(s: RngState, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick: empty list');
  return items[nextInt(s, 0, items.length - 1)] as T;
}

/** Picks a key by weight. Entries with weight <= 0 are never picked. */
export function weightedPick<T>(s: RngState, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  if (total <= 0) throw new Error('weightedPick: no positive weights');
  let roll = nextFloat(s) * total;
  for (const [item, w] of entries) {
    if (w <= 0) continue;
    roll -= w;
    if (roll < 0) return item;
  }
  // Floating-point edge: return the last positive entry.
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i] as readonly [T, number];
    if (entry[1] > 0) return entry[0];
  }
  throw new Error('weightedPick: unreachable');
}

/** Fisher–Yates shuffle, in place. Returns the same array. */
export function shuffleInPlace<T>(s: RngState, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = nextInt(s, 0, i);
    const tmp = items[i] as T;
    items[i] = items[j] as T;
    items[j] = tmp;
  }
  return items;
}
