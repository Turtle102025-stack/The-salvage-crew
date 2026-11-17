import type { ActDef } from '../../../engine/types';

export { ACT1_ENEMIES } from './enemies';

export const ACT1: ActDef = {
  id: 1,
  name: 'The Graveyard Belt',
  intro:
    'The debris field around the Meridian. Scrap Mites, rival crews and a thousand broken drones, all between you and the biggest payday of your life.',
  encounters: {
    weak: [
      { id: 'a1_mites', enemies: ['scrap_mite', 'scrap_mite'] },
      { id: 'a1_lamprey', enemies: ['rust_lamprey'] },
    ],
    normal: [
      { id: 'a1_mite_lamprey', enemies: ['scrap_mite', 'rust_lamprey'] },
      { id: 'a1_two_lampreys', enemies: ['rust_lamprey', 'rust_lamprey'] },
      { id: 'a1_infestation', enemies: ['scrap_mite', 'rust_lamprey', 'scrap_mite'] },
    ],
    // Placeholders until Phase 6 adds the real Hazards and boss.
    elite: [{ id: 'a1_lamprey_nest', name: 'Lamprey Nest', enemies: ['rust_lamprey', 'rust_lamprey', 'rust_lamprey'] }],
    boss: [{ id: 'a1_swarm', name: 'The Swarm', enemies: ['scrap_mite', 'rust_lamprey', 'rust_lamprey', 'scrap_mite'] }],
  },
  events: ['escape_pod', 'vending_machine', 'union_rep'],
};
