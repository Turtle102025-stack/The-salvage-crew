/**
 * The run state machine.
 *
 *   const { run } = createRun(content, { seed, characterId, difficulty });
 *   const result = dispatchRun(content, run, { type: 'chooseNode', node: '1-3' });
 *
 * Like combat, it's pure: it never mutates the run you pass in, and the same
 * seed plus the same commands always gives the same run.
 */
import { cloneState, createCombat, dispatchCombat } from '../combat/combat';
import { effectsUseTarget } from '../defs';
import { createRngStreams, nextFloat, nextInt, pick, weightedPick } from '../rng';
import type { CardInstance, CardSelectPurpose, CombatSetup, CombatState, Content, Encounter, RunEffect } from '../types';
import { difficultyMods } from './difficulty';
import { availableNodes, generateMap } from './map';
import { cardPool, rollCards, rollPotion, rollRelic, type RewardKind } from './pools';
import type { EventState, NodeType, RewardState, RunCommand, RunEvent, RunResult, RunScreen, RunState, ShopItem, ShopState } from './types';

export const START_GOLD = 99;
export const BASE_POTION_SLOTS = 3;
export const SAVE_VERSION = 1;

interface Ctx {
  content: Content;
  run: RunState;
  events: RunEvent[];
  combatEvents?: RunResult['combatEvents'];
  combatFrom?: CombatState | null;
  combat?: CombatState;
}

// --- Creation --------------------------------------------------------------

export function createRun(content: Content, opts: { seed: string; characterId: string; difficulty?: number }): RunResult {
  const character = content.characters[opts.characterId];
  if (!character) throw new Error(`Unknown character "${opts.characterId}"`);
  if (!content.acts.length) throw new Error('No acts defined');
  const difficulty = opts.difficulty ?? 0;
  const mods = difficultyMods(difficulty);
  const rng = createRngStreams(opts.seed);
  const maxHp = character.maxHp + mods.maxHpDelta;
  const run: RunState = {
    version: SAVE_VERSION,
    seed: opts.seed,
    characterId: character.id,
    difficulty,
    act: 1,
    floor: 0,
    hp: maxHp,
    maxHp,
    gold: START_GOLD,
    deck: character.starterDeck.map((id, i) => ({ uid: i + 1, id, upgraded: false })),
    nextUid: character.starterDeck.length + 1,
    relics: [],
    potions: Array(BASE_POTION_SLOTS).fill(null),
    map: { act: 1, floors: 0, cols: 0, nodes: {}, boss: 'boss' },
    position: null,
    path: [],
    bossEncounter: '',
    screen: { type: 'map' },
    rng,
    stats: {
      floorsClimbed: 0,
      enemiesKilled: 0,
      elitesKilled: 0,
      bossesKilled: 0,
      damageTaken: 0,
      damageDealt: 0,
      cardsPlayed: 0,
      turns: 0,
      goldEarned: 0,
      goldSpent: 0,
      cardsRemoved: 0,
      cardsUpgraded: 0,
      potionsUsed: 0,
      fights: [],
      picks: [],
      relicsTaken: [],
    },
    counters: { battlesThisAct: 0, recentEncounters: [], seenEvents: [], rareOffset: -5, potionChance: 40, removals: 0 },
    phase: 'active',
  };
  const ctx: Ctx = { content, run, events: [] };
  gainRelic(ctx, character.starterRelic);
  startAct(ctx, 1, false);
  return { run, events: ctx.events };
}

function actDef(content: Content, act: number) {
  const def = content.acts.find((a) => a.id === act);
  if (!def) throw new Error(`No act ${act}`);
  return def;
}

function startAct(ctx: Ctx, act: number, heal: boolean): void {
  const { run, content } = ctx;
  run.act = act;
  run.floor = 0;
  run.position = null;
  run.path = [];
  run.counters.battlesThisAct = 0;
  run.counters.recentEncounters = [];
  run.map = generateMap(run.rng.map, act);
  const boss = pickEncounter(ctx, actDef(content, act).encounters.boss);
  run.bossEncounter = boss.id;
  if (heal) {
    const amount = Math.round((run.maxHp - run.hp) * difficultyMods(run.difficulty).actHeal);
    changeHp(ctx, amount);
  }
  run.screen = { type: 'actIntro', act };
  ctx.events.push({ type: 'actStart', act });
}

