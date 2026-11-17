/** All game content, assembled for the engine. */
import type { Content } from '../engine/types';
import { ACT1, ACT1_ENEMIES } from './acts/act1';
import { NEUTRAL_CARDS } from './cards/neutral';
import { RIGGER, RIGGER_CARDS } from './characters/rigger';
import { ACT1_EVENTS } from './events/act1';
import { POTIONS } from './potions';
import { RELICS } from './relics';
import { STATUSES } from './statuses';

export const CONTENT: Content = {
  cards: { ...RIGGER_CARDS, ...NEUTRAL_CARDS },
  statuses: STATUSES,
  relics: RELICS,
  enemies: { ...ACT1_ENEMIES },
  characters: { rigger: RIGGER },
  potions: POTIONS,
  events: { ...ACT1_EVENTS },
  acts: [ACT1],
};

export * from './encounters';
