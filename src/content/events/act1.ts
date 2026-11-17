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
  workshop: {
    name: 'Abandoned Workshop',
    acts: [1, 2],
    art: 'hammer',
    scenes: {
      start: {
        text: 'A sealed workshop module, lights still on. Tools hang neatly on the wall. A half-finished project sits on the bench under a note: "BACK IN 5 MIN." The dust says otherwise.',
        choices: [
          {
            label: 'Work through the night',
            effects: [{ type: 'upgradeRandom', count: 2 }, { type: 'hp', amount: -6 }],
            result: 'You wake up face-down on the bench with two very nicely tuned tools and a crick in your neck.',
          },
          {
            label: 'Finish their project',
            effects: [{ type: 'addRandomCard', rarity: 'uncommon' }],
            result: 'It turns out to be quite good. You leave a note: "Finished it. You’re welcome."',
          },
          { label: 'Respect the note', effects: [], result: 'Five minutes. Sure.' },
        ],
      },
    },
  },
  distress_call: {
    name: 'Distress Call',
    acts: [1],
    art: 'antenna',
    scenes: {
      start: {
        text: '"Mayday, mayday, we are pinned down by mites, repeat, MITES." A rival crew’s skiff is wedged in the debris, hull crawling with little legs.',
        choices: [
          {
            label: 'Help them out',
            effects: [{ type: 'hp', amount: -10 }, { type: 'gold', amount: 60 }, { type: 'potion' }],
            result: 'It gets bitey. They pay up, and throw in a Canister "for the trouble".',
          },
          {
            label: 'Loot their cargo while they’re busy',
            effects: [{ type: 'gold', amount: 95 }, { type: 'addCard', card: 'paperwork' }],
            result: 'Profitable. Also reported to the union. Expect paperwork.',
          },
          { label: 'Keep moving', effects: [], result: 'Not your crew, not your mites.' },
        ],
      },
    },
  },
  cargo_master: {
    name: 'The Cargo Master',
    acts: [1, 2, 3],
    art: 'ghost',
    scenes: {
      start: {
        text: 'A flickering hologram of the Meridian’s cargo master blinks into view. "Manifest discrepancy detected. Would you like to… exchange something?"',
        choices: [
          {
            label: 'Exchange a card',
            effects: [{ type: 'selectCards', purpose: 'transform', count: 1 }],
            result: '"Manifest updated. Thank you for flying Meridian."',
          },
          {
            label: 'Exchange some of yourself',
            requires: { hp: 6 },
            effects: [{ type: 'maxHp', amount: -5 }, { type: 'relic', rarity: 'uncommon' }],
            result: 'You feel lighter. The hologram looks pleased. Neither is reassuring.',
          },
          { label: '"No discrepancy here."', effects: [], result: '"Very good. Please enjoy the rest of your voyage." It has been 400 years.' },
        ],
      },
    },
  },
  coolant_spill: {
    name: 'Coolant Spill',
    acts: [1, 2],
    art: 'drop',
    scenes: {
      start: {
        text: 'A coolant main has burst, filling the corridor with glittering blue vapour. It smells of mint and bad decisions.',
        choices: [
          {
            label: 'Bottle some',
            effects: [{ type: 'potion', potion: 'acid_flask' }, { type: 'potion', potion: 'cryo_spray' }],
            result: 'Two canisters of something the Trader would definitely want a hazard waiver for.',
          },
          {
            label: 'Seal the breach',
            effects: [{ type: 'hp', amount: -5 }, { type: 'upgradeRandom', count: 1 }],
            result: 'Cold hands, steady weld. Your tools come out better for it.',
          },
          {
            label: 'Breathe it in',
            effects: [{ type: 'chance', percent: 50, then: [{ type: 'maxHp', amount: 4 }], else: [{ type: 'hp', amount: -8 }] }],
            result: 'You feel… something. Is that good? That might be good.',
          },
        ],
      },
    },
  },
  scrap_shrine: {
    name: 'Scrap Heap Shrine',
    acts: [1, 2, 3],
    art: 'star',
    scenes: {
      start: {
        text: 'Crews have built a shrine out of junk: a welded statue covered in offerings. Washers, coins, a photo of someone’s dog. A sign reads "FOR LUCK".',
        choices: [
          {
            label: 'Leave an offering (40 Credits)',
            requires: { gold: 40 },
            effects: [{ type: 'gold', amount: -40 }, { type: 'selectCards', purpose: 'remove', count: 1 }],
            result: 'Lighter pockets, lighter deck. The statue seems to approve.',
          },
          {
            label: 'Take an offering',
            effects: [{ type: 'gold', amount: 50 }, { type: 'chance', percent: 50, then: [{ type: 'addCard', card: 'paperwork' }] }],
            result: 'You pocket the coins. Somewhere, a dog in a photo looks disappointed.',
          },
          { label: 'Pay your respects', effects: [{ type: 'hp', amount: 8 }], result: 'A moment of quiet in a very loud place.' },
        ],
      },
    },
  },
  looping_signal: {
    name: 'Looping Signal',
    acts: [1, 2],
    art: 'eye',
    scenes: {
      start: {
        text: 'Your radio picks up a looping signal in an old command code. Over and over: the same string of numbers, and a voice saying "do not".',
        choices: [
          { label: 'Decode it', effects: [], next: 'decoded' },
          { label: 'Switch channels', effects: [], result: 'You find a station playing cargo-hauler country. Much better.' },
        ],
      },
      decoded: {
        text: 'Coordinates. A hidden cache, close by. The voice finishes its sentence: "do not… open… the green one."',
        choices: [
          {
            label: 'Open the green one',
            effects: [{ type: 'relic', rarity: 'rare' }, { type: 'fight', enemies: ['salvage_drone', 'defense_turret'] }],
            result: 'It was a security system. It was also full of loot.',
          },
          {
            label: 'Take the other crates',
            effects: [{ type: 'gold', amount: 45 }, { type: 'potion' }],
            result: 'Safe, sensible, and slightly disappointing.',
          },
          { label: 'Sell the coordinates', effects: [{ type: 'gold', amount: 70 }], result: 'Someone else can find out what the green one does.' },
        ],
      },
    },
  },
});
