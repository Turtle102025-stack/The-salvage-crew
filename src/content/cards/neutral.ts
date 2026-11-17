/** Cards anyone can end up with: curses and status junk. */
import { defineCards } from '../../engine/defs';

export const NEUTRAL_CARDS = defineCards('neutral', {
  paperwork: {
    name: 'Paperwork',
    type: 'curse',
    rarity: 'special',
    cost: 0,
    effects: [],
    keywords: ['unplayable'],
    upgrade: { name: 'Paperwork' },
    flavor: 'Form 27-B, in triplicate. It is always in your way.',
  },
});
