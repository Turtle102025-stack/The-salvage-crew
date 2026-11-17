/** Run-level state: everything between the main menu and the summary screen. */
import type { RngState, RngStream } from '../rng';
import type { CardInstance, CardSelectPurpose, CombatEvent, CombatState, CreatureId, CombatCommand } from '../types';

export type NodeType = 'battle' | 'elite' | 'rest' | 'shop' | 'event' | 'treasure' | 'boss';

export interface MapNode {
  id: string;
  floor: number;
  col: number;
  type: NodeType;
  /** Ids of nodes on the next floor this connects to. */
  next: string[];
}

export interface MapState {
  act: number;
  floors: number;
  cols: number;
  nodes: Record<string, MapNode>;
  boss: string;
}

export interface RewardCardChoice {
  options: { id: string; upgraded: boolean }[];
  taken: boolean;
}

export interface RewardState {
  gold: number | null;
  cards: RewardCardChoice[];
  potion: string | null;
  relic: string | null;
  /** Boss rewards: pick one of these. */
  bossRelics: string[] | null;
}

export interface ShopItem {
  id: string;
  price: number;
  sold: boolean;
  upgraded?: boolean;
  onSale?: boolean;
}

export interface ShopState {
  cards: ShopItem[];
  relics: ShopItem[];
  potions: ShopItem[];
  removePrice: number;
  removeUsed: boolean;
}

export interface EventState {
  id: string;
  scene: string;
  /** Set when the event has ended. */
  result: string | null;
  /** Lines describing what the last choice did (gold, HP, cards…). */
  outcome: string[];
}

export type RunScreen =
  | { type: 'map' }
  | { type: 'combat'; node: NodeType; encounter: string; combat: CombatState; fromEvent?: boolean }
  | { type: 'reward'; node: NodeType; reward: RewardState }
  | { type: 'rest'; done: boolean; healed?: number }
  | { type: 'shop'; shop: ShopState }
  | { type: 'event'; event: EventState }
  | { type: 'treasure'; opened: boolean; reward: RewardState | null }
  | { type: 'cardSelect'; purpose: CardSelectPurpose; count: number; cost?: number; returnTo: RunScreen; optional: boolean }
  | { type: 'actIntro'; act: number }
  | { type: 'gameOver'; won: boolean };

export interface FightRecord {
  act: number;
  floor: number;
  node: NodeType;
  encounter: string;
  turns: number;
  damageTaken: number;
  won: boolean;
}

export interface PickRecord {
  act: number;
  floor: number;
  options: string[];
  picked: string | null;
}

export interface RunStats {
  floorsClimbed: number;
  enemiesKilled: number;
  elitesKilled: number;
  bossesKilled: number;
  damageTaken: number;
  damageDealt: number;
  cardsPlayed: number;
  turns: number;
  goldEarned: number;
  goldSpent: number;
  cardsRemoved: number;
  cardsUpgraded: number;
  potionsUsed: number;
  fights: FightRecord[];
  picks: PickRecord[];
  relicsTaken: { id: string; act: number; floor: number }[];
  /** Encounter that ended the run, if lost. */
  killedBy?: string;
}

export interface RunCounters {
  battlesThisAct: number;
  recentEncounters: string[];
  seenEvents: string[];
  /** Card-reward rarity offset (pity timer for rares). */
  rareOffset: number;
  potionChance: number;
  removals: number;
}

export interface RunState {
  version: 1;
  seed: string;
  characterId: string;
  difficulty: number;
  act: number;
  /** Floor within the act: 0 before the first node, map.floors + 1 = boss. */
  floor: number;
  hp: number;
  maxHp: number;
  gold: number;
  deck: CardInstance[];
  nextUid: number;
  relics: string[];
  potions: (string | null)[];
  map: MapState;
  position: string | null;
  /** Node ids visited this act, in order. */
  path: string[];
  bossEncounter: string;
  screen: RunScreen;
  rng: Record<RngStream, RngState>;
  stats: RunStats;
  counters: RunCounters;
  phase: 'active' | 'won' | 'lost';
}

export type RunCommand =
  | { type: 'chooseNode'; node: string }
  | { type: 'combat'; command: CombatCommand }
  | { type: 'usePotion'; slot: number; target?: CreatureId }
  | { type: 'discardPotion'; slot: number }
  | { type: 'takeGold' }
  | { type: 'takeCard'; reward: number; option: number }
  | { type: 'skipCard'; reward: number }
  | { type: 'takePotion' }
  | { type: 'takeRelic'; index?: number }
  | { type: 'rest' }
  | { type: 'smith' }
  | { type: 'buy'; kind: 'card' | 'relic' | 'potion'; index: number }
  | { type: 'removeCard' }
  | { type: 'eventChoice'; index: number }
  | { type: 'selectCards'; uids: number[] }
  | { type: 'cancelSelect' }
  | { type: 'openChest' }
  | { type: 'proceed' };

/** Things that happened, for UI feedback (toasts, sounds). */
export type RunEvent =
  | { type: 'gold'; amount: number }
  | { type: 'hp'; amount: number }
  | { type: 'maxHp'; amount: number }
  | { type: 'cardAdded'; card: string; upgraded: boolean }
  | { type: 'cardRemoved'; card: string }
  | { type: 'cardUpgraded'; card: string }
  | { type: 'relic'; relic: string }
  | { type: 'potion'; potion: string }
  | { type: 'potionUsed'; potion: string }
  | { type: 'potionFull'; potion: string }
  | { type: 'combatStart'; encounter: string }
  | { type: 'actStart'; act: number }
  | { type: 'runOver'; won: boolean };

export interface RunResult {
  run: RunState;
  events: RunEvent[];
  /** Combat events to animate (when the command was a combat command or started a fight). */
  combatEvents?: CombatEvent[];
  /** Combat state before the combat events (null when a fight just started). */
  combatFrom?: CombatState | null;
  /** Combat state after the command (kept even when the fight just ended). */
  combat?: CombatState;
  error?: string;
}
