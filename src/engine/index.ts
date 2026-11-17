/** The game engine's public surface. UI, tests and the simulator import from here. */
export * from './types';
export * from './rng';
export * from './defs';
export * from './version';
export type { Amount, AmountSource, CardPile, Condition, Effect, EffectType, TargetSel } from './effects/types';
export * as fx from './effects/builders';
export { describeCard, describeEffect, describeEffects, describeRelic, describeStatus, fillStatusText } from './effects/describe';
export { createCombat, dispatchCombat, canPlayCard, serializeCombat, deserializeCombat, cloneState } from './combat/combat';
export { attackDamage } from './combat/damage';
export { getIntent, chooseMove, type IntentView } from './combat/enemies';
export { MAX_HAND_SIZE, livingEnemies } from './combat/core';
export { setupFromSeed } from './combat/setup';
