/** All game content, assembled for the engine. */
import type { Content } from '../engine/types';
import { ACT1_ENEMIES } from './acts/act1/enemies';
import { RIGGER, RIGGER_CARDS } from './characters/rigger';
import { RELICS } from './relics';
import { STATUSES } from './statuses';

export const CONTENT: Content = {
  cards: { ...RIGGER_CARDS },
  statuses: STATUSES,
  relics: RELICS,
  enemies: { ...ACT1_ENEMIES },
  characters: { rigger: RIGGER },
};

export * from './encounters';
