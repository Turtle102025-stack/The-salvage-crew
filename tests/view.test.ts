/**
 * The battle screen animates by replaying engine events onto what's on
 * screen. This checks that the replay always ends exactly on the engine's
 * real state, for every command of many full fights.
 */
import { describe, expect, it } from 'vitest';
import { CONTENT, TEST_FIGHT_ENEMIES, TEST_FIGHT_EXTRA_CARDS } from '../src/content';
import { createCombat, dispatchCombat, setupFromSeed } from '../src/engine';
import { applyEvent, cardIndex, viewFromState } from '../src/ui/battle/view';
import { botCommand } from './helpers';

describe('battle view replay', () => {
  it('replaying each command’s events reproduces the next state exactly', () => {
    for (let i = 0; i < 60; i++) {
      const start = createCombat(
        CONTENT,
        setupFromSeed(CONTENT, {
          seed: `VIEW-${i}`,
          characterId: 'rigger',
          enemies: TEST_FIGHT_ENEMIES,
          extraCards: TEST_FIGHT_EXTRA_CARDS.map((id) => ({ id })),
        }),
      );
      let state = start.state;
      for (let step = 0; step < 300 && state.phase === 'player'; step++) {
        const result = dispatchCombat(CONTENT, state, botCommand(CONTENT, state));
        const view = viewFromState(state);
        const cards = cardIndex(state, result.state);
        for (const event of result.events) applyEvent(view, event, cards);
        const expected = viewFromState(result.state);
        // `acted` is a display-only flag; dead enemies may keep it.
        for (const e of view.enemies) delete e.acted;
        expect({ ...view, acting: 'player' }).toEqual(expected);
        state = result.state;
      }
    }
  });
});
