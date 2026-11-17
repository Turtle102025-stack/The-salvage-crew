import { describe, expect, it } from 'vitest';
import { CONTENT } from '../src/content';
import {
  createRun,
  currentPotions,
  deserializeRun,
  dispatchRun,
  serializeRun,
  type Content,
  type RunCommand,
  type RunState,
} from '../src/engine';
import { botRun, botRunCommand } from './helpers';

const newRun = (seed = 'RUN-TEST', difficulty = 0) => createRun(CONTENT, { seed, characterId: 'rigger', difficulty }).run;

function send(run: RunState, command: RunCommand, content: Content = CONTENT): RunState {
  const r = dispatchRun(content, run, command);
  if (r.error) throw new Error(r.error);
  return r.run;
}

/** Jump straight to a node of the given type (test setup only). */
function goTo(run: RunState, type: string): RunState {
  const node = Object.values(run.map.nodes).find((n) => n.type === type)!;
  const r = { ...run, screen: { type: 'map' as const } };
  r.position = Object.values(r.map.nodes).find((n) => n.next.includes(node.id))?.id ?? null;
  return send(r, { type: 'chooseNode', node: node.id });
}

describe('starting a run', () => {
  it('sets Juno up with her starter deck, relic, Credits and 3 empty Canister slots', () => {
    const run = newRun();
    expect(run.hp).toBe(72);
    expect(run.deck).toHaveLength(10);
    expect(run.relics).toEqual(['lucky_wrench']);
    expect(run.gold).toBe(99);
    expect(run.potions).toEqual([null, null, null]);
    expect(run.screen).toEqual({ type: 'actIntro', act: 1 });
  });

  it('only lets you move to reachable nodes', () => {
    let run = send(newRun(), { type: 'proceed' });
    expect(dispatchRun(CONTENT, run, { type: 'chooseNode', node: 'boss' }).error).toBeDefined();
    const first = Object.values(run.map.nodes).find((n) => n.floor === 1)!;
    run = send(run, { type: 'chooseNode', node: first.id });
    expect(run.screen.type).toBe('combat');
    expect(run.floor).toBe(1);
  });
});

describe('whole runs (bot)', () => {
  it('always finish, in a win or a loss', () => {
    for (let i = 0; i < 25; i++) {
      const { run } = botRun(CONTENT, `BOT-RUN-${i}`);
      expect(run.phase).not.toBe('active');
      expect(run.stats.floorsClimbed).toBeGreaterThan(0);
      expect(run.stats.fights.length).toBeGreaterThan(0);
    }
  });

  it('the same seed and choices give the identical run', () => {
    const a = botRun(CONTENT, 'SAME-RUN');
    const b = botRun(CONTENT, 'SAME-RUN');
    expect(b.commands).toEqual(a.commands);
    expect(b.run).toEqual(a.run);
  });

  it('different seeds give different maps', () => {
    expect(newRun('AAAA').map).not.toEqual(newRun('BBBB').map);
  });

  it('saving and loading after every command changes nothing', () => {
    const reference = botRun(CONTENT, 'SAVE-RUN');
    let run = newRun('SAVE-RUN');
    for (const command of reference.commands) {
      run = deserializeRun(serializeRun(run));
      run = send(run, command);
    }
    expect(run).toEqual(reference.run);
  });

  it('never mutates the run it was given', () => {
    const run = newRun();
    const before = JSON.stringify(run);
    dispatchRun(CONTENT, run, botRunCommand(CONTENT, run));
    expect(JSON.stringify(run)).toBe(before);
  });
});

describe('rewards', () => {
  function winFirstFight(seed = 'REWARD') {
    let run = send(newRun(seed), { type: 'proceed' });
    run = send(run, { type: 'chooseNode', node: Object.values(run.map.nodes).find((n) => n.floor === 1)!.id });
    while (run.screen.type === 'combat') run = send(run, botRunCommand(CONTENT, run));
    return run;
  }

  it('gives Credits and a choice of 3 different Rigger cards after a fight', () => {
    const run = winFirstFight();
    expect(run.screen.type).toBe('reward');
    if (run.screen.type !== 'reward') return;
    const { reward } = run.screen;
    expect(reward.gold).toBeGreaterThanOrEqual(10);
    expect(reward.gold).toBeLessThanOrEqual(20);
    const ids = reward.cards[0]!.options.map((o) => o.id);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(CONTENT.cards[id]!.character).toBe('rigger');
  });

  it('taking a card adds it to the deck and records the pick', () => {
    let run = winFirstFight();
    const option = run.screen.type === 'reward' ? run.screen.reward.cards[0]!.options[1]! : null;
    run = send(run, { type: 'takeCard', reward: 0, option: 1 });
    expect(run.deck.at(-1)!.id).toBe(option!.id);
    expect(run.stats.picks.at(-1)!.picked).toBe(option!.id);
    expect(dispatchRun(CONTENT, run, { type: 'takeCard', reward: 0, option: 0 }).error).toBeDefined();
  });

  it('skipping records a skip; proceeding returns to the map', () => {
    let run = winFirstFight();
    run = send(run, { type: 'skipCard', reward: 0 });
    expect(run.stats.picks.at(-1)!.picked).toBeNull();
    run = send(run, { type: 'proceed' });
    expect(run.screen.type).toBe('map');
  });
});

