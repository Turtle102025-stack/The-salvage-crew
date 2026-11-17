/** Act 2: The Hulk. Inside the Meridian: security systems and things that nest in the dark. */
import { defineEnemies } from '../../../engine/defs';
import { addCard, apply, attack, block, gain, heal, summon } from '../../../engine/effects/builders';

export const ACT2_ENEMIES = defineEnemies({
  // --- Regular ---------------------------------------------------------------------
  security_drone: {
    name: 'Security Drone',
    hp: [26, 30],
    moves: {
      stun: { name: 'Stun Beam', effects: [attack(5), apply('weak', 1)] },
      patrol: { name: 'Patrol Pattern', effects: [block(8)] },
      volley: { name: 'Taser Volley', effects: [attack(2, { hits: 3 })] },
    },
    ai: { then: { weights: { stun: 40, volley: 40, patrol: 20 }, maxInARow: 2 } },
    flavor: '"Please present your boarding pass." It has been asking for 400 years.',
  },
  bulkhead_sentinel: {
    name: 'Bulkhead Sentinel',
    hp: [36, 40],
    startStatuses: { plating: 3 },
    moves: {
      lock: { name: 'Lock On', effects: [apply('vulnerable', 1)] },
      round: { name: 'Heavy Round', effects: [attack(13)] },
    },
    ai: { then: { cycle: ['lock', 'round', 'round'] } },
    flavor: 'Bolted to the deck. Very angry about it.',
  },
  vent_crawler: {
    name: 'Vent Crawler',
    hp: [24, 28],
    startStatuses: { barbed: 1 },
    moves: {
      lunge: { name: 'Lunge', effects: [attack(8)] },
      skitter: { name: 'Skitter', effects: [attack(3, { hits: 2 })] },
    },
    ai: { then: { weights: { lunge: 55, skitter: 45 }, maxInARow: 2 } },
    flavor: 'Spines like rivets. Lives in the ducts. Hates visitors.',
  },
  bilge_jelly: {
    name: 'Bilge Jelly',
    hp: [30, 34],
    moves: {
      sting: { name: 'Sting', effects: [attack(5), apply('poison', 2)] },
      pulse: { name: 'Pulse', effects: [apply('weak', 1), apply('vulnerable', 1)] },
      absorb: { name: 'Absorb', effects: [block(9), heal(4)] },
    },
    ai: { then: { cycle: ['sting', 'pulse', 'sting', 'absorb'] } },
    flavor: 'Glows a soft, friendly blue. It is not friendly.',
  },
  cargo_loader: {
    name: 'Rogue Cargo Loader',
    hp: [44, 48],
    moves: {
      slam: { name: 'Slam', effects: [attack(12)] },
      lift: { name: 'Lift and Brace', effects: [block(12)] },
      toss: { name: 'Toss Crate', effects: [attack(7), addCard('debris', 'draw', { count: 1 })] },
    },
    ai: { then: { cycle: ['toss', 'slam', 'lift'] } },
    flavor: 'Still trying to load cargo. You are now cargo.',
  },
  brood_larva: {
    name: 'Brood Larva',
    hp: [11, 14],
    moves: {
      gnaw: { name: 'Gnaw', effects: [attack(5)] },
      molt: { name: 'Molt', effects: [gain('strength', 1)] },
    },
    ai: { then: { weights: { gnaw: 70, molt: 30 }, maxInARow: 2 } },
    flavor: 'Small, squishy, and growing faster than you’d like.',
  },
  hull_mold: {
    name: 'Hull Mold',
    hp: [36, 40],
    startStatuses: { nanites: 2 },
    moves: {
      spores: { name: 'Spore Burst', effects: [apply('poison', 3)] },
      smother: { name: 'Smother', effects: [attack(7), apply('weak', 1)] },
    },
    ai: { opening: ['spores'], then: { cycle: ['smother', 'smother', 'spores'] } },
    flavor: 'Eats insulation, rust and, eventually, boots.',
  },
  warden_eye: {
    name: 'Warden Eye',
    hp: [24, 28],
    moves: {
      scan: { name: 'Deep Scan', effects: [apply('vulnerable', 1)] },
      ray: { name: 'Disintegrator Ray', effects: [attack(9)] },
      recalibrate: { name: 'Recalibrate', effects: [gain('strength', 1)] },
    },
    ai: { then: { cycle: ['scan', 'ray', 'recalibrate', 'ray'] } },
    flavor: 'Sees everything. Judges everything. Shoots most things.',
  },
  hollow_crewman: {
    name: 'Hollow Crewman',
    hp: [32, 36],
    moves: {
      swing: { name: 'Wrench Swing', effects: [attack(10)] },
      grab: { name: 'Cold Grip', effects: [attack(4), apply('weak', 1)] },
      mutter: { name: 'Mutter', effects: [block(8), gain('strength', 1)] },
    },
    ai: { then: { weights: { swing: 45, grab: 35, mutter: 20 }, maxInARow: 2 } },
    flavor: 'One of the original crew. Still clocked in.',
  },

  // --- Hazards ----------------------------------------------------------------------
  lockdown_sentinel: {
    name: 'Lockdown Sentinel',
    hp: [88, 94],
    startStatuses: { plating: 6 },
    moves: {
      suppress: { name: 'Suppressing Fire', effects: [attack(6, { hits: 2 }), apply('vulnerable', 1)] },
      reinforce: { name: 'Reinforce', effects: [block(18)] },
      overcharge: { name: 'Overcharge', effects: [gain('strength', 2)] },
    },
    ai: { then: { cycle: ['suppress', 'overcharge', 'suppress', 'reinforce'] } },
    flavor: 'Ship security’s last word. It has a lot of words, all of them bullets.',
  },
  gnawing_mass: {
    name: 'The Gnawing Mass',
    hp: [90, 96],
    startStatuses: { barbed: 2 },
    moves: {
      engulf: { name: 'Engulf', effects: [attack(3, { hits: 4 })] },
      feed: { name: 'Feed', effects: [heal(8), gain('strength', 1)] },
      shriek: { name: 'Shriek', effects: [apply('weak', 2), apply('vulnerable', 2)] },
    },
    ai: { opening: ['shriek'], then: { weights: { engulf: 55, feed: 25, shriek: 20 }, maxInARow: 2 } },
    flavor: 'A thousand vent crawlers, moving as one, very hungry.',
  },
  captain_vass: {
    name: 'Captain Vass',
    hp: [86, 90],
    moves: {
      whip: { name: 'Pistol Whip', effects: [attack(10), apply('weak', 1)] },
      orders: { name: 'Crew, To Me!', effects: [summon('claim_jumper', 1, 3), block(8)] },
      grenade: { name: 'Frag Grenade', effects: [attack(7), apply('vulnerable', 1)] },
    },
    ai: { then: { cycle: ['whip', 'grenade', 'whip', 'orders'] } },
    flavor: 'Rival captain. Filed a claim on the Meridian the same morning you did. One of you is lying.',
  },

  // --- Boss -------------------------------------------------------------------------------
  brood_matron: {
    name: 'The Brood Matron',
    hp: [220, 226],
    moves: {
      lay: { name: 'Lay Eggs', effects: [summon('brood_larva', 2, 4)] },
      spit: { name: 'Acid Spit', effects: [attack(9), apply('poison', 3)] },
      coils: { name: 'Crushing Coils', effects: [attack(6, { hits: 3 })] },
      harden: { name: 'Harden Carapace', effects: [block(16), gain('strength', 2)] },
    },
    ai: { opening: ['lay'], then: { cycle: ['spit', 'coils', 'harden', 'lay', 'coils'] } },
    flavor: 'The Meridian’s cargo hold has a new owner, and she is expecting.',
  },
});
