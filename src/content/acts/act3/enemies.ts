/** Act 3: The Heart. The alien engine at the Meridian's core, and the things it made. */
import { defineEnemies } from '../../../engine/defs';
import { addCard, apply, attack, block, dealDamage, gain, heal, summon } from '../../../engine/effects/builders';

export const ACT3_ENEMIES = defineEnemies({
  // --- Regular ---------------------------------------------------------------------
  spark_wisp: {
    name: 'Spark Wisp',
    hp: [22, 26],
    moves: {
      arc: { name: 'Arc', effects: [attack(4, { hits: 2 })] },
      flicker: { name: 'Flicker', effects: [block(8), gain('strength', 1)] },
    },
    ai: { then: { weights: { arc: 65, flicker: 35 }, maxInARow: 2 } },
    flavor: 'A stray thought of the engine, given legs. Well, sparks.',
  },
  phase_sentinel: {
    name: 'Phase Sentinel',
    hp: [42, 46],
    startStatuses: { plating: 4 },
    moves: {
      ray: { name: 'Phase Ray', effects: [attack(12)] },
      null_field: { name: 'Null Field', effects: [apply('weak', 2), apply('vulnerable', 2)] },
    },
    ai: { then: { cycle: ['null_field', 'ray', 'ray'] } },
    flavor: 'Half here, half somewhere else. Fully hostile in both.',
  },
  core_mite: {
    name: 'Core Mite',
    hp: [26, 30],
    startStatuses: { barbed: 2 },
    moves: {
      bite: { name: 'Searing Bite', effects: [attack(8)] },
      charge: { name: 'Charge Up', effects: [gain('strength', 2), block(6)] },
    },
    ai: { then: { weights: { bite: 65, charge: 35 }, maxInARow: 2 } },
    flavor: 'Lives inside the reactor shielding. Thinks you are a snack.',
  },
  conduit_worm: {
    name: 'Conduit Worm',
    hp: [48, 52],
    moves: {
      discharge: { name: 'Discharge', effects: [attack(11), apply('vulnerable', 1)] },
      coil: { name: 'Coil', effects: [block(12)] },
      siphon: { name: 'Siphon', effects: [attack(8), heal(8)] },
    },
    ai: { then: { cycle: ['discharge', 'siphon', 'coil'] } },
    flavor: 'It swims through power lines and comes out angry.',
  },
  heartguard: {
    name: 'Heartguard',
    hp: [60, 64],
    startStatuses: { plating: 6 },
    moves: {
      crush: { name: 'Crush', effects: [attack(17)] },
      resonate: { name: 'Resonate', effects: [gain('strength', 2)] },
    },
    ai: { then: { cycle: ['resonate', 'crush', 'crush'] } },
    flavor: 'Built by something that never met a human, to stop things exactly like you.',
  },
  crew_echo: {
    name: 'Echo of the Crew',
    hp: [40, 44],
    startStatuses: { nanites: 3 },
    moves: {
      pain: { name: 'Remembered Pain', effects: [attack(9), apply('weak', 1)] },
      forget: { name: 'Forget', effects: [addCard('debris', 'discard', { count: 2 }), block(10)] },
    },
    ai: { then: { cycle: ['pain', 'pain', 'forget'] } },
    flavor: 'The engine keeps copies of everyone it has met. They are not happy copies.',
  },
  plasma_blob: {
    name: 'Plasma Blob',
    hp: [52, 56],
    moves: {
      splatter: { name: 'Splatter', effects: [attack(9), apply('poison', 2)] },
      engulf: { name: 'Engulf', effects: [block(15)] },
      ignite: { name: 'Ignite', effects: [attack(6, { hits: 2 })] },
    },
    ai: { then: { weights: { splatter: 40, ignite: 40, engulf: 20 }, maxInARow: 2 } },
    flavor: 'Hot to the touch. Do not touch.',
  },
  living_turret: {
    name: 'Living Turret',
    hp: [36, 40],
    moves: {
      charge: { name: 'Charge', effects: [gain('strength', 2), block(6)] },
      lance: { name: 'Plasma Lance', effects: [attack(16)] },
    },
    ai: { then: { cycle: ['charge', 'lance'] } },
    flavor: 'The engine grew a gun. It is learning.',
  },

  // --- Hazards ----------------------------------------------------------------------
  the_chorus: {
    name: 'The Chorus',
    hp: [116, 122],
    startStatuses: { agitated: 1 },
    moves: {
      shriek: { name: 'Shriek', effects: [apply('weak', 1), apply('vulnerable', 2)] },
      rend: { name: 'Rend', effects: [attack(5, { hits: 3 })] },
      harmonize: { name: 'Harmonize', effects: [block(15), heal(10)] },
    },
    ai: { opening: ['shriek'], then: { weights: { rend: 55, harmonize: 25, shriek: 20 }, maxInARow: 2 } },
    flavor: 'A swarm of voices singing one note. The note is "leave".',
  },
  reactor_golem: {
    name: 'Reactor Golem',
    hp: [130, 136],
    startStatuses: { plating: 9 },
    moves: {
      punch: { name: 'Meltdown Punch', effects: [attack(21)] },
      vent: { name: 'Vent Steam', effects: [dealDamage(8), block(20)] },
      pressure: { name: 'Build Pressure', effects: [gain('strength', 4)] },
    },
    ai: { then: { cycle: ['pressure', 'punch', 'vent', 'punch'] } },
    flavor: 'A walking reactor that has decided it is in charge of safety now.',
  },
  archivist: {
    name: 'The Archivist',
    hp: [120, 126],
    startStatuses: { nanites: 6 },
    moves: {
      erase: { name: 'Erase', effects: [attack(16)] },
      rewrite: { name: 'Rewrite', effects: [addCard('paperwork', 'draw', { count: 2 }), apply('weak', 2)], intent: ['debuff'] },
      defrag: { name: 'Defragment', effects: [block(18), gain('strength', 2)] },
    },
    ai: { then: { cycle: ['erase', 'rewrite', 'erase', 'defrag'] } },
    flavor: 'It keeps the Meridian’s records, and it is about to file you under "deceased".',
  },

  // --- Boss -------------------------------------------------------------------------------
  meridian_heart: {
    name: 'The Meridian Heart',
    hp: [258, 264],
    startStatuses: { plating: 5 },
    moves: {
      awaken: { name: 'Awaken', effects: [gain('strength', 2), block(16)] },
      pulse: { name: 'Pulse', effects: [attack(6, { hits: 3 })] },
      sparks: { name: 'Shed Sparks', effects: [summon('spark_wisp', 2, 4)] },
      surge: { name: 'Surge', effects: [attack(22)] },
      corrupt: {
        name: 'Corruption',
        effects: [addCard('debris', 'draw', { count: 2 }), apply('weak', 1), apply('vulnerable', 2)],
        intent: ['debuff'],
      },
    },
    ai: { opening: ['awaken'], then: { cycle: ['pulse', 'sparks', 'surge', 'corrupt', 'pulse', 'awaken'] } },
    flavor: 'The engine at the centre of the wreck. It has been asleep for four hundred years and it wakes up in a mood.',
  },
});