describe('rest stops', () => {
  it('Rest heals 30% of max HP', () => {
    let run = goTo(newRun(), 'rest');
    run.hp = 30;
    run = send(run, { type: 'rest' });
    expect(run.hp).toBe(30 + Math.round(72 * 0.3));
    expect(dispatchRun(CONTENT, run, { type: 'rest' }).error).toBeDefined();
  });

  it('Tinker upgrades the chosen card, and can be cancelled', () => {
    let run = goTo(newRun(), 'rest');
    run = send(run, { type: 'smith' });
    expect(run.screen.type).toBe('cardSelect');
    const back = send(run, { type: 'cancelSelect' });
    expect(back.screen).toEqual({ type: 'rest', done: false });
    const uid = run.deck[0]!.uid;
    run = send(run, { type: 'selectCards', uids: [uid] });
    expect(run.deck[0]!.upgraded).toBe(true);
    expect(run.screen).toMatchObject({ type: 'rest', done: true });
  });
});

describe('the Trader', () => {
  it('sells cards, relics and Canisters for Credits', () => {
    let run = goTo(newRun('SHOP-1'), 'shop');
    if (run.screen.type !== 'shop') throw new Error('not a shop');
    run.gold = 1000;
    const card = run.screen.shop.cards[0]!;
    const deckSize = run.deck.length;
    run = send(run, { type: 'buy', kind: 'card', index: 0 });
    expect(run.deck).toHaveLength(deckSize + 1);
    expect(run.gold).toBe(1000 - card.price);
    expect(dispatchRun(CONTENT, run, { type: 'buy', kind: 'card', index: 0 }).error).toBe('Sold out.');
    run = send(run, { type: 'buy', kind: 'potion', index: 0 });
    expect(run.potions.filter(Boolean)).toHaveLength(1);
    const relicCount = run.relics.length;
    run = send(run, { type: 'buy', kind: 'relic', index: 0 });
    expect(run.relics.length).toBe(relicCount + 1);
  });

  it('refuses purchases you cannot afford', () => {
    const run = goTo(newRun('SHOP-2'), 'shop');
    run.gold = 0;
    expect(dispatchRun(CONTENT, run, { type: 'buy', kind: 'card', index: 0 }).error).toBe('Not enough Credits.');
  });

  it('removes one card per visit, for a price that goes up each time', () => {
    let run = goTo(newRun('SHOP-3'), 'shop');
    run.gold = 500;
    run = send(run, { type: 'removeCard' });
    run = send(run, { type: 'selectCards', uids: [run.deck[0]!.uid] });
    expect(run.deck).toHaveLength(9);
    expect(run.gold).toBe(425);
    expect(run.screen.type).toBe('shop');
    expect(dispatchRun(CONTENT, run, { type: 'removeCard' }).error).toBeDefined();
    expect(run.counters.removals).toBe(1);
  });
});

describe('events (Signals)', () => {
  function atEvent(id: string, run = newRun()): RunState {
    return { ...run, screen: { type: 'event', event: { id, scene: 'start', result: null, outcome: [] } } };
  }

  it('applies a choice and shows its outcome', () => {
    let run = atEvent('escape_pod');
    run = send(run, { type: 'eventChoice', index: 1 });
    expect(run.gold).toBe(99 + 35);
    expect(run.screen.type === 'event' && run.screen.event.outcome).toEqual(['Gained 35 Credits.']);
    run = send(run, { type: 'proceed' });
    expect(run.screen.type).toBe('map');
  });

  it('enforces requirements', () => {
    const run = atEvent('vending_machine');
    run.gold = 10;
    expect(dispatchRun(CONTENT, run, { type: 'eventChoice', index: 0 }).error).toBeDefined();
  });

  it('can ask you to pick a card, then return to the event', () => {
    let run = atEvent('union_rep');
    run = send(run, { type: 'eventChoice', index: 0 });
    expect(run.screen).toMatchObject({ type: 'cardSelect', purpose: 'upgrade', optional: false });
    run = send(run, { type: 'selectCards', uids: [run.deck[3]!.uid] });
    expect(run.deck[3]!.upgraded).toBe(true);
    expect(run.screen.type).toBe('event');
  });

  it('can add a curse', () => {
    const run = send(atEvent('union_rep'), { type: 'eventChoice', index: 1 });
    expect(run.deck.at(-1)!.id).toBe('paperwork');
    expect(run.gold).toBe(159);
  });
});