// --- Small helpers -----------------------------------------------------------

function changeGold(ctx: Ctx, amount: number): void {
  const { run } = ctx;
  const before = run.gold;
  run.gold = Math.max(0, run.gold + amount);
  const delta = run.gold - before;
  if (delta > 0) run.stats.goldEarned += delta;
  if (delta < 0) run.stats.goldSpent -= delta;
  if (delta) ctx.events.push({ type: 'gold', amount: delta });
}

/** Out of combat, HP can't drop below 1. */
function changeHp(ctx: Ctx, amount: number): void {
  const { run } = ctx;
  const before = run.hp;
  run.hp = Math.max(1, Math.min(run.maxHp, run.hp + amount));
  const delta = run.hp - before;
  if (delta < 0) run.stats.damageTaken -= delta;
  if (delta) ctx.events.push({ type: 'hp', amount: delta });
}

function changeMaxHp(ctx: Ctx, amount: number): void {
  const { run } = ctx;
  run.maxHp = Math.max(1, run.maxHp + amount);
  if (amount > 0) run.hp += amount;
  run.hp = Math.min(run.hp, run.maxHp);
  ctx.events.push({ type: 'maxHp', amount });
}

export function addCardToDeck(ctx: { run: RunState; events: RunEvent[] }, id: string, upgraded = false): CardInstance {
  const card = { uid: ctx.run.nextUid++, id, upgraded };
  ctx.run.deck.push(card);
  ctx.events.push({ type: 'cardAdded', card: id, upgraded });
  return card;
}

function relicMods(content: Content, run: RunState) {
  const sum = { potionSlots: 0, maxEnergy: 0, drawPerTurn: 0, restHealBonus: 0, shopDiscount: 0, cardChoices: 0, goldAfterCombat: 0, healAfterCombat: 0 };
  for (const id of run.relics) {
    const m = content.relics[id]?.run;
    if (!m) continue;
    sum.potionSlots += m.potionSlots ?? 0;
    sum.maxEnergy += m.maxEnergy ?? 0;
    sum.drawPerTurn += m.drawPerTurn ?? 0;
    sum.restHealBonus += m.restHealBonus ?? 0;
    sum.shopDiscount += m.shopDiscount ?? 0;
    sum.cardChoices += m.cardChoices ?? 0;
    sum.goldAfterCombat += m.goldAfterCombat ?? 0;
    sum.healAfterCombat += m.healAfterCombat ?? 0;
  }
  return sum;
}

export function gainRelic(ctx: Ctx, id: string): void {
  const { run, content } = ctx;
  const def = content.relics[id];
  if (!def) throw new Error(`Unknown relic "${id}"`);
  if (run.relics.includes(id)) return;
  run.relics.push(id);
  run.stats.relicsTaken.push({ id, act: run.act, floor: run.floor });
  ctx.events.push({ type: 'relic', relic: id });
  const m = def.run;
  if (!m) return;
  if (m.maxHpOnPickup) changeMaxHp(ctx, m.maxHpOnPickup);
  if (m.healOnPickup) changeHp(ctx, m.healOnPickup);
  if (m.goldOnPickup) changeGold(ctx, m.goldOnPickup);
  if (m.potionSlots) for (let i = 0; i < m.potionSlots; i++) run.potions.push(null);
}

/** Adds a potion to the first free slot. Returns false if all slots are full. */
function gainPotion(ctx: Ctx, id: string): boolean {
  const slot = ctx.run.potions.indexOf(null);
  if (slot < 0) {
    ctx.events.push({ type: 'potionFull', potion: id });
    return false;
  }
  ctx.run.potions[slot] = id;
  ctx.events.push({ type: 'potion', potion: id });
  return true;
}

export function shopPrice(content: Content, run: RunState, base: number): number {
  const discount = Math.min(0.5, relicMods(content, run).shopDiscount);
  return Math.round(base * (1 - discount));
}

export function canUpgrade(content: Content, card: CardInstance): boolean {
  const def = content.cards[card.id];
  return !!def && !card.upgraded && def.type !== 'curse' && def.type !== 'status';
}

export function selectableCards(content: Content, run: RunState, purpose: CardSelectPurpose): CardInstance[] {
  if (purpose === 'upgrade') return run.deck.filter((c) => canUpgrade(content, c));
  return run.deck;
}

