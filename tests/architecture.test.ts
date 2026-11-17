/**
 * Guards the core design rules from CLAUDE.md:
 *  - the engine and content are pure TypeScript (no React, no UI, no browser APIs),
 *  - every random number comes from the seeded RNG (no Math.random),
 *  - no wall-clock time in game logic (no Date.now / new Date / performance.now).
 * This lets the engine run headless in tests and the balance simulator, and
 * makes the same seed reproduce the same run.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..');
const PURE_DIRS = ['src/engine', 'src/content'];

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listSourceFiles(full));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /from\s+['"]react(-dom)?(\/[^'"]*)?['"]/, why: 'imports React' },
  { pattern: /from\s+['"][^'"]*\/ui\/[^'"]*['"]/, why: 'imports UI code' },
  { pattern: /\.tsx['"]/, why: 'imports a .tsx file' },
  { pattern: /Math\.random\s*\(/, why: 'uses Math.random (use the seeded RNG)' },
  { pattern: /Date\.now\s*\(|new Date\s*\(|performance\.now\s*\(/, why: 'reads the clock' },
  { pattern: /\b(window|document|localStorage|sessionStorage|navigator)\s*\./, why: 'uses a browser API' },
];

describe('architecture: engine and content stay pure', () => {
  const files = PURE_DIRS.flatMap((d) => listSourceFiles(join(ROOT, d)));

  it('finds engine source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('has no .tsx (UI) files inside engine or content', () => {
    const tsx = PURE_DIRS.flatMap((d) =>
      readdirSync(join(ROOT, d), { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.tsx')),
    );
    expect(tsx).toEqual([]);
  });

  it('contains no forbidden imports or APIs', () => {
    const violations: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, ''); // ignore line comments
        for (const rule of FORBIDDEN) {
          if (rule.pattern.test(code)) {
            violations.push(`${relative(ROOT, file)}:${i + 1} ${rule.why}`);
          }
        }
      });
    }
    expect(violations).toEqual([]);
  });
});
