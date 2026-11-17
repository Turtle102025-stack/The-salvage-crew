/**
 * The combat runner's shared machinery: the action queue, events, hooks,
 * and the primitive state changes (damage, block, statuses, cards).
 *
 * How resolution works:
 * - Everything that happens is an Action, resolved one at a time from `queue`.
 * - While an action resolves, anything it causes (an effect's sub-steps, hook
 *   reactions, the next step of a turn) is collected in `pending`. When the
 *   action finishes, `pending` is put at the FRONT of the queue, in order.
 *   So reactions always resolve right after their cause, before the next
 *   queued effect.
 * - Every state change emits a CombatEvent; the UI animates these afterwards.
 */
import { nextInt, pick, shuffleInPlace } from '../rng';
import type { Effect } from '../effects/types';
import type {
  CardInstance,
  CardType,
  CombatEvent,
  CombatState,
  Content,
  Creature,
  CreatureId,
  Hook,
  PileName,
  SourceRef,
  Trigger,
} from '../types';
import { attacksIgnoreBlock, splitDamage } from './damage';
import { chooseMove } from './enemies';

export const MAX_HAND_SIZE = 10;

/** Who is doing something, to whom, and why. */
export interface Ctx {
  actor: CreatureId;
  target?: CreatureId;
  source: SourceRef;
  /** Energy spent on an X-cost card. */
  x?: number;
}

export type Action =
  | { kind: 'effect'; effect: Effect; ctx: Ctx }
  /** Emits an event at its place in the queue (e.g. "this relic fired"). */
  | { kind: 'announce'; event: CombatEvent }
  | { kind: 'hit'; ctx: Ctx; base: number; targetId?: CreatureId; random?: boolean }
  | { kind: 'combatStart' }
  | { kind: 'playCard'; uid: number; target?: CreatureId; x: number }
  | { kind: 'usePotion'; slot: number; target?: CreatureId }
  | { kind: 'finishCard'; uid: number }
  | { kind: 'playerTurnStart' }
  | { kind: 'playerTurnEnd' }
  | { kind: 'discardHand' }
  | { kind: 'enemyPhase' }
  | { kind: 'enemyTurnStart'; enemy: CreatureId }
  | { kind: 'enemyAct'; enemy: CreatureId }
  | { kind: 'enemyTurnEnd'; enemy: CreatureId }
  | { kind: 'decideIntents' }
  | { kind: 'decay'; who: CreatureId; when: 'turnStart' | 'turnEnd' }
  | { kind: 'drawCards'; count: number }
  | { kind: 'victory' };

export interface Runner {
  content: Content;
  state: CombatState;
  queue: Action[];
  pending: Action[];
  events: CombatEvent[];
  /** True once the last enemy has died and end-of-combat hooks are running. */
  ending: boolean;
}

export function emit(r: Runner, event: CombatEvent): void {
  r.events.push(event);
}

/** Schedules actions to run right after the current one (in this order). */
export function enqueue(r: Runner, ...actions: Action[]): void {
  r.pending.push(...actions);
}

export function enqueueEffects(r: Runner, effects: readonly Effect[], ctx: Ctx): void {
  for (const effect of effects) enqueue(r, { kind: 'effect', effect, ctx });
}

// --- Creatures -------------------------------------------------------------

export function getCreature(r: Runner, id: CreatureId | undefined): Creature | undefined {
  if (id === undefined) return undefined;
  if (id === 'player') return r.state.player;
  return r.state.enemies.find((e) => e.id === id);
}

export function isAlive(c: Creature | undefined): c is Creature {
  return !!c && !c.dead;
}

export function livingEnemies(state: CombatState): Creature[] {
  return state.enemies.filter((e) => !e.dead);
}

/** Living creatures on the other side from `c`. */
export function opponentsOf(r: Runner, c: Creature): Creature[] {
  return c.side === 'player' ? livingEnemies(r.state) : isAlive(r.state.player) ? [r.state.player] : [];
}

/** Living creatures on the same side as `c`, including `c`. */
export function alliesOf(r: Runner, c: Creature): Creature[] {
  return c.side === 'player' ? (isAlive(r.state.player) ? [r.state.player] : []) : livingEnemies(r.state);
}

// --- Cards -----------------------------------------------------------------

export function newCardInstance(r: Runner, id: string, upgraded: boolean): CardInstance {
  if (!r.content.cards[id]) throw new Error(`Unknown card "${id}"`);
  return { uid: r.state.nextUid++, id, upgraded };
}

export function putCard(r: Runner, card: CardInstance, to: PileName): void {
  const s = r.state;
  switch (to) {
    case 'hand':
      if (s.hand.length >= MAX_HAND_SIZE) {
        s.discard.push(card);
        emit(r, { type: 'cardMoved', uid: card.uid, card: card.id, to: 'discard' });
        return;
      }
      s.hand.push(card);
      break;
    case 'draw': {
      // Shuffled into a random position of the draw pile.
      const at = nextInt(s.rng.misc, 0, s.draw.length);
      s.draw.splice(at, 0, card);
      break;
    }
    case 'discard':
      s.discard.push(card);
      break;
    case 'exhaust':
      s.exhaust.push(card);
      break;
    case 'removed':
      break;
  }
  emit(r, { type: 'cardMoved', uid: card.uid, card: card.id, to });
}

