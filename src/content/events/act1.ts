/**
 * Signals (events) in the Graveyard Belt. Choice labels are in-world; what
 * each choice actually does is listed automatically from its effects.
 */
import type { EventDef } from '../../engine/types';

function defineEvents(defs: Record<string, Omit<EventDef, 'id'>>): Record<string, EventDef> {
  return Object.fromEntries(Object.entries(defs).map(([id, d]) => [id, { ...d, id }]));
}

export const ACT1_EVENTS = defineEvents({
  escape_pod: {
    name: 'Derelict Escape Pod',
    acts: [1],
    art: 'crate',
    scenes: {
      start: {
        text: 'A battered escape pod tumbles past, beacon still blinking. Something rattles around inside. Could be cargo. Could be teeth.',
        choices: [
          {
            label: 'Pry it open',
            effects: [{ type: 'chance', percent: 60, then: [{ type: 'relic', rarity: 'common' }], else: [{ type: 'hp', amount: -8 }] }],
            result: 'You get the hatch open. Whatever was in there has opinions about that, one way or another.',
          },
          {
            label: 'Tow it to the Trader',
            effects: [{ type: 'gold', amount: 35 }],
            result: 'The Trader pays by the kilo and asks no questions. Your favourite kind of customer service.',
          },
          { label: 'Leave it spinning', effects: [], result: 'Some mysteries are above your pay grade.' },
        ],
      },
    },
  },
  vending_machine: {
    name: 'Vending Machine',
    acts: [1, 2, 3],
    art: 'flask',
    scenes: {
      start: {
        text: 'A vending machine floats in the debris, still lit, still humming, still charging station prices. One button reads REPAIR GEL. The others are in a language nobody speaks anymore.',
        choices: [
          {
            label: 'Insert 30 Credits',
            requires: { gold: 30 },
            effects: [{ type: 'gold', amount: -30 }, { type: 'potion' }, { type: 'potion' }],
            result: 'Two canisters clunk into the tray. A tiny voice says "Enjoy." You decide not to think about it.',
          },
          {
            label: 'Give it a good kick',
            effects: [{ type: 'chance', percent: 50, then: [{ type: 'potion' }], else: [{ type: 'hp', amount: -5 }] }],
            result: 'Percussive maintenance: the oldest trade secret in the belt.',
          },
          { label: 'Keep floating', effects: [], result: 'You resist. Barely.' },
        ],
      },
    },
  },
  union_rep: {
    name: 'The Union Rep',
    acts: [1, 2],
    art: 'mask',
    scenes: {
      start: {
        text: '"Hold it, Kade." A tired woman in a hard hat drifts over on a safety tether. "Mandatory safety briefing. It covers torches, tethers, and what to do when the wreck starts talking back."',
        choices: [
          {
            label: 'Attend the briefing',
            effects: [{ type: 'selectCards', purpose: 'upgrade', count: 1 }],
            result: '"…and that’s why we never weld facing the airlock." You actually learned something. Don’t tell anyone.',
          },
          {
            label: 'Skip it and pull overtime',
            effects: [{ type: 'gold', amount: 60 }, { type: 'addCard', card: 'paperwork' }],
            result: 'The overtime pays. The disciplinary notice follows you everywhere.',
          },
        ],
      },
    },
  },
});
