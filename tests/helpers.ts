/**
 * Test helpers: a few simple test-only cards/enemies/relics layered on top of
 * the real content, plus shortcuts for playing cards and a basic bot.
 */
import { CONTENT } from '../src/content';
import {
  attack,
  block,
  dealDamage,
  draw,
  energy,
  gain,
  apply,
  heal,
  thisStacks,
  X,
} from '../src/engine/effects/builders';
import {
  canPlayCard,
  cardNeedsTarget,
  createCombat,
  createRngStreams,
  defineCards,
  defineEnemies,
  defineRelics,
  defineStatuses,
  dispatchCombat,
  getIntent,
  livingEnemies,
  resolveCard,
  type CombatCommand,
  type CombatEvent,
  type CombatResult,
  type CombatState,
  type Content,
} from '../src/engine';

export const TEST_CARDS = defineCards('test', {
  t_strike: { name: 'Test Strike', type: 'attack', rarity: 'common', cost: 1, effects: [attack(10)], upgrade: { effects: [attack(15)] } },
  t_guard: { name: 'Test Guard', type: 'skill', rarity: 'common', cost: 1, effects: [block(10)], upgrade: { effects: [block(15)] } },
  t_free_strike: { name: 'Free Strike', type: 'attack', rarity: 'common', cost: 0, effects: [attack(1)], upgrade: { effects: [attack(2)] } },
  t_big: { name: 'Big Swing', type: 'attack', rarity: 'common', cost: 3, effects: [attack(30)], upgrade: { cost: 2 } },
  t_draw2: { name: 'Draw Two', type: 'skill', rarity: 'common', cost: 0, effects: [draw(2)], upgrade: { effects: [draw(3)] } },
  t_exhaust: { name: 'Burn Out', type: 'skill', rarity: 'common', cost: 0, effects: [block(1)], keywords: ['exhaust'], upgrade: { effects: [block(2)] } },
  t_ethereal: { name: 'Fading', type: 'skill', rarity: 'common', cost: 0, effects: [block(1)], keywords: ['ethereal'], upgrade: { effects: [block(2)] } },
  t_retain: { name: 'Keeper', type: 'skill', rarity: 'common', cost: 0, effects: [block(1)], keywords: ['retain'], upgrade: { effects: [block(2)] } },
  t_innate: { name: 'Opener', type: 'skill', rarity: 'common', cost: 0, effects: [block(1)], keywords: ['innate'], upgrade: { effects: [block(2)] } },
  t_x: { name: 'X Blast', type: 'attack', rarity: 'common', cost: 'X', effects: [attack(5, { hits: X() })], upgrade: { effects: [attack(5, { hits: X({ plus: 1 }) })] } },
  t_multi: { name: 'Triple Tap', type: 'attack', rarity: 'common', cost: 1, effects: [attack(4, { hits: 3 })], upgrade: { effects: [attack(5, { hits: 3 })] } },
  t_aoe: { name: 'Sweep', type: 'attack', rarity: 'common', cost: 1, effects: [attack(8, { target: 'allEnemies' })], upgrade: { effects: [attack(11, { target: 'allEnemies' })] } },
  t_weak: { name: 'Sap', type: 'skill', rarity: 'common', cost: 0, effects: [apply('weak', 2)], upgrade: { effects: [apply('weak', 3)] } },
  t_vuln: { name: 'Expose', type: 'skill', rarity: 'common', cost: 0, effects: [apply('vulnerable', 2)], upgrade: { effects: [apply('vulnerable', 3)] } },
  t_str: { name: 'Pump', type: 'skill', rarity: 'common', cost: 0, effects: [gain('strength', 3)], upgrade: { effects: [gain('strength', 4)] } },
  t_poison: { name: 'Leak', type: 'skill', rarity: 'common', cost: 0, effects: [apply('poison', 3)], upgrade: { effects: [apply('poison', 5)] } },
  t_energy: { name: 'Battery', type: 'skill', rarity: 'common', cost: 0, effects: [energy(2)], upgrade: { effects: [energy(3)] } },
  t_power: { name: 'Test Power', type: 'power', rarity: 'common', cost: 0, effects: [gain('t_power_status', 2)], upgrade: { effects: [gain('t_power_status', 3)] } },
  t_junk: { name: 'Junk', type: 'status', rarity: 'special', cost: 0, effects: [], keywords: ['unplayable'], upgrade: { name: 'Junk' } },
});

export const TEST_STATUSES = defineStatuses({
  t_power_status: {
    name: 'Test Power',
    kind: 'power',
    hooks: [{ on: 'turnStart', effects: [dealDamage(thisStacks(), 'allEnemies')] }],
    description: 'At the start of your turn, deal {n} damage to ALL enemies.',
  },
});

