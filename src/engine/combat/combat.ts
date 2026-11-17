/**
 * Public combat API.
 *
 *   const { state, events } = createCombat(content, setup);
 *   const next = dispatchCombat(content, state, { type: 'playCard', uid, target });
 *
 * The engine is a pure state machine: it never mutates the state you pass in,
 * resolves everything a command causes (including the whole enemy turn) and
 * returns the new state plus the list of events for the UI to animate.
 */
import { resolveCard, cardNeedsTarget, effectsUseTarget } from '../defs';
import { resolveEffect } from '../effects/resolve';
import { nextInt, shuffleInPlace } from '../rng';
import type { CardInstance, CombatCommand, CombatResult, CombatSetup, CombatState, Content, Creature } from '../types';
import {
  changeEnergy,
  changeStatus,
  dealDamage,
  drawCards,
  emit,
  enqueue,
  enqueueEffects,
  fireTrigger,
  getCreature,
  isAlive,
  livingEnemies,
  putCard,
  randomOpponent,
  resetBlock,
  type Action,
  type Runner,
} from './core';
import { attackDamage } from './damage';
import { chooseMove } from './enemies';

/** Safety net against content that loops forever (e.g. two hooks feeding each other). */
const MAX_ACTIONS_PER_COMMAND = 20000;

/** Deep copy. State is plain JSON data by design, so this is exact. */
export function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// --- Running the queue -----------------------------------------------------

function run(r: Runner): void {
  let steps = 0;
  while (r.queue.length > 0) {
    if (++steps > MAX_ACTIONS_PER_COMMAND) throw new Error('Combat got stuck in a loop (too many actions).');
    const action = r.queue.shift() as Action;
    resolveAction(r, action);
    if (r.pending.length) {
      r.queue.unshift(...r.pending);
      r.pending = [];
    }
    if (r.state.phase === 'defeat') {
      r.queue = [];
      return;
    }
    if (!r.ending && livingEnemies(r.state).length === 0) {
      // Victory: drop whatever was still queued, run end-of-combat hooks, finish.
      r.ending = true;
      r.queue = [];
      fireTrigger(r, 'combatEnd', {});
      enqueue(r, { kind: 'victory' });
      r.queue.unshift(...r.pending);
      r.pending = [];
    }
  }
}