/** Potions currently held (in combat, the fight's copy is the live one). */
export function currentPotions(run: RunState): (string | null)[] {
  return run.screen.type === 'combat' ? run.screen.combat.potions : run.potions;
}

// --- Encounters & combat -------------------------------------------------------

function pickEncounter(ctx: Ctx, pool: Encounter[]): Encounter {
  const { run } = ctx;
  if (!pool.length) throw new Error('Empty encounter pool');
  const fresh = pool.filter((e) => !run.counters.recentEncounters.includes(e.id));
  const options = fresh.length ? fresh : pool;
  return weightedPick(
    run.rng.encounters,
    options.map((e) => [e, e.weight ?? 1] as const),
  );
}

function enterCombat(ctx: Ctx, node: NodeType, encounter: Encounter, fromEvent = false): void {
  const { run, content } = ctx;
  const mods = difficultyMods(run.difficulty);
  const rmods = relicMods(content, run);
  const hpMult = node === 'boss' ? mods.bossHpMult : node === 'elite' ? mods.eliteHpMult : mods.enemyHpMult;
  const setup: CombatSetup = {
    characterId: run.characterId,
    hp: run.hp,
    maxHp: run.maxHp,
    deck: run.deck.map((c) => ({ id: c.id, upgraded: c.upgraded })),
    relics: [...run.relics],
    enemies: encounter.enemies,
    rng: { shuffle: run.rng.shuffle, enemyAI: run.rng.enemyAI, misc: run.rng.misc },
    potions: [...run.potions],
    maxEnergy: 3 + rmods.maxEnergy,
    drawPerTurn: 5 + rmods.drawPerTurn,
    enemyHpMult: hpMult,
    enemyStrength: node === 'boss' ? mods.bossStrength : 0,
  };
  const { state, events } = createCombat(content, setup);
  run.counters.recentEncounters = [...run.counters.recentEncounters, encounter.id].slice(-3);
  run.screen = { type: 'combat', node, encounter: encounter.id, combat: state, ...(fromEvent ? { fromEvent } : {}) };
  ctx.combatEvents = events;
  ctx.combatFrom = null;
  ctx.combat = state;
  ctx.events.push({ type: 'combatStart', encounter: encounter.id });
}

/** "2× Rust Lamprey, Scrap Mite" */
export function describeEnemies(content: Content, enemies: string[]): string {
  const counts = new Map<string, number>();
  for (const id of enemies) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([id, n]) => `${n > 1 ? `${n}× ` : ''}${content.enemies[id]?.name ?? id}`).join(', ');
}

function encounterName(content: Content, run: RunState, id: string): string {
  for (const act of content.acts) {
    for (const pool of Object.values(act.encounters)) {
      const e = pool.find((x) => x.id === id);
      if (e) return e.name ?? describeEnemies(content, e.enemies);
    }
  }
  void run;
  return id;
}

function finishCombat(ctx: Ctx, combat: CombatState, node: NodeType, encounter: string): void {
  const { run, content } = ctx;
  run.rng.shuffle = combat.rng.shuffle;
  run.rng.enemyAI = combat.rng.enemyAI;
  run.rng.misc = combat.rng.misc;
  run.potions = [...combat.potions];
  run.hp = combat.player.hp;
  const s = run.stats;
  s.turns += combat.stats.turns;
  s.cardsPlayed += combat.stats.cardsPlayed;
  s.damageTaken += combat.stats.damageTaken;
  s.damageDealt += combat.stats.damageDealt;
  s.potionsUsed += combat.stats.potionsUsed;
  const won = combat.phase === 'victory';
  s.fights.push({ act: run.act, floor: run.floor, node, encounter, turns: combat.stats.turns, damageTaken: combat.stats.damageTaken, won });

  if (!won) {
    run.hp = 0;
    run.phase = 'lost';
    s.killedBy = encounterName(content, run, encounter);
    run.screen = { type: 'gameOver', won: false };
    ctx.events.push({ type: 'runOver', won: false });
    return;
  }

  s.enemiesKilled += combat.enemies.length;
  if (node === 'elite') s.elitesKilled++;
  if (node === 'boss') s.bossesKilled++;
  const rmods = relicMods(content, run);
  if (rmods.healAfterCombat) changeHp(ctx, rmods.healAfterCombat);
  if (rmods.goldAfterCombat) changeGold(ctx, rmods.goldAfterCombat);
  run.screen = { type: 'reward', node, reward: generateReward(ctx, node === 'boss' ? 'boss' : node === 'elite' ? 'elite' : 'battle') };
}