export const TEST_ENEMIES = defineEnemies({
  dummy: { name: 'Dummy', hp: [50, 50], moves: { wait: { name: 'Wait', effects: [] } }, ai: { then: { cycle: ['wait'] } } },
  hitter: { name: 'Hitter', hp: [40, 40], moves: { hit: { name: 'Hit', effects: [attack(10)] } }, ai: { then: { cycle: ['hit'] } } },
  guard_bot: { name: 'Guard Bot', hp: [40, 40], moves: { guard: { name: 'Guard', effects: [block(10)] } }, ai: { then: { cycle: ['guard'] } } },
  hexer: {
    name: 'Hexer',
    hp: [40, 40],
    moves: { hex: { name: 'Hex', effects: [apply('vulnerable', 1), apply('weak', 1)] } },
    ai: { then: { cycle: ['hex'] } },
  },
  opener: {
    name: 'Opener',
    hp: [30, 30],
    moves: { a: { name: 'A', effects: [] }, b: { name: 'B', effects: [] }, c: { name: 'C', effects: [] } },
    ai: { opening: ['c', 'b'], then: { weights: { a: 50, b: 50 }, maxInARow: 1 } },
  },
});

export const TEST_RELICS = defineRelics({
  t_attack_relic: {
    name: 'Attack Relic',
    rarity: 'common',
    character: 'neutral',
    hooks: [{ on: 'cardPlayed', if: { cardType: 'attack' }, effects: [block(1)] }],
  },
  t_end_relic: { name: 'End Relic', rarity: 'common', character: 'neutral', hooks: [{ on: 'combatEnd', effects: [heal(5)] }] },
  t_turn_relic: { name: 'Turn Relic', rarity: 'common', character: 'neutral', hooks: [{ on: 'turnStart', effects: [gain('strength', 1)] }] },
});

export const TEST_CONTENT: Content = {
  ...CONTENT,
  cards: { ...CONTENT.cards, ...TEST_CARDS },
  statuses: { ...CONTENT.statuses, ...TEST_STATUSES },
  enemies: { ...CONTENT.enemies, ...TEST_ENEMIES },
  relics: { ...CONTENT.relics, ...TEST_RELICS },
};

export interface TestFightOpts {
  deck?: string[];
  enemies?: string[];
  relics?: string[];
  hp?: number;
  seed?: string;
}

/** A fight with an exact deck/relics/enemies (default: 10 Test Strikes vs a Dummy, no relics). */
export function startFight(opts: TestFightOpts = {}): CombatResult {
  const streams = createRngStreams(opts.seed ?? 'TEST-SEED');
  return createCombat(TEST_CONTENT, {
    characterId: 'rigger',
    hp: opts.hp ?? 72,
    maxHp: 72,
    deck: (opts.deck ?? Array(10).fill('t_strike')).map((id: string) => ({ id })),
    relics: opts.relics ?? [],
    enemies: opts.enemies ?? ['dummy'],
    rng: { shuffle: streams.shuffle, enemyAI: streams.enemyAI, misc: streams.misc },
  });
}

/** Replaces the hand with fresh copies of these cards (test setup only). */
export function setHand(state: CombatState, ids: string[], upgraded = false): CombatState {
  state.hand = ids.map((id) => ({ uid: state.nextUid++, id, upgraded }));
  return state;
}

export function uidOf(state: CombatState, cardId: string): number {
  const card = state.hand.find((c) => c.id === cardId);
  if (!card) throw new Error(`No "${cardId}" in hand: ${state.hand.map((c) => c.id).join(', ')}`);
  return card.uid;
}

/** Plays the first copy of `cardId` in hand. Throws if the engine rejects it. */
export function play(state: CombatState, cardId: string, target?: string, content: Content = TEST_CONTENT): CombatResult {
  const result = dispatchCombat(content, state, { type: 'playCard', uid: uidOf(state, cardId), ...(target ? { target } : {}) });
  if (result.error) throw new Error(result.error);
  return result;
}

export function endTurn(state: CombatState, content: Content = TEST_CONTENT): CombatResult {
  const result = dispatchCombat(content, state, { type: 'endTurn' });
  if (result.error) throw new Error(result.error);
  return result;
}

export function eventsOf<T extends CombatEvent['type']>(events: CombatEvent[], type: T): Extract<CombatEvent, { type: T }>[] {
  return events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
}

/**
 * A deliberately simple bot: plays Powers first, blocks when an attack is
 * coming and it isn't covered, otherwise attacks the weakest enemy.
 * Good enough to drive whole fights in tests (the Phase 7 simulator gets a
 * better one).
 */
