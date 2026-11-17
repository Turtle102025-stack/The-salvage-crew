# Design: The Salvage Crew

The agreed plan from Phase 1, plus every decision made since. The original
request is in [BRIEF.md](BRIEF.md). Rules that every session must follow are
in [CLAUDE.md](../CLAUDE.md).

## Decisions log

| # | Decision | Chosen |
|---|----------|--------|
| 1 | Repo visibility | Public (free GitHub Pages needs a public repo on the Free plan) |
| 2 | Repo name / link | `The-salvage-crew` (capital T, as created on GitHub) → https://turtle102025-stack.github.io/The-salvage-crew/ |
| 3 | Starting character | Juno Kade, the Rigger (as pitched) |
| 4 | Art style | A: industrial hazard (dark navy, amber + teal, chunky flat shapes, dark outlines) |
| 5 | Writing tone | Wry, working-class crew humour |
| 6 | In-game terms | Credits / Salvage / Canisters / Docking Bay / Trader / Signals / Cargo Pods / Hazards |
| 7 | Shipping | Each phase pushes straight to `main`; GitHub Actions tests, then deploys to Pages |
| 8 | Run length | Keep ~15 floors per act; tune for ~1 min per floor; trim to ~12 if runs run long |
| 9 | Fonts | Chakra Petch (OFL licence) bundled from npm for headings; system font for body |
| 10 | Test fight (Phase 3) | Starter deck + one of each sampler card vs Scrap Mite, Rust Lamprey, Scrap Mite |
| 11 | Hand size | Max 10 cards; draws beyond that are skipped, created cards go to discard |
| 12 | Power cards | Leave play when played (not discarded or exhausted) and install a `power` status |
| 13 | Debuff timing | Weak / Vulnerable / Breach drop by 1 at the end of their owner's turn; Poison ticks at the start of its owner's turn, then drops by 1 |
| 14 | Enemy Block | Resets at the start of the enemy's own turn (so it protects them during yours) |

## World

