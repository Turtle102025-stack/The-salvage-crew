import { describe, expect, it } from 'vitest';
import { block, spend, attack } from '../src/engine/effects/builders';
import { defineCards, describeRelic, type Content } from '../src/engine';
import { CONTENT } from '../src/content';
import { endTurn, eventsOf, play, setHand, startFight, TEST_CONTENT } from './helpers';

describe('relics', () => {
  it('Lucky Wrench gives 2 Scrap at the start of each combat', () => {
    const { state, events } = startFight({ relics: ['lucky_wrench'] });
    expect(state.player.statuses.scrap).toBe(2);
    expect(eventsOf(events, 'trigger')).toContainEqual({ type: 'trigger', source: { kind: 'relic', id: 'lucky_wrench' } });
  });

  it('describes itself from its hooks', () => {
    expect(describeRelic(CONTENT, CONTENT.relics.lucky_wrench!)).toBe('At the start of each combat, gain 2 Scrap.');
    expect(describeRelic(TEST_CONTENT, TEST_CONTENT.relics.t_attack_relic!)).toBe('Whenever you play an Attack, gain 1 Block.');
  });

  it('a "whenever you play an Attack" relic ignores Skills', () => {
    const { state } = startFight({ relics: ['t_attack_relic'] });
    setHand(state, ['t_strike', 't_guard']);
    let r = play(state, 't_strike', 'e0');
    expect(r.state.player.block).toBe(1);
    r = play(r.state, 't_guard');
    expect(r.state.player.block).toBe(11);
  });

  it('turn-start relics fire every turn', () => {
    const { state } = startFight({ relics: ['t_turn_relic'] });
    expect(state.player.statuses.strength).toBe(1);
    const r = endTurn(endTurn(state).state);
    expect(r.state.player.statuses.strength).toBe(3);
  });

  it('end-of-combat relics fire once when the last enemy dies', () => {
    const { state } = startFight({ relics: ['t_end_relic'], hp: 50 });
    state.enemies[0]!.hp = 5;
    setHand(state, ['t_strike']);
    const r = play(state, 't_strike', 'e0');
    expect(r.state.phase).toBe('victory');
    expect(r.state.player.hp).toBe(55);
    expect(r.events.at(-1)).toEqual({ type: 'victory' });
  });
});

describe('hook order and timing', () => {
  it('fires relics before the player’s own statuses', () => {
    const { state } = startFight({ relics: ['t_turn_relic'] });
    state.player.statuses.t_power_status = 1;
    const r = endTurn(state);
    const triggers = eventsOf(r.events, 'trigger').map((t) => (t.source.kind === 'relic' || t.source.kind === 'status' ? t.source.id : ''));
    expect(triggers.indexOf('t_turn_relic')).toBeLessThan(triggers.indexOf('t_power_status'));
  });

  it('reactions resolve immediately after their cause, before the card’s next effect', () => {
    // Hit a Magnetized enemy (gives 1 Scrap as a reaction), then spend 1 Scrap.
    // This only works if the Scrap arrives before the spend resolves.
    const cards = defineCards('test', {
      t_combo: {
        name: 'Combo',
        type: 'attack',
        rarity: 'common',
        cost: 1,
        effects: [attack(3), spend('scrap', 1, [block(7)])],
        upgrade: { cost: 0 },
      },
    });
    const content: Content = { ...TEST_CONTENT, cards: { ...TEST_CONTENT.cards, ...cards } };
    const { state } = startFight();
    state.enemies[0]!.statuses.magnetized = 1;
    setHand(state, ['t_combo']);
    const r = play(state, 't_combo', 'e0', content);
    expect(r.state.player.block).toBe(7);
    expect(r.state.player.statuses.scrap).toBeUndefined();
    const order = r.events
      .filter((e) => e.type === 'damage' || e.type === 'status' || e.type === 'block')
      .map((e) => (e.type === 'status' ? `${e.status}${e.delta > 0 ? '+' : ''}${e.delta}` : e.type));
    expect(order).toEqual(['damage', 'scrap+1', 'magnetized-1', 'scrap-1', 'block']);
  });

  it('a hook that kills the last enemy ends the fight immediately', () => {
    const { state } = startFight({ enemies: ['dummy'] });
    state.enemies[0]!.hp = 3;
    state.player.statuses.cutter_drone = 5;
    const r = endTurn(state);
    expect(r.state.phase).toBe('victory');
    expect(r.events.some((e) => e.type === 'enemyMove')).toBe(false);
  });
});
