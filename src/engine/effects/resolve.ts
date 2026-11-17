/**
 * What each effect does when it resolves. Sub-steps (each hit of an attack,
 * the inside of `repeat`/`spend`/`if`) are queued as their own actions so
 * hooks react between them and the UI can animate each one.
 */
import {
  alliesOf,
  changeEnergy,
  changeStatus,
  dealDamage,
  drawCards,
  enqueue,
  enqueueEffects,
  gainBlock,
  getCreature,
  heal,
  isAlive,
  loseHp,
  newCardInstance,
  opponentsOf,
  putCard,
  randomOpponent,
  spawnEnemy,
  type Action,
  type Ctx,
  type Runner,
} from '../combat/core';
import type { CreatureId } from '../types';
import type { Amount, Condition, Effect, TargetSel } from './types';

export function evalAmount(r: Runner, amount: Amount, ctx: Ctx): number {
  if (typeof amount === 'number') return amount;
  const src = amount.of;
  let value = 0;
  if (src === 'x') value = ctx.x ?? 0;
  else if (src === 'handSize') value = r.state.hand.length;
  else if (src === 'thisStacks') {
    if (ctx.source.kind === 'status') value = getCreature(r, ctx.source.owner)?.statuses[ctx.source.id] ?? 0;
  } else {
    const who = getCreature(r, src.on === 'target' ? ctx.target : ctx.actor);
    value = who?.statuses[src.stacks] ?? 0;
  }
  return Math.floor((amount.plus ?? 0) + (amount.times ?? 1) * value);
}

function evalCondition(r: Runner, cond: Condition, ctx: Ctx): boolean {
  if ('not' in cond) return !evalCondition(r, cond.not, ctx);
  const who = getCreature(r, cond.on === 'target' ? ctx.target : ctx.actor);
  return (who?.statuses[cond.hasStatus] ?? 0) >= (cond.atLeast ?? 1);
}

/** The creatures an effect applies to right now. `randomEnemy` picks one. */
export function resolveTargets(r: Runner, ctx: Ctx, sel: TargetSel): CreatureId[] {
  const actor = getCreature(r, ctx.actor);
  if (!actor) return [];
  switch (sel) {
    case 'self':
      return isAlive(actor) ? [actor.id] : [];
    case 'target': {
      const t = getCreature(r, ctx.target);
      return isAlive(t) ? [t.id] : [];
    }
    case 'allEnemies':
      return opponentsOf(r, actor).map((c) => c.id);
    case 'randomEnemy': {
      const t = randomOpponent(r, actor);
      return t ? [t.id] : [];
    }
    case 'allAllies':
      return alliesOf(r, actor).map((c) => c.id);
  }
}

export function resolveEffect(r: Runner, effect: Effect, ctx: Ctx): void {
  switch (effect.type) {
    case 'attack': {
      const base = evalAmount(r, effect.amount, ctx);
      const hits = effect.hits === undefined ? 1 : evalAmount(r, effect.hits, ctx);
      const actions: Action[] = [];
      for (let h = 0; h < hits; h++) {
        if (effect.target === 'randomEnemy') actions.push({ kind: 'hit', ctx, base, random: true });
        else for (const id of resolveTargets(r, ctx, effect.target)) actions.push({ kind: 'hit', ctx, base, targetId: id });
      }
      enqueue(r, ...actions);
      return;
    }
    case 'damage': {
      const amount = evalAmount(r, effect.amount, ctx);
      for (const id of resolveTargets(r, ctx, effect.target)) {
        dealDamage(r, { sourceId: ctx.actor, targetId: id, amount, attack: false });
      }
      return;
    }
    case 'block': {
      const amount = evalAmount(r, effect.amount, ctx);
      for (const id of resolveTargets(r, ctx, effect.target)) gainBlock(r, id, amount);
      return;
    }
    case 'applyStatus': {
      const amount = evalAmount(r, effect.amount, ctx);
      for (const id of resolveTargets(r, ctx, effect.target)) changeStatus(r, id, effect.status, amount);
      return;
    }
    case 'removeStatus': {
      for (const id of resolveTargets(r, ctx, effect.target)) {
        const current = getCreature(r, id)?.statuses[effect.status] ?? 0;
        const amount = effect.amount === undefined ? current : Math.min(current, evalAmount(r, effect.amount, ctx));
        if (amount !== 0) changeStatus(r, id, effect.status, -amount);
      }
      return;
    }
    case 'draw':
      drawCards(r, evalAmount(r, effect.amount, ctx));
      return;
    case 'gainEnergy':
      changeEnergy(r, evalAmount(r, effect.amount, ctx));
      return;
    case 'heal': {
      const amount = evalAmount(r, effect.amount, ctx);
      for (const id of resolveTargets(r, ctx, effect.target)) heal(r, id, amount);
      return;
    }
    case 'loseHp': {
      const amount = evalAmount(r, effect.amount, ctx);
      for (const id of resolveTargets(r, ctx, effect.target)) loseHp(r, id, amount, ctx.actor);
      return;
    }
    case 'addCard': {
      for (let i = 0; i < (effect.count ?? 1); i++) {
        const card = newCardInstance(r, effect.card, effect.upgraded ?? false);
        r.events.push({ type: 'cardCreated', uid: card.uid, card: card.id, to: effect.to });
        putCard(r, card, effect.to);
      }
      return;
    }
    case 'spend': {
      const actor = getCreature(r, ctx.actor);
      if (isAlive(actor) && (actor.statuses[effect.status] ?? 0) >= effect.amount) {
        changeStatus(r, actor.id, effect.status, -effect.amount);
        enqueueEffects(r, effect.then, ctx);
      } else if (effect.else) {
        enqueueEffects(r, effect.else, ctx);
      }
      return;
    }
    case 'summon': {
      const max = effect.max ?? 5;
      for (let i = 0; i < (effect.count ?? 1); i++) {
        if (r.state.enemies.filter((e) => !e.dead).length >= max) break;
        spawnEnemy(r, effect.enemy);
      }
      return;
    }
    case 'upgradeHand': {
      for (const card of r.state.hand) {
        const def = r.content.cards[card.id];
        if (card.upgraded || !def || def.type === 'curse' || def.type === 'status') continue;
        card.upgraded = true;
        r.events.push({ type: 'cardUpgraded', uid: card.uid, card: card.id });
      }
      return;
    }
    case 'repeat': {
      const times = evalAmount(r, effect.times, ctx);
      for (let i = 0; i < times; i++) enqueueEffects(r, effect.effects, ctx);
      return;
    }
    case 'if': {
      const branch = evalCondition(r, effect.cond, ctx) ? effect.then : (effect.else ?? []);
      enqueueEffects(r, branch, ctx);
      return;
    }
  }
}
