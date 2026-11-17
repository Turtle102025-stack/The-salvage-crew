import { describe, expect, it } from 'vitest';
import { CONTENT, TEST_FIGHT_ENEMIES, TEST_FIGHT_EXTRA_CARDS } from '../src/content';
import { chooseMove, createCombat, createRng, describeCard, dispatchCombat, getIntent, setupFromSeed } from '../src/engine';
import { endTurn, eventsOf, play, setHand, startFight, TEST_CONTENT } from './helpers';

describe('turn flow', () => {
  it('opens with intents chosen, relics fired and a hand drawn, in that order', () => {
    const { events } = startFight({ relics: ['lucky_wrench'] });
    const types = events.map((e) => e.type);
    expect(types[0]).toBe('combatStart');
    expect(types.indexOf('intent')).toBeLessThan(types.indexOf('trigger'));
    expect(types.indexOf('trigger')).toBeLessThan(types.indexOf('turnStart'));
    expect(types.indexOf('turnStart')).toBeLessThan(types.indexOf('draw'));
  });

  it('runs the whole enemy turn and hands control back on a new player turn', () => {
    const { state } = startFight({ enemies: ['hitter', 'hitter'] });
    const r = endTurn(state);
    expect(eventsOf(r.events, 'enemyMove').map((e) => e.enemy)).toEqual(['e0', 'e1']);
    expect(r.state.player.hp).toBe(52);
    expect(r.state.turn).toBe(2);
    expect(r.state.phase).toBe('player');
    expect(eventsOf(r.events, 'intent')).toHaveLength(2);
  });

  it('dead enemies do not act', () => {
    const { state } = startFight({ enemies: ['hitter', 'hitter'] });
    state.enemies[0]!.hp = 20;
    setHand(state, ['t_big']);
    const r = endTurn(play(state, 't_big', 'e0').state);
    expect(eventsOf(r.events, 'enemyMove').map((e) => e.enemy)).toEqual(['e1']);
    expect(getIntent(TEST_CONTENT, r.state, r.state.enemies[0]!)).toBeUndefined();
  });

  it('ends in defeat when the player hits 0 HP, and then refuses commands', () => {
    const { state } = startFight({ enemies: ['hitter'], hp: 8 });
    const r = endTurn(state);
    expect(r.state.phase).toBe('defeat');
    expect(r.state.player.hp).toBe(0);
    expect(r.events.at(-1)).toEqual({ type: 'defeat' });
    expect(dispatchCombat(TEST_CONTENT, r.state, { type: 'endTurn' }).error).toBe('The fight is over.');
  });

  it('ends in victory when every enemy is dead', () => {
    const { state } = startFight({ enemies: ['dummy', 'dummy'] });
    state.enemies[0]!.hp = 5;
    state.enemies[1]!.hp = 5;
    setHand(state, ['t_aoe']);
    const r = play(state, 't_aoe');
    expect(r.state.phase).toBe('victory');
    expect(eventsOf(r.events, 'death')).toHaveLength(2);
    expect(r.state.discard.map((c) => c.id)).toContain('t_aoe');
  });

  it('tracks turns, cards played and damage taken', () => {
    const { state } = startFight({ enemies: ['hitter'] });
    setHand(state, ['t_strike']);
    const r = endTurn(endTurn(play(state, 't_strike', 'e0').state).state);
    expect(r.state.stats).toEqual({ turns: 3, cardsPlayed: 1, damageTaken: 20, damageDealt: 10, potionsUsed: 0 });
  });
});

describe('enemy AI', () => {
  it('uses opening moves first, then never repeats beyond maxInARow', () => {
    const def = TEST_CONTENT.enemies.opener!;
    const rng = createRng('AI', 'enemyAI');
    const history: string[] = [];
    for (let i = 0; i < 200; i++) history.push(chooseMove(def, history, rng));
    expect(history.slice(0, 2)).toEqual(['c', 'b']);
    for (let i = 3; i < history.length; i++) expect(history[i]).not.toBe(history[i - 1]);
    expect(new Set(history.slice(2))).toEqual(new Set(['a', 'b']));
  });

  it('shows intents with the right icons', () => {
    const start = createCombat(
      CONTENT,
      setupFromSeed(CONTENT, { seed: 'INTENTS', characterId: 'rigger', enemies: ['rust_lamprey'] }),
    );
    expect(getIntent(CONTENT, start.state, start.state.enemies[0]!)).toMatchObject({ name: 'Corrode', kinds: ['debuff'], statuses: ['poison'] });
  });
});

describe('card text', () => {
  const text = (id: string, upgraded = false) => describeCard(CONTENT, CONTENT.cards[id]!, upgraded);

  it('is generated from the effects, including upgrades', () => {
    expect(text('pry_bar')).toBe('Deal 6 damage.');
    expect(text('pry_bar', true)).toBe('Deal 9 damage.');
    expect(text('strip_for_parts')).toBe('Deal 5 damage. Gain 2 Scrap.');
    expect(text('jury_rig')).toBe('Gain 6 Block. Spend 2 Scrap: gain 6 more Block.');
    expect(text('thermal_lance')).toBe('Gain 3 Heat. Deal damage equal to twice your Heat.');
    expect(text('thermal_lance', true)).toBe('Gain 3 Heat. Deal damage equal to 3× your Heat.');
    expect(text('cutter_drone')).toBe('At the end of your turn, deal 3 damage to a random enemy.');
  });

  it('includes keywords', () => {
    expect(describeCard(TEST_CONTENT, TEST_CONTENT.cards.t_exhaust!, false)).toBe('Gain 1 Block. Exhaust.');
    expect(describeCard(TEST_CONTENT, TEST_CONTENT.cards.t_ethereal!, false)).toBe('Ethereal. Gain 1 Block.');
    expect(describeCard(TEST_CONTENT, TEST_CONTENT.cards.t_junk!, false)).toBe('Unplayable.');
    expect(describeCard(TEST_CONTENT, TEST_CONTENT.cards.t_aoe!, false)).toBe('Deal 8 damage to ALL enemies.');
    expect(describeCard(TEST_CONTENT, TEST_CONTENT.cards.t_multi!, false)).toBe('Deal 4 damage 3 times.');
  });
});

describe('the Phase 3 test fight', () => {
  it('sets up Juno with her starter deck, sampler cards and Lucky Wrench', () => {
    const { state } = createCombat(
      CONTENT,
      setupFromSeed(CONTENT, {
        seed: '7KQ2-M9XA',
        characterId: 'rigger',
        enemies: TEST_FIGHT_ENEMIES,
        extraCards: TEST_FIGHT_EXTRA_CARDS.map((id) => ({ id })),
      }),
    );
    expect(state.player).toMatchObject({ name: 'Juno Kade', hp: 72, maxHp: 72 });
    expect(state.player.statuses.scrap).toBe(2);
    expect(state.hand.length + state.draw.length).toBe(16);
    expect(state.enemies.map((e) => e.name)).toEqual(['Scrap Mite', 'Rust Lamprey', 'Scrap Mite']);
  });
});
