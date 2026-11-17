/** Random picks for rewards and shops: cards, relics and potions. */
import { nextFloat, pick, weightedPick, type RngState } from '../rng';
import type { CardRarity, CardType, Content, PotionRarity, RelicRarity } from '../types';
import type { RunState } from './types';

export type RewardKind = 'battle' | 'elite' | 'boss' | 'shop' | 'event';

const RARE_CHANCE: Record<RewardKind, number> = { battle: 3, elite: 10, boss: 100, shop: 9, event: 6 };
const UNCOMMON_CHANCE: Record<RewardKind, number> = { battle: 37, elite: 40, boss: 0, shop: 37, event: 37 };

export function cardPool(content: Content, characterId: string, rarity?: CardRarity, type?: CardType): string[] {
  return Object.values(content.cards)
    .filter(
      (c) =>
        (c.character === characterId || c.character === 'neutral') &&
        (c.rarity === 'common' || c.rarity === 'uncommon' || c.rarity === 'rare') &&
        (rarity === undefined || c.rarity === rarity) &&
        (type === undefined || c.type === type),
    )
    .map((c) => c.id)
    .sort();
}

/** Rolls a card rarity, updating the rare "pity" offset like the genre does. */
export function rollRarity(run: RunState, rng: RngState, kind: RewardKind): CardRarity {
  const rare = Math.max(0, RARE_CHANCE[kind] + (kind === 'boss' ? 0 : run.counters.rareOffset));
  const roll = nextFloat(rng) * 100;
  if (roll < rare) {
    run.counters.rareOffset = -5;
    return 'rare';
  }
  if (roll < rare + UNCOMMON_CHANCE[kind]) return 'uncommon';
  run.counters.rareOffset = Math.min(40, run.counters.rareOffset + 1);
  return 'common';
}

const FALLBACK: Record<CardRarity, CardRarity[]> = {
  rare: ['rare', 'uncommon', 'common'],
  uncommon: ['uncommon', 'common', 'rare'],
  common: ['common', 'uncommon', 'rare'],
  starter: ['common'],
  special: ['common'],
};

/** `count` distinct card options for a reward or shop row. */
export function rollCards(
  content: Content,
  run: RunState,
  rng: RngState,
  kind: RewardKind,
  count: number,
  type?: CardType,
): { id: string; upgraded: boolean }[] {
  const out: { id: string; upgraded: boolean }[] = [];
  const upgradeChance = run.act >= 3 ? 25 : run.act === 2 ? 12 : 0;
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(run, rng, kind);
    let options: string[] = [];
    for (const r of FALLBACK[rarity]) {
      options = cardPool(content, run.characterId, r, type).filter((id) => !out.some((o) => o.id === id));
      if (options.length) break;
    }
    if (!options.length) break;
    const id = pick(rng, options);
    const def = content.cards[id]!;
    out.push({ id, upgraded: def.rarity !== 'rare' && nextFloat(rng) * 100 < upgradeChance });
  }
  return out;
}

const RELIC_WEIGHTS: [RelicRarity, number][] = [
  ['common', 50],
  ['uncommon', 33],
  ['rare', 17],
];

export function relicPool(content: Content, run: RunState, rarity: RelicRarity): string[] {
  return Object.values(content.relics)
    .filter((r) => r.rarity === rarity && (r.character === run.characterId || r.character === 'neutral') && !run.relics.includes(r.id))
    .map((r) => r.id)
    .sort();
}

/** A random relic you don't own yet, or null if there are none left. */
export function rollRelic(content: Content, run: RunState, rng: RngState, rarity?: RelicRarity, exclude: string[] = []): string | null {
  const first = rarity ?? weightedPick(rng, RELIC_WEIGHTS);
  const order: RelicRarity[] = [first, 'common', 'uncommon', 'rare', 'shop'];
  for (const r of order) {
    const pool = relicPool(content, run, r).filter((id) => !exclude.includes(id));
    if (pool.length) return pick(rng, pool);
  }
  return null;
}

const POTION_WEIGHTS: [PotionRarity, number][] = [
  ['common', 65],
  ['uncommon', 25],
  ['rare', 10],
];

export function rollPotion(content: Content, rng: RngState): string | null {
  const rarity = weightedPick(rng, POTION_WEIGHTS);
  for (const r of [rarity, 'common', 'uncommon', 'rare'] as PotionRarity[]) {
    const pool = Object.values(content.potions)
      .filter((p) => p.rarity === r)
      .map((p) => p.id)
      .sort();
    if (pool.length) return pick(rng, pool);
  }
  return null;
}
