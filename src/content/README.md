# Content (data only)

Cards, relics, potions, statuses, enemies and events live here as plain data,
built from the effect library in `src/engine/effects`. Adding content must not
require engine changes. See `CLAUDE.md` → "Content rules".

Planned layout:

```
content/
├─ characters/rigger/   cards, starter deck, starter relic
├─ relics.ts            shared relics ("Salvage" in game)
├─ potions.ts           potions ("Canisters" in game)
├─ statuses.ts          status definitions
└─ acts/act1/           enemies, elites, boss, events ("Signals")
```
