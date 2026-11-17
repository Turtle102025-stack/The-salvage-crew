/**
 * Act 1: The Graveyard Belt. Only the test-fight enemies for now; the rest of
 * the Act 1 roster arrives in Phase 6. Numbers get tuned in Phase 7.
 */
import { defineEnemies } from '../../../engine/defs';
import { apply, attack, block, gain } from '../../../engine/effects/builders';

export const ACT1_ENEMIES = defineEnemies({
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
});
