/** Signals (events) for Acts 2 and 3. */
import type { EventDef } from '../../engine/types';

function defineEvents(defs: Record<string, Omit<EventDef, 'id'>>): Record<string, EventDef> {
  return Object.fromEntries(Object.entries(defs).map(([id, d]) => [id, { ...d, id }]));
}

export const ACT23_EVENTS = defineEvents({
  // --- Act 2: The Hulk -------------------------------------------------------------
  cryo_bay: {
    name: 'Cryo Bay',
    acts: [2],
    art: 'snow',
    scenes: {
      start: {
        text: 'Rows of frosted cryo pods line the wall. Most are dark. One still hums, its occupant frozen mid-yawn. A sign reads: "DO NOT WAKE BEFORE ARRIVAL."',
        choices: [
          {
            label: 'Wake them up',
            effects: [{ type: 'chance', percent: 50, then: [{ type: 'relic', rarity: 'rare' }], else: [{ type: 'fight', enemies: ['hollow_crewman'] }] }],
            result: 'They wake up confused, then grateful, then… it depends.',
          },
          {
            label: 'Borrow their supplies',
            effects: [{ type: 'potion' }, { type: 'potion' }, { type: 'addCard', card: 'paperwork' }],
            result: 'They’ll never know. The ship’s inventory system will, though.',
          },
          { label: 'Let them sleep', effects: [{ type: 'hp', amount: 6 }], result: 'You sit with them a while. It’s surprisingly restful.' },
        ],
      },
    },
  },
  robot_chef: {
    name: 'The Galley',
    acts: [2],
    art: 'flask',
    scenes: {
      start: {
        text: 'A robot chef in a stained apron is still cooking for a crew of zero. "TODAY’S SPECIAL," it announces, "IS SPECIAL."',
        choices: [
          {
            label: 'Order the special (60 Credits)',
            requires: { gold: 60 },
            effects: [{ type: 'gold', amount: -60 }, { type: 'maxHp', amount: 7 }],
            result: 'It is genuinely the best meal you’ve had in years. You feel sturdier.',
          },
          {
            label: 'Eat whatever is in the fridge',
            effects: [{ type: 'chance', percent: 50, then: [{ type: 'maxHp', amount: 4 }], else: [{ type: 'hp', amount: -9 }] }],
            result: 'Four hundred years old. Bold choice.',
          },
          { label: 'Compliment the chef', effects: [{ type: 'hp', amount: 10 }], result: '"THANK YOU." It gives you a free coffee. It’s good coffee.' },
        ],
      },
    },
  },
  archive_terminal: {
    name: 'Archive Terminal',
    acts: [2, 3],
    art: 'core',
    scenes: {
      start: {
        text: 'A terminal flickers to life as you pass. "ENGINEERING ARCHIVE. ACCESS LEVEL: NONE. WOULD YOU LIKE TO TRY ANYWAY?"',
        choices: [
          {
            label: 'Download the schematics',
            requires: { hp: 8 },
            effects: [{ type: 'hp', amount: -8 }, { type: 'addRandomCard', rarity: 'rare' }],
            result: 'The security countermeasure stings. The schematics are worth it.',
          },
          {
            label: 'Upload a cleanup script',
            effects: [{ type: 'selectCards', purpose: 'remove', count: 1 }],
            result: 'One less thing cluttering up your workflow.',
          },
          { label: 'Read the logs', effects: [{ type: 'gold', amount: 40 }], result: 'The logs mention a stash of hazard pay. You find it behind the terminal.' },
        ],
      },
    },
  },
  gravity_well: {
    name: 'Gravity Anomaly',
    acts: [2, 3],
    art: 'core',
    scenes: {
      start: {
        text: 'A section of corridor where gravity has gone strange: loose bolts orbit slowly around a point in mid-air. Tools pulled through it come out… different.',
        choices: [
          {
            label: 'Ride the anomaly',
            requires: { hp: 12 },
            effects: [{ type: 'upgradeRandom', count: 3 }, { type: 'hp', amount: -12 }],
            result: 'You come out the other side dizzy, bruised and somehow better equipped.',
          },
          {
            label: 'Throw junk into it',
            effects: [{ type: 'selectCards', purpose: 'transform', count: 1 }],
            result: 'You throw in a tool. A different tool comes back.',
          },
          { label: 'Go the long way round', effects: [], result: 'Some shortcuts aren’t worth it.' },
        ],
      },
    },
  },
  smugglers_stash: {
    name: 'Smuggler’s Stash',
    acts: [2, 3],
    art: 'crate',
    scenes: {
      start: {
        text: 'Behind a false panel: three crates stencilled "DEFINITELY NOT CONTRABAND". You only have room for one.',
        choices: [
          { label: 'The heavy one', effects: [{ type: 'gold', amount: 120 }, { type: 'addCard', card: 'paperwork' }], result: 'Credits! And an invoice, addressed to you.' },
          { label: 'The humming one', effects: [{ type: 'relic' }], result: 'Something useful, wrapped in someone else’s socks.' },
          { label: 'The sloshing one', effects: [{ type: 'potion' }, { type: 'potion' }, { type: 'potion' }], result: 'Canisters. Lots of them. Hopefully labelled correctly.' },
        ],
      },
    },
  },

  // --- Act 3: The Heart -----------------------------------------------------------------
  whispering_engine: {
    name: 'The Whispering Engine',
    acts: [3],
    art: 'eye',
    scenes: {
      start: {
        text: 'The walls are warm here, and they whisper. Not words exactly, more like offers. The engine knows what you want.',
        choices: [
          {
            label: 'Listen closely',
            requires: { hp: 6 },
            effects: [{ type: 'maxHp', amount: -6 }, { type: 'relic', rarity: 'rare' }],
            result: 'It takes something from you. It gives something back. You try not to think about the exchange rate.',
          },
          {
            label: 'Answer back',
            effects: [{ type: 'selectCards', purpose: 'transform', count: 2 }],
            result: 'Your tools change in your hands while you argue.',
          },
          { label: 'Hum loudly and keep walking', effects: [{ type: 'hp', amount: 12 }], result: 'Cargo-hauler country, at full volume. The whispers give up.' },
        ],
      },
    },
  },
  crew_echoes: {
    name: 'Crew Echoes',
    acts: [3],
    art: 'ghost',
    scenes: {
      start: {
        text: 'Translucent figures of the Meridian’s original crew drift through the corridor, still doing their jobs. One stops, tips its cap, and offers to help.',
        choices: [
          { label: 'Accept their help', effects: [{ type: 'upgradeRandom', count: 2 }], result: 'They fix things the way only people who built them can.' },
          { label: 'Ask about the engine', effects: [{ type: 'gold', amount: 80 }], result: 'They point you to a payroll safe nobody ever emptied.' },
          {
            label: 'Lay them to rest',
            effects: [{ type: 'healPercent', percent: 25 }, { type: 'selectCards', purpose: 'remove', count: 1 }],
            result: 'They thank you, and fade. You feel lighter.',
          },
        ],
      },
    },
  },
  molten_forge: {
    name: 'Molten Forge',
    acts: [3],
    art: 'flame',
    scenes: {
      start: {
        text: 'A channel of liquid metal flows from the engine core into an ancient forge. The heat is incredible. So is the opportunity.',
        choices: [
          {
            label: 'Reforge a tool (copy a card)',
            requires: { hp: 10 },
            effects: [{ type: 'hp', amount: -10 }, { type: 'selectCards', purpose: 'duplicate', count: 1 }],
            result: 'Burnt fingers, perfect copy.',
          },
          { label: 'Temper your gear', effects: [{ type: 'selectCards', purpose: 'upgrade', count: 1 }], result: 'Quenched, hardened, improved.' },
          { label: 'Too hot. Walk away', effects: [], result: 'Your eyebrows thank you.' },
        ],
      },
    },
  },
  last_lifeboat: {
    name: 'The Last Lifeboat',
    acts: [3],
    art: 'drone',
    scenes: {
      start: {
        text: 'One lifeboat never launched. Its supplies are untouched, and its log has a single entry: "Waiting for the captain."',
        choices: [
          { label: 'Raid its supplies', effects: [{ type: 'potion' }, { type: 'potion' }, { type: 'gold', amount: 50 }], result: 'The captain isn’t coming. You’re sure they wouldn’t mind.' },
          { label: 'Rest in its bunk', effects: [{ type: 'healPercent', percent: 35 }], result: 'The best sleep you’ve had since the job started.' },
          { label: 'Leave a message for the captain', effects: [{ type: 'maxHp', amount: 3 }], result: '"Gone ahead. Will save you a seat." It feels right.' },
        ],
      },
    },
  },
  the_contract: {
    name: 'The Contract',
    acts: [3],
    art: 'card',
    scenes: {
      start: {
        text: 'A holographic lawyer materialises in a sharp suit. "Juno Kade? I represent the Meridian Holding Company. We’d like to buy out your claim. Generously."',
        choices: [
          {
            label: 'Sign',
            effects: [{ type: 'gold', amount: 250 }, { type: 'addCard', card: 'paperwork', count: 2 }],
            result: '"Pleasure doing business." The fine print starts following you around.',
          },
          { label: 'Tear it up', effects: [{ type: 'relic', rarity: 'common' }], result: 'The hologram looks wounded. It drops a "gift" on the way out. Petty, but useful.' },
          { label: '"Talk to my union rep."', effects: [{ type: 'gold', amount: 60 }], result: 'The lawyer vanishes in a hurry, leaving a settlement payment behind.' },
        ],
      },
    },
  },
});