function resolveAction(r: Runner, action: Action): void {
  const s = r.state;
  switch (action.kind) {
    case 'effect':
      resolveEffect(r, action.effect, action.ctx);
      return;

    case 'announce':
      emit(r, action.event);
      return;

    case 'hit': {
      const attacker = getCreature(r, action.ctx.actor);
      if (!isAlive(attacker)) return;
      const defender = action.random ? randomOpponent(r, attacker) : getCreature(r, action.targetId);
      if (!isAlive(defender)) return;
      const amount = attackDamage(r.content, attacker, defender, action.base);
      dealDamage(r, { sourceId: attacker.id, targetId: defender.id, amount, attack: true });
      return;
    }

    case 'combatStart':
      emit(r, { type: 'combatStart' });
      enqueue(r, { kind: 'decideIntents' });
      fireTrigger(r, 'combatStart', {});
      enqueue(r, { kind: 'playerTurnStart' });
      return;

    case 'playCard': {
      const index = s.hand.findIndex((c) => c.uid === action.uid);
      const card = s.hand[index] as CardInstance;
      const def = r.content.cards[card.id];
      if (!def) throw new Error(`Unknown card "${card.id}"`);
      const resolved = resolveCard(def, card.upgraded);
      const cost = resolved.cost === 'X' ? s.energy : resolved.cost;
      changeEnergy(r, -cost);
      s.hand.splice(index, 1);
      s.limbo.push(card);
      s.stats.cardsPlayed++;
      emit(r, { type: 'playCard', uid: card.uid, card: card.id, ...(action.target ? { target: action.target } : {}) });
      const ctx = {
        actor: 'player',
        source: { kind: 'card', uid: card.uid, id: card.id } as const,
        x: action.x,
        ...(action.target ? { target: action.target } : {}),
      };
      enqueueEffects(r, resolved.effects, ctx);
      fireTrigger(r, 'cardPlayed', { cardType: def.type, ...(action.target ? { other: action.target } : {}) });
      enqueue(r, { kind: 'finishCard', uid: card.uid });
      return;
    }

    case 'usePotion': {
      const id = s.potions[action.slot];
      const def = id ? r.content.potions[id] : undefined;
      if (!id || !def) return;
      s.potions[action.slot] = null;
      s.stats.potionsUsed++;
      emit(r, { type: 'usePotion', slot: action.slot, potion: id, ...(action.target ? { target: action.target } : {}) });
      enqueueEffects(r, def.effects, {
        actor: 'player',
        source: { kind: 'potion', slot: action.slot, id },
        ...(action.target ? { target: action.target } : {}),
      });
      return;
    }

    case 'finishCard': {
      const index = s.limbo.findIndex((c) => c.uid === action.uid);
      if (index < 0) return;
      const [card] = s.limbo.splice(index, 1) as [CardInstance];
      const def = r.content.cards[card.id];
      const keywords = def ? (resolveCard(def, card.upgraded).keywords ?? []) : [];
      if (def?.type === 'power') putCard(r, card, 'removed');
      else if (keywords.includes('exhaust')) putCard(r, card, 'exhaust');
      else putCard(r, card, 'discard');
      return;
    }

    case 'playerTurnStart':
      s.turn++;
      s.stats.turns = s.turn;
      resetBlock(r, s.player);
      changeEnergy(r, s.maxEnergy - s.energy);
      emit(r, { type: 'turnStart', who: 'player', turn: s.turn });
      fireTrigger(r, 'turnStart', { owner: 'player' });
      enqueue(r, { kind: 'decay', who: 'player', when: 'turnStart' }, { kind: 'drawCards', count: s.drawPerTurn });
      return;

    case 'playerTurnEnd':
      emit(r, { type: 'turnEnd', who: 'player' });
      fireTrigger(r, 'turnEnd', { owner: 'player' });
      enqueue(r, { kind: 'decay', who: 'player', when: 'turnEnd' }, { kind: 'discardHand' }, { kind: 'enemyPhase' });
      return;

    case 'discardHand':
      for (const card of [...s.hand]) {
        const def = r.content.cards[card.id];
        const keywords = def ? (resolveCard(def, card.upgraded).keywords ?? []) : [];
        if (keywords.includes('retain')) continue;
        s.hand.splice(s.hand.indexOf(card), 1);
        putCard(r, card, keywords.includes('ethereal') ? 'exhaust' : 'discard');
      }
      return;

    case 'enemyPhase':
      for (const enemy of livingEnemies(s)) {
        enqueue(
          r,
          { kind: 'enemyTurnStart', enemy: enemy.id },
          { kind: 'enemyAct', enemy: enemy.id },
          { kind: 'enemyTurnEnd', enemy: enemy.id },
        );
      }
      enqueue(r, { kind: 'decideIntents' }, { kind: 'playerTurnStart' });
      return;

    case 'enemyTurnStart': {
      const enemy = getCreature(r, action.enemy);
      if (!isAlive(enemy)) return;
      resetBlock(r, enemy);
      emit(r, { type: 'turnStart', who: enemy.id, turn: s.turn });
      fireTrigger(r, 'turnStart', { owner: enemy.id });
      enqueue(r, { kind: 'decay', who: enemy.id, when: 'turnStart' });
      return;
    }

    case 'enemyAct': {
      const enemy = getCreature(r, action.enemy);
      if (!isAlive(enemy) || !enemy.moveId) return;
      const move = r.content.enemies[enemy.defId]?.moves[enemy.moveId];
      if (!move) throw new Error(`Enemy "${enemy.defId}" has no move "${enemy.moveId}"`);
      emit(r, { type: 'enemyMove', enemy: enemy.id, move: enemy.moveId, name: move.name });
      (enemy.moveHistory ??= []).push(enemy.moveId);
      enqueueEffects(r, move.effects, {
        actor: enemy.id,
        target: 'player',
        source: { kind: 'move', enemy: enemy.id, move: enemy.moveId },
      });
      return;
    }

    case 'enemyTurnEnd': {
      const enemy = getCreature(r, action.enemy);
      if (!isAlive(enemy)) return;
      emit(r, { type: 'turnEnd', who: enemy.id });
      fireTrigger(r, 'turnEnd', { owner: enemy.id });
      enqueue(r, { kind: 'decay', who: enemy.id, when: 'turnEnd' });
      return;
    }

    case 'decideIntents':
      for (const enemy of livingEnemies(s)) {
        const def = r.content.enemies[enemy.defId];
        if (!def) continue;
        enemy.moveId = chooseMove(def, enemy.moveHistory ?? [], s.rng.enemyAI);
        emit(r, { type: 'intent', enemy: enemy.id, move: enemy.moveId });
      }
      return;

    case 'decay': {
      const c = getCreature(r, action.who);
      if (!isAlive(c)) return;
      for (const [id, stacks] of Object.entries(c.statuses)) {
        const decay = r.content.statuses[id]?.decay;
        if (!decay || decay.when !== action.when) continue;
        changeStatus(r, c.id, id, decay.amount === 'all' ? -stacks : -Math.min(decay.amount, stacks));
      }
      return;
    }

    case 'drawCards':
      drawCards(r, action.count);
      return;

    case 'victory':
      s.phase = 'victory';
      for (const card of s.limbo.splice(0)) putCard(r, card, 'discard');
      emit(r, { type: 'victory' });
      return;
  }
}