/** Draws `count` cards, reshuffling the discard pile when the draw pile runs out. */
export function drawCards(r: Runner, count: number): void {
  const s = r.state;
  for (let i = 0; i < count; i++) {
    if (s.hand.length >= MAX_HAND_SIZE) {
      emit(r, { type: 'handFull' });
      return;
    }
    if (s.draw.length === 0) {
      if (s.discard.length === 0) return;
      reshuffleDiscard(r);
    }
    const card = s.draw.pop();
    if (!card) return;
    s.hand.push(card);
    emit(r, { type: 'draw', uid: card.uid, card: card.id });
  }
}

export function reshuffleDiscard(r: Runner): void {
  const s = r.state;
  const count = s.discard.length;
  s.draw.push(...s.discard);
  s.discard = [];
  shuffleInPlace(s.rng.shuffle, s.draw);
  emit(r, { type: 'shuffle', count });
  fireTrigger(r, 'shuffle', {});
}

// --- Hooks -----------------------------------------------------------------

const OWNER_SCOPED: ReadonlySet<Trigger> = new Set<Trigger>(['turnStart', 'turnEnd', 'attacked', 'damageTaken', 'blockGained']);

interface Listener {
  owner: CreatureId;
  source: SourceRef;
  hooks: readonly Hook[];
  /** Stable key for `every` counters. */
  key: string;
}

function statusListeners(r: Runner, c: Creature): Listener[] {
  const out: Listener[] = [];
  for (const id of Object.keys(c.statuses)) {
    const hooks = r.content.statuses[id]?.hooks;
    if (hooks?.length) out.push({ owner: c.id, source: { kind: 'status', id, owner: c.id }, hooks, key: `status:${c.id}:${id}` });
  }
  return out;
}

function relicListeners(r: Runner): Listener[] {
  return r.state.relics.flatMap((id) => {
    const hooks = r.content.relics[id]?.hooks;
    return hooks?.length ? [{ owner: 'player', source: { kind: 'relic', id } as SourceRef, hooks, key: `relic:${id}` }] : [];
  });
}

/**
 * Fires a trigger. Listener order: player relics → player statuses/powers →
 * enemies left to right. Owner-scoped triggers only reach the creature the
 * event is about (plus relics if that is the player).
 */
export function fireTrigger(
  r: Runner,
  trigger: Trigger,
  opts: { owner?: CreatureId; other?: CreatureId; cardType?: CardType },
): void {
  let listeners: Listener[];
  if (OWNER_SCOPED.has(trigger)) {
    const owner = getCreature(r, opts.owner);
    if (!owner) return;
    listeners = owner.side === 'player' ? [...relicListeners(r), ...statusListeners(r, owner)] : statusListeners(r, owner);
  } else {
    listeners = [...relicListeners(r)];
    if (isAlive(r.state.player)) listeners.push(...statusListeners(r, r.state.player));
    for (const enemy of livingEnemies(r.state)) listeners.push(...statusListeners(r, enemy));
  }

  for (const listener of listeners) {
    const matching = listener.hooks.filter((h, index) => {
      if (h.on !== trigger || (h.if?.cardType !== undefined && h.if.cardType !== opts.cardType)) return false;
      if (!h.every) return true;
      const key = `${listener.key}#${index}`;
      const count = (r.state.counters[key] ?? 0) + 1;
      r.state.counters[key] = count % h.every;
      return count >= h.every;
    });
    if (matching.length === 0) continue;
    enqueue(r, { kind: 'announce', event: { type: 'trigger', source: listener.source } });
    const ctx: Ctx = { actor: listener.owner, source: listener.source };
    if (opts.other !== undefined) ctx.target = opts.other;
    for (const hook of matching) enqueueEffects(r, hook.effects, ctx);
  }
}

// --- Primitive state changes ----------------------------------------------

export function changeStatus(r: Runner, whoId: CreatureId, statusId: string, delta: number): void {
  const c = getCreature(r, whoId);
  if (!isAlive(c) || delta === 0) return;
  const def = r.content.statuses[statusId];
  if (!def) throw new Error(`Unknown status "${statusId}"`);
  const old = c.statuses[statusId] ?? 0;
  let next = old + delta;
  if (!def.allowNegative) next = Math.max(0, next);
  if (next === old) return;
  if (next === 0) delete c.statuses[statusId];
  else c.statuses[statusId] = next;
  emit(r, { type: 'status', target: c.id, status: statusId, delta: next - old, stacks: next });

  if (def.threshold && delta > 0 && next >= def.threshold.at) {
    const source: SourceRef = { kind: 'status', id: statusId, owner: c.id };
    enqueue(r, { kind: 'announce', event: { type: 'trigger', source } });
    enqueueEffects(r, def.threshold.effects, { actor: c.id, source });
  }
}

