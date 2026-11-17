import { describe, expect, it } from 'vitest';
import { dispatchCombat, MAX_HAND_SIZE, type CombatState } from '../src/engine';
import { endTurn, eventsOf, play, setHand, startFight, TEST_CONTENT } from './helpers';

const DECK_10 = ['t_strike', 't_strike', 't_strike', 't_strike', 't_strike', 't_guard', 't_guard', 't_guard', 't_guard', 't_guard'];

function allCards(s: CombatState) {
  return [...s.draw, ...s.hand, ...s.discard, ...s.exhaust, ...s.limbo];
}

describe('drawing and energy', () => {
  it('starts each turn with 3 Energy and 5 cards', () => {
    const { state } = startFight({ deck: DECK_10 });
    expect(state.energy).toBe(3);
    expect(state.hand).toHaveLength(5);
    expect(state.draw).toHaveLength(5);
    expect(state.turn).toBe(1);
  });

  it('playing a card costs Energy and moves it to the discard pile', () => {
    const { state } = startFight({ deck: DECK_10 });
    setHand(state, ['t_strike']);
    const r = play(state, 't_strike', 'e0');
    expect(r.state.energy).toBe(2);
    expect(r.state.hand).toHaveLength(0);
    expect(r.state.discard.map((c) => c.id)).toEqual(['t_strike']);
  });

  it('refuses a card you cannot afford, without changing anything', () => {
    const { state } = startFight({ deck: DECK_10 });
    setHand(state, ['t_big', 't_strike']);
    const afterStrike = play(state, 't_strike', 'e0').state; // 2 Energy left
    const before = JSON.stringify(afterStrike);
    const r = dispatchCombat(TEST_CONTENT, afterStrike, { type: 'playCard', uid: afterStrike.hand[0]!.uid, target: 'e0' });
    expect(r.error).toBe('Not enough Energy.');
    expect(r.events).toEqual([]);
    expect(JSON.stringify(r.state)).toBe(before);
  });

  it('refuses unplayable cards and targeted cards without a valid target', () => {
    const { state } = startFight({ deck: DECK_10, enemies: ['dummy', 'dummy'] });
    setHand(state, ['t_junk', 't_strike']);
    expect(dispatchCombat(TEST_CONTENT, state, { type: 'playCard', uid: state.hand[0]!.uid }).error).toBe('This card cannot be played.');
    expect(dispatchCombat(TEST_CONTENT, state, { type: 'playCard', uid: state.hand[1]!.uid }).error).toBe('Choose an enemy to target.');
    expect(dispatchCombat(TEST_CONTENT, state, { type: 'playCard', uid: state.hand[1]!.uid, target: 'player' }).error).toBe(
      'Choose an enemy to target.',
    );
  });

  it('auto-targets when only one enemy is left', () => {
    const { state } = startFight({ deck: DECK_10, enemies: ['dummy'] });
    setHand(state, ['t_strike']);
    const r = dispatchCombat(TEST_CONTENT, state, { type: 'playCard', uid: state.hand[0]!.uid });
    expect(r.error).toBeUndefined();
    expect(r.state.enemies[0]!.hp).toBe(40);
  });

  it('Energy does not carry over between turns', () => {
    const { state } = startFight({ deck: DECK_10 });
    setHand(state, ['t_energy']);
    const r = endTurn(play(state, 't_energy').state); // 5 Energy, unspent
    expect(r.state.energy).toBe(3);
  });

  it('never mutates the state it was given', () => {
    const { state } = startFight({ deck: DECK_10 });
    const snapshot = JSON.stringify(state);
    dispatchCombat(TEST_CONTENT, state, { type: 'playCard', uid: state.hand[0]!.uid, target: 'e0' });
    dispatchCombat(TEST_CONTENT, state, { type: 'endTurn' });
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe('deck cycling', () => {
  it('discards the hand at end of turn and draws a fresh 5', () => {
    const { state } = startFight({ deck: DECK_10 });
    const firstHand = state.hand.map((c) => c.uid).sort();
    const r = endTurn(state);
    expect(r.state.discard.map((c) => c.uid).sort()).toEqual(firstHand);
    expect(r.state.hand).toHaveLength(5);
    expect(r.state.draw).toHaveLength(0);
  });

  it('shuffles the discard pile into the draw pile when it runs out', () => {
    const { state } = startFight({ deck: DECK_10 });
    let r = endTurn(state); // draws the last 5: draw pile now empty
    expect(r.state.draw).toHaveLength(0);
    r = endTurn(r.state); // all 10 cards are in the discard pile: reshuffle them
    const shuffles = eventsOf(r.events, 'shuffle');
    expect(shuffles).toEqual([{ type: 'shuffle', count: 10 }]);
    expect(r.state.hand).toHaveLength(5);
    expect(r.state.draw).toHaveLength(5);
    expect(r.state.discard).toHaveLength(0);
  });

  it('draws as many as possible when both piles are empty', () => {
    const { state } = startFight({ deck: DECK_10 });
    setHand(state, ['t_draw2']);
    state.draw = [];
    state.discard = [];
    const r = play(state, 't_draw2');
    expect(r.state.hand).toHaveLength(0);
    expect(eventsOf(r.events, 'draw')).toHaveLength(0);
  });

  it(`stops drawing at ${MAX_HAND_SIZE} cards in hand`, () => {
    const { state } = startFight({ deck: Array(20).fill('t_strike') });
    setHand(state, [...Array(9).fill('t_strike'), 't_draw2']);
    const r = play(state, 't_draw2'); // 9 in hand after playing, room for 1
    expect(r.state.hand).toHaveLength(MAX_HAND_SIZE);
    expect(eventsOf(r.events, 'handFull')).toHaveLength(1);
  });

  it('no card is ever lost or duplicated over a long fight', () => {
    const { state } = startFight({ deck: [...DECK_10, 't_draw2', 't_exhaust', 't_ethereal'], enemies: ['guard_bot'] });
    state.enemies[0]!.hp = state.enemies[0]!.maxHp = 9999; // keep the fight going
    let s = state;
    const uids = allCards(s)
      .map((c) => c.uid)
      .sort((a, b) => a - b);
    for (let turn = 0; turn < 12; turn++) {
      for (const card of [...s.hand]) {
        const r = dispatchCombat(TEST_CONTENT, s, { type: 'playCard', uid: card.uid, target: 'e0' });
        if (!r.error) s = r.state;
      }
      s = endTurn(s).state;
      expect(allCards(s).map((c) => c.uid).sort((a, b) => a - b)).toEqual(uids);
    }
  });
});

describe('card keywords', () => {
  it('Exhaust cards go to the exhaust pile when played', () => {
    const { state } = startFight();
    setHand(state, ['t_exhaust']);
    const r = play(state, 't_exhaust');
    expect(r.state.exhaust.map((c) => c.id)).toEqual(['t_exhaust']);
    expect(r.state.discard).toHaveLength(0);
  });

  it('Ethereal cards are exhausted if still in hand at end of turn', () => {
    const { state } = startFight();
    setHand(state, ['t_ethereal', 't_strike']);
    const r = endTurn(state);
    expect(r.state.exhaust.map((c) => c.id)).toEqual(['t_ethereal']);
  });

  it('Retain cards stay in hand at end of turn', () => {
    const { state } = startFight();
    setHand(state, ['t_retain', 't_strike']);
    const r = endTurn(state);
    expect(r.state.hand.map((c) => c.id)).toContain('t_retain');
    expect(r.state.hand).toHaveLength(6);
  });

  it('Innate cards are always in the opening hand', () => {
    for (const seed of ['A', 'B', 'C', 'D', 'E']) {
      const { state } = startFight({ seed, deck: [...Array(15).fill('t_strike'), 't_innate'] });
      expect(state.hand.map((c) => c.id)).toContain('t_innate');
    }
  });

  it('upgraded cards use their upgraded numbers', () => {
    const { state } = startFight();
    setHand(state, ['t_strike'], true);
    expect(play(state, 't_strike', 'e0').state.enemies[0]!.hp).toBe(35);
  });
});