function newRunner(content: Content, state: CombatState): Runner {
  return { content, state, queue: [], pending: [], events: [], ending: false };
}

// --- Public API ------------------------------------------------------------

/** Sets up a fight and runs it up to the player's first decision. */
export function createCombat(content: Content, setup: CombatSetup): CombatResult {
  const character = content.characters[setup.characterId];
  if (!character) throw new Error(`Unknown character "${setup.characterId}"`);
  const rng = cloneState(setup.rng);

  const player: Creature = {
    id: 'player',
    side: 'player',
    defId: character.id,
    name: character.name,
    hp: setup.hp,
    maxHp: setup.maxHp,
    block: 0,
    statuses: {},
    dead: false,
  };

  const enemies: Creature[] = setup.enemies.map((id, i) => {
    const def = content.enemies[id];
    if (!def) throw new Error(`Unknown enemy "${id}"`);
    const hp = Math.max(1, Math.round(nextInt(rng.misc, def.hp[0], def.hp[1]) * (setup.enemyHpMult ?? 1)));
    const statuses: Record<string, number> = { ...(def.startStatuses ?? {}) };
    if (setup.enemyStrength) statuses.strength = (statuses.strength ?? 0) + setup.enemyStrength;
    return {
      id: `e${i}`,
      side: 'enemy',
      defId: id,
      name: def.name,
      hp,
      maxHp: hp,
      block: 0,
      statuses,
      dead: false,
      moveHistory: [],
    };
  });

  for (const id of setup.relics) if (!content.relics[id]) throw new Error(`Unknown relic "${id}"`);

  const cards: CardInstance[] = setup.deck.map((c, i) => {
    if (!content.cards[c.id]) throw new Error(`Unknown card "${c.id}"`);
    return { uid: i + 1, id: c.id, upgraded: c.upgraded ?? false };
  });
  shuffleInPlace(rng.shuffle, cards);
  // Innate cards go on top of the draw pile (the end of the array).
  const isInnate = (c: CardInstance) => {
    const def = content.cards[c.id];
    return !!def && (resolveCard(def, c.upgraded).keywords ?? []).includes('innate');
  };
  const draw = [...cards.filter((c) => !isInnate(c)), ...cards.filter(isInnate)];

  const state: CombatState = {
    version: 1,
    phase: 'player',
    turn: 0,
    energy: 0,
    maxEnergy: setup.maxEnergy ?? 3,
    drawPerTurn: setup.drawPerTurn ?? 5,
    player,
    enemies,
    draw,
    hand: [],
    discard: [],
    exhaust: [],
    limbo: [],
    relics: [...setup.relics],
    potions: [...(setup.potions ?? [])],
    counters: {},
    rng,
    nextUid: cards.length + 1,
    stats: { turns: 0, cardsPlayed: 0, damageTaken: 0, damageDealt: 0, potionsUsed: 0 },
  };

  const r = newRunner(content, state);
  r.queue.push({ kind: 'combatStart' });
  run(r);
  return { state: r.state, events: r.events };
}

