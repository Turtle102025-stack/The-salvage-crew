/**
 * Act 1: The Graveyard Belt. Regular enemies, Hazards (elites) and the boss.
 * Numbers get tuned by the Phase 7 simulator.
 */
import { defineEnemies } from '../../../engine/defs';
import { addCard, apply, attack, block, gain, heal } from '../../../engine/effects/builders';

export const ACT1_ENEMIES = defineEnemies({
  // --- Regular ---------------------------------------------------------------------
  scrap_mite: {
    name: 'Scrap Mite',
    hp: [12, 15],
    moves: {
      nibble: { name: 'Nibble', effects: [attack(5)] },
      chew_wiring: { name: 'Chew Wiring', effects: [attack(3), apply('weak', 1)] },
    },
    ai: { then: { weights: { nibble: 60, chew_wiring: 40 }, maxInARow: 2 } },
    flavor: 'Eats insulation, solder and, given the chance, boots.',
  },
  rust_lamprey: {
    name: 'Rust Lamprey',
    hp: [24, 28],
    moves: {
      corrode: { name: 'Corrode', effects: [apply('poison', 3)] },
      latch: { name: 'Latch On', effects: [attack(7)] },
      swell: { name: 'Swell', effects: [block(6), gain('strength', 2)] },
    },
    ai: { opening: ['corrode'], then: { weights: { latch: 60, swell: 40 }, maxInARow: 2 } },
    flavor: 'Lives in coolant lines. Leaves them worse.',
  },
  salvage_drone: {
    name: 'Salvage Drone',
    hp: [20, 24],
    moves: {
      scan: { name: 'Target Scan', effects: [apply('vulnerable', 1)] },
      laser: { name: 'Cutting Laser', effects: [attack(9)] },
      repair: { name: 'Self-Repair', effects: [block(7), heal(4)] },
    },
    ai: { opening: ['scan'], then: { cycle: ['laser', 'repair', 'laser', 'scan'] } },
    flavor: 'Still running its old salvage program. You are classified as "scrap".',
  },
  claim_jumper: {
    name: 'Claim Jumper',
    hp: [26, 30],
    moves: {
      swing: { name: 'Crowbar Swing', effects: [attack(10)] },
      grab: { name: 'Smash and Grab', effects: [attack(6), apply('weak', 1)] },
      brace: { name: 'Hunker Down', effects: [block(9)] },
    },
    ai: { then: { weights: { swing: 45, grab: 35, brace: 20 }, maxInARow: 2 } },
    flavor: 'A rival scavenger with a forged claim and a very real crowbar.',
  },
  coolant_slick: {
    name: 'Coolant Slick',
    hp: [30, 34],
    moves: {
      seep: { name: 'Seep', effects: [attack(5), apply('poison', 2)] },
      splash: { name: 'Splash', effects: [apply('weak', 2)] },
      congeal: { name: 'Congeal', effects: [block(10)] },
    },
    ai: { then: { cycle: ['seep', 'splash', 'seep', 'congeal'] } },
    flavor: 'Somewhere along the way, the spill decided it was alive.',
  },
  defense_turret: {
    name: 'Defense Turret',
    hp: [22, 26],
    moves: {
      lock_on: { name: 'Lock On', effects: [apply('vulnerable', 2)] },
      fire: { name: 'Fire', effects: [attack(12)] },
    },
    ai: { then: { cycle: ['lock_on', 'fire'] } },
    flavor: 'Hull security. Still guarding a hull that is now mostly holes.',
  },
  scrap_crab: {
    name: 'Scrap Crab',
    hp: [34, 38],
    moves: {
      pinch: { name: 'Double Pinch', effects: [attack(5, { hits: 2 })] },
      shell: { name: 'Shell Up', effects: [block(12)] },
      snap: { name: 'Snap', effects: [attack(11)] },
    },
    ai: { then: { weights: { pinch: 40, shell: 25, snap: 35 }, maxInARow: 1 } },
    flavor: 'Built its shell out of hull plating. Better plating than yours.',
  },
  sentry_orb: {
    name: 'Sentry Orb',
    hp: [18, 22],
    moves: {
      glare: { name: 'Glare', effects: [apply('weak', 1), apply('vulnerable', 1)] },
      zap: { name: 'Zap', effects: [attack(7)] },
    },
    ai: { then: { cycle: ['zap', 'glare', 'zap'] } },
    flavor: 'An old security eye. It has been watching nothing for forty years and is thrilled to see you.',
  },
  mite_swarm: {
    name: 'Mite Swarm',
    hp: [28, 32],
    moves: {
      skitter: { name: 'Skitter', effects: [attack(2, { hits: 4 })] },
      multiply: { name: 'Multiply', effects: [gain('strength', 1), block(5)] },
    },
    ai: { then: { weights: { skitter: 65, multiply: 35 }, maxInARow: 2 } },
    flavor: 'Individually harmless. There is no "individually" here.',
  },

  // --- Hazards (elites) ---------------------------------------------------------------
  foreman_krell: {
    name: 'Foreman Krell',
    hp: [74, 80],
    moves: {
      kick: { name: 'Kick the Dirt', effects: [attack(6), apply('vulnerable', 2)] },
      swing: { name: 'Hydraulic Swing', effects: [attack(15)] },
      rally: { name: 'Rally the Crew', effects: [gain('strength', 2), block(10)] },
    },
    ai: { opening: ['kick'], then: { weights: { swing: 45, rally: 25, kick: 30 }, maxInARow: 2 } },
    flavor: 'Runs a rival crew on fear, overtime and a hydraulic arm he did not pay for.',
  },
  cutter_bot: {
    name: 'Cutter Bot Mk II',
    hp: [64, 70],
    moves: {
      grind: { name: 'Grind', effects: [attack(5, { hits: 3 })] },
      overclock: { name: 'Overclock', effects: [gain('strength', 3)] },
      brace: { name: 'Brace Frame', effects: [block(15)] },
    },
    ai: { then: { cycle: ['grind', 'overclock', 'grind', 'brace'] } },
    flavor: 'Mark I was recalled for "excessive enthusiasm". Mark II fixed that by adding more blades.',
  },
  lamprey_matriarch: {
    name: 'Lamprey Matriarch',
    hp: [80, 86],
    moves: {
      bite: { name: 'Corrosive Bite', effects: [attack(10), apply('poison', 2)] },
      cloud: { name: 'Spawn Cloud', effects: [apply('poison', 4), apply('weak', 1)] },
      coil: { name: 'Coil', effects: [block(12), gain('strength', 2)] },
    },
    ai: { opening: ['cloud'], then: { weights: { bite: 50, coil: 25, cloud: 25 }, maxInARow: 2 } },
    flavor: 'Every lamprey in the belt came from somewhere. This is the somewhere.',
  },

  // --- Boss ------------------------------------------------------------------------------
  wreckwarden: {
    name: 'The Wreckwarden',
    hp: [200, 208],
    moves: {
      citation: { name: 'Issue Citations', effects: [addCard('paperwork', 'draw', { count: 2 }), apply('weak', 1)], intent: ['debuff'] },
      clamp: { name: 'Hydraulic Clamp', effects: [attack(16)] },
      compactor: { name: 'Compactor', effects: [attack(6, { hits: 3 })] },
      lockdown: { name: 'Lockdown', effects: [block(16), gain('strength', 3)] },
      dump: { name: 'Dump Debris', effects: [attack(8), addCard('debris', 'discard', { count: 2 })] },
    },
    ai: { opening: ['citation'], then: { cycle: ['clamp', 'compactor', 'lockdown', 'dump', 'clamp', 'citation'] } },
    flavor: 'An automated claim enforcer, still on duty, still issuing fines to anything that moves. You owe 4,000 years of back fees.',
  },
});
