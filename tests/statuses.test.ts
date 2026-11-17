import { describe, expect, it } from 'vitest';
import { OVERHEAT_HP_LOSS } from '../src/content/statuses';
import { getIntent } from '../src/engine';
import { endTurn, eventsOf, play, setHand, startFight, TEST_CONTENT } from './helpers';

describe('Poison', () => {
  it('hits at the start of its owner’s turn, then drops by 1 each turn until gone', () => {
    const { state } = startFight({ enemies: ['dummy'] });
    setHand(state, ['t_poison']);
    let r = play(state, 't_poison', 'e0'); // 3 Poison
    const hpAfter: number[] = [];
    for (let i = 0; i < 4; i++) {
      r = endTurn(r.state);
      hpAfter.push(r.state.enemies[0]!.hp);
    }
    expect(hpAfter).toEqual([47, 45, 44, 44]); // 3, then 2, then 1, then nothing
    expect(r.state.enemies[0]!.statuses.poison).toBeUndefined();
  });

  it('can kill, which ends the fight in a victory', () => {
    const { state } = startFight({ enemies: ['dummy'] });
    state.enemies[0]!.hp = 2;
    setHand(state, ['t_poison']);
    const r = endTurn(play(state, 't_poison', 'e0').state);
    expect(r.state.phase).toBe('victory');
  });
});

describe('Weak and Vulnerable', () => {
  it("Weak on an enemy weakens its attack that turn, then wears off at the end of the enemy's turn", () => {
    const { state } = startFight({ enemies: ['hitter'] });
    setHand(state, ['t_weak']); // 2 Weak
    let r = endTurn(play(state, 't_weak', 'e0').state);
    expect(r.state.player.hp).toBe(72 - 7); // 10 × 0.75
    expect(r.state.enemies[0]!.statuses.weak).toBe(1);
    r = endTurn(r.state);
    expect(r.state.player.hp).toBe(72 - 14);
    expect(r.state.enemies[0]!.statuses.weak).toBeUndefined();
    r = endTurn(r.state);
    expect(r.state.player.hp).toBe(72 - 24); // back to full damage
  });

  it("debuffs an enemy puts on the player last through the player's next turn", () => {
    const { state } = startFight({ enemies: ['hexer', 'dummy'] });
    const r = endTurn(state); // Hexer applies 1 Vulnerable + 1 Weak to the player
    expect(r.state.player.statuses).toMatchObject({ vulnerable: 1, weak: 1 });
    setHand(r.state, ['t_strike']);
    const hit = play(r.state, 't_strike', 'e1');
    expect(eventsOf(hit.events, 'damage')[0]!.amount).toBe(7); // Weak player: 10 × 0.75
    const next = endTurn(hit.state);
    // Wore off at the end of the player's turn, then Hexer re-applied it.
    expect(eventsOf(next.events, 'status').filter((e) => e.target === 'player' && e.delta < 0)).toHaveLength(2);
    expect(next.state.player.statuses).toMatchObject({ vulnerable: 1, weak: 1 });
  });

  it('Vulnerable on an enemy makes attacks hit 50% harder', () => {
    const { state } = startFight({ enemies: ['dummy'] });
    setHand(state, ['t_vuln', 't_strike']);
    const r = play(play(state, 't_vuln', 'e0').state, 't_strike', 'e0');
    expect(r.state.enemies[0]!.hp).toBe(35);
  });
});

describe('Strength', () => {
  it('stacks and boosts every hit of a multi-hit attack', () => {
    const { state } = startFight({ enemies: ['dummy'] });
    setHand(state, ['t_str', 't_multi']);
    const r = play(play(state, 't_str').state, 't_multi', 'e0'); // (4 + 3) × 3
    expect(r.state.enemies[0]!.hp).toBe(29);
  });

  it("raises the damage shown in an enemy's intent", () => {
    const { state } = startFight({ enemies: ['hitter'] });
    expect(getIntent(TEST_CONTENT, state, state.enemies[0]!)).toMatchObject({ kinds: ['attack'], damage: 10, hits: 1 });
    state.enemies[0]!.statuses.strength = 3;
    state.player.statuses.vulnerable = 1;
    expect(getIntent(TEST_CONTENT, state, state.enemies[0]!)).toMatchObject({ damage: 19 }); // (10 + 3) × 1.5
  });
});

