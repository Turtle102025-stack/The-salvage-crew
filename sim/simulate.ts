/**
 * Plays runs headlessly with the AI and turns them into balance statistics.
 * Pure (no file system): the CLI in run.ts handles arguments and output.
 */
import { createRng, createRun, dispatchRun, type Content, type RunState } from '../src/engine';
import { chooseRunCommand, type AiOptions } from './ai';

export interface RunRecord {
  seed: string;
  won: boolean;
  /** Highest act reached, and whether each act was cleared. */
  act: number;
  actsCleared: number;
  floor: number;
  killedBy?: string;
  fights: RunState['stats']['fights'];
  picks: RunState['stats']['picks'];
  deck: string[];
  relics: string[];
  relicsTaken: RunState['stats']['relicsTaken'];
  turns: number;
  cardsPlayed: number;
  floorsClimbed: number;
  commands: number;
}

export function simulateRun(content: Content, seed: string, opts: { difficulty?: number; ai?: Partial<AiOptions>; maxCommands?: number } = {}): RunRecord {
  const ai: AiOptions = { explore: 0.2, ...opts.ai };
  const decide = createRng(seed, 'sim-ai');
  let run = createRun(content, { seed, characterId: 'rigger', difficulty: opts.difficulty ?? 0 }).run;
  let commands = 0;
  const max = opts.maxCommands ?? 20000;
  while (run.phase === 'active' && commands < max) {
    const command = chooseRunCommand(content, run, decide, ai);
    const result = dispatchRun(content, run, command);
    if (result.error) throw new Error(`[${seed}] AI command ${JSON.stringify(command)} on ${run.screen.type} rejected: ${result.error}`);
    run = result.run;
    commands++;
  }
  const actsCleared = run.phase === 'won' ? run.act : run.act - 1;
  return {
    seed,
    won: run.phase === 'won',
    act: run.act,
    actsCleared,
    floor: run.floor,
    ...(run.stats.killedBy ? { killedBy: run.stats.killedBy } : {}),
    fights: run.stats.fights,
    picks: run.stats.picks,
    deck: run.deck.map((c) => c.id),
    relics: run.relics,
    relicsTaken: run.stats.relicsTaken,
    turns: run.stats.turns,
    cardsPlayed: run.stats.cardsPlayed,
    floorsClimbed: run.stats.floorsClimbed,
    commands,
  };
}

export interface ItemStat {
  id: string;
  name: string;
  offered: number;
  picked: number;
  pickRate: number;
  /** Runs that picked it at least once. */
  runsWith: number;
  winRateWith: number;
  /** Difference from the overall win rate, in percentage points. */
  delta: number;
}

export interface Report {
  runs: number;
  difficulty: number;
  acts: number;
  winRate: number;
  /** For each act: runs that started it, and the share that cleared it. */
  actStats: { act: number; started: number; clearRate: number }[];
  avgDamagePerFight: number;
  damageByNode: { node: string; fights: number; avgDamage: number; deathRate: number }[];
  encounters: { id: string; fights: number; avgDamage: number; deathRate: number; avgTurns: number }[];
  cards: ItemStat[];
  relics: ItemStat[];
  killers: { name: string; count: number }[];
  avgTurns: number;
  avgCardsPlayed: number;
  avgFloors: number;
  /** Rough real-time estimate for a human player, in minutes. */
  estMinutes: number;
  flags: string[];
}

const MIN_SAMPLES = 25;

