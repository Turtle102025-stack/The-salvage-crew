/**
 * Autosave and profile. The run is saved to localStorage after every action;
 * the profile keeps unlocked Hazard levels and the run history.
 */
import { deserializeRun, serializeRun, type RunState } from '../engine';
import { readJson, removeKey, writeJson } from './storage';

const RUN_KEY = 'salvage-crew.run.v1';
const PROFILE_KEY = 'salvage-crew.profile.v1';

export interface SavedRun {
  run: RunState;
  /** Wall-clock play time so far (UI-only, not part of the deterministic run). */
  playMs: number;
  startedAt: number;
}

export function loadRun(): SavedRun | null {
  try {
    const raw = window.localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { run: string; playMs: number; startedAt: number };
    return { run: deserializeRun(data.run), playMs: data.playMs ?? 0, startedAt: data.startedAt ?? 0 };
  } catch {
    return null;
  }
}

export function saveRun(saved: SavedRun): boolean {
  return writeJson(RUN_KEY, { run: serializeRun(saved.run), playMs: saved.playMs, startedAt: saved.startedAt });
}

export function clearRun(): void {
  removeKey(RUN_KEY);
}

export interface HistoryEntry {
  date: number;
  seed: string;
  characterId: string;
  difficulty: number;
  won: boolean;
  act: number;
  floor: number;
  floorsClimbed: number;
  killedBy?: string;
  playMs: number;
  deckSize: number;
  relics: number;
  enemiesKilled: number;
  score: number;
}

export interface Profile {
  /** Highest Hazard level unlocked (0 = only standard). */
  unlockedHazard: number;
  wins: number;
  runs: number;
  history: HistoryEntry[];
}

const EMPTY: Profile = { unlockedHazard: 0, wins: 0, runs: 0, history: [] };

export function loadProfile(): Profile {
  return { ...EMPTY, ...(readJson<Partial<Profile>>(PROFILE_KEY) ?? {}) };
}

export function saveProfile(p: Profile): void {
  writeJson(PROFILE_KEY, p);
}

/** A simple score for the history list: floors, kills and a win bonus. */
export function runScore(run: RunState): number {
  const s = run.stats;
  return s.floorsClimbed * 5 + s.enemiesKilled * 2 + s.elitesKilled * 10 + s.bossesKilled * 50 + (run.phase === 'won' ? 250 : 0) + run.difficulty * 25;
}

/** Records a finished run; unlocks the next Hazard level on a win. Returns the updated profile. */
export function recordRun(run: RunState, playMs: number, maxHazard: number): Profile {
  const p = loadProfile();
  const won = run.phase === 'won';
  const entry: HistoryEntry = {
    date: Date.now(),
    seed: run.seed,
    characterId: run.characterId,
    difficulty: run.difficulty,
    won,
    act: run.act,
    floor: run.floor,
    floorsClimbed: run.stats.floorsClimbed,
    ...(run.stats.killedBy ? { killedBy: run.stats.killedBy } : {}),
    playMs,
    deckSize: run.deck.length,
    relics: run.relics.length,
    enemiesKilled: run.stats.enemiesKilled,
    score: runScore(run),
  };
  const next: Profile = {
    unlockedHazard: won ? Math.min(maxHazard, Math.max(p.unlockedHazard, run.difficulty + 1)) : p.unlockedHazard,
    wins: p.wins + (won ? 1 : 0),
    runs: p.runs + 1,
    history: [entry, ...p.history].slice(0, 50),
  };
  saveProfile(next);
  return next;
}