describe('Canisters (potions)', () => {
  it('can be used in a fight and leave their slot', () => {
    let run = send(newRun('POTION'), { type: 'proceed' });
    run.potions = ['shield_foam', null, null];
    run = send(run, { type: 'chooseNode', node: Object.values(run.map.nodes).find((n) => n.floor === 1)!.id });
    run = send(run, { type: 'usePotion', slot: 0 });
    expect(run.screen.type === 'combat' && run.screen.combat.player.block).toBe(12);
    expect(currentPotions(run)).toEqual([null, null, null]);
  });

  it('healing Canisters also work on the map; others refuse', () => {
    let run = send(newRun(), { type: 'proceed' });
    run.hp = 40;
    run.potions = ['repair_gel', 'shield_foam', null];
    run = send(run, { type: 'usePotion', slot: 0 });
    expect(run.hp).toBe(52);
    expect(dispatchRun(CONTENT, run, { type: 'usePotion', slot: 1 }).error).toMatch(/only works in a fight/);
    run = send(run, { type: 'discardPotion', slot: 1 });
    expect(run.potions).toEqual([null, null, null]);
  });
});

describe('relics with run effects', () => {
  it('apply on pickup: max HP, Canister slots', () => {
    let run = newRun();
    run = { ...run, screen: { type: 'reward', node: 'elite', reward: { gold: null, cards: [], potion: null, relic: 'hazard_vest', bossRelics: null } } };
    run = send(run, { type: 'takeRelic' });
    expect(run.maxHp).toBe(80);
    expect(run.hp).toBe(80);
    run = { ...run, screen: { type: 'reward', node: 'elite', reward: { gold: null, cards: [], potion: null, relic: 'tool_belt', bossRelics: null } } };
    run = send(run, { type: 'takeRelic' });
    expect(run.potions).toHaveLength(4);
  });
});

describe('edge cases', () => {
  it('a fight that ends before the first turn is resolved straight away', () => {
    let run = send(newRun('EDGE'), { type: 'proceed' });
    run.hp = 3;
    run.relics.push('overclocked_reactor'); // lose 4 HP at the start of each combat
    run = send(run, { type: 'chooseNode', node: Object.values(run.map.nodes).find((n) => n.floor === 1)!.id });
    expect(run.phase).toBe('lost');
    expect(run.screen).toEqual({ type: 'gameOver', won: false });
  });
});

describe('difficulty (Hazard levels)', () => {
  it('Hazard 4 starts with less max HP', () => {
    expect(newRun('HZ', 4).maxHp).toBe(66);
  });

  it('Hazard 2 rests for less', () => {
    let run = goTo(newRun('HZ2', 2), 'rest');
    run.hp = 10;
    run = send(run, { type: 'rest' });
    expect(run.hp).toBe(10 + Math.round(72 * 0.25));
  });
});

describe('acts', () => {
  it('beating a boss starts the next act with healing and a new map', () => {
    const twoActs: Content = { ...CONTENT, acts: [CONTENT.acts[0]!, { ...CONTENT.acts[0]!, id: 2, name: 'Act Two' }] };
    let run = createRun(twoActs, { seed: 'ACTS', characterId: 'rigger' }).run;
    run = { ...run, hp: 30, screen: { type: 'reward', node: 'boss', reward: { gold: null, cards: [], potion: null, relic: null, bossRelics: null } } };
    const oldMap = run.map;
    run = send(run, { type: 'proceed' }, twoActs);
    expect(run.act).toBe(2);
    expect(run.screen).toEqual({ type: 'actIntro', act: 2 });
    expect(run.map).not.toEqual(oldMap);
    expect(run.hp).toBe(30 + Math.round((72 - 30) * 0.75));
  });

  it('beating the last boss wins the run', () => {
    let run = newRun();
    run = { ...run, act: 3, screen: { type: 'reward', node: 'boss', reward: { gold: null, cards: [], potion: null, relic: null, bossRelics: null } } };
    run = send(run, { type: 'proceed' });
    expect(run.phase).toBe('won');
    expect(run.screen).toEqual({ type: 'gameOver', won: true });
  });
});