function generateReward(ctx: Ctx, kind: RewardKind): RewardState {
  const { run, content } = ctx;
  const rng = run.rng.rewards;
  const gold = kind === 'boss' ? nextInt(rng, 95, 105) : kind === 'elite' ? nextInt(rng, 25, 35) : nextInt(rng, 10, 20);
  const choices = 3 + relicMods(content, run).cardChoices;
  const options = rollCards(content, run, rng, kind, choices);
  let potion: string | null = null;
  if (kind !== 'boss') {
    if (nextFloat(run.rng.potions) * 100 < run.counters.potionChance) {
      potion = rollPotion(content, run.rng.potions);
      run.counters.potionChance = Math.max(0, run.counters.potionChance - 10);
    } else {
      run.counters.potionChance = Math.min(100, run.counters.potionChance + 10);
    }
  }
  const relic = kind === 'elite' ? rollRelic(content, run, rng) : null;
  let bossRelics: string[] | null = null;
  if (kind === 'boss') {
    bossRelics = [];
    for (let i = 0; i < 3; i++) {
      const id = rollRelic(content, run, rng, 'boss', bossRelics);
      if (id && !bossRelics.includes(id)) bossRelics.push(id);
    }
    if (!bossRelics.length) bossRelics = null;
  }
  return { gold, cards: options.length ? [{ options, taken: false }] : [], potion, relic, bossRelics };
}

// --- Shops & events ---------------------------------------------------------

const CARD_PRICE: Record<string, [number, number]> = { common: [45, 55], uncommon: [68, 82], rare: [135, 165] };
const RELIC_PRICE: Record<string, number> = { common: 150, uncommon: 250, rare: 300, shop: 150, boss: 300, starter: 150 };
const POTION_PRICE: Record<string, number> = { common: 50, uncommon: 75, rare: 100 };

function generateShop(ctx: Ctx): ShopState {
  const { run, content } = ctx;
  const rng = run.rng.shop;
  const cards: ShopItem[] = [];
  const rows: [('attack' | 'skill' | 'power'), number][] = [
    ['attack', 2],
    ['skill', 2],
    ['power', 1],
  ];
  for (const [type, count] of rows) {
    for (const c of rollCards(content, run, rng, 'shop', count, type)) {
      if (cards.some((x) => x.id === c.id)) continue;
      const [lo, hi] = CARD_PRICE[content.cards[c.id]!.rarity] ?? [50, 50];
      cards.push({ id: c.id, upgraded: c.upgraded, price: nextInt(rng, lo, hi), sold: false });
    }
  }
  if (cards.length) {
    const sale = nextInt(rng, 0, cards.length - 1);
    cards[sale]!.price = Math.round(cards[sale]!.price / 2);
    cards[sale]!.onSale = true;
  }
  const relics: ShopItem[] = [];
  for (let i = 0; i < 3; i++) {
    const id = rollRelic(content, run, rng, i === 2 ? 'shop' : undefined, relics.map((r) => r.id));
    if (!id) continue;
    const base = RELIC_PRICE[content.relics[id]!.rarity] ?? 200;
    relics.push({ id, price: Math.round(base * (0.95 + nextFloat(rng) * 0.1)), sold: false });
  }
  const potions: ShopItem[] = [];
  for (let i = 0; i < 3; i++) {
    const id = rollPotion(content, rng);
    if (!id) continue;
    const base = POTION_PRICE[content.potions[id]!.rarity] ?? 60;
    potions.push({ id, price: Math.round(base * (0.95 + nextFloat(rng) * 0.1)), sold: false });
  }
  return { cards, relics, potions, removePrice: 75 + 25 * run.counters.removals, removeUsed: false };
}

function pickEvent(ctx: Ctx): string | null {
  const { run, content } = ctx;
  const act = actDef(content, run.act);
  const pool = act.events.filter((id) => content.events[id]);
  if (!pool.length) return null;
  const fresh = pool.filter((id) => !run.counters.seenEvents.includes(id));
  const id = pick(run.rng.events, fresh.length ? fresh : pool);
  run.counters.seenEvents.push(id);
  return id;
}