export function buildReport(content: Content, records: RunRecord[], difficulty = 0): Report {
  const n = records.length;
  const wins = records.filter((r) => r.won).length;
  const winRate = n ? wins / n : 0;
  const acts = content.acts.length;

  const actStats = content.acts.map((a) => {
    const started = records.filter((r) => r.act >= a.id).length;
    const cleared = records.filter((r) => r.actsCleared >= a.id).length;
    return { act: a.id, started, clearRate: started ? cleared / started : 0 };
  });

  const fights = records.flatMap((r) => r.fights);
  const avgDamagePerFight = fights.length ? fights.reduce((s, f) => s + f.damageTaken, 0) / fights.length : 0;
  const nodes = ['battle', 'elite', 'boss'];
  const damageByNode = nodes.map((node) => {
    const fs = fights.filter((f) => f.node === node);
    return {
      node,
      fights: fs.length,
      avgDamage: fs.length ? fs.reduce((s, f) => s + f.damageTaken, 0) / fs.length : 0,
      deathRate: fs.length ? fs.filter((f) => !f.won).length / fs.length : 0,
    };
  });
  const byEncounter = new Map<string, typeof fights>();
  for (const f of fights) byEncounter.set(f.encounter, [...(byEncounter.get(f.encounter) ?? []), f]);
  const encounters = [...byEncounter]
    .map(([id, fs]) => ({
      id,
      fights: fs.length,
      avgDamage: fs.reduce((s, f) => s + f.damageTaken, 0) / fs.length,
      deathRate: fs.filter((f) => !f.won).length / fs.length,
      avgTurns: fs.reduce((s, f) => s + f.turns, 0) / fs.length,
    }))
    .sort((a, b) => b.avgDamage - a.avgDamage);

  // Cards: offered / picked from rewards; win rate of runs that picked them.
  const cardIds = Object.values(content.cards)
    .filter((c) => c.rarity === 'common' || c.rarity === 'uncommon' || c.rarity === 'rare')
    .map((c) => c.id);
  // Compared with runs that were offered the card but passed on it: both groups
  // were alive at the same point, so later-run survivorship doesn't skew it.
  const cards: ItemStat[] = cardIds.map((id) => {
    let offered = 0;
    let picked = 0;
    let runsWith = 0;
    let winsWith = 0;
    let runsSkipped = 0;
    let winsSkipped = 0;
    for (const r of records) {
      let has = false;
      let seen = false;
      for (const p of r.picks) {
        if (p.options.includes(id)) {
          offered++;
          seen = true;
        }
        if (p.picked === id) {
          picked++;
          has = true;
        }
      }
      if (has) {
        runsWith++;
        if (r.won) winsWith++;
      } else if (seen) {
        runsSkipped++;
        if (r.won) winsSkipped++;
      }
    }
    const winRateWith = runsWith ? winsWith / runsWith : 0;
    const winRateSkipped = runsSkipped ? winsSkipped / runsSkipped : winRate;
    return {
      id,
      name: content.cards[id]!.name,
      offered,
      picked,
      pickRate: offered ? picked / offered : 0,
      runsWith,
      winRateWith,
      delta: runsWith && runsSkipped ? (winRateWith - winRateSkipped) * 100 : 0,
    };
  });

  // Compared with all runs that got at least as far as the point it was found.
  const progress = (act: number, floor: number) => act * 100 + floor;
  const reached = records.map((r) => progress(r.act, r.floor));
  const relics: ItemStat[] = Object.values(content.relics)
    .filter((r) => r.rarity !== 'starter')
    .map((def) => {
      const withIt = records.filter((r) => r.relics.includes(def.id));
      const w = withIt.filter((r) => r.won).length;
      const winRateWith = withIt.length ? w / withIt.length : 0;
      let baseline = 0;
      for (const r of withIt) {
        const t = r.relicsTaken.find((x) => x.id === def.id);
        const at = t ? progress(t.act, t.floor) : 0;
        // Boss Salvage is only offered after beating that act's boss.
        const alive =
          def.rarity === 'boss' && t ? records.filter((x) => x.actsCleared >= t.act) : records.filter((_, i) => reached[i]! >= at);
        baseline += alive.length ? alive.filter((x) => x.won).length / alive.length : winRate;
      }
      baseline = withIt.length ? baseline / withIt.length : winRate;
      return {
        id: def.id,
        name: def.name,
        offered: 0,
        picked: withIt.length,
        pickRate: n ? withIt.length / n : 0,
        runsWith: withIt.length,
        winRateWith,
        delta: withIt.length ? (winRateWith - baseline) * 100 : 0,
      };
    });

  const killerCounts = new Map<string, number>();
  for (const r of records) if (r.killedBy) killerCounts.set(r.killedBy, (killerCounts.get(r.killedBy) ?? 0) + 1);
  const killers = [...killerCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const avgTurns = n ? records.reduce((s, r) => s + r.turns, 0) / n : 0;
  const avgCardsPlayed = n ? records.reduce((s, r) => s + r.cardsPlayed, 0) / n : 0;
  const avgFloors = n ? records.reduce((s, r) => s + r.floorsClimbed, 0) / n : 0;
  // ~3.5 s per card, ~4 s per turn end + enemy turn, ~20 s per floor of map/reward/shop decisions.
  const wonRuns = records.filter((r) => r.won);
  const fullRun = wonRuns.length ? wonRuns : records;
  const est = (r: RunRecord) => (r.cardsPlayed * 3.5 + r.turns * 4 + r.floorsClimbed * 20) / 60;
  const estMinutes = fullRun.length ? fullRun.reduce((s, r) => s + est(r), 0) / fullRun.length : 0;

  const flags: string[] = [];
  for (const c of cards) {
    if (c.runsWith >= MIN_SAMPLES && c.delta >= 12) flags.push(`Card "${c.name}" may be too strong: win rate +${c.delta.toFixed(1)} pts when picked (${c.runsWith} runs).`);
    if (c.runsWith >= MIN_SAMPLES && c.delta <= -12) flags.push(`Card "${c.name}" may be weak: win rate ${c.delta.toFixed(1)} pts when picked (${c.runsWith} runs).`);
    // Low pick rate mostly reflects the AI's taste; only flag it if the card also underperforms.
    if (c.offered >= MIN_SAMPLES * 2 && c.pickRate < 0.12 && c.delta < 0) {
      flags.push(`Card "${c.name}" is rarely chosen (${(c.pickRate * 100).toFixed(0)}% pick rate) and does not help when taken: may be useless.`);
    }
  }
  for (const r of relics) {
    if (r.runsWith >= MIN_SAMPLES && r.delta >= 15) flags.push(`Relic "${r.name}" may be too strong: win rate +${r.delta.toFixed(1)} pts when held (${r.runsWith} runs).`);
    if (r.runsWith >= MIN_SAMPLES && r.delta <= -15) flags.push(`Relic "${r.name}" may be weak: win rate ${r.delta.toFixed(1)} pts when held (${r.runsWith} runs).`);
  }
  for (const e of encounters) {
    if (e.fights >= MIN_SAMPLES && e.deathRate > 0.25 && !e.id.includes('boss') && !content.acts.some((a) => a.encounters.boss.some((b) => b.id === e.id))) {
      flags.push(`Encounter "${e.id}" kills ${(e.deathRate * 100).toFixed(0)}% of the time: may be too hard.`);
    }
  }

  return {
    runs: n,
    difficulty,
    acts,
    winRate,
    actStats,
    avgDamagePerFight,
    damageByNode,
    encounters,
    cards,
    relics,
    killers,
    avgTurns,
    avgCardsPlayed,
    avgFloors,
    estMinutes,
    flags,
  };
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function formatReport(r: Report): string {
  const lines: string[] = [];
  lines.push(`# Balance report`, '');
  lines.push(`${r.runs} simulated runs · Hazard ${r.difficulty} · ${r.acts} act(s)`, '');
  lines.push(`**Win rate: ${pct(r.winRate)}**`, '');
  lines.push('| Act | Runs that started it | Cleared |', '|---|---|---|');
  for (const a of r.actStats) lines.push(`| ${a.act} | ${a.started} | ${pct(a.clearRate)} |`);
  lines.push('');
  lines.push(`Average damage taken per fight: **${r.avgDamagePerFight.toFixed(1)}**`, '');
  lines.push('| Fight type | Fights | Avg damage taken | Death rate |', '|---|---|---|---|');
  for (const d of r.damageByNode) lines.push(`| ${d.node} | ${d.fights} | ${d.avgDamage.toFixed(1)} | ${pct(d.deathRate)} |`);
  lines.push('');
  lines.push(
    `Average run: ${r.avgFloors.toFixed(1)} floors, ${r.avgTurns.toFixed(0)} turns, ${r.avgCardsPlayed.toFixed(0)} cards played. Estimated real time for a full run: ~${r.estMinutes.toFixed(0)} min.`,
    '',
  );
  lines.push('## Flags', '');
  if (!r.flags.length) lines.push('Nothing flagged.');
  for (const f of r.flags) lines.push(`- ${f}`);
  lines.push('');
  lines.push('## Encounters (hardest first)', '', '| Encounter | Fights | Avg damage | Death rate | Avg turns |', '|---|---|---|---|---|');
  for (const e of r.encounters) lines.push(`| ${e.id} | ${e.fights} | ${e.avgDamage.toFixed(1)} | ${pct(e.deathRate)} | ${e.avgTurns.toFixed(1)} |`);
  lines.push('');
  lines.push(
    '## Cards',
    '',
    'Pick rate = how often the AI took it when offered. Win rate = runs that picked it at least once. "vs skipped" compares with runs that were offered it but passed.',
    '',
  );
  lines.push('| Card | Offered | Pick rate | Runs with | Win rate with | vs skipped |', '|---|---|---|---|---|---|');
  for (const c of [...r.cards].sort((a, b) => b.delta - a.delta)) {
    lines.push(`| ${c.name} | ${c.offered} | ${pct(c.pickRate)} | ${c.runsWith} | ${pct(c.winRateWith)} | ${c.delta >= 0 ? '+' : ''}${c.delta.toFixed(1)} |`);
  }
  lines.push('');
  lines.push('## Relics', '', '"vs baseline" compares with all runs that got as far as where it was found.', '', '| Relic | Runs with | Win rate with | vs baseline |', '|---|---|---|---|');
  for (const x of [...r.relics].sort((a, b) => b.delta - a.delta)) lines.push(`| ${x.name} | ${x.runsWith} | ${pct(x.winRateWith)} | ${x.delta >= 0 ? '+' : ''}${x.delta.toFixed(1)} |`);
  lines.push('');
  lines.push('## Top killers', '');
  for (const k of r.killers.slice(0, 10)) lines.push(`- ${k.name}: ${k.count}`);
  lines.push('');
  return lines.join('\n');
}
