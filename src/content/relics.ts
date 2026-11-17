/** Relics ("Salvage" in game). The full set arrives in Phases 5–6. */
import { defineRelics } from '../engine/defs';
import { gain } from '../engine/effects/builders';

export const RELICS = defineRelics({
  lucky_wrench: {
    name: 'Lucky Wrench',
    rarity: 'starter',
    character: 'rigger',
    hooks: [{ on: 'combatStart', effects: [gain('scrap', 2)] }],
    flavor: "Juno's first wrench. It has never once been lucky, but she isn't about to tell it that.",
  },
});
