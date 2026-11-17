/**
 * Hazard levels: optional difficulty, unlocked one at a time by winning.
 * Each level includes all the ones below it.
 */
export interface HazardLevel {
  level: number;
  name: string;
  description: string;
}

export const HAZARD_LEVELS: HazardLevel[] = [
  { level: 0, name: 'Standard contract', description: 'The job as advertised.' },
  { level: 1, name: 'Hazard 1: Angry locals', description: 'Hazards (elites) have 15% more HP.' },
  { level: 2, name: 'Hazard 2: Thin rations', description: 'Resting heals 25% of max HP instead of 30%.' },
  { level: 3, name: 'Hazard 3: Hard vacuum', description: 'Regular enemies have 10% more HP.' },
  { level: 4, name: 'Hazard 4: Worn-out suit', description: 'Start with 6 less max HP, and heal less between acts.' },
  { level: 5, name: 'Hazard 5: Management is watching', description: 'Bosses have 15% more HP and start with 1 Strength.' },
];

export const MAX_HAZARD = HAZARD_LEVELS.length - 1;

export interface DifficultyMods {
  enemyHpMult: number;
  eliteHpMult: number;
  bossHpMult: number;
  bossStrength: number;
  restHealPercent: number;
  maxHpDelta: number;
  /** Fraction of missing HP healed when a new act starts. */
  actHeal: number;
}

export function difficultyMods(level: number): DifficultyMods {
  return {
    enemyHpMult: level >= 3 ? 1.1 : 1,
    eliteHpMult: (level >= 1 ? 1.15 : 1) * (level >= 3 ? 1.1 : 1),
    bossHpMult: (level >= 5 ? 1.15 : 1) * (level >= 3 ? 1.1 : 1),
    bossStrength: level >= 5 ? 1 : 0,
    restHealPercent: level >= 2 ? 25 : 30,
    maxHpDelta: level >= 4 ? -6 : 0,
    actHeal: level >= 4 ? 0.5 : 0.75,
  };
}
