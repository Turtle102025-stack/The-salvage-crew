/**
 * Status effects. Numbers marked "tune" are first guesses until the balance
 * simulator (Phase 7) has run.
 */
import { defineStatuses } from '../engine/defs';
import { apply, block, dealDamage, draw, energy, gain, heal, loseHp, remove, stacks, thisStacks } from '../engine/effects/builders';

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

  // --- Enemy traits (Acts 2–3) --------------------------------------------------------
  barbed: {
    name: 'Barbed',
    kind: 'buff',
    hooks: [{ on: 'attacked', effects: [dealDamage(thisStacks(), 'target')] }],
    description: 'Whenever this is hit by an attack, the attacker takes {n} damage.',
    summary: 'Hitting it with attacks hurts you back.',
  },
  nanites: {
    name: 'Nanites',
    kind: 'buff',
    hooks: [{ on: 'turnEnd', effects: [heal(thisStacks())] }],
    description: 'Heals {n} HP at the end of its turn.',
    summary: 'Repairs itself a little every turn.',
  },
  plating: {
    name: 'Plating',
    kind: 'buff',
    hooks: [{ on: 'turnStart', effects: [block(thisStacks())] }],
    description: 'Gains {n} Block at the start of its turn.',
    summary: 'Gains some Block at the start of each turn.',
  },
  agitated: {
    name: 'Agitated',
    kind: 'buff',
    hooks: [{ on: 'cardPlayed', if: { cardType: 'skill' }, effects: [gain('strength', thisStacks())] }],
    description: 'Whenever you play a Skill, gains {n} Strength.',
    summary: 'Gets stronger every time you play a Skill.',
  },

  // --- More powers (Phase 8) -------------------------------------------------------------
  heat_exchanger: {
    name: 'Heat Exchanger',
    kind: 'power',
    hooks: [{ on: 'turnStart', effects: [gain('heat', 2), block(thisStacks())] }],
    description: 'At the start of your turn, gain 2 Heat and {n} Block.',
  },
  reactive_armor: {
    name: 'Reactive Armor',
    kind: 'power',
    hooks: [{ on: 'attacked', effects: [block(thisStacks())] }],
    description: 'Whenever you are hit by an attack, gain {n} Block.',
  },
  juggernaut: {
    name: 'Juggernaut Rig',
    kind: 'power',
    hooks: [{ on: 'blockGained', effects: [dealDamage(thisStacks(), 'randomEnemy')] }],
    description: 'Whenever you gain Block, deal {n} damage to a random enemy.',
  },
  scrapyard_king: {
    name: 'Scrapyard King',
    kind: 'power',
    hooks: [{ on: 'turnEnd', effects: [dealDamage(stacks('scrap'), 'allEnemies')] }],
    description: 'At the end of your turn, deal damage equal to your Scrap to ALL enemies.',
  },
  magnetar: {
    name: 'Magnetar',
    kind: 'power',
    hooks: [{ on: 'turnStart', effects: [apply('magnetized', thisStacks(), 'allEnemies')] }],
    description: 'At the start of your turn, apply {n} Magnetized to ALL enemies.',
  },
  toolmaster: {
    name: 'Toolmaster',
    kind: 'power',
    hooks: [{ on: 'turnStart', effects: [draw(thisStacks())] }],
    description: 'At the start of your turn, draw {n} more card{s}.',
  },
});