export function gainBlock(r: Runner, whoId: CreatureId, amount: number): void {
  const c = getCreature(r, whoId);
  const n = Math.floor(amount);
  if (!isAlive(c) || n <= 0) return;
  c.block += n;
  emit(r, { type: 'block', target: c.id, amount: n, total: c.block });
  fireTrigger(r, 'blockGained', { owner: c.id });
}

export function resetBlock(r: Runner, c: Creature): void {
  if (c.block > 0) emit(r, { type: 'blockReset', target: c.id, lost: c.block });
  c.block = 0;
}

/** Damage that goes through Block. `attack` damage also fires `attacked` hooks. */
export function dealDamage(
  r: Runner,
  opts: { sourceId?: CreatureId; targetId: CreatureId; amount: number; attack: boolean },
): void {
  const t = getCreature(r, opts.targetId);
  if (!isAlive(t)) return;
  const amount = Math.max(0, Math.floor(opts.amount));
  const { blocked, through } = splitDamage(t.block, amount, opts.attack && attacksIgnoreBlock(r.content, t));
  t.block -= blocked;
  const before = t.hp;
  t.hp = Math.max(0, t.hp - through);
  const hpLost = before - t.hp;
  emit(r, {
    type: 'damage',
    ...(opts.sourceId !== undefined ? { source: opts.sourceId } : {}),
    target: t.id,
    amount,
    blocked,
    hpLost,
    attack: opts.attack,
  });
  if (opts.attack && opts.sourceId !== undefined) fireTrigger(r, 'attacked', { owner: t.id, other: opts.sourceId });
  afterHpLoss(r, t, hpLost, opts.sourceId);
}

/** HP loss that ignores Block (Poison, Overheat…). */
export function loseHp(r: Runner, targetId: CreatureId, amount: number, sourceId?: CreatureId): void {
  const t = getCreature(r, targetId);
  const n = Math.max(0, Math.floor(amount));
  if (!isAlive(t) || n === 0) return;
  const before = t.hp;
  t.hp = Math.max(0, t.hp - n);
  const hpLost = before - t.hp;
  emit(r, { type: 'hpLoss', target: t.id, amount: hpLost });
  afterHpLoss(r, t, hpLost, sourceId);
}

function afterHpLoss(r: Runner, t: Creature, hpLost: number, sourceId?: CreatureId): void {
  if (hpLost > 0) {
    if (t.side === 'player') r.state.stats.damageTaken += hpLost;
    else r.state.stats.damageDealt += hpLost;
    fireTrigger(r, 'damageTaken', { owner: t.id, ...(sourceId !== undefined ? { other: sourceId } : {}) });
  }
  if (t.hp <= 0 && !t.dead) {
    t.dead = true;
    t.block = 0;
    emit(r, { type: 'death', target: t.id });
    if (t.side === 'player') {
      r.state.phase = 'defeat';
      emit(r, { type: 'defeat' });
    } else {
      fireTrigger(r, 'enemyDied', { other: t.id });
    }
  }
}

export function heal(r: Runner, whoId: CreatureId, amount: number): void {
  const c = getCreature(r, whoId);
  if (!isAlive(c)) return;
  const n = Math.min(Math.max(0, Math.floor(amount)), c.maxHp - c.hp);
  if (n <= 0) return;
  c.hp += n;
  emit(r, { type: 'heal', target: c.id, amount: n });
}

export function changeEnergy(r: Runner, delta: number): void {
  if (delta === 0) return;
  r.state.energy = Math.max(0, r.state.energy + delta);
  emit(r, { type: 'energy', energy: r.state.energy, delta });
}

/** Brings a new enemy into the fight (rightmost), with its first intent decided. */
export function spawnEnemy(r: Runner, enemyId: string): Creature | undefined {
  const def = r.content.enemies[enemyId];
  if (!def) throw new Error(`Unknown enemy "${enemyId}"`);
  const s = r.state;
  const index = s.enemies.reduce((m, e) => Math.max(m, Number(e.id.slice(1))), -1) + 1;
  const hp = nextInt(s.rng.misc, def.hp[0], def.hp[1]);
  const creature: Creature = {
    id: `e${index}`,
    side: 'enemy',
    defId: def.id,
    name: def.name,
    hp,
    maxHp: hp,
    block: 0,
    statuses: { ...(def.startStatuses ?? {}) },
    dead: false,
    moveHistory: [],
  };
  creature.moveId = chooseMove(def, [], s.rng.enemyAI);
  s.enemies.push(creature);
  emit(r, { type: 'spawn', creature: JSON.parse(JSON.stringify(creature)) as Creature });
  return creature;
}

/** Picks a random living opponent of `actor` (misc stream). */
export function randomOpponent(r: Runner, actor: Creature): Creature | undefined {
  const options = opponentsOf(r, actor);
  return options.length ? pick(r.state.rng.misc, options) : undefined;
}
