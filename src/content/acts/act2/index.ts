import type { ActDef } from '../../../engine/types';

export { ACT2_ENEMIES } from './enemies';

export const ACT2: ActDef = {
  id: 2,
  name: 'The Hulk',
  intro:
    'Inside the Meridian at last: kilometres of dark corridors, security systems that never got the evacuation order, and something that has been nesting in the cargo holds for a very long time.',
  encounters: {
    weak: [
      { id: 'a2_drones', name: 'Security Patrol', enemies: ['security_drone', 'security_drone'] },
      { id: 'a2_crawlers', name: 'Vent Crawlers', enemies: ['vent_crawler', 'vent_crawler'] },
      { id: 'a2_jelly', enemies: ['bilge_jelly', 'brood_larva'] },
    ],
    normal: [
      { id: 'a2_sentinel', name: 'Checkpoint', enemies: ['bulkhead_sentinel', 'security_drone'] },
      { id: 'a2_loader', enemies: ['cargo_loader', 'brood_larva'] },
      { id: 'a2_mold', enemies: ['hull_mold', 'vent_crawler'] },
      { id: 'a2_eye', name: 'Surveillance Node', enemies: ['warden_eye', 'warden_eye'] },
      { id: 'a2_crew', name: 'Hollow Crew', enemies: ['hollow_crewman', 'hollow_crewman'] },
      { id: 'a2_jellies', name: 'Bilge Bloom', enemies: ['bilge_jelly', 'bilge_jelly'] },
      { id: 'a2_larvae', name: 'Hatchery', enemies: ['brood_larva', 'brood_larva', 'brood_larva', 'brood_larva'] },
      { id: 'a2_mixed', name: 'Corridor Ambush', enemies: ['security_drone', 'hollow_crewman', 'vent_crawler'], weight: 0.7 },
    ],
    elite: [
      { id: 'a2_lockdown', name: 'Lockdown Sentinel', enemies: ['lockdown_sentinel'] },
      { id: 'a2_mass', name: 'The Gnawing Mass', enemies: ['gnawing_mass'] },
      { id: 'a2_vass', name: 'Captain Vass', enemies: ['captain_vass', 'claim_jumper'] },
    ],
    boss: [{ id: 'a2_matron', name: 'The Brood Matron', enemies: ['brood_matron'] }],
  },
  events: ['vending_machine', 'union_rep', 'workshop', 'cargo_master', 'coolant_spill', 'scrap_shrine', 'looping_signal', 'cryo_bay', 'robot_chef', 'archive_terminal', 'gravity_well', 'smugglers_stash'],
};
