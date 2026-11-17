/**
 * The Rigger's cards. Starter cards plus a first handful that exercise each
 * of her mechanics (Scrap, Heat, Breach, Magnetized, drones). The full card
 * pool arrives in Phase 6; numbers get tuned in Phase 7.
 */
import { defineCards } from '../../../engine/defs';
import { apply, attack, block, draw, gain, remove, spend, stacks } from '../../../engine/effects/builders';

export const RIGGER_CARDS = defineCards('rigger', {
  // --- Starter deck -----------------------------------------------------------
  pry_bar: {
    name: 'Pry Bar',
    type: 'attack',
    rarity: 'starter',
    cost: 1,
    effects: [attack(6)],
    upgrade: { effects: [attack(9)] },
    flavor: 'Opens crates, hatches and arguments.',
  },
  hull_patch: {
    name: 'Hull Patch',
    type: 'skill',
    rarity: 'starter',
    cost: 1,
    effects: [block(5)],
    upgrade: { effects: [block(8)] },
    flavor: 'Mostly tape. Mostly holds.',
  },
  strip_for_parts: {
    name: 'Strip for Parts',
    type: 'attack',
    rarity: 'starter',
    cost: 1,
    effects: [attack(5), gain('scrap', 2)],
    upgrade: { effects: [attack(7), gain('scrap', 3)] },
    flavor: "If it's not bolted down, it's inventory. If it is bolted down, it's inventory later.",
  },

  // --- Sampler: one card per mechanic -----------------------------------------
  jury_rig: {
    name: 'Jury-Rig',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    effects: [block(6), spend('scrap', 2, [block(6)])],
    upgrade: { effects: [block(8), spend('scrap', 2, [block(8)])] },
    flavor: 'Not up to code. Up to something, though.',
  },
  mag_clamp: {
    name: 'Mag Clamp',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    effects: [attack(5), apply('magnetized', 2)],
    upgrade: { effects: [attack(7), apply('magnetized', 3)] },
    flavor: 'Sticks to anything metal. Also, briefly, to Juno.',
  },
  thermal_lance: {
    name: 'Thermal Lance',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    effects: [gain('heat', 3), attack(stacks('heat', { times: 2 }))],
    upgrade: { effects: [gain('heat', 3), attack(stacks('heat', { times: 3 }))] },
    flavor: 'Safety goggles sold separately.',
  },
  vent_coolant: {
    name: 'Vent Coolant',
    type: 'skill',
    rarity: 'common',
    cost: 1,
    effects: [block(stacks('heat', { times: 2 })), remove('heat')],
    upgrade: { cost: 0 },
    flavor: 'The hiss means it is working. The smell means it is working too hard.',
  },
  breach_charge: {
    name: 'Breach Charge',
    type: 'skill',
    rarity: 'uncommon',
    cost: 1,
    effects: [apply('breach', 2), draw(1)],
    upgrade: { effects: [apply('breach', 3), draw(1)] },
    flavor: 'Knock knock.',
  },
  cutter_drone: {
    name: 'Cutter Drone',
    type: 'power',
    rarity: 'uncommon',
    cost: 1,
    effects: [gain('cutter_drone', 3)],
    upgrade: { effects: [gain('cutter_drone', 4)] },
    flavor: 'Named "Sparky" by the crew. Named nothing printable by everyone else.',
  },
});
