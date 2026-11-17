import { describe, expect, it } from 'vitest';
import { CONTENT } from '../src/content';
import { cardPower, chooseCombatCommand, scoreCombat } from '../sim/ai';
import { buildReport, formatReport, simulateRun } from '../sim/simulate';
import { createCombat, setupFromSeed } from '../src/engine';

describe('balance simulator', () => {
  it('plays whole runs to the end without illegal moves, deterministically', () => {
    const a = simulateRun(CONTENT, 'SIM-TEST-1');
    const b = simulateRun(CONTENT, 'SIM-TEST-1');
    expect(a).toEqual(b);
    expect(a.floorsClimbed).toBeGreaterThan(0);
  });

  it('builds a report with win rates, damage per fight and card/relic stats', () => {
    const records = Array.from({ length: 12 }, (_, i) => simulateRun(CONTENT, `SIM-REPORT-${i}`));
    const report = buildReport(CONTENT, records);
    expect(report.runs).toBe(12);
    expect(report.actStats[0]!.started).toBe(12);
    expect(report.avgDamagePerFight).toBeGreaterThan(0);
    expect(report.cards.length).toBeGreaterThan(30);
    expect(report.relics.length).toBeGreaterThan(10);
    const md = formatReport(report);
    expect(md).toContain('# Balance report');
    expect(md).toContain('## Cards');
  });

  it('the AI never ends its turn when it can win right now', () => {
    const { state } = createCombat(CONTENT, setupFromSeed(CONTENT, { seed: 'AI-WIN', characterId: 'rigger', enemies: ['scrap_mite'] }));
    state.enemies[0]!.hp = 3;
    const cmd = chooseCombatCommand(CONTENT, state, { node: 'battle' });
    expect(cmd.type).toBe('playCard');
  });

  it('scores a won fight above anything else and values starter cards sensibly', () => {
    const { state } = createCombat(CONTENT, setupFromSeed(CONTENT, { seed: 'AI-SCORE', characterId: 'rigger', enemies: ['scrap_mite'] }));
    expect(scoreCombat(CONTENT, { ...state, phase: 'victory' })).toBeGreaterThan(scoreCombat(CONTENT, state));
    expect(cardPower(CONTENT.cards.pry_bar!, false)).toBeCloseTo(6);
    expect(cardPower(CONTENT.cards.pry_bar!, true)).toBeGreaterThan(cardPower(CONTENT.cards.pry_bar!, false));
  });
});
