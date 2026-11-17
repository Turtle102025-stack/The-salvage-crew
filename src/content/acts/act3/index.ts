import type { ActDef } from '../../../engine/types';

export { ACT3_ENEMIES } from './enemies';

export const ACT3: ActDef = {
  id: 3,
  name: 'The Heart',
  intro:
    'The Meridian was never just a colony ship. At its core sits an engine nobody human ever built, and it is waking up. Strip it, and the crew retires rich. Fail, and the wreck gets one more ghost.',
  encounters: {
    weak: [
      { id: 'a3_wisps', name: 'Spark Wisps', enemies: ['spark_wisp', 'spark_wisp'] },
      { id: 'a3_mites', name: 'Core Mites', enemies: ['core_mite', 'core_mite'] },
      { id: 'a3_turret', enemies: ['living_turret', 'spark_wisp'] },
    ],
    normal: [
      { id: 'a3_sentinel', enemies: ['phase_sentinel', 'spark_wisp'] },
      { id: 'a3_worm', enemies: ['conduit_worm', 'core_mite'] },
      { id: 'a3_heartguard', enemies: ['heartguard'] },
      { id: 'a3_echoes', name: 'Echoes', enemies: ['crew_echo', 'crew_echo'] },
      { id: 'a3_blob', enemies: ['plasma_blob', 'spark_wisp'] },
      { id: 'a3_turrets', name: 'Gun Garden', enemies: ['living_turret', 'living_turret'] },
      { id: 'a3_mixed', name: 'Engine Room', enemies: ['phase_sentinel', 'spark_wisp', 'spark_wisp'], weight: 0.8 },
    ],
    elite: [
      { id: 'a3_chorus', name: 'The Chorus', enemies: ['the_chorus'] },
      { id: 'a3_golem', name: 'Reactor Golem', enemies: ['reactor_golem'] },
      { id: 'a3_archivist', name: 'The Archivist', enemies: ['archivist'] },
    ],
    boss: [{ id: 'a3_heart', name: 'The Meridian Heart', enemies: ['meridian_heart'] }],
  },
  events: ['vending_machine', 'cargo_master', 'scrap_shrine', 'whispering_engine', 'crew_echoes', 'molten_forge', 'last_lifeboat', 'the_contract'],
};
