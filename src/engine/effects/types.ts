/**
 * The effect library's vocabulary. Every card, relic, potion, status and enemy
 * move is a list of these plain-data effects. To add a brand-new kind of
 * effect: add it to `Effect` below, then handle it in `resolve.ts` (what it
 * does), `describe.ts` (its card text) and `builders.ts` (a helper), plus a
 * test. TypeScript will point at every place that needs a case.
 */

/**
 * Who an effect hits, relative to the creature performing it (the "actor").
 * - self:        the actor
 * - target:      the chosen target (a card's target; for enemy moves, the
 *                player; inside a hook, the other creature in the event,
 *                e.g. the attacker for an `attacked` hook)
 * - allEnemies:  every living opponent of the actor
 * - randomEnemy: one random living opponent (re-rolled per hit)
 * - allAllies:   every living creature on the actor's side, including itself
 */
export type TargetSel = 'self' | 'target' | 'allEnemies' | 'randomEnemy' | 'allAllies';

/** Where a computed amount reads its value from. */
export type AmountSource =
  | 'x' // energy spent on an X-cost card
  | 'thisStacks' // stacks of the status whose hook is running
  | 'handSize'
  | { stacks: string; on?: 'self' | 'target' };

/** A plain number, or `plus + times × source`. */
export type Amount = number | { of: AmountSource; times?: number; plus?: number };

export type Condition =
  | { hasStatus: string; on?: 'self' | 'target'; atLeast?: number }
  | { not: Condition };

export type CardPile = 'hand' | 'draw' | 'discard';

export type Effect =
  /** Attack damage: modified by Strength / Weak / Vulnerable, blocked by Block. */
  | { type: 'attack'; amount: Amount; target: TargetSel; hits?: Amount }
  /** Plain damage (drones, explosions): blocked by Block, not modified by statuses. */
  | { type: 'damage'; amount: Amount; target: TargetSel }
  | { type: 'block'; amount: Amount; target: TargetSel }
  | { type: 'applyStatus'; status: string; amount: Amount; target: TargetSel }
  /** Removes `amount` stacks, or all stacks when amount is omitted. */
  | { type: 'removeStatus'; status: string; amount?: Amount; target: TargetSel }
  | { type: 'draw'; amount: Amount }
  | { type: 'gainEnergy'; amount: Amount }
  | { type: 'heal'; amount: Amount; target: TargetSel }
  /** HP loss that ignores Block (Poison, Overheat, self-harm). */
  | { type: 'loseHp'; amount: Amount; target: TargetSel }
  | { type: 'addCard'; card: string; to: CardPile; count?: number; upgraded?: boolean }
  /** Pay `amount` stacks of the actor's status (e.g. Scrap) to do `then`; otherwise `else`. */
  | { type: 'spend'; status: string; amount: number; then: Effect[]; else?: Effect[] }
  | { type: 'repeat'; times: Amount; effects: Effect[] }
  /** Enemies: bring in another enemy (up to `max` living enemies in the fight). */
  | { type: 'summon'; enemy: string; count?: number; max?: number }
  /** Upgrade every card in your hand for the rest of this fight. */
  | { type: 'upgradeHand' }
  | { type: 'if'; cond: Condition; then: Effect[]; else?: Effect[] };

export type EffectType = Effect['type'];
