import { describe, expect, it } from 'vitest';
import { attackDamage, type Creature } from '../src/engine';
import { endTurn, eventsOf, play, setHand, startFight, TEST_CONTENT } from './helpers';

function creature(statuses: Record<string, number> = {}): Creature {
  return { id: 'x', side: 'enemy', defId: 'dummy', name: 'X', hp: 50, maxHp: 50, block: 0, statuses, dead: false };
}

describe('damage pipeline (attackDamage)', () => {
  const dmg = (base: number, attacker: Record<string, number>, defender: Record<string, number>) =>
    attackDamage(TEST_CONTENT, creature(attacker), creature(defender), base);

  it('passes base damage through unchanged', () => {
    expect(dmg(6, {}, {})).toBe(6);
  });

  it('adds Strength per stack, including negative Strength', () => {
    expect(dmg(6, { strength: 2 }, {})).toBe(8);
    expect(dmg(6, { strength: -2 }, {})).toBe(4);
    expect(dmg(2, { strength: -5 }, {})).toBe(0); // never below 0
  });

  it('Weak attacker deals 25% less, rounded down', () => {
    expect(dmg(10, { weak: 1 }, {})).toBe(7); // 7.5 → 7
    expect(dmg(10, { weak: 3 }, {})).toBe(7); // stacks are turns, not extra strength
  });

  it('Vulnerable defender takes 50% more, rounded down', () => {
    expect(dmg(10, {}, { vulnerable: 1 })).toBe(15);
    expect(dmg(7, {}, { vulnerable: 2 })).toBe(10); // 10.5 → 10
  });

  it('applies Strength, then Weak, then Vulnerable, then rounds once', () => {
    // (6 + 2) × 0.75 × 1.5 = 9
    expect(dmg(6, { strength: 2, weak: 1 }, { vulnerable: 1 })).toBe(9);
    // (5 + 0) × 0.75 × 1.5 = 5.625 → 5 (rounding once, not after each step)
    expect(dmg(5, { weak: 1 }, { vulnerable: 1 })).toBe(5);
  });
});

describe('damage in combat', () => {
  it('Block absorbs damage first, then HP takes the rest', () => {
    const { state } = startFight({ enemies: ['dummy'] });
    state.enemies[0]!.block = 4;
    setHand(state, ['t_strike']);
    const { state: after, events } = play(state, 't_strike', 'e0');
    const [hit] = eventsOf(events, 'damage');
    expect(hit).toMatchObject({ amount: 10, blocked: 4, hpLost: 6, attack: true });
    expect(after.enemies[0]!.block).toBe(0);
    expect(after.enemies[0]!.hp).toBe(44);
  });

  it('Breach makes attacks ignore Block', () => {
    const { state } = startFight({ enemies: ['dummy'] });
    state.enemies[0]!.block = 8;
    state.enemies[0]!.statuses.breach = 1;
    setHand(state, ['t_strike']);
    const { state: after } = play(state, 't_strike', 'e0');
    expect(after.enemies[0]!.hp).toBe(40);
    expect(after.enemies[0]!.block).toBe(8);
  });

  it('multi-hit attacks resolve as separate hits', () => {
    const { state } = startFight();
    state.enemies[0]!.block = 5;
    setHand(state, ['t_multi']);
    const { events, state: after } = play(state, 't_multi', 'e0');
    expect(eventsOf(events, 'damage').map((e) => [e.blocked, e.hpLost])).toEqual([[4, 0], [1, 3], [0, 4]]);
    expect(after.enemies[0]!.hp).toBe(43);
  });

  it('X-cost cards spend all Energy and scale with it', () => {
    const { state } = startFight();
    setHand(state, ['t_x']);
    const { state: after, events } = play(state, 't_x', 'e0');
    expect(after.energy).toBe(0);
    expect(eventsOf(events, 'damage')).toHaveLength(3);
    expect(after.enemies[0]!.hp).toBe(35);
  });

  it('attacks on ALL enemies hit each living enemy', () => {
    const { state } = startFight({ enemies: ['dummy', 'dummy', 'dummy'] });
    state.enemies[1]!.hp = 5;
    setHand(state, ['t_aoe', 't_aoe']);
    let result = play(state, 't_aoe');
    expect(result.state.enemies.map((e) => e.hp)).toEqual([42, 0, 42]);
    result = play(result.state, 't_aoe');
    expect(result.state.enemies.map((e) => e.hp)).toEqual([34, 0, 34]); // the dead one is skipped
  });

  it("the player's Block absorbs enemy attacks and resets at the start of the player's turn", () => {
    const { state } = startFight({ enemies: ['hitter'] });
    setHand(state, ['t_guard', 't_guard']);
    let r = play(state, 't_guard');
    r = play(r.state, 't_guard'); // 20 Block
    r = endTurn(r.state); // Hitter deals 10
    expect(r.state.player.hp).toBe(72);
    expect(r.state.player.block).toBe(0); // the leftover 10 Block is gone on the new turn
    expect(eventsOf(r.events, 'blockReset')).toEqual([{ type: 'blockReset', target: 'player', lost: 10 }]);
  });

  it("enemy Block lasts through the player's turn and resets at the start of the enemy's turn", () => {
    const { state } = startFight({ enemies: ['guard_bot'] });
    let r = endTurn(state); // Guard Bot gains 10 Block on its turn
    expect(r.state.enemies[0]!.block).toBe(10);
    r = endTurn(r.state); // its Block resets, then it guards again
    const resets = eventsOf(r.events, 'blockReset').filter((e) => e.target === 'e0');
    expect(resets).toHaveLength(1);
    expect(r.state.enemies[0]!.block).toBe(10);
  });
});
