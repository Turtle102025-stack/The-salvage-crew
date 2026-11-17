# The Salvage Crew

A roguelike deckbuilder about a salvage crew cutting into the biggest wreck in
the galaxy. Lead Juno Kade, the Rigger, through three acts of the colony ship
*Meridian*: climb a branching map, fight turn-based card battles, and build
your deck with new cards, Salvage (relics) and Canisters (potions) until you
strike it rich or end up as part of the debris.

**Play it:** https://turtle102025-stack.github.io/The-salvage-crew/

## What's in it

- 3 acts (The Graveyard Belt, The Hulk, The Heart), each a 15-floor branching
  map ending in a boss: fights, Hazards (elites), Docking Bays (rest or
  upgrade), the Trader (shop), Signals (events) and Cargo Pods (treasure)
- 75 cards for the Rigger across three deck styles (Scrap, Heat, Drones),
  31 pieces of Salvage, 12 Canisters, 33 enemies including 9 Hazards and
  3 bosses, 19 Signals
- Drag cards onto enemies or click to target; keyboard: 1–0 pick a card,
  ←/→ target, Enter play, E end turn, Space skip animations
- Seeded runs (enter a seed to replay a run exactly), autosave after every
  move, run history, 5 unlockable Hazard difficulty levels
- Art drawn entirely in code (SVG/CSS); sound synthesised with the Web Audio API

## Run it on your own computer (optional)

You need [Node.js](https://nodejs.org/) 22 or newer.

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

## For developers

- `npm run check`: type check, tests and production build
- `npm run sim -- --runs 2000`: balance simulator (report in `sim-reports/`)
- Design docs: [`docs/BRIEF.md`](docs/BRIEF.md), [`docs/DESIGN.md`](docs/DESIGN.md), balance reports in [`docs/balance/`](docs/balance/)
- Project rules: [`CLAUDE.md`](CLAUDE.md)

All cards, characters, text and art in this game are original.
