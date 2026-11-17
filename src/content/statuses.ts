/**
 * Status effects. Numbers marked "tune" are first guesses until the balance
 * simulator (Phase 7) has run.
 */
import { defineStatuses } from '../engine/defs';
import { apply, dealDamage, loseHp, remove, thisStacks } from '../engine/effects/builders';

export const OVERHEAT_AT = 10;
export const OVERHEAT_HP_LOSS = 8; // tune

export const STATUSES = defineStatuses({
  // --- Genre-standard -------------------------------------------------------
  strength: {
    name: 'Strength',
    kind: 'buff',
    allowNegative: true,
    modifiers: { attackDealtPerStack: 1 },
    description: 'Attacks deal {n} more damage.',
  },
  weak: {
    name: 'Weak',
    kind: 'debuff',
    decay: { when: 'turnEnd', amount: 1 },
    modifiers: { attackDealtMult: 0.75 },
    description: 'Deals 25% less attack damage. Lasts {n} more turn{s}.',
  },
  vulnerable: {
    name: 'Vulnerable',
    kind: 'debuff',
    decay: { when: 'turnEnd', amount: 1 },
    modifiers: { attackTakenMult: 1.5 },
    description: 'Takes 50% more attack damage. Lasts {n} more turn{s}.',
  },
  poison: {
    name: 'Poison',
    kind: 'debuff',
    decay: { when: 'turnStart', amount: 1 },
    hooks: [{ on: 'turnStart', effects: [loseHp(thisStacks(), 'self')] }],
    description: 'Toxic coolant. Loses {n} HP at the start of its turn, then Poison drops by 1.',
  },

  // --- Original: the Rigger's toolkit -----------------------------------------
  scrap: {
    name: 'Scrap',
    kind: 'buff',
    description: 'Salvaged parts ({n}). Some cards spend Scrap for bonus effects. Resets after each fight.',
  },
  heat: {
    name: 'Heat',
    kind: 'buff',
    threshold: { at: OVERHEAT_AT, label: 'Overheat', effects: [loseHp(OVERHEAT_HP_LOSS, 'self'), remove('heat')] },
    description: `Torch heat ({n}). At ${OVERHEAT_AT} Heat you Overheat: lose ${OVERHEAT_HP_LOSS} HP and drop to 0 Heat.`,
  },
  breach: {
    name: 'Breach',
    kind: 'debuff',
    decay: { when: 'turnEnd', amount: 1 },
    modifiers: { attackIgnoresBlock: true },
    description: "Hull breached: attacks ignore this creature's Block. Lasts {n} more turn{s}.",
  },
  magnetized: {
    name: 'Magnetized',
    kind: 'debuff',
    hooks: [{ on: 'attacked', effects: [apply('scrap', 1, 'target'), remove('magnetized', 1, 'self')] }],
    description: 'The next {n} attack hit{s} on this creature each give the attacker 1 Scrap.',
  },

  // --- Powers (installed by Power cards) --------------------------------------
  cutter_drone: {
    name: 'Cutter Drone',
    kind: 'power',
    hooks: [{ on: 'turnEnd', effects: [dealDamage(thisStacks(), 'randomEnemy')] }],
    description: 'At the end of your turn, deal {n} damage to a random enemy.',
  },
});