/** Applies run effects. Returns a screen to switch to (card select or a fight), if any. */
function applyRunEffects(ctx: Ctx, effects: readonly RunEffect[], after: RunScreen): RunScreen | null {
  const { run, content } = ctx;
  let next: RunScreen | null = null;
  for (const e of effects) {
    switch (e.type) {
      case 'gold':
        changeGold(ctx, e.amount);
        break;
      case 'hp':
        changeHp(ctx, e.amount);
        break;
      case 'healPercent':
        changeHp(ctx, Math.round((run.maxHp * e.percent) / 100));
        break;
      case 'maxHp':
        changeMaxHp(ctx, e.amount);
        break;
      case 'addCard':
        for (let i = 0; i < (e.count ?? 1); i++) addCardToDeck(ctx, e.card, e.upgraded ?? false);
        break;
      case 'addRandomCard': {
        const pool = cardPool(content, run.characterId, e.rarity, e.cardType);
        if (pool.length) addCardToDeck(ctx, pick(run.rng.events, pool), e.upgraded ?? false);
        break;
      }
      case 'relic': {
        const id = e.relic ?? rollRelic(content, run, run.rng.events, e.rarity);
        if (id) gainRelic(ctx, id);
        else changeGold(ctx, 50);
        break;
      }
      case 'potion': {
        const id = e.potion ?? rollPotion(content, run.rng.potions);
        if (id) gainPotion(ctx, id);
        break;
      }
      case 'upgradeRandom': {
        const options = run.deck.filter((c) => canUpgrade(content, c));
        for (let i = 0; i < e.count && options.length; i++) {
          const card = options.splice(nextInt(run.rng.events, 0, options.length - 1), 1)[0]!;
          card.upgraded = true;
          run.stats.cardsUpgraded++;
          ctx.events.push({ type: 'cardUpgraded', card: card.id });
        }
        break;
      }
      case 'selectCards':
        if (selectableCards(content, run, e.purpose).length) {
          next = { type: 'cardSelect', purpose: e.purpose, count: e.count, returnTo: next ?? after, optional: false };
        }
        break;
      case 'fight': {
        const encounter: Encounter = { id: `event:${e.enemies.join('+')}`, name: describeEnemies(content, e.enemies), enemies: e.enemies };
        const node: NodeType = e.reward === 'elite' ? 'elite' : 'battle';
        enterCombat(ctx, node, encounter, true);
        next = run.screen;
        break;
      }
      case 'chance': {
        const hit = nextFloat(run.rng.events) * 100 < e.percent;
        const sub = applyRunEffects(ctx, hit ? e.then : (e.else ?? []), after);
        if (sub) next = sub;
        break;
      }
    }
  }
  return next;
}

export function choiceAvailable(run: RunState, req: { gold?: number; hp?: number; relic?: string } | undefined): boolean {
  if (!req) return true;
  if (req.gold !== undefined && run.gold < req.gold) return false;
  if (req.hp !== undefined && run.hp <= req.hp) return false;
  if (req.relic !== undefined && !run.relics.includes(req.relic)) return false;
  return true;
}

// --- Dispatch ---------------------------------------------------------------

function fail(run: RunState, error: string): RunResult {
  return { run, events: [], error };
}