/** Can the player play this card right now? */
export function canPlayCard(content: Content, state: CombatState, uid: number): { ok: true } | { ok: false; reason: string } {
  if (state.phase !== 'player') return { ok: false, reason: 'The fight is over.' };
  const card = state.hand.find((c) => c.uid === uid);
  if (!card) return { ok: false, reason: 'That card is not in your hand.' };
  const def = content.cards[card.id];
  if (!def) return { ok: false, reason: `Unknown card "${card.id}".` };
  const resolved = resolveCard(def, card.upgraded);
  if ((resolved.keywords ?? []).includes('unplayable')) return { ok: false, reason: 'This card cannot be played.' };
  if (resolved.cost !== 'X' && resolved.cost > state.energy) return { ok: false, reason: 'Not enough Energy.' };
  return { ok: true };
}

/** Applies one player command. Never mutates `state`. */
export function dispatchCombat(content: Content, state: CombatState, command: CombatCommand): CombatResult {
  const reject = (error: string): CombatResult => ({ state, events: [], error });
  if (state.phase !== 'player') return reject('The fight is over.');

  const r = newRunner(content, cloneState(state));
  const s = r.state;

  if (command.type === 'endTurn') {
    r.queue.push({ kind: 'playerTurnEnd' });
  } else if (command.type === 'discardPotion') {
    const id = s.potions[command.slot];
    if (!id) return reject('That slot is empty.');
    s.potions[command.slot] = null;
    r.events.push({ type: 'discardPotion', slot: command.slot, potion: id });
    return { state: s, events: r.events };
  } else if (command.type === 'usePotion') {
    const id = s.potions[command.slot];
    const def = id ? content.potions[id] : undefined;
    if (!id || !def) return reject('That slot is empty.');
    let target = command.target;
    if (effectsUseTarget(def.effects)) {
      const alive = livingEnemies(s);
      if (target === undefined && alive.length === 1) target = alive[0]?.id;
      if (!alive.some((e) => e.id === target)) return reject('Choose an enemy to target.');
    } else {
      target = undefined;
    }
    r.queue.push({ kind: 'usePotion', slot: command.slot, ...(target ? { target } : {}) });
  } else {
    const check = canPlayCard(content, s, command.uid);
    if (!check.ok) return reject(check.reason);
    const card = s.hand.find((c) => c.uid === command.uid) as CardInstance;
    const def = content.cards[card.id];
    if (!def) return reject(`Unknown card "${card.id}".`);
    let target = command.target;
    if (cardNeedsTarget(def, card.upgraded)) {
      const alive = livingEnemies(s);
      if (target === undefined && alive.length === 1) target = alive[0]?.id;
      if (!alive.some((e) => e.id === target)) return reject('Choose an enemy to target.');
    } else {
      target = undefined;
    }
    r.queue.push({ kind: 'playCard', uid: card.uid, x: s.energy, ...(target ? { target } : {}) });
  }

  run(r);
  return { state: r.state, events: r.events };
}

/** Save format for a fight in progress. */
export function serializeCombat(state: CombatState): string {
  return JSON.stringify(state);
}

export function deserializeCombat(json: string): CombatState {
  const data = JSON.parse(json) as CombatState;
  if (data.version !== 1) throw new Error(`Unsupported combat save version ${String(data.version)}`);
  return data;
}

