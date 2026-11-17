import type { ActDef } from '../../../engine/types';

export { ACT1_ENEMIES } from './enemies';

export const ACT1: ActDef = {
  id: 1,
  name: 'The Graveyard Belt',
  intro:
    'The debris field around the Meridian. Scrap Mites, rival crews and a thousand broken drones, all between you and the biggest payday of your life.',
  encounters: {
    // The first two fights of the act come from here.
    weak: [
      { id: 'a1_mites', name: 'Scrap Mites', enemies: ['scrap_mite', 'scrap_mite'] },
      { id: 'a1_lamprey', enemies: ['rust_lamprey'] },
      { id: 'a1_drone', enemies: ['salvage_drone'] },
      { id: 'a1_sentry_mite', enemies: ['sentry_orb', 'scrap_mite'] },
    ],
    normal: [
      { id: 'a1_mite_lamprey', enemies: ['scrap_mite', 'rust_lamprey'] },
      { id: 'a1_jumper', enemies: ['claim_jumper', 'scrap_mite'] },
      { id: 'a1_jumpers', name: 'Claim Jumpers', enemies: ['claim_jumper', 'claim_jumper'] },
      { id: 'a1_slick', enemies: ['coolant_slick', 'scrap_mite'] },
      { id: 'a1_turret', name: 'Turret Nest', enemies: ['defense_turret', 'sentry_orb'] },
      { id: 'a1_crab', enemies: ['scrap_crab'] },
      { id: 'a1_swarm', enemies: ['mite_swarm', 'scrap_mite'] },
      { id: 'a1_drones', name: 'Drone Pair', enemies: ['salvage_drone', 'salvage_drone'] },
      { id: 'a1_infestation', name: 'Infestation', enemies: ['scrap_mite', 'rust_lamprey', 'scrap_mite'] },
    ],
    elite: [
      { id: 'a1_krell', name: 'Foreman Krell', enemies: ['foreman_krell'] },
      { id: 'a1_cutter_bot', name: 'Cutter Bot Mk II', enemies: ['cutter_bot'] },
      { id: 'a1_matriarch', name: 'Lamprey Matriarch', enemies: ['lamprey_matriarch'] },
    ],
    boss: [{ id: 'a1_wreckwarden', name: 'The Wreckwarden', enemies: ['wreckwarden'] }],
  },
  events: ['escape_pod', 'vending_machine', 'union_rep', 'workshop', 'distress_call', 'cargo_master', 'coolant_spill', 'scrap_shrine', 'looping_signal'],
};
