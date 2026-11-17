/** Canisters (potions): single-use, three slots. */
import { block, dealDamage, draw, energy, gain, heal, apply, remove, stacks } from '../engine/effects/builders';
import type { PotionDef } from '../engine/types';

function definePotions(defs: Record<string, Omit<PotionDef, 'id'>>): Record<string, PotionDef> {
  return Object.fromEntries(Object.entries(defs).map(([id, d]) => [id, { ...d, id }]));
}

export const POTIONS = definePotions({
  repair_gel: {
    name: 'Repair Gel',
    rarity: 'common',
    effects: [heal(12)],
    outOfCombat: [{ type: 'hp', amount: 12 }],
    flavor: 'Seals suits, hulls and, in a pinch, people.',
  },
  shield_foam: {
    name: 'Shield Foam',
    rarity: 'common',
    effects: [block(12)],
    flavor: 'Expands on contact. Do not inhale.',
  },
  smoke_canister: {
    name: 'Smoke Canister',
    rarity: 'common',
    effects: [apply('weak', 2, 'allEnemies')],
    flavor: 'Nobody can hit what they can’t see. Including you.',
  },
  acid_flask: {
    name: 'Acid Flask',
    rarity: 'common',
    effects: [apply('poison', 7)],
    flavor: 'Industrial descaler. Also descales enemies.',
  },
  cutting_charge: {
    name: 'Cutting Charge',
    rarity: 'common',
    effects: [dealDamage(20)],
    flavor: 'Rated for bulkheads. Works on most other things too.',
  },
  caffeine_jolt: {
    name: 'Caffeine Jolt',
    rarity: 'common',
    effects: [draw(3)],
    flavor: 'Brewed in the reactor coolant line. Technically against regulations.',
  },
  overclock_cell: {
    name: 'Overclock Cell',
    rarity: 'uncommon',
    effects: [energy(2)],
    flavor: 'Warranty void if used. Warranty void anyway.',
  },
  stim_shot: {
    name: 'Stim Shot',
    rarity: 'uncommon',
    effects: [gain('strength', 2)],
    flavor: 'Side effects include confidence.',
  },
  scrap_pack: {
    name: 'Scrap Pack',
    rarity: 'common',
    effects: [gain('scrap', 6)],
    flavor: 'Nuts, bolts and one suspicious sandwich.',
  },
  cryo_spray: {
    name: 'Cryo Spray',
    rarity: 'uncommon',
    effects: [block(stacks('heat', { times: 3 })), remove('heat')],
    flavor: 'For when the torch gets ideas.',
  },
  plating_gel: {
    name: 'Plating Gel',
    rarity: 'uncommon',
    effects: [gain('plating', 4)],
    flavor: 'Smear it on, let it set, feel invincible (not a warranty).',
  },
  emergency_battery: {
    name: 'Emergency Battery',
    rarity: 'rare',
    effects: [energy(1), draw(2)],
    flavor: 'For emergencies. Everything is an emergency.',
  },
});
