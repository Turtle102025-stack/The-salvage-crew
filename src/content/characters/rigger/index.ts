import type { CharacterDef } from '../../../engine/types';

export { RIGGER_CARDS } from './cards';

export const RIGGER: CharacterDef = {
  id: 'rigger',
  name: 'Juno Kade',
  title: 'The Rigger',
  maxHp: 72,
  starterDeck: [
    'pry_bar', 'pry_bar', 'pry_bar', 'pry_bar', 'pry_bar',
    'hull_patch', 'hull_patch', 'hull_patch', 'hull_patch',
    'strip_for_parts',
  ],
  starterRelic: 'lucky_wrench',
  flavor: 'Rigger on the Last Chance. Can fix anything with a wrench, a torch and a bad attitude.',
};
