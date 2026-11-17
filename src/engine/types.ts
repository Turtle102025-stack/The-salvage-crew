/**
 * Core engine types: content definitions, combat state, player commands and
 * the events the engine reports back. Everything in state is plain,
 * JSON-serializable data (no classes, functions or Maps).
 */
import type { Effect } from './effects/types';
import type { RngState } from './rng';

// ---------------------------------------------------------------------------
// Content definitions (written in src/content)
// ---------------------------------------------------------------------------

export type CardType = 'attack' | 'skill' | 'power' | 'status' | 'curse';
export type CardRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'special';
export type CardKeyword = 'exhaust' | 'ethereal' | 'unplayable' | 'retain' | 'innate';

/** The parts of a card that an upgrade can change. */
export interface CardStats {
  cost: number | 'X';
  effects: Effect[];
  keywords?: CardKeyword[];
  /** Hand-written rules text; leave out to generate it from the effects. */
  text?: string;
}

export interface CardDef extends CardStats {
  id: string;
  name: string;
  type: CardType;
  rarity: CardRarity;
  /** Character id ('rigger'…) or 'neutral'. */
  character: string;
  flavor?: string;
  /** Every card has an upgraded version; only the changed parts are listed. */
  upgrade: Partial<CardStats> & { name?: string };
}

/**
 * When a hook fires.
 * Owner-scoped (only the creature the event is about, plus the player's relics
 * when that creature is the player): turnStart, turnEnd, attacked, damageTaken,
 * blockGained.
 * Global (every listener): combatStart, combatEnd, cardPlayed, enemyDied, shuffle.
 */
export type Trigger =
  | 'combatStart'
  | 'combatEnd'
  | 'turnStart'
  | 'turnEnd'
  | 'cardPlayed'
  | 'attacked'
  | 'damageTaken'
  | 'blockGained'
  | 'enemyDied'
  | 'shuffle';

export interface HookFilter {
  /** cardPlayed only: the played card's type. */
  cardType?: CardType;
}

export interface Hook {
  on: Trigger;
  if?: HookFilter;
  effects: Effect[];
}

export interface StatusModifiers {
  /** Added to attack damage per stack (Strength). */
  attackDealtPerStack?: number;
  /** Multiplies attack damage this creature deals (Weak: 0.75). */
  attackDealtMult?: number;
  /** Multiplies attack damage this creature takes (Vulnerable: 1.5). */
  attackTakenMult?: number;
  /** Attacks against this creature ignore its Block (Breach). */
  attackIgnoresBlock?: boolean;
}

export interface StatusDef {
  id: string;
  name: string;
  /** Tooltip text. `{n}` = stacks, `{s}` = "s" unless stacks is 1. */
  description: string;
  /** buff/debuff for normal statuses; power = installed by a Power card. */
  kind: 'buff' | 'debuff' | 'power';
  /** Stacks drop by `amount` (or to 0) at the owner's turn start/end, after hooks. */
  decay?: { when: 'turnStart' | 'turnEnd'; amount: number | 'all' };
  allowNegative?: boolean;
  modifiers?: StatusModifiers;
  hooks?: Hook[];
  /** When stacks reach `at`, run `effects` (e.g. Heat → Overheat). `label` names the moment in the UI. */
  threshold?: { at: number; effects: Effect[]; label?: string };
}

export type RelicRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'boss' | 'shop';

export interface RelicDef {
  id: string;
  name: string;
  rarity: RelicRarity;
  /** Character id or 'neutral'. */
  character: string;
  hooks: Hook[];
  /** Hand-written description; leave out to generate it from the hooks. */
  description?: string;
  flavor?: string;
}

export type IntentKind = 'attack' | 'block' | 'buff' | 'debuff' | 'unknown';

export interface EnemyMoveDef {
  name: string;
  effects: Effect[];
  /** Override the intent icons derived from the effects. */
  intent?: IntentKind[];
}

export interface EnemyAI {
  /** Moves used in order on the first turns. */
  opening?: string[];
  /** Afterwards: a fixed rotation, or weighted random. */
  then: { cycle: string[] } | { weights: Record<string, number>; maxInARow?: number };
}

export interface EnemyDef {
  id: string;
  name: string;
  /** HP is rolled in this range (inclusive). */
  hp: [number, number];
  moves: Record<string, EnemyMoveDef>;
  ai: EnemyAI;
  startStatuses?: Record<string, number>;
  flavor?: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  maxHp: number;
  starterDeck: string[];
  starterRelic: string;
  flavor?: string;
}