export function dispatchRun(content: Content, input: RunState, command: RunCommand): RunResult {
  if (input.phase !== 'active') return fail(input, 'The run is over.');
  const run = cloneState(input);
  const ctx: Ctx = { content, run, events: [] };
  const screen = run.screen;
  const ok = (): RunResult => ({
    run,
    events: ctx.events,
    ...(ctx.combatEvents ? { combatEvents: ctx.combatEvents, combatFrom: ctx.combatFrom ?? null, ...(ctx.combat ? { combat: ctx.combat } : {}) } : {}),
  });

  switch (command.type) {
    case 'chooseNode': {
      if (screen.type !== 'map') return fail(input, 'Not on the map.');
      if (!availableNodes(run.map, run.position).includes(command.node)) return fail(input, "You can't reach that from here.");
      const node = run.map.nodes[command.node]!;
      run.position = node.id;
      run.path.push(node.id);
      run.floor = node.floor;
      run.stats.floorsClimbed++;
      const act = actDef(content, run.act);
      switch (node.type) {
        case 'battle': {
          const weak = run.counters.battlesThisAct < 2 && act.encounters.weak.length > 0;
          run.counters.battlesThisAct++;
          enterCombat(ctx, 'battle', pickEncounter(ctx, weak ? act.encounters.weak : act.encounters.normal));
          break;
        }
        case 'elite':
          enterCombat(ctx, 'elite', pickEncounter(ctx, act.encounters.elite));
          break;
        case 'boss': {
          const boss = act.encounters.boss.find((e) => e.id === run.bossEncounter) ?? act.encounters.boss[0]!;
          enterCombat(ctx, 'boss', boss);
          break;
        }
        case 'rest':
          run.screen = { type: 'rest', done: false };
          break;
        case 'shop':
          run.screen = { type: 'shop', shop: generateShop(ctx) };
          break;
        case 'treasure':
          run.screen = { type: 'treasure', opened: false, reward: null };
          break;
        case 'event': {
          const id = pickEvent(ctx);
          if (id) run.screen = { type: 'event', event: { id, scene: 'start', result: null, outcome: [] } };
          else {
            run.counters.battlesThisAct++;
            enterCombat(ctx, 'battle', pickEncounter(ctx, act.encounters.normal));
          }
          break;
        }
      }
      return ok();
    }

    case 'combat': {
      if (screen.type !== 'combat') return fail(input, 'Not in a fight.');
      const before = screen.combat;
      const result = dispatchCombat(content, before, command.command);
      if (result.error) return fail(input, result.error);
      screen.combat = result.state;
      ctx.combatEvents = result.events;
      ctx.combatFrom = before;
      ctx.combat = result.state;
      if (result.state.phase !== 'player') finishCombat(ctx, result.state, screen.node, screen.encounter);
      return ok();
    }

    case 'usePotion': {
      if (screen.type === 'combat') return dispatchRun(content, input, { type: 'combat', command: { type: 'usePotion', slot: command.slot, ...(command.target ? { target: command.target } : {}) } });
      const id = run.potions[command.slot];
      const def = id ? content.potions[id] : undefined;
      if (!id || !def) return fail(input, 'That slot is empty.');
      if (!def.outOfCombat) return fail(input, 'That Canister only works in a fight.');
      run.potions[command.slot] = null;
      run.stats.potionsUsed++;
      ctx.events.push({ type: 'potionUsed', potion: id });
      applyRunEffects(ctx, def.outOfCombat, run.screen);
      return ok();
    }

    case 'discardPotion': {
      if (screen.type === 'combat') return dispatchRun(content, input, { type: 'combat', command: { type: 'discardPotion', slot: command.slot } });
      if (!run.potions[command.slot]) return fail(input, 'That slot is empty.');
      run.potions[command.slot] = null;
      return ok();
    }

    case 'takeGold':
    case 'takePotion':
    case 'takeRelic':
    case 'takeCard':
    case 'skipCard': {
      const reward = screen.type === 'reward' ? screen.reward : screen.type === 'treasure' ? screen.reward : null;
      if (!reward) return fail(input, 'Nothing to take here.');
      if (command.type === 'takeGold') {
        if (reward.gold === null) return fail(input, 'Already taken.');
        changeGold(ctx, reward.gold);
        reward.gold = null;
      } else if (command.type === 'takePotion') {
        if (!reward.potion) return fail(input, 'Already taken.');
        if (!gainPotion(ctx, reward.potion)) return fail(input, 'Your Canister slots are full. Use or drop one first.');
        reward.potion = null;
      } else if (command.type === 'takeRelic') {
        if (reward.bossRelics && command.index !== undefined) {
          const id = reward.bossRelics[command.index];
          if (!id) return fail(input, 'No such relic.');
          gainRelic(ctx, id);
          reward.bossRelics = null;
        } else {
          if (!reward.relic) return fail(input, 'Already taken.');
          gainRelic(ctx, reward.relic);
          reward.relic = null;
        }
      } else {
        const choice = reward.cards[command.reward];
        if (!choice || choice.taken) return fail(input, 'Already chosen.');
        choice.taken = true;
        let picked: string | null = null;
        if (command.type === 'takeCard') {
          const option = choice.options[command.option];
          if (!option) return fail(input, 'No such card.');
          addCardToDeck(ctx, option.id, option.upgraded);
          picked = option.id;
        }
        run.stats.picks.push({ act: run.act, floor: run.floor, options: choice.options.map((o) => o.id), picked });
      }
      return ok();
    }

    case 'openChest': {
      if (screen.type !== 'treasure' || screen.opened) return fail(input, 'Nothing to open.');
      screen.opened = true;
      const relic = rollRelic(content, run, run.rng.rewards);
      screen.reward = { gold: nextInt(run.rng.rewards, 20, 40), cards: [], potion: null, relic, bossRelics: null };
      return ok();
    }

    case 'rest': {
      if (screen.type !== 'rest' || screen.done) return fail(input, "You can't rest now.");
      const percent = difficultyMods(run.difficulty).restHealPercent + relicMods(content, run).restHealBonus;
      const before = run.hp;
      changeHp(ctx, Math.round((run.maxHp * percent) / 100));
      run.screen = { type: 'rest', done: true, healed: run.hp - before };
      return ok();
    }

    case 'smith': {
      if (screen.type !== 'rest' || screen.done) return fail(input, "You can't tinker now.");
      if (!selectableCards(content, run, 'upgrade').length) return fail(input, 'Every card is already upgraded.');
      run.screen = { type: 'cardSelect', purpose: 'upgrade', count: 1, returnTo: { type: 'rest', done: true }, optional: true };
      return ok();
    }

    case 'buy': {
      if (screen.type !== 'shop') return fail(input, 'Not at the Trader.');
      const list = command.kind === 'card' ? screen.shop.cards : command.kind === 'relic' ? screen.shop.relics : screen.shop.potions;
      const item = list[command.index];
      if (!item || item.sold) return fail(input, 'Sold out.');
      const price = shopPrice(content, run, item.price);
      if (run.gold < price) return fail(input, 'Not enough Credits.');
      if (command.kind === 'potion' && run.potions.indexOf(null) < 0) return fail(input, 'Your Canister slots are full.');
      changeGold(ctx, -price);
      item.sold = true;
      if (command.kind === 'card') addCardToDeck(ctx, item.id, item.upgraded ?? false);
      else if (command.kind === 'relic') gainRelic(ctx, item.id);
      else gainPotion(ctx, item.id);
      return ok();
    }

    case 'removeCard': {
      if (screen.type !== 'shop') return fail(input, 'Not at the Trader.');
      if (screen.shop.removeUsed) return fail(input, 'The Trader only does one removal per visit.');
      const price = shopPrice(content, run, screen.shop.removePrice);
      if (run.gold < price) return fail(input, 'Not enough Credits.');
      run.screen = { type: 'cardSelect', purpose: 'remove', count: 1, cost: price, returnTo: screen, optional: true };
      return ok();
    }

    case 'selectCards': {
      if (screen.type !== 'cardSelect') return fail(input, 'Nothing to choose.');
      const eligible = selectableCards(content, run, screen.purpose);
      const need = Math.min(screen.count, eligible.length);
      const uids = [...new Set(command.uids)];
      if (uids.length !== need || !uids.every((u) => eligible.some((c) => c.uid === u))) return fail(input, `Choose ${need} card${need === 1 ? '' : 's'}.`);
      for (const uid of uids) {
        const card = run.deck.find((c) => c.uid === uid)!;
        switch (screen.purpose) {
          case 'upgrade':
            card.upgraded = true;
            run.stats.cardsUpgraded++;
            ctx.events.push({ type: 'cardUpgraded', card: card.id });
            break;
          case 'remove':
            run.deck = run.deck.filter((c) => c.uid !== uid);
            run.stats.cardsRemoved++;
            ctx.events.push({ type: 'cardRemoved', card: card.id });
            break;
          case 'transform': {
            run.deck = run.deck.filter((c) => c.uid !== uid);
            ctx.events.push({ type: 'cardRemoved', card: card.id });
            const pool = cardPool(content, run.characterId).filter((id) => id !== card.id);
            if (pool.length) addCardToDeck(ctx, pick(run.rng.events, pool), false);
            break;
          }
          case 'duplicate':
            addCardToDeck(ctx, card.id, card.upgraded);
            break;
        }
      }
      if (screen.cost) {
        changeGold(ctx, -screen.cost);
        run.counters.removals++;
        if (screen.returnTo.type === 'shop') screen.returnTo.shop.removeUsed = true;
      }
      run.screen = screen.returnTo;
      return ok();
    }

    case 'cancelSelect': {
      if (screen.type !== 'cardSelect' || !screen.optional) return fail(input, "You can't back out now.");
      run.screen = screen.purpose === 'upgrade' && screen.returnTo.type === 'rest' ? { type: 'rest', done: false } : screen.returnTo;
      return ok();
    }

    case 'eventChoice': {
      if (screen.type !== 'event' || screen.event.result !== null) return fail(input, 'No choice to make.');
      const def = content.events[screen.event.id];
      const scene = def?.scenes[screen.event.scene];
      const choice = scene?.choices[command.index];
      if (!def || !scene || !choice) return fail(input, 'No such choice.');
      if (!choiceAvailable(run, choice.requires)) return fail(input, "You can't do that right now.");
      const nextEvent: EventState = choice.next
        ? { id: def.id, scene: choice.next, result: null, outcome: [] }
        : { id: def.id, scene: screen.event.scene, result: choice.result ?? '', outcome: [] };
      const after: RunScreen = { type: 'event', event: nextEvent };
      run.screen = after;
      const before = ctx.events.length;
      const jump = applyRunEffects(ctx, choice.effects, after);
      nextEvent.outcome = ctx.events.slice(before).map((e) => describeRunEvent(content, e)).filter((x): x is string => !!x);
      if (jump) run.screen = jump;
      return ok();
    }

    case 'proceed': {
      switch (screen.type) {
        case 'actIntro':
        case 'shop':
        case 'treasure':
          run.screen = { type: 'map' };
          return ok();
        case 'rest':
          run.screen = { type: 'map' };
          return ok();
        case 'event':
          if (screen.event.result === null) return fail(input, 'Make a choice first.');
          run.screen = { type: 'map' };
          return ok();
        case 'reward':
          if (screen.node === 'boss') {
            const nextAct = content.acts.find((a) => a.id === run.act + 1);
            if (nextAct) startAct(ctx, nextAct.id, true);
            else {
              run.phase = 'won';
              run.screen = { type: 'gameOver', won: true };
              ctx.events.push({ type: 'runOver', won: true });
            }
          } else {
            run.screen = { type: 'map' };
          }
          return ok();
        default:
          return fail(input, "You can't leave yet.");
      }
    }
  }
}

