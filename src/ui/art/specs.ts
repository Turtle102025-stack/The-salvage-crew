/**
 * Which art each piece of content uses. Pure lookup tables keyed by content
 * id, with fallbacks so new content always has something sensible to show.
 */
import type { CardType, IntentKind } from '../../engine';
import type { EnemyArtSpec } from './EnemyArt';

export interface GlyphArt {
  glyph: string;
  color?: string;
  color2?: string;
  /** A second, smaller glyph in the corner of card art. */
  badge?: string;
  badgeColor?: string;
}

// --- Cards -----------------------------------------------------------------

export const CARD_ART: Record<string, GlyphArt> = {
  pry_bar: { glyph: 'crowbar', color: 'var(--steel-300)' },
  hull_patch: { glyph: 'plate', color: 'var(--steel-400)' },
  strip_for_parts: { glyph: 'wrench', color: 'var(--steel-300)', badge: 'gear', badgeColor: 'var(--amber)' },
  jury_rig: { glyph: 'plate', color: 'var(--amber)', badge: 'gear', badgeColor: 'var(--steel-300)' },
  mag_clamp: { glyph: 'magnet', color: 'var(--card-attack)' },
  thermal_lance: { glyph: 'beam', color: 'var(--steel-400)', color2: 'var(--amber)' },
  vent_coolant: { glyph: 'snow', color: 'var(--block)', badge: 'shield', badgeColor: 'var(--block)' },
  breach_charge: { glyph: 'charge', color: 'var(--card-attack)' },
  cutter_drone: { glyph: 'drone', color: 'var(--steel-400)', color2: 'var(--amber)', badge: 'saw', badgeColor: 'var(--steel-300)' },
};

const CARD_FALLBACK: Record<CardType, GlyphArt> = {
  attack: { glyph: 'strike', color: 'var(--steel-300)' },
  skill: { glyph: 'shield', color: 'var(--block)' },
  power: { glyph: 'spark', color: 'var(--card-power)' },
  status: { glyph: 'gear', color: 'var(--steel-500)' },
  curse: { glyph: 'skull', color: 'var(--steel-500)' },
};

export function cardArt(id: string, type: CardType): GlyphArt {
  return CARD_ART[id] ?? CARD_FALLBACK[type];
}

// --- Enemies ---------------------------------------------------------------

export const ENEMY_ART: Record<string, EnemyArtSpec> = {
  scrap_mite: { body: 'mite', main: '#8a6a4a', accent: '#c98b4f', eye: 'var(--teal)', scale: 0.7, features: ['antenna'] },
  rust_lamprey: { body: 'worm', main: '#a4512f', accent: '#d9773f', eye: '#ffd166', scale: 0.95, features: ['spikes'] },
};

const ENEMY_FALLBACK: EnemyArtSpec = { body: 'blob', main: 'var(--steel-500)', accent: 'var(--steel-300)', eye: 'var(--amber)' };

export function enemyArt(id: string): EnemyArtSpec {
  return ENEMY_ART[id] ?? ENEMY_FALLBACK;
}

// --- Statuses ----------------------------------------------------------------

export const STATUS_ART: Record<string, GlyphArt> = {
  strength: { glyph: 'fist', color: 'var(--card-attack)' },
  weak: { glyph: 'down', color: '#c7adff' },
  vulnerable: { glyph: 'target', color: '#ff8a65' },
  poison: { glyph: 'drop', color: 'var(--poison)', color2: '#e6ffc2' },
  scrap: { glyph: 'gear', color: 'var(--amber)' },
  heat: { glyph: 'flame', color: '#ff7a3d', color2: '#ffd166' },
  breach: { glyph: 'hazard', color: '#ff8a65' },
  magnetized: { glyph: 'magnet', color: '#ff6b6b' },
  cutter_drone: { glyph: 'drone', color: 'var(--steel-400)', color2: 'var(--amber)' },
};

export function statusArt(id: string, kind?: string): GlyphArt {
  return STATUS_ART[id] ?? (kind === 'debuff' ? { glyph: 'down', color: '#c7adff' } : kind === 'power' ? { glyph: 'spark', color: 'var(--teal)' } : { glyph: 'up', color: 'var(--amber)' });
}

// --- Intents -----------------------------------------------------------------

export const INTENT_ART: Record<IntentKind, GlyphArt> = {
  attack: { glyph: 'strike', color: 'var(--card-attack)' },
  block: { glyph: 'shield', color: 'var(--block)', color2: '#bfe0ff' },
  buff: { glyph: 'up', color: 'var(--amber)' },
  debuff: { glyph: 'down', color: '#b28cff' },
  unknown: { glyph: 'question', color: 'var(--steel-300)' },
};

// --- Relics & potions (filled in as content arrives) -------------------------

export const RELIC_ART: Record<string, GlyphArt> = {
  lucky_wrench: { glyph: 'wrench', color: 'var(--amber)' },
};

export function relicArt(id: string): GlyphArt {
  return RELIC_ART[id] ?? { glyph: 'gear', color: 'var(--steel-300)' };
}

export const POTION_ART: Record<string, GlyphArt> = {};

export function potionArt(id: string): GlyphArt {
  return POTION_ART[id] ?? { glyph: 'flask', color: 'var(--teal)', color2: '#e9fffc' };
}
