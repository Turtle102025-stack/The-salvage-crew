/**
 * Helpers for writing content. They fill in each definition's `id` from its
 * key so ids can never drift from the map they live in.
 */
import type { Condition, Effect } from './effects/types';
import type { CardDef, CardStats, EnemyDef, RelicDef, StatusDef } from './types';

type WithoutId<T> = Omit<T, 'id'>;

function withIds<T extends { id: string }>(defs: Record<string, WithoutId<T>>, extra: Partial<T> = {}): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [id, def] of Object.entries(defs)) out[id] = { ...extra, ...def, id } as T;
  return out;
}

export const defineCards = (character: string, defs: Record<string, WithoutId<Omit<CardDef, 'character'>>>) =>
  withIds<CardDef>(defs as Record<string, WithoutId<CardDef>>, { character });

export const defineStatuses = (defs: Record<string, WithoutId<StatusDef>>) => withIds<StatusDef>(defs);
export const defineEnemies = (defs: Record<string, WithoutId<EnemyDef>>) => withIds<EnemyDef>(defs);
export const defineRelics = (defs: Record<string, WithoutId<RelicDef>>) => withIds<RelicDef>(defs);

// --- Cards -----------------------------------------------------------------

export interface ResolvedCard extends CardStats {
  name: string;
  upgraded: boolean;
}

/** A card's effective name, cost, effects and keywords (upgrade applied). */
export function resolveCard(def: CardDef, upgraded: boolean): ResolvedCard {
  if (!upgraded) {
    return { name: def.name, cost: def.cost, effects: def.effects, keywords: def.keywords, text: def.text, upgraded };
  }
  const u = def.upgrade;
  return {
    name: u.name ?? `${def.name}+`,
    cost: u.cost ?? def.cost,
    effects: u.effects ?? def.effects,
    keywords: u.keywords ?? def.keywords,
    text: u.text ?? def.text,
    upgraded,
  };
}

/** True if any effect (including nested ones) aims at the chosen target. */
export function effectsUseTarget(effects: readonly Effect[]): boolean {
  return effects.some((e) => {
    switch (e.type) {
      case 'if':
        return conditionUsesTarget(e.cond) || effectsUseTarget(e.then) || effectsUseTarget(e.else ?? []);
      case 'spend':
        return effectsUseTarget(e.then) || effectsUseTarget(e.else ?? []);
      case 'repeat':
        return effectsUseTarget(e.effects);
      case 'draw':
      case 'gainEnergy':
      case 'addCard':
      case 'summon':
      case 'upgradeHand':
        return false;
      default:
        return e.target === 'target';
    }
  });
}

function conditionUsesTarget(cond: Condition): boolean {
  return 'not' in cond ? conditionUsesTarget(cond.not) : cond.on === 'target';
}

/** Does playing this card require choosing an enemy? */
export function cardNeedsTarget(def: CardDef, upgraded: boolean): boolean {
  return effectsUseTarget(resolveCard(def, upgraded).effects);
}
