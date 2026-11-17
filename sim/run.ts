/**
 * Balance simulator CLI.
 *
 *   npm run sim                       # 1000 runs, Hazard 0
 *   npm run sim -- --runs 3000 --hazard 2 --prefix TEST
 *
 * Prints a summary and writes sim-reports/report-<hazard>-<runs>.md and .json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT } from '../src/content';
import { buildReport, formatReport, simulateRun, type RunRecord } from './simulate';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

const runs = Number(arg('runs', '1000'));
const hazard = Number(arg('hazard', '0'));
const prefix = arg('prefix', 'SIM');
const explore = Number(arg('explore', '0.2'));

const started = performance.now();
const records: RunRecord[] = [];
for (let i = 0; i < runs; i++) {
  records.push(simulateRun(CONTENT, `${prefix}-${i}`, { difficulty: hazard, ai: { explore } }));
  if ((i + 1) % 100 === 0) process.stdout.write(`  ${i + 1}/${runs} runs…\r`);
}
const seconds = (performance.now() - started) / 1000;
const report = buildReport(CONTENT, records, hazard);
const md = formatReport(report);

const dir = join(process.cwd(), 'sim-reports');
mkdirSync(dir, { recursive: true });
const base = join(dir, `report-h${hazard}-${runs}`);
writeFileSync(`${base}.md`, md);
writeFileSync(`${base}.json`, JSON.stringify(report, null, 2));

console.log(`\nSimulated ${runs} runs in ${seconds.toFixed(1)} s.`);
console.log(`Win rate ${(report.winRate * 100).toFixed(1)}%  |  ${report.actStats.map((a) => `Act ${a.act} cleared ${(a.clearRate * 100).toFixed(0)}%`).join('  |  ')}`);
console.log(`Avg damage per fight ${report.avgDamagePerFight.toFixed(1)}  |  est. full run ~${report.estMinutes.toFixed(0)} min`);
console.log(`${report.flags.length} flag(s). Report: ${base}.md`);
for (const f of report.flags.slice(0, 15)) console.log(`  - ${f}`);
