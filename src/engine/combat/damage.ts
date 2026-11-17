/**
 * The damage pipeline. All attack damage in the game is computed here:
 *
 *   base → + Strength (per stack) → × Weak (attacker) → × Vulnerable (defender)
 *        → round down, minimum 0 → Block absorbs (unless Breached) → HP
 *
 * Which statuses do what comes from their `modifiers` in content, so new
 * damage-modifying statuses need no engine changes.
 */
import type { Content, Creature } from '../types';

/** Attack damage after attacker and defender modifiers (before Block). */
export function attackDamage(content: Content, attacker: Creature | undefined, defender: Creature | undefined, base: number): number {
  let dmg = base;
  let dealtMult = 1;
  let takenMult = 1;
  if (attacker) {
    for (const [id, stacks] of Object.entries(attacker.statuses)) {
      const mods = content.statuses[id]?.modifiers;
      if (!mods) continue;
      if (mods.attackDealtPerStack) dmg += mods.attackDealtPerStack * stacks;
      if (mods.attackDealtMult !== undefined && stacks > 0) dealtMult *= mods.attackDealtMult;
    }
  }
  if (defender) {
    for (const [id, stacks] of Object.entries(defender.statuses)) {
      const mods = content.statuses[id]?.modifiers;
      if (mods?.attackTakenMult !== undefined && stacks > 0) takenMult *= mods.attackTakenMult;
    }
  }
  return Math.max(0, Math.floor(dmg * dealtMult * takenMult));
}

/** True if attacks against this creature skip its Block (e.g. Breach). */
export function attacksIgnoreBlock(content: Content, defender: Creature): boolean {
  return Object.entries(defender.statuses).some(
    ([id, stacks]) => stacks > 0 && content.statuses[id]?.modifiers?.attackIgnoresBlock === true,
  );
}

/** Splits damage into the part Block absorbs and the part that reaches HP. */
export function splitDamage(block: number, amount: number, ignoreBlock: boolean): { blocked: number; through: number } {
  const blocked = ignoreBlock ? 0 : Math.min(Math.max(0, block), amount);
  return { blocked, through: amount - blocked };
}
