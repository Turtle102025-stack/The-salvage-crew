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
  rivet_gun: { glyph: 'rivet', color: 'var(--steel-300)', badge: 'rivet', badgeColor: 'var(--steel-400)' },
  sheet_metal: { glyph: 'plate', color: 'var(--steel-300)', badge: 'gear', badgeColor: 'var(--amber)' },
  scavenge: { glyph: 'gear', color: 'var(--amber)', badge: 'card', badgeColor: 'var(--steel-300)' },
  bolt_driver: { glyph: 'hammer', color: 'var(--steel-300)', badge: 'gear', badgeColor: 'var(--amber)' },
  preheat: { glyph: 'flame', color: '#ff7a3d', color2: '#ffd166', badge: 'card', badgeColor: 'var(--steel-300)' },
  arc_cutter: { glyph: 'spark', color: '#ffd166', badge: 'flame', badgeColor: '#ff7a3d' },
  wrench_whack: { glyph: 'wrench', color: 'var(--card-attack)', badge: 'target', badgeColor: '#ff8a65' },
  brace_for_impact: { glyph: 'shield', color: 'var(--steel-400)', color2: 'var(--steel-300)', badge: 'down', badgeColor: '#c7adff' },
  magnet_pulse: { glyph: 'magnet', color: '#ff6b6b', badge: 'shield', badgeColor: 'var(--block)' },
  coolant_spray: { glyph: 'drop', color: 'var(--poison)', color2: '#f2ffd9' },
  hot_rivet: { glyph: 'rivet', color: '#ff7a3d', badge: 'flame', badgeColor: '#ffd166' },
  quick_fix: { glyph: 'bandage', color: 'var(--steel-300)' },
  scrap_cannon: { glyph: 'charge', color: 'var(--steel-400)', badge: 'gear', badgeColor: 'var(--amber)' },
  reinforce: { glyph: 'plate', color: 'var(--amber)', badge: 'plus', badgeColor: 'var(--heal)' },
  overcharge: { glyph: 'battery', color: 'var(--amber)', badge: 'flame', badgeColor: '#ff7a3d' },
  flash_weld: { glyph: 'shield', color: '#ff7a3d', color2: '#ffd166', badge: 'spark', badgeColor: '#ffd166' },
  plasma_burst: { glyph: 'core', color: '#ff7a3d', color2: '#fff4d6', badge: 'spark', badgeColor: '#ffd166' },
  shield_drone: { glyph: 'drone', color: 'var(--block)', color2: '#e3f1ff', badge: 'shield', badgeColor: 'var(--block)' },
  coolant_drone: { glyph: 'drone', color: 'var(--poison)', color2: '#f2ffd9', badge: 'drop', badgeColor: 'var(--poison)' },
  jackhammer: { glyph: 'hammer', color: 'var(--card-attack)', badge: 'spark', badgeColor: '#ffd166' },
  breach_and_clear: { glyph: 'hazard', color: '#ff8a65', badge: 'strike', badgeColor: 'var(--steel-300)' },
  polarity_slam: { glyph: 'magnet', color: 'var(--block)', badge: 'fist', badgeColor: 'var(--card-attack)' },
  corrosive_mist: { glyph: 'ghost', color: 'var(--poison)', color2: '#2b3654' },
  scrap_plating: { glyph: 'plate', color: 'var(--card-power)', badge: 'gear', badgeColor: 'var(--amber)' },
  recycler: { glyph: 'gear', color: 'var(--card-power)', badge: 'gear', badgeColor: 'var(--amber)' },
  magnetic_field: { glyph: 'magnet', color: 'var(--card-power)', badge: 'spark', badgeColor: '#ffd166' },
  gravity_hammer: { glyph: 'hammer', color: 'var(--card-power)', badge: 'down', badgeColor: '#c7adff' },
  double_shift: { glyph: 'clock', color: 'var(--amber)', badge: 'battery', badgeColor: 'var(--amber)' },
  thermal_feedback: { glyph: 'flame', color: '#ff7a3d', color2: 'var(--card-power)', badge: 'spark', badgeColor: '#ffd166' },
  mother_lode: { glyph: 'crate', color: 'var(--rarity-rare)', badge: 'gear', badgeColor: 'var(--amber)' },
  total_teardown: { glyph: 'saw', color: 'var(--steel-300)', badge: 'skull', badgeColor: 'var(--steel-300)' },
  drone_wing: { glyph: 'drone', color: 'var(--card-power)', color2: 'var(--amber)', badge: 'drone', badgeColor: 'var(--teal)' },
  salvage_frenzy: { glyph: 'claw', color: 'var(--amber)', badge: 'gear', badgeColor: 'var(--steel-300)' },
  emergency_dump: { glyph: 'flame', color: '#ff4d5e', color2: '#ffd166', badge: 'hazard', badgeColor: 'var(--amber)' },
  paperwork: { glyph: 'card', color: '#f3ead2' },
  debris: { glyph: 'crate', color: 'var(--steel-500)' },
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
  salvage_drone: { body: 'drone', main: '#5b6b8c', accent: 'var(--amber)', eye: '#ff4d5e', scale: 0.8, features: ['jet', 'antenna'] },
  claim_jumper: { body: 'scavenger', main: '#6b4a3a', accent: '#c98b4f', eye: '#ffd166', scale: 0.95, features: ['scar'] },
  coolant_slick: { body: 'blob', main: '#2f8f9d', accent: '#9fe8ff', eye: '#e9fffc', scale: 0.95, features: ['glow'] },
  defense_turret: { body: 'turret', main: '#4a5a7a', accent: '#ff4d5e', eye: '#ff4d5e', scale: 0.85, features: ['stripes', 'antenna'] },
  scrap_crab: { body: 'crab', main: '#7a5a4a', accent: '#c98b4f', eye: 'var(--teal)', scale: 1, features: ['stripes'] },
  sentry_orb: { body: 'orb', main: '#3a4766', accent: 'var(--amber)', eye: '#ff4d5e', scale: 0.7, features: ['glow', 'jet'] },
  mite_swarm: { body: 'swarm', main: '#8a6a4a', accent: '#c98b4f', eye: 'var(--teal)', scale: 0.95 },
  foreman_krell: { body: 'scavenger', main: '#8e3b22', accent: 'var(--amber)', eye: 'var(--amber)', scale: 1.2, features: ['stripes', 'scar', 'saw', 'antenna'] },
  cutter_bot: { body: 'construct', main: '#4a5a7a', accent: '#ff7a3d', eye: '#ff4d5e', scale: 1.15, features: ['spikes'] },
  lamprey_matriarch: { body: 'worm', main: '#7a2e2a', accent: '#ff7a3d', eye: '#ffd166', scale: 1.25, features: ['spikes'] },
  wreckwarden: { body: 'warden', main: '#3a4766', accent: 'var(--amber)', eye: '#ff4d5e', scale: 1.5 },
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
  duct_tape: { glyph: 'bandage', color: 'var(--steel-300)' },
  mag_boots: { glyph: 'boot', color: 'var(--steel-400)' },
  coffee_thermos: { glyph: 'flask', color: '#8a5a3c', color2: '#f3d9b1' },
  union_card: { glyph: 'card', color: 'var(--amber)' },
  hazard_vest: { glyph: 'shield', color: '#ff8a3d', color2: '#ffd166' },
  grease_gun: { glyph: 'drop', color: '#3b3f4f', color2: '#9aa6c2' },
  welding_mask: { glyph: 'mask', color: 'var(--steel-500)', color2: 'var(--teal)' },
  tool_belt: { glyph: 'bag', color: '#a0703e' },
  scrap_magnet: { glyph: 'magnet', color: '#ff6b6b' },
  spare_fuse: { glyph: 'bolt', color: '#ffd166' },
  coolant_loop: { glyph: 'snow', color: 'var(--block)' },
  crackling_radio: { glyph: 'antenna', color: 'var(--teal)' },
  drone_kit: { glyph: 'drone', color: 'var(--steel-400)', color2: 'var(--amber)' },
  pocket_fusion: { glyph: 'core', color: 'var(--teal)', color2: '#e9fffc' },
  gravity_anchor: { glyph: 'hook', color: 'var(--card-power)' },
  traders_ledger: { glyph: 'coin', color: 'var(--rarity-rare)' },
  shrapnel_net: { glyph: 'spark', color: '#ff7a3d' },
  overclocked_reactor: { glyph: 'core', color: '#ff4d5e', color2: '#ffd166' },
  bigger_toolbox: { glyph: 'crate', color: '#c98b4f' },
  cracked_fusion_core: { glyph: 'flame', color: '#ff7a3d', color2: 'var(--teal)' },
  salvage_license: { glyph: 'key', color: 'var(--rarity-rare)' },
};