/** Short text for a run event ("Gained 50 Credits."), used for event outcomes. */
export function describeRunEvent(content: Content, e: RunEvent): string | null {
  switch (e.type) {
    case 'gold':
      return e.amount > 0 ? `Gained ${e.amount} Credits.` : `Lost ${-e.amount} Credits.`;
    case 'hp':
      return e.amount > 0 ? `Healed ${e.amount} HP.` : `Lost ${-e.amount} HP.`;
    case 'maxHp':
      return e.amount > 0 ? `Max HP +${e.amount}.` : `Max HP ${e.amount}.`;
    case 'cardAdded':
      return `Added ${content.cards[e.card]?.name ?? e.card}${e.upgraded ? '+' : ''} to your deck.`;
    case 'cardRemoved':
      return `Removed ${content.cards[e.card]?.name ?? e.card} from your deck.`;
    case 'cardUpgraded':
      return `Upgraded ${content.cards[e.card]?.name ?? e.card}.`;
    case 'relic':
      return `Obtained ${content.relics[e.relic]?.name ?? e.relic}.`;
    case 'potion':
      return `Obtained ${content.potions[e.potion]?.name ?? e.potion}.`;
    case 'potionFull':
      return `No room for ${content.potions[e.potion]?.name ?? e.potion}: Canister slots full.`;
    default:
      return null;
  }
}

export function serializeRun(run: RunState): string {
  return JSON.stringify(run);
}

export function deserializeRun(json: string): RunState {
  const data = JSON.parse(json) as RunState;
  if (data.version !== SAVE_VERSION) throw new Error(`Unsupported save version ${String(data.version)}`);
  return data;
}

export { effectsUseTarget as potionNeedsTarget };
