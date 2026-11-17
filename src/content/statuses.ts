/**
 * Status effects. Numbers marked "tune" are first guesses until the balance
 * simulator (Phase 7) has run.
 */
import { defineStatuses } from '../engine/defs';
import { apply, block, dealDamage, draw, energy, gain, loseHp, remove, stacks, thisStacks } from '../engine/effects/builders';

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
    summary: 'Attacks deal more damage per stack.',
  },
  weak: {
    name: 'Weak',
    kind: 'debuff',
    decay: { when: 'turnEnd', amount: 1 },
    modifiers: { attackDealtMult: 0.75 },
    description: 'Deals 25% less attack damage. Lasts {n} more turn{s}.',
    summary: 'Deals 25% less attack damage. Wears off one turn at a time.',
  },
  vulnerable: {
    name: 'Vulnerable',
    kind: 'debuff',
    decay: { when: 'turnEnd', amount: 1 },
    modifiers: { attackTakenMult: 1.5 },
    description: 'Takes 50% more attack damage. Lasts {n} more turn{s}.',
    summary: 'Takes 50% more attack damage. Wears off one turn at a time.',
  },
  poison: {
    name: 'Poison',
    kind: 'debuff',
    decay: { when: 'turnStart', amount: 1 },
    hooks: [{ on: 'turnStart', effects: [loseHp(thisStacks(), 'self')] }],
    description: 'Toxic coolant. Loses {n} HP at the start of its turn, then Poison drops by 1.',
    summary: 'Loses HP equal to its Poison at the start of each turn, then Poison drops by 1. Ignores Block.',
  },

  // --- Original: the Rigger's toolkit -----------------------------------------
  scrap: {
    name: 'Scrap',
    kind: 'buff',
    description: 'Salvaged parts ({n}). Some cards spend Scrap for bonus effects. Resets after each fight.',
    summary: 'Salvaged parts. Some cards spend Scrap for bonus effects. Resets after each fight.',
  },
  heat: {
    name: 'Heat',
    kind: 'buff',
    threshold: { at: OVERHEAT_AT, label: 'Overheat', effects: [loseHp(OVERHEAT_HP_LOSS, 'self'), remove('heat')] },
    description: `Torch heat ({n}). At ${OVERHEAT_AT} Heat you Overheat: lose ${OVERHEAT_HP_LOSS} HP and drop to 0 Heat.`,
    summary: `Builds up as you use torch cards. At ${OVERHEAT_AT} Heat you Overheat: lose ${OVERHEAT_HP_LOSS} HP and drop to 0 Heat. Resets after each fight.`,
  },
  breach: {
    name: 'Breach',
    kind: 'debuff',
    decay: { when: 'turnEnd', amount: 1 },
    modifiers: { attackIgnoresBlock: true },
    description: "Hull breached: attacks ignore this creature's Block. Lasts {n} more turn{s}.",
    summary: "Attacks ignore this creature's Block. Wears off one turn at a time.",
  },
  magnetized: {
    name: 'Magnetized',
    kind: 'debuff',
    hooks: [{ on: 'attacked', effects: [apply('scrap', 1, 'target'), remove('magnetized', 1, 'self')] }],
    description: 'The next {n} attack hit{s} on this creature each give the attacker 1 Scrap.',
    summary: 'Each attack hit on this creature gives the attacker 1 Scrap and uses up 1 stack.',
  },

  // --- Powers (installed by Power cards) --------------------------------------
  cutter_drone: {
    name: 'Cutter Drone',
    kind: 'power',
    hooks: [{ on: 'turnEnd', effects: [dealDamage(thisStacks(), 'randomEnemy')] }],
    description: 'At the end of your turn, deal {n} damage to a random enemy.',
  },
  shield_drone: {
    name: 'Shield Drone',
    kind: 'power',
    hooks: [{ on: 'turnEnd', effects: [block(thisStacks())] }],
    description: 'At the end of your turn, gain {n} Block.',
  },
  coolant_drone: {
    name: 'Coolant Drone',
    kind: 'power',
    hooks: [{ on: 'turnEnd', effects: [apply('poison', thisStacks(), 'randomEnemy')] }],
    description: 'At the end of your turn, apply {n} Poison to a random enemy.',
  },
  recycler: {
    name: 'Recycler',
    kind: 'power',
    hooks: [{ on: 'turnStart', effects: [gain('scrap', thisStacks())] }],
    description: 'At the start of your turn, gain {n} Scrap.',
  },
  scrap_plating: {
    name: 'Scrap Plating',
    kind: 'power',
    hooks: [{ on: 'turnStart', effects: [block(stacks('scrap'))] }],
    description: 'At the start of your turn, gain Block equal to your Scrap.',
  },
  thermal_feedback: {
    name: 'Thermal Feedback',
    kind: 'power',
    hooks: [{ on: 'turnEnd', effects: [dealDamage(stacks('heat'), 'allEnemies'), gain('heat', 2)] }],
    description: 'At the end of your turn, deal damage equal to your Heat to ALL enemies, then gain 2 Heat.',
  },
  double_shift: {
    name: 'Double Shift',
    kind: 'power',
    hooks: [{ on: 'turnStart', effects: [energy(thisStacks()), draw(1), loseHp(1)] }],
    description: 'At the start of your turn, gain {n} Energy, draw 1 card and lose 1 HP.',
  },
  magnetic_field: {
    name: 'Magnetic Field',
    kind: 'power',
    hooks: [{ on: 'cardPlayed', if: { cardType: 'attack' }, effects: [apply('magnetized', thisStacks(), 'randomEnemy'), block(2)] }],
    description: 'Whenever you play an Attack, apply {n} Magnetized to a random enemy and gain 2 Block.',
  },
});