/** Everything the engine needs to know about the game's content. */
export interface Content {
  cards: Record<string, CardDef>;
  statuses: Record<string, StatusDef>;
  relics: Record<string, RelicDef>;
  enemies: Record<string, EnemyDef>;
  characters: Record<string, CharacterDef>;
}

// ---------------------------------------------------------------------------
// Combat state
// ---------------------------------------------------------------------------

/** 'player', or 'e0', 'e1'… for enemies in left-to-right order. */
export type CreatureId = string;

/** Status id → stacks. Insertion order is the hook order. */
export type StatusMap = Record<string, number>;

export interface Creature {
  id: CreatureId;
  side: 'player' | 'enemy';
  /** Character id for the player, enemy id for enemies. */
  defId: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: StatusMap;
  dead: boolean;
  /** Enemies: the move they will make on their next turn. */
  moveId?: string;
  moveHistory?: string[];
}

export interface CardInstance {
  uid: number;
  id: string;
  upgraded: boolean;
}

/** A deck entry before combat assigns it a uid. */
export interface DeckCard {
  id: string;
  upgraded?: boolean;
}

export type CombatPhase = 'player' | 'victory' | 'defeat';

export interface CombatStats {
  turns: number;
  cardsPlayed: number;
  /** HP the player lost this combat. */
  damageTaken: number;
}

export interface CombatRng {
  shuffle: RngState;
  enemyAI: RngState;
  misc: RngState;
}

export interface CombatState {
  version: 1;
  phase: CombatPhase;
  turn: number;
  energy: number;
  maxEnergy: number;
  drawPerTurn: number;
  player: Creature;
  enemies: Creature[];
  /** The top of the draw pile is the END of the array. */
  draw: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  exhaust: CardInstance[];
  /** Cards being played right now (between paying and discarding). */
  limbo: CardInstance[];
  relics: string[];
  rng: CombatRng;
  nextUid: number;
  stats: CombatStats;
}

export interface CombatSetup {
  characterId: string;
  hp: number;
  maxHp: number;
  deck: DeckCard[];
  relics: string[];
  enemies: string[];
  rng: CombatRng;
  maxEnergy?: number;
  drawPerTurn?: number;
}

// ---------------------------------------------------------------------------
// Commands (player input) and events (what happened)
// ---------------------------------------------------------------------------

export type CombatCommand =
  | { type: 'playCard'; uid: number; target?: CreatureId }
  | { type: 'endTurn' };

export type SourceRef =
  | { kind: 'card'; uid: number; id: string }
  | { kind: 'relic'; id: string }
  | { kind: 'status'; id: string; owner: CreatureId }
  | { kind: 'move'; enemy: CreatureId; move: string }
  | { kind: 'system' };

export type PileName = 'draw' | 'hand' | 'discard' | 'exhaust' | 'removed';

export type CombatEvent =
  | { type: 'combatStart' }
  | { type: 'turnStart'; who: CreatureId; turn: number }
  | { type: 'turnEnd'; who: CreatureId }
  | { type: 'energy'; energy: number; delta: number }
  | { type: 'draw'; uid: number; card: string }
  | { type: 'handFull' }
  | { type: 'shuffle'; count: number }
  | { type: 'playCard'; uid: number; card: string; target?: CreatureId }
  | { type: 'cardMoved'; uid: number; card: string; to: PileName }
  | { type: 'cardCreated'; uid: number; card: string; to: PileName }
  | { type: 'damage'; source?: CreatureId; target: CreatureId; amount: number; blocked: number; hpLost: number; attack: boolean }
  | { type: 'hpLoss'; target: CreatureId; amount: number }
  | { type: 'heal'; target: CreatureId; amount: number }
  | { type: 'block'; target: CreatureId; amount: number; total: number }
  | { type: 'blockReset'; target: CreatureId; lost: number }
  | { type: 'status'; target: CreatureId; status: string; delta: number; stacks: number }
  | { type: 'trigger'; source: SourceRef }
  | { type: 'enemyMove'; enemy: CreatureId; move: string; name: string }
  | { type: 'intent'; enemy: CreatureId; move: string }
  | { type: 'death'; target: CreatureId }
  | { type: 'victory' }
  | { type: 'defeat' };

export interface CombatResult {
  state: CombatState;
  events: CombatEvent[];
  /** Set when the command was rejected; state is then unchanged. */
  error?: string;
}
