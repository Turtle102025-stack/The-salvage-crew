/**
 * Enemy behaviour: picking the next move (from the enemy's `ai` data) and
 * describing it as an intent the player can see.
 */
import { weightedPick, type RngState } from '../rng';
import type { Effect } from '../effects/types';
import type { CombatState, Content, Creature, EnemyDef, IntentKind } from '../types';
import { attackDamage } from './damage';

function trailingRepeats(history: readonly string[], move: string): number {
  let n = 0;
  for (let i = history.length - 1; i >= 0 && history[i] === move; i--) n++;
  return n;
}

/** Chooses the move an enemy will use next, given the moves it has used. */
export function chooseMove(def: EnemyDef, history: readonly string[], rng: RngState): string {
  const opening = def.ai.opening ?? [];
  if (history.length < opening.length) return opening[history.length] as string;
  const then = def.ai.then;
  if ('cycle' in then) {
    return then.cycle[(history.length - opening.length) % then.cycle.length] as string;
  }
  const all = Object.entries(then.weights);
  const max = then.maxInARow ?? Infinity;
  const allowed = all.filter(([move]) => trailingRepeats(history, move) < max);
  return weightedPick(rng, allowed.length ? allowed : all);
}

export interface IntentView {
  move: string;
  name: string;
  kinds: IntentKind[];
  /** Damage per hit after Strength/Weak/Vulnerable, if the move attacks. */
  damage?: number;
  hits?: number;
  /** Statuses the move applies (for tooltips). */
  statuses: string[];
}

interface IntentScan {
  kinds: Set<IntentKind>;
  damage?: number;
  hits: number;
  statuses: string[];
}

function scanEffects(content: Content, enemy: Creature, player: Creature, effects: readonly Effect[], mult: number, out: IntentScan): void {
  for (const e of effects) {
    switch (e.type) {
      case 'attack':
      case 'damage': {
        out.kinds.add('attack');
        const hits = e.type === 'attack' && typeof e.hits === 'number' ? e.hits : 1;
        if (typeof e.amount === 'number' && out.damage === undefined) {
          out.damage = e.type === 'attack' ? attackDamage(content, enemy, player, e.amount) : e.amount;
        }
        out.hits += hits * mult;
        break;
      }
      case 'block':
        out.kinds.add('block');
        break;
      case 'heal':
        out.kinds.add('buff');
        break;
      case 'applyStatus': {
        const onSelf = e.target === 'self' || e.target === 'allAllies';
        const def = content.statuses[e.status];
        out.kinds.add(onSelf ? (def?.kind === 'debuff' ? 'debuff' : 'buff') : 'debuff');
        out.statuses.push(e.status);
        break;
      }
      case 'repeat':
        scanEffects(content, enemy, player, e.effects, mult * (typeof e.times === 'number' ? e.times : 1), out);
        break;
      case 'spend':
      case 'if':
        scanEffects(content, enemy, player, e.then, mult, out);
        break;
      default:
        break;
    }
  }
}

const KIND_ORDER: IntentKind[] = ['attack', 'block', 'buff', 'debuff', 'unknown'];

/** What an enemy is about to do, with live damage numbers. */
export function getIntent(content: Content, state: CombatState, enemy: Creature): IntentView | undefined {
  if (enemy.dead || !enemy.moveId) return undefined;
  const def = content.enemies[enemy.defId];
  const move = def?.moves[enemy.moveId];
  if (!move) return undefined;
  const scan: IntentScan = { kinds: new Set(), hits: 0, statuses: [] };
  scanEffects(content, enemy, state.player, move.effects, 1, scan);
  const kinds = move.intent ?? KIND_ORDER.filter((k) => scan.kinds.has(k));
  return {
    move: enemy.moveId,
    name: move.name,
    kinds: kinds.length ? kinds : ['unknown'],
    ...(scan.damage !== undefined ? { damage: scan.damage, hits: Math.max(1, scan.hits) } : {}),
    statuses: scan.statuses,
  };
}