describe('Heat and Overheat (Thermal Lance)', () => {
  it('builds Heat for bigger hits, then Overheats at 10: lose HP, Heat resets, the hit does nothing', () => {
    const { state } = startFight({ enemies: ['dummy'] });
    state.energy = 10;
    setHand(state, ['thermal_lance', 'thermal_lance', 'thermal_lance', 'thermal_lance']);
    const damage: number[] = [];
    let s = state;
    for (let i = 0; i < 4; i++) {
      const r = play(s, 'thermal_lance', 'e0');
      damage.push(eventsOf(r.events, 'damage')[0]?.amount ?? -1);
      s = r.state;
    }
    expect(damage).toEqual([6, 12, 18, 0]);
    expect(s.player.statuses.heat).toBeUndefined();
    expect(s.player.hp).toBe(72 - OVERHEAT_HP_LOSS);
    expect(s.enemies[0]!.hp).toBe(50 - 36);
  });

  it('Vent Coolant turns Heat into Block and clears it', () => {
    const { state } = startFight();
    state.player.statuses.heat = 6;
    setHand(state, ['vent_coolant']);
    const r = play(state, 'vent_coolant');
    expect(r.state.player.block).toBe(18);
    expect(r.state.player.statuses.heat).toBeUndefined();
  });
});

describe('Magnetized and Scrap', () => {
  it('each attack hit on a Magnetized enemy gives 1 Scrap and uses up a stack', () => {
    const { state } = startFight({ enemies: ['dummy'] });
    setHand(state, ['mag_clamp', 't_multi']);
    let r = play(state, 'mag_clamp', 'e0');
    expect(r.state.player.statuses.scrap).toBeUndefined(); // its own hit lands before the clamp
    expect(r.state.enemies[0]!.statuses.magnetized).toBe(3);
    r = play(r.state, 't_multi', 'e0'); // 3 hits use up all 3 stacks
    expect(r.state.player.statuses.scrap).toBe(3);
    expect(r.state.enemies[0]!.statuses.magnetized).toBeUndefined();
  });

  it('Jury-Rig spends 2 Scrap for extra Block, and works without it', () => {
    const { state } = startFight();
    state.player.statuses.scrap = 3;
    setHand(state, ['jury_rig', 'jury_rig']);
    let r = play(state, 'jury_rig');
    expect(r.state.player.block).toBe(11);
    expect(r.state.player.statuses.scrap).toBe(1);
    r = play(r.state, 'jury_rig'); // only 1 Scrap left: no bonus
    expect(r.state.player.block).toBe(17);
    expect(r.state.player.statuses.scrap).toBe(1);
  });
});

describe('Powers', () => {
  it('Cutter Drone deals damage at the end of every turn and the card leaves play', () => {
    const { state } = startFight({ enemies: ['dummy'] });
    setHand(state, ['cutter_drone']);
    let r = play(state, 'cutter_drone');
    expect(r.state.player.statuses.cutter_drone).toBe(3);
    expect([...r.state.discard, ...r.state.exhaust, ...r.state.hand].some((c) => c.id === 'cutter_drone')).toBe(false);
    r = endTurn(r.state);
    r = endTurn(r.state);
    expect(r.state.enemies[0]!.hp).toBe(44);
  });

  it('playing a second copy stacks the power', () => {
    const { state } = startFight({ enemies: ['dummy'] });
    setHand(state, ['t_power', 't_power']);
    const r = endTurn(play(play(state, 't_power').state, 't_power').state);
    expect(r.state.enemies[0]!.hp).toBe(46); // 4 damage at the start of the next turn
  });
});

describe('status removal', () => {
  it('statuses that reach 0 are removed entirely', () => {
    const { state } = startFight({ enemies: ['dummy'] });
    state.enemies[0]!.statuses.vulnerable = 1;
    const r = endTurn(state);
    expect(r.state.enemies[0]!.statuses).toEqual({});
  });
});
