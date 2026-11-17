# Project brief: The Salvage Crew

_The original brief for this project, saved as written. Decisions made since
then are in [DESIGN.md](DESIGN.md); the working rules are in [CLAUDE.md](../CLAUDE.md)._

---

# New project: roguelike deckbuilder (browser game)

My coding experience: [none] I also need to set up the new project in github and I need help with that.
Theme: ["space salvage crew"]
Game name: [The Salvage Crew]

## What I want

A single-player roguelike deckbuilder that runs in the browser, in the style of the genre (Slay the Spire, Monster Train) but set in an original space salvage world. In each run I climb a branching map, fight turn-based card battles, and build up my deck with new cards, relics and potions until I win or die. A run should take 30–45 minutes, and every run should feel different.

## Originality

- Every card, relic, potion, enemy, character, name and piece of art is original. Genre mechanics (energy, enemy intents, deckbuilding) are fine to use, but don't copy any existing game's cards, relics, names, text or visuals.
- Art is made in code (SVG/CSS) in one consistent style. No downloaded or copied images.

## Core gameplay

Combat:

- 3 energy and 5 cards drawn per turn. Draw, discard and exhaust piles; when the draw pile runs out, shuffle the discard pile into it.
- Card types: Attack, Skill, Power. Rarities: common, uncommon, rare. Every card has an upgraded version.
- Block absorbs damage and resets at the start of my turn.
- Enemies show their intent for the next turn (attack for X, defend, buff, debuff...).
- Status effects with stacks and durations: Strength, Weak, Vulnerable and Poison, plus a few original ones.

Run structure:

- 3 acts. Each act is a branching map of about 15 floors ending in a boss.
- Node types: battle, elite, rest site (heal or upgrade a card), shop (buy cards, relics or potions, or pay to remove a card), event (a short text scenario with choices and trade-offs), treasure.
- After a battle: gold, a pick of 1 card out of 3 (or skip), sometimes a potion. Elites and bosses also drop relics.
- Relics give passive effects for the rest of the run. Potions are single-use.

## Content targets

- MVP (Act 1 playable from start to finish): 1 character, ~35 cards, ~12 relics, ~6 potions, ~8 regular enemies, 3 elites, 1 boss, ~8 events.
- Full version: 3 acts, ~75 cards and ~30 relics for the first character, designed so more characters can be added later.

## Architecture

- TypeScript + Vite. React for screens and menus; CSS transitions for card and damage animations.
- The game engine is pure TypeScript with no UI code, so it can be unit tested and run headless.
- A seeded random number generator for everything, so the same seed reproduces the same run exactly. Show the seed, and let me enter one.
- Data-driven content: cards, relics, potions, enemies and events are defined in data files and built from a small library of reusable effects (deal damage, gain block, apply status, draw, gain energy...). Adding content shouldn't require engine changes.
- A trigger/hook system (start of turn, card played, damage taken, enemy died, etc.) for relics, powers and statuses.
- An action queue that resolves effects one at a time, in order, so the UI can animate each step.
- Autosave the run to localStorage after every action, so closing the tab never loses a run.
- Vitest tests for the engine: damage math, status interactions, deck cycling, relic triggers, and identical results from the same seed.

## Balance tools

- A headless simulator with a simple AI player that plays thousands of runs. It reports win rate by act, average damage taken per fight, and each card's and relic's pick rate and win rate. Use it to flag cards that are too strong or useless.

## UI

- Battle screen: hand of cards, energy, draw/discard pile counts, my HP and block, and each enemy's HP, block, statuses and intent. Hovering a card or status shows a tooltip.
- Play cards by dragging them onto a target, or by clicking the card and then the target. Keyboard shortcuts: 1–0 to select a card, E to end the turn.
- Map screen showing the paths ahead, a deck viewer, a relic bar and potion slots.
- Main menu, settings (animation speed, sound on/off), run history, and a win/lose summary screen with stats.
- Simple sound effects generated with the Web Audio API.
- Desktop first, but usable on a tablet.

## Build plan

Work in phases. At the end of each phase, tell me in plain steps how to run and test it, then commit and push.

1. Plan: before writing any code, ask me your questions, pitch a theme and starting character if I left them blank, and propose the architecture, folder structure and effect system. Wait for my OK.
2. Setup: a git repo, plus a GitHub repo created with the gh CLI (help me log in if needed). Deploy to GitHub Pages with a GitHub Actions workflow so I have a playable link from day one. Check whether my GitHub plan allows Pages on a private repo; if it doesn't, ask me before making the repo public. Save this brief to docs/BRIEF.md and the key design rules to CLAUDE.md so future sessions follow them.
3. Combat engine with tests: one battle playable in a bare-bones UI.
4. Battle screen UI and animations.
5. The run loop: map, rewards, rest sites, shop, events, relics, potions, autosave.
6. Act 1 content, playable through the boss.
7. Balance simulator, then a balance pass.
8. Acts 2 and 3, difficulty levels that unlock after a win, run history, seeds, sound and polish.
