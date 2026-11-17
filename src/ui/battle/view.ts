/**
 * The battle screen's view model, rebuilt step by step from engine events.
 *
 * The engine resolves a whole command at once and returns the final state plus
 * a list of events. To animate, the UI starts from what is currently on screen
 * and applies the events one at a time (`applyEvent`), pausing between them.
 * When the list is done, the view is replaced by the authoritative final state
 * (`viewFromState`). A test checks that replaying events always lands exactly
 * on the final state.
 */
import type { CardInstance, CombatEvent, CombatPhase, CombatState, Creature } from '../../engine';

export interface ViewCreature {
  id: string;
  defId: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: Record<string, number>;
  dead: boolean;
  moveId?: string;
  /** Enemies: has already acted this enemy turn (hide its intent until the next one). */
  acted?: boolean;
}

export interface BattleView {
  phase: CombatPhase;
  turn: number;
  energy: number;
  maxEnergy: number;
  player: ViewCreature;
  enemies: ViewCreature[];
  hand: CardInstance[];
  drawCount: number;
  discardCount: number;
  exhaustCount: number;
  /** Whose turn is being shown (for banners and input locking). */
  acting: 'player' | 'enemy';
}

function viewCreature(c: Creature): ViewCreature {
  return {
    id: c.id,
    defId: c.defId,
    name: c.name,
    hp: c.hp,
    maxHp: c.maxHp,
    block: c.block,
    statuses: { ...c.statuses },
    dead: c.dead,
    ...(c.moveId !== undefined ? { moveId: c.moveId } : {}),
  };
}

export function viewFromState(state: CombatState): BattleView {
  return {
    phase: state.phase,
    turn: state.turn,
    energy: state.energy,
    maxEnergy: state.maxEnergy,
    player: viewCreature(state.player),
    enemies: state.enemies.map(viewCreature),
    hand: state.hand.map((c) => ({ ...c })),
    drawCount: state.draw.length,
    discardCount: state.discard.length,
    exhaustCount: state.exhaust.length,
    acting: 'player',
  };
}

/** Every card instance the UI might need to show, by uid. */
export function cardIndex(...states: CombatState[]): Map<number, CardInstance> {
  const map = new Map<number, CardInstance>();
  for (const s of states) {
    for (const pile of [s.draw, s.hand, s.discard, s.exhaust, s.limbo]) for (const c of pile) map.set(c.uid, c);
  }
  return map;
}

function creature(view: BattleView, id: string): ViewCreature | undefined {
  return id === 'player' ? view.player : view.enemies.find((e) => e.id === id);
}

function removeFromHand(view: BattleView, uid: number): boolean {
  const i = view.hand.findIndex((c) => c.uid === uid);
  if (i < 0) return false;
  view.hand.splice(i, 1);
  return true;
}

/** Applies one event to the view (mutates it). */
export function applyEvent(view: BattleView, event: CombatEvent, cards: Map<number, CardInstance>): void {
  switch (event.type) {
    case 'energy':
      view.energy = event.energy;
      return;
    case 'turnStart':
      if (event.who === 'player') {
        view.turn = event.turn;
        view.acting = 'player';
      }
      return;
    case 'turnEnd':
      if (event.who === 'player') view.acting = 'enemy';
      return;
    case 'draw': {
      const card = cards.get(event.uid) ?? { uid: event.uid, id: event.card, upgraded: false };
      view.hand.push({ ...card });
      view.drawCount = Math.max(0, view.drawCount - 1);
      return;
    }
    case 'shuffle':
      view.drawCount += event.count;
      view.discardCount = 0;
      return;
    case 'playCard':
      removeFromHand(view, event.uid);
      return;
    case 'cardMoved':
      switch (event.to) {
        case 'hand': {
          const card = cards.get(event.uid) ?? { uid: event.uid, id: event.card, upgraded: false };
          view.hand.push({ ...card });
          return;
        }
        case 'discard':
          removeFromHand(view, event.uid);
          view.discardCount++;
          return;
        case 'exhaust':
          removeFromHand(view, event.uid);
          view.exhaustCount++;
          return;
        case 'draw':
          view.drawCount++;
          return;
        case 'removed':
          removeFromHand(view, event.uid);
          return;
      }
      return;
    case 'damage': {
      const c = creature(view, event.target);
      if (!c) return;
      c.block = Math.max(0, c.block - event.blocked);
      c.hp = Math.max(0, c.hp - event.hpLost);
      return;
    }
    case 'hpLoss': {
      const c = creature(view, event.target);
      if (c) c.hp = Math.max(0, c.hp - event.amount);
      return;
    }
    case 'heal': {
      const c = creature(view, event.target);
      if (c) c.hp = Math.min(c.maxHp, c.hp + event.amount);
      return;
    }
    case 'block': {
      const c = creature(view, event.target);
      if (c) c.block = event.total;
      return;
    }
    case 'blockReset': {
      const c = creature(view, event.target);
      if (c) c.block = 0;
      return;
    }
    case 'status': {
      const c = creature(view, event.target);
      if (!c) return;
      if (event.stacks === 0) delete c.statuses[event.status];
      else c.statuses[event.status] = event.stacks;
      return;
    }
    case 'death': {
      const c = creature(view, event.target);
      if (c) {
        c.dead = true;
        c.block = 0;
      }
      return;
    }
    case 'intent': {
      const c = creature(view, event.enemy);
      if (c) {
        c.moveId = event.move;
        delete c.acted;
      }
      return;
    }
    case 'enemyMove': {
      const c = creature(view, event.enemy);
      if (c) c.acted = true;
      return;
    }
    case 'victory':
      view.phase = 'victory';
      return;
    case 'defeat':
      view.phase = 'defeat';
      return;
    default:
      return;
  }
}

export function cloneView(view: BattleView): BattleView {
  return {
    ...view,
    player: { ...view.player, statuses: { ...view.player.statuses } },
    enemies: view.enemies.map((e) => ({ ...e, statuses: { ...e.statuses } })),
    hand: view.hand.map((c) => ({ ...c })),
  };
}