export function relicArt(id: string): GlyphArt {
  return RELIC_ART[id] ?? { glyph: 'gear', color: 'var(--steel-300)' };
}

export const POTION_ART: Record<string, GlyphArt> = {
  repair_gel: { glyph: 'flask', color: 'var(--heal)', color2: '#d9ffe7' },
  shield_foam: { glyph: 'flask', color: 'var(--block)', color2: '#e3f1ff' },
  smoke_canister: { glyph: 'flask', color: '#8d94a8', color2: '#e8ecf5' },
  acid_flask: { glyph: 'flask', color: 'var(--poison)', color2: '#f2ffd9' },
  cutting_charge: { glyph: 'flask', color: '#ff7a3d', color2: '#ffe0c7' },
  caffeine_jolt: { glyph: 'flask', color: '#8a5a3c', color2: '#f3d9b1' },
  overclock_cell: { glyph: 'flask', color: 'var(--amber)', color2: '#fff4d6' },
  stim_shot: { glyph: 'flask', color: '#ff4d5e', color2: '#ffd6da' },
  scrap_pack: { glyph: 'flask', color: '#c98b4f', color2: '#ffe9c7' },
  cryo_spray: { glyph: 'flask', color: '#9fe8ff', color2: '#ffffff' },
};

export function potionArt(id: string): GlyphArt {
  return POTION_ART[id] ?? { glyph: 'flask', color: 'var(--teal)', color2: '#e9fffc' };
}
