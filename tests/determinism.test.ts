/**
 * Same seed + same commands ⇒ exactly the same fight. Also: saving mid-fight
 * and loading changes nothing, and bot-played fights always finish.
 */
import { describe, expect, it } from 'vitest';
import { CONTENT, TEST_FIGHT_ENEMIES, TEST_FIGHT_EXTRA_CARDS } from '../src/content';
import { createCombat, deserializeCombat, dispatchCombat, serializeCombat, setupFromSeed } from '../src/engine';
import { botCommand, botFight } from './helpers';

const testFight = (seed: string) =>
  createCombat(
    CONTENT,
    setupFromSeed(CONTENT, {
      seed,
      characterId: 'rigger',
      enemies: TEST_FIGHT_ENEMIES,
      extraCards: TEST_FIGHT_EXTRA_CARDS.map((id) => ({ id })),
    }),
  );

describe('determinism', () => {
  it('the same seed and the same commands give an identical fight', () => {
    const a = botFight(CONTENT, testFight('SAME-SEED'));
    const b = botFight(CONTENT, testFight('SAME-SEED'));
    expect(b.commands).toEqual(a.commands);
    expect(b.events).toEqual(a.events);
    expect(b.state).toEqual(a.state);
  });

  it('replaying recorded commands reproduces the fight exactly', () => {
    const original = botFight(CONTENT, testFight('REPLAY'));
    let state = testFight('REPLAY').state;
    for (const command of original.commands) state = dispatchCombat(CONTENT, state, command).state;
    expect(state).toEqual(original.state);
  });

  it('different seeds give different fights', () => {
    const logs = ['SEED-AAAA', 'SEED-BBBB', 'SEED-CCCC'].map((s) => JSON.stringify(testFight(s).state.hand));
    expect(new Set(logs).size).toBeGreaterThan(1);
  });

  it('saving and loading mid-fight changes nothing', () => {
    const uninterrupted = botFight(CONTENT, testFight('SAVE-LOAD'));
    let state = testFight('SAVE-LOAD').state;
    uninterrupted.commands.forEach((command, i) => {
      if (i % 3 === 0) state = deserializeCombat(serializeCombat(state)); // save + reload every few moves
      state = dispatchCombat(CONTENT, state, command).state;
    });
    expect(state).toEqual(uninterrupted.state);
  });

  it('refuses saves from an unknown version', () => {
    const json = JSON.stringify({ ...testFight('V').state, version: 99 });
    expect(() => deserializeCombat(json)).toThrow(/version/);
  });
});

describe('bot-played fights', () => {
  it('always finish, conserve cards and keep HP in range over 200 seeds', () => {
    let wins = 0;
    for (let i = 0; i < 200; i++) {
      const start = testFight(`BOT-${i}`);
      const deckSize = start.state.draw.length + start.state.hand.length;
      const { state, commands } = botFight(CONTENT, start);
      expect(state.phase).not.toBe('player');
      expect(commands.length).toBeLessThan(500);
      expect(state.player.hp).toBeGreaterThanOrEqual(0);
      expect(state.player.hp).toBeLessThanOrEqual(state.player.maxHp);
      const powersPlayed = TEST_FIGHT_EXTRA_CARDS.filter((id) => CONTENT.cards[id]?.type === 'power').length;
      const cards = state.draw.length + state.hand.length + state.discard.length + state.exhaust.length;
      expect(cards).toBeGreaterThanOrEqual(deckSize - powersPlayed);
      expect(cards).toBeLessThanOrEqual(deckSize);
      if (state.phase === 'victory') wins++;
    }
    // A sanity bound, not a balance target: the test fight should be winnable.
    expect(wins).toBeGreaterThan(100);
  });

  it('the bot only ever issues commands the engine accepts', () => {
    let { state } = testFight('LEGAL');
    for (let i = 0; i < 100 && state.phase === 'player'; i++) {
      const result = dispatchCombat(CONTENT, state, botCommand(CONTENT, state));
      expect(result.error).toBeUndefined();
      state = result.state;
    }
  });
});
