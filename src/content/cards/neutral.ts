/** Cards anyone can end up with: curses and status junk. */
import { defineCards } from '../../engine/defs';
import { attack } from '../../engine/effects/builders';

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
  debris: {
    name: 'Debris',
    type: 'status',
    rarity: 'special',
    cost: 0,
    effects: [],
    keywords: ['unplayable', 'ethereal'],
    upgrade: { name: 'Debris' },
    flavor: 'Someone dumped this on you. Literally.',
  },
  spare_part: {
    name: 'Spare Part',
    type: 'attack',
    rarity: 'special',
    cost: 0,
    effects: [attack(3)],
    keywords: ['exhaust'],
    upgrade: { effects: [attack(5)] },
    flavor: 'Nobody knows where it goes. Into the enemy, today.',
  },
});
