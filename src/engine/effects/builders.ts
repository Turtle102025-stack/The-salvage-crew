/**
 * Small helpers so content files read like card text:
 *   effects: [attack(6), gain('scrap', 2)]
 */
import type { Amount, AmountSource, CardPile, Condition, Effect, TargetSel } from './types';

export const attack = (amount: Amount, opts: { target?: TargetSel; hits?: Amount } = {}): Effect => ({
  type: 'attack',
  amount,
  target: opts.target ?? 'target',
  ...(opts.hits !== undefined ? { hits: opts.hits } : {}),
});

/** Plain damage: not boosted by Strength or Vulnerable. */
export const dealDamage = (amount: Amount, target: TargetSel = 'target'): Effect => ({ type: 'damage', amount, target });

export const block = (amount: Amount, target: TargetSel = 'self'): Effect => ({ type: 'block', amount, target });

/** Apply a status to the target (default) or anyone else. */
export const apply = (status: string, amount: Amount, target: TargetSel = 'target'): Effect => ({
  type: 'applyStatus',
  status,
  amount,
  target,
});

/** Give the actor a status (Scrap, Heat, Strength, a Power…). */
export const gain = (status: string, amount: Amount): Effect => apply(status, amount, 'self');

/** Remove `amount` stacks, or all of them when amount is omitted. */
export const remove = (status: string, amount?: Amount, target: TargetSel = 'self'): Effect => ({
  type: 'removeStatus',
  status,
  target,
  ...(amount !== undefined ? { amount } : {}),
});

export const draw = (amount: Amount): Effect => ({ type: 'draw', amount });
export const energy = (amount: Amount): Effect => ({ type: 'gainEnergy', amount });
export const heal = (amount: Amount, target: TargetSel = 'self'): Effect => ({ type: 'heal', amount, target });
export const loseHp = (amount: Amount, target: TargetSel = 'self'): Effect => ({ type: 'loseHp', amount, target });

export const addCard = (card: string, to: CardPile, opts: { count?: number; upgraded?: boolean } = {}): Effect => ({
  type: 'addCard',
  card,
  to,
  ...opts,
});

export const spend = (status: string, amount: number, then: Effect[], otherwise?: Effect[]): Effect => ({
  type: 'spend',
  status,
  amount,
  then,
  ...(otherwise ? { else: otherwise } : {}),
});

export const repeat = (times: Amount, effects: Effect[]): Effect => ({ type: 'repeat', times, effects });

export const when = (cond: Condition, then: Effect[], otherwise?: Effect[]): Effect => ({
  type: 'if',
  cond,
  then,
  ...(otherwise ? { else: otherwise } : {}),
});

// --- Amount helpers --------------------------------------------------------

const amountOf = (of: AmountSource, opts: { times?: number | undefined; plus?: number | undefined } = {}): Amount => ({
  of,
  ...(opts.times !== undefined ? { times: opts.times } : {}),
  ...(opts.plus !== undefined ? { plus: opts.plus } : {}),
});

/** Stacks of a status on the actor (default) or the target. */
export const stacks = (status: string, opts: { on?: 'self' | 'target'; times?: number; plus?: number } = {}): Amount =>
  amountOf({ stacks: status, ...(opts.on ? { on: opts.on } : {}) }, { times: opts.times, plus: opts.plus });

/** Stacks of the status whose hook is running (for status/power hooks). */
export const thisStacks = (opts: { times?: number; plus?: number } = {}): Amount => amountOf('thisStacks', opts);

/** Energy spent on an X-cost card. */
export const X = (opts: { times?: number; plus?: number } = {}): Amount => amountOf('x', opts);