export function botCommand(content: Content, state: CombatState): CombatCommand {
  const incoming = livingEnemies(state).reduce((sum, e) => {
    const intent = getIntent(content, state, e);
    return sum + (intent?.damage ?? 0) * (intent?.hits ?? 0);
  }, 0);
  const playable = state.hand.filter((c) => canPlayCard(content, state, c.uid).ok);
  const typeOf = (id: string) => content.cards[id]?.type;
  const blocks = (id: string) =>
    resolveCard(content.cards[id]!, false).effects.some((e) => e.type === 'block');
  const pickCard =
    playable.find((c) => typeOf(c.id) === 'power') ??
    (incoming > state.player.block ? playable.find((c) => typeOf(c.id) === 'skill' && blocks(c.id)) : undefined) ??
    playable.find((c) => typeOf(c.id) === 'attack') ??
    playable.find((c) => typeOf(c.id) === 'skill');
  if (!pickCard) return { type: 'endTurn' };
  const def = content.cards[pickCard.id]!;
  if (!cardNeedsTarget(def, pickCard.upgraded)) return { type: 'playCard', uid: pickCard.uid };
  const weakest = [...livingEnemies(state)].sort((a, b) => a.hp - b.hp)[0]!;
  return { type: 'playCard', uid: pickCard.uid, target: weakest.id };
}

/** Plays a whole fight with the bot. Returns every command and event. */
export function botFight(content: Content, start: CombatResult, maxCommands = 500) {
  let state = start.state;
  const events = [...start.events];
  const commands: CombatCommand[] = [];
  while (state.phase === 'player' && commands.length < maxCommands) {
    const command = botCommand(content, state);
    const result = dispatchCombat(content, state, command);
    if (result.error) throw new Error(`Bot command rejected: ${result.error}`);
    commands.push(command);
    events.push(...result.events);
    state = result.state;
  }
  return { state, events, commands };
}

// --- Runs -------------------------------------------------------------------

import { availableNodes, choiceAvailable, createRun, dispatchRun, selectableCards, type RunCommand, type RunState } from '../src/engine';

/** A simple, deterministic bot that plays a whole run (used by tests). */
export function botRunCommand(content: Content, run: RunState): RunCommand {
  const s = run.screen;
  switch (s.type) {
    case 'actIntro':
      return { type: 'proceed' };
    case 'map': {
      const options = availableNodes(run.map, run.position).map((id) => run.map.nodes[id]!);
      const low = run.hp < run.maxHp * 0.5;
      const pref = low ? ['rest', 'shop', 'event', 'treasure', 'battle', 'elite', 'boss'] : ['elite', 'treasure', 'battle', 'event', 'rest', 'shop', 'boss'];
      options.sort((a, b) => pref.indexOf(a.type) - pref.indexOf(b.type) || a.col - b.col);
      return { type: 'chooseNode', node: options[0]!.id };
    }
    case 'combat': {
      const slot = s.combat.potions.findIndex((p) => p !== null);
      if (slot >= 0 && s.combat.player.hp < s.combat.player.maxHp * 0.4) {
        const target = s.combat.enemies.find((e) => !e.dead)?.id;
        return { type: 'usePotion', slot, ...(target ? { target } : {}) };
      }
      return { type: 'combat', command: botCommand(content, s.combat) };
    }
    case 'reward':
    case 'treasure': {
      if (s.type === 'treasure' && !s.opened) return { type: 'openChest' };
      const r = s.reward!;
      if (r.gold !== null) return { type: 'takeGold' };
      if (r.relic) return { type: 'takeRelic' };
      if (r.bossRelics) return { type: 'takeRelic', index: 0 };
      if (r.potion && run.potions.includes(null)) return { type: 'takePotion' };
      const choice = r.cards.findIndex((c) => !c.taken);
      if (choice >= 0) return { type: 'takeCard', reward: choice, option: 0 };
      return { type: 'proceed' };
    }
    case 'rest':
      if (s.done) return { type: 'proceed' };
      return run.hp < run.maxHp * 0.6 || selectableCards(content, run, 'upgrade').length === 0 ? { type: 'rest' } : { type: 'smith' };
    case 'shop': {
      const i = s.shop.cards.findIndex((c) => !c.sold && c.price <= run.gold);
      if (i >= 0) return { type: 'buy', kind: 'card', index: i };
      return { type: 'proceed' };
    }
    case 'event': {
      if (s.event.result !== null) return { type: 'proceed' };
      const scene = content.events[s.event.id]!.scenes[s.event.scene]!;
      const i = scene.choices.findIndex((c) => choiceAvailable(run, c.requires));
      return { type: 'eventChoice', index: Math.max(0, i) };
    }
    case 'cardSelect': {
      const eligible = selectableCards(content, run, s.purpose);
      return { type: 'selectCards', uids: eligible.slice(0, s.count).map((c) => c.uid) };
    }
    case 'gameOver':
      throw new Error('Run is over');
  }
}

export function botRun(content: Content, seed: string, difficulty = 0, maxCommands = 4000) {
  let run = createRun(content, { seed, characterId: 'rigger', difficulty }).run;
  const commands: RunCommand[] = [];
  while (run.phase === 'active' && commands.length < maxCommands) {
    const command = botRunCommand(content, run);
    const result = dispatchRun(content, run, command);
    if (result.error) throw new Error(`Bot run command ${JSON.stringify(command)} rejected on ${run.screen.type}: ${result.error}`);
    commands.push(command);
    run = result.run;
  }
  return { run, commands };
}