The *Last Chance* is a battered salvage tug. Its crew has won a claim (#4471)
on the biggest wreck ever found: the drifting colony ship *Meridian*. The
deeper you cut in, the bigger the payout, and the stranger it gets.

| Act | Zone | Flavour | Boss |
|-----|------|---------|------|
| 1 | The Graveyard Belt | Debris field around the wreck: Scrap Mites, rival scavengers, broken salvage drones | The Wreckwarden (an automated salvage-claim enforcer) |
| 2 | The Hulk | Inside the *Meridian*: security systems still running, things nesting in the dark | TBD |
| 3 | The Heart | An alien engine at the ship's core, waking up | TBD |

## Terminology (code name → in-game name)

| Code / genre term | In game |
|---|---|
| gold | Credits |
| relic | Salvage |
| potion | Canister |
| rest site | Docking Bay (Rest = heal, Tinker = upgrade a card) |
| shop | Trader |
| event | Signal |
| treasure | Cargo Pod |
| elite | Hazard |
| energy | Energy |

## Characters

Each playable character is a member of the crew, so more can be added later
(Medic, Pilot, Cutter…). Every character is a folder under
`src/content/characters/<id>/`.

### Juno Kade, the Rigger (first character)

- **HP:** 72
- **Starter deck:** 5× *Pry Bar* (Attack, 1: deal 6), 4× *Hull Patch* (Skill, 1: gain 5 Block), 1× *Strip for Parts* (Attack, 1: deal 5, gain 2 Scrap)
- **Starter relic:** *Lucky Wrench*: start each combat with 2 Scrap
- **Deck styles (archetypes):**
  - **Scrapper:** collect Scrap and spend it for bonus effects.
  - **Torchwork:** build Heat for huge hits; vent it before you Overheat.
  - **Drone Bay:** Powers that deploy drones that hit, shield or spray toxic coolant (Poison) every turn.

## Statuses

Genre-standard: **Strength** (+damage per attack), **Weak** (deal 25% less
attack damage, turns), **Vulnerable** (take 50% more attack damage, turns),
**Poison** (lose HP at turn start, then stacks drop by 1).

Original:

- **Scrap** (player resource): stacks; cards and relics spend it for bonus effects.
- **Heat** (player): torch cards add Heat. At 10 Heat you **Overheat**: take damage and reset to 0. Some cards scale with Heat; vent cards turn Heat into something useful.
- **Breach** (enemy, turns): your attacks ignore its Block.
- **Magnetized** (enemy, stacks): each time you hit it with an attack, gain 1 Scrap and lose 1 stack.

Exact numbers are set in Phase 3 and tuned by the simulator in Phase 7.

## Architecture

Two halves:

1. **Engine** (`src/engine`): all rules, pure TypeScript, no UI or browser
   code. Input: the current state plus a player command (play card, end turn,
   choose map node…). Output: the new state plus a list of **events** that
   describe what happened (`damageDealt`, `blockGained`, `cardDrawn`,
   `statusApplied`, `enemyDied`…).
2. **UI** (`src/ui`): React screens draw the state and play the event list
   back as CSS animations at the speed chosen in Settings.

### Action queue

Every effect becomes a small **action**. The engine resolves actions one at a
time, in order. Each resolved action emits an event. The engine runs to
completion synchronously (so tests and the simulator are fast); the UI
animates the recorded events afterwards.

### Hooks

Relics, powers and statuses register listeners on **triggers**:
`combatStart`, `turnStart`, `turnEnd`, `cardPlayed`, `cardDrawn`,
`cardExhausted`, `shuffle`, `attackDealt`, `damageTaken`, `blockGained`,
`statusApplied`, `enemyDied`, `combatEnd`, plus run-level triggers
(`floorEntered`, `cardAdded`, `creditsGained`, `rest`…). When a trigger
fires, listeners run in a fixed order (player relics → player statuses/powers
→ enemies left to right) and their reactions are inserted **immediately
after** the action that caused them (before the next queued action).

### Damage pipeline (one function, heavily tested)

`base → + Strength → × 0.75 if attacker Weak → × 1.5 if target Vulnerable →
round down (min 0) → Block absorbs → HP loss`.

### Randomness and seeds

- One run seed, shown as a short code like `7KQ2-M9XA`; players can type one in.
- The seed feeds **separate named streams**: `map`, `rewards`, `shuffle`,
  `enemyAI`, `events`, `shop`, `potions`, `misc`. Playing a fight differently
  doesn't change the map or later rewards.
- RNG state is part of the saved game, so the same seed plus the same choices
  gives an identical run, and reloading can't re-roll anything.

### Save

The whole run is plain JSON (including RNG positions) and is saved to
`localStorage` after every player command, with a `saveVersion` number so old
saves can be migrated or discarded safely. The save/load code lives in the
UI layer; the engine only provides `serialize` / `deserialize`.

## Effect system

Content is data built from a small library of effects. Card text is generated
from the effects, so the numbers on a card always match what it does
(upgrades included). An optional hand-written text override exists for
special cases.

**Primitive effects:** `damage`, `block`, `applyStatus`, `removeStatus`,
`draw`, `discard`, `exhaust`, `gainEnergy`, `heal`, `loseHp`, `addCard`
(to hand / draw / discard), `upgradeCard`, `gainCredits`, `spend` (pay a
status cost such as Scrap).

**Control:** `repeat`, `if`, target selectors (`self`, chosen enemy, all
enemies, random enemy).

**Amounts** are a number or a small formula: X (energy spent), stacks of a
status (e.g. Heat), cards in hand, and so on.

**Adding a new kind of effect:** add one primitive to the effect library
(one small file plus a test). After that any card, relic or enemy can use it.
The engine core never changes for new content.

```ts
card({ id: 'jury_rig', name: 'Jury-Rig', type: 'skill', rarity: 'common', cost: 1,
  effects: [ block(6), ifSpend('scrap', 2, [ block(6) ]) ],
  upgrade: { effects: [ block(8), ifSpend('scrap', 2, [ block(8) ]) ] },
})  // → "Gain 6 Block. Spend 2 Scrap: gain 6 more Block."

relic({ id: 'lucky_wrench', name: 'Lucky Wrench', rarity: 'starter',
  on: { combatStart: [ gainStatus('scrap', 2) ] } })

enemy({ id: 'scrap_mite', name: 'Scrap Mite', hp: [11, 15],
  moves: { bite: [ attack(5) ], burrow: [ block(6), buff('strength', 1) ] },
  pattern: weighted({ bite: 70, burrow: 30 }, { noRepeat: 'burrow' }) })
```

(Exact helper names may change in Phase 3; the shape stays.)

## Engine map (as built in Phase 3)

| File | What it does |
|---|---|
| `src/engine/rng.ts` | Seeded RNG (sfc32 + cyrb128), named streams, seed codes |
| `src/engine/types.ts` | Content definitions, combat state, commands, events |
| `src/engine/defs.ts` | `defineCards/Statuses/Enemies/Relics`, `resolveCard` (applies upgrades), `cardNeedsTarget` |
| `src/engine/effects/types.ts` | The effect vocabulary (`Effect`, `Amount`, `TargetSel`, `Condition`) |
| `src/engine/effects/builders.ts` | Helpers used by content: `attack`, `block`, `apply`, `gain`, `spend`… |
| `src/engine/effects/resolve.ts` | What each effect does |
| `src/engine/effects/describe.ts` | Card / relic / status text generated from effects |
| `src/engine/combat/core.ts` | Action queue, hooks (`fireTrigger`), damage/block/status/card primitives |
| `src/engine/combat/damage.ts` | The one damage pipeline |
| `src/engine/combat/enemies.ts` | Enemy move choice and intents |
| `src/engine/combat/combat.ts` | Turn flow + public API: `createCombat`, `dispatchCombat`, `canPlayCard`, save/load |
| `src/engine/combat/setup.ts` | `setupFromSeed` for stand-alone fights |

Events are emitted in resolution order (hook "trigger" announcements are
queued, not emitted early), so the UI can animate the event list as-is.

## Battle screen (Phase 4)

- `src/ui/battle/view.ts`: the on-screen view model. The UI replays each
  command's events onto it one at a time (`applyEvent`), then snaps to the
  engine's final state. `tests/view.test.ts` proves replay == final state.
- `src/ui/battle/BattleScreen.tsx`: playback (timings in `playback.ts`,
  divided by the animation-speed setting; Space/tap skips), floating numbers,
  hit/lunge/glow reactions, turn banners, drag-or-click to play, keyboard
  (1–0 select, ←/→ target, Enter play, Esc cancel, E end turn), pile viewers,
  combat log drawer.
- Art: `src/ui/art/glyphs.tsx` (shared icon library), `EnemyArt.tsx`
  (enemies drawn from body plans + palette + features), `PlayerArt.tsx`,
  `StageBackdrop.tsx`; which art each id uses lives in `src/ui/art/specs.ts`.
  Open the site with `#gallery` to see every piece of art.
- Tooltips (`src/ui/components/Tooltip.tsx`): hover, focus, or long-press on
  touch screens.
- Settings (`src/ui/settings.tsx`): animation speed, sound, volume; saved in
  localStorage via `src/ui/storage.ts` (all access wrapped in try/catch).

## Run loop (Phase 5)

- `src/engine/run/run.ts`: `createRun` / `dispatchRun(content, run, command)`.
  Pure like combat; same seed + same commands = same run. Screens: actIntro,
  map, combat, reward, rest, shop, event, treasure, cardSelect, gameOver.
- `map.ts`: 15 floors × 7 columns, 6 non-crossing paths; floor 1 fights,
  floor 9 Cargo Pod, floor 15 Docking Bay, no Hazards/rest before floor 6,
  no Hazard/rest/shop/treasure twice in a row; boss on top.
- `pools.ts`: card rarity rolls (common 60 / uncommon 37 / rare 3 for fights,
  rare pity timer), relic and potion picks. `difficulty.ts`: Hazard levels 0–5.
- Rewards: fights 10–20 Credits, Hazards 25–35 + Salvage, bosses 95–105 +
  1 of 3 boss Salvage; card pick 1 of 3; Canister drop chance starts at 40%
  (−10% when one drops, +10% when not).
- Rest: heal 30% max HP (25% at Hazard 2+) or upgrade a card.
- Trader: 5 cards (one on sale), 3 Salvage, 3 Canisters, one card removal per
  visit (75 Credits, +25 each time).
- Events: `EventDef` scenes and choices with `RunEffect`s; choice effects are
  listed automatically (`describeRunEffects`).
- New act: heal 75% of missing HP (50% at Hazard 4+), new map.
- RNG streams: map, rewards, shuffle, enemyAI, events, shop, potions, misc,
  encounters.
- UI: `src/ui/run/RunView.tsx` (HUD, screen switching, autosave after every
  command and on tab close, history on run end), `MapView.tsx`, `screens.tsx`.
  Saves: `src/ui/save.ts` (`salvage-crew.run.v1`, profile in
  `salvage-crew.profile.v1`).

## Folder structure

```
the-salvage-crew/
├─ CLAUDE.md               rules for every session
├─ docs/                   BRIEF.md, DESIGN.md
├─ .github/workflows/      test → build → deploy to GitHub Pages
├─ public/                 favicon (SVG, made in code)
├─ src/
│  ├─ engine/              rules only: rng, state, actions, effects, hooks, combat, run, save
│  ├─ content/             data only
│  │  ├─ characters/rigger/   cards, starter deck, starter relic
│  │  ├─ relics, potions, statuses
│  │  └─ acts/act1/           enemies, elites, boss, events
│  └─ ui/                  React: screens, components, art (SVG), audio (Web Audio), styles
├─ sim/                    headless balance simulator (npm run sim)
└─ tests/                  Vitest
```
