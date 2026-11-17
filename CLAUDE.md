# CLAUDE.md: The Salvage Crew

A single-player roguelike deckbuilder for the browser, set in an original
space-salvage world. Full brief: `docs/BRIEF.md`. Agreed design and decisions
log: `docs/DESIGN.md`. Read both before starting a phase.

## Working with the owner

- The owner has **no coding experience**. Explain things in plain language,
  avoid jargon, and give step-by-step instructions they can follow.
- Work in the phases listed in `docs/BRIEF.md`. At the end of each phase:
  1. run `npm run check` (type check + tests + build) and fix anything red;
  2. update the work-order list on the title screen (`src/ui/screens/TitleScreen.tsx`)
     and `BUILD_PHASE` in `src/engine/version.ts` until the real menu replaces it;
  3. tell the owner, in plain steps, how to play and test the new work
     (normally: open the live link, then a short checklist);
  4. commit and push to `main` (this is the agreed workflow; GitHub Actions
     tests, builds and deploys to Pages).
- Record any new design decision in the decisions log in `docs/DESIGN.md`.
- Live link: https://turtle102025-stack.github.io/the-salvage-crew/

## Originality (non-negotiable)

- Every card, relic, potion, enemy, character, name, line of text and piece of
  art is original. Genre mechanics (energy, intents, deckbuilding, Strength /
  Weak / Vulnerable / Poison) are fine; copying any existing game's cards,
  relics, names, text or visuals is not. Don't reuse well-known names from
  other deckbuilders (e.g. no "Strike"/"Defend" starters; ours are *Pry Bar*
  and *Hull Patch*).
- All art is SVG/CSS written in code, in **art style A**: dark navy space,
  amber + teal accents, chunky flat shapes with dark (`--space-950`) outlines.
  Use the colour tokens in `src/ui/styles/theme.css`, never ad-hoc colours.
  Card types: Attack = rust orange, Skill = teal, Power = violet.
- No downloaded or copied images, icons or sounds. Sounds are generated with
  the Web Audio API. The only bundled asset is the OFL-licensed Chakra Petch
  font from npm.

## Tone and terminology

- Writing tone: **wry, working-class crew humour** (hazard pay, cranky ship AI,
  rival crews, union jokes). Short and punchy; card text stays clear first.
- In-game names (code keeps the genre terms): gold → **Credits**, relic →
  **Salvage**, potion → **Canister**, rest site → **Docking Bay** (Rest /
  Tinker), shop → **Trader**, event → **Signal**, treasure → **Cargo Pod**,
  elite → **Hazard**.

## Architecture rules

- **`src/engine` and `src/content` are pure TypeScript.** No React, no
  imports from `src/ui`, no `.tsx`, no browser APIs (`window`, `document`,
  `localStorage`…), no `Math.random`, no clock (`Date.now`, `new Date`,
  `performance.now`). Enforced by `tests/architecture.test.ts` and by
  `tsconfig.engine.json` (no DOM types). Never weaken these guards.
- **All randomness goes through the seeded RNG**, using the correct named
  stream (`map`, `rewards`, `shuffle`, `enemyAI`, `events`, `shop`, `potions`,
  `misc`). RNG state lives in the game state so saves reproduce exactly.
- **The engine is a state machine:** `(state, command) → (newState, events)`.
  It never waits for the UI. The UI animates the returned events.
- **Action queue:** effects become actions resolved one at a time, in order.
  Hook reactions are inserted immediately after the action that triggered
  them. Listener order: player relics → player statuses/powers → enemies
  left to right.
- **Damage pipeline** lives in exactly one function: base → +Strength →
  ×0.75 Weak → ×1.5 Vulnerable → floor (min 0) → Block → HP.
- **State is plain, JSON-serializable data** (no classes, functions or Maps in
  state). Saves carry a `saveVersion`.
- **localStorage is touched only in `src/ui`** (save/load and settings).

## Content rules

- Cards, relics, potions, statuses, enemies and events are **data** in
  `src/content`, built from the effect library in `src/engine/effects`.
  Adding content must not require engine changes.
- If a design truly needs a new kind of effect, add **one new primitive** to
  the effect library with its own test, then use it from data.
- Card text is **generated from effects** (an override is allowed for special
  cases). Every card has an upgraded version.
- Every content id is unique, `snake_case`, and stable (saves reference ids).
- Characters are folders: `src/content/characters/<id>/` (cards, starter
  deck, starter relic). Nothing in the engine may assume there is only one.

## Testing

- Vitest. Engine changes come with tests: damage math, status interactions,
  deck cycling (draw / discard / exhaust / reshuffle), relic triggers, and
  **same seed + same commands ⇒ identical result**.
- `npm run check` must pass before every commit. CI runs the same checks and
  won't deploy if they fail.

## Commands

| Command | What it does |
|---|---|
| `npm install` | install dependencies (first time only) |
| `npm run dev` | local dev server with live reload |
| `npm test` | run the tests once |
| `npm run typecheck` | type check app + engine (engine without DOM types) |
| `npm run build` | production build into `dist/` |
| `npm run check` | typecheck + tests + build (run before committing) |
| `npm run sim` | balance simulator (from Phase 7) |

## Deployment

- Public GitHub repo `turtle102025-stack/the-salvage-crew`.
- `.github/workflows/deploy.yml`: on every push to `main`, type check, test
  and build, then deploy `dist/` to GitHub Pages. Pull requests are tested
  but not deployed.
- Vite uses `base: './'` so the build works under the `/the-salvage-crew/` path.
