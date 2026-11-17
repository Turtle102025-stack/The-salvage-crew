/**
 * Map generation: a branching climb of `floors` floors on a grid of `cols`
 * columns, ending in a boss node. Six paths are walked from the bottom up
 * (never crossing), then node types are assigned with genre rules:
 * - floor 1 is always a fight; the middle floor is a Cargo Pod (treasure);
 *   the last floor before the boss is a Docking Bay (rest);
 * - no Hazards (elites) or rest stops in the first few floors;
 * - Hazards, rest stops, shops and treasure never come twice in a row.
 */
import { nextFloat, nextInt, pick, weightedPick, type RngState } from '../rng';
import type { MapNode, MapState, NodeType } from './types';

export const MAP_FLOORS = 15;
export const MAP_COLS = 7;
const PATHS = 6;

const nodeId = (floor: number, col: number) => `${floor}-${col}`;

const NO_REPEAT: ReadonlySet<NodeType> = new Set<NodeType>(['elite', 'rest', 'shop', 'treasure']);

export function generateMap(rng: RngState, act: number, floors = MAP_FLOORS, cols = MAP_COLS): MapState {
  const nodes: Record<string, MapNode> = {};
  const edges = new Set<string>(); // "f-c>c2"

  const ensure = (floor: number, col: number): MapNode => {
    const id = nodeId(floor, col);
    nodes[id] ??= { id, floor, col, type: 'battle', next: [] };
    return nodes[id];
  };

  let firstStart = -1;
  for (let p = 0; p < PATHS; p++) {
    let col = nextInt(rng, 0, cols - 1);
    if (p === 1) while (col === firstStart) col = nextInt(rng, 0, cols - 1);
    if (p === 0) firstStart = col;
    ensure(1, col);
    for (let floor = 1; floor < floors; floor++) {
      const options = [col - 1, col, col + 1].filter((c) => c >= 0 && c < cols);
      // Don't cross an existing edge: (floor, c±1) -> (floor+1, c).
      const allowed = options.filter((c2) => {
        if (c2 === col) return true;
        const crossing = `${floor}-${c2}>${col}`;
        return !edges.has(crossing);
      });
      const next = pick(rng, allowed.length ? allowed : [col]);
      edges.add(`${floor}-${col}>${next}`);
      const from = ensure(floor, col);
      const to = ensure(floor + 1, next);
      if (!from.next.includes(to.id)) from.next.push(to.id);
      col = next;
    }
  }

  const boss: MapNode = { id: 'boss', floor: floors + 1, col: Math.floor(cols / 2), type: 'boss', next: [] };
  nodes.boss = boss;
  for (const n of Object.values(nodes)) if (n.floor === floors) n.next = ['boss'];

  assignTypes(rng, nodes, floors);
  for (const n of Object.values(nodes)) n.next.sort();
  return { act, floors, cols, nodes, boss: 'boss' };
}

function parentsOf(nodes: Record<string, MapNode>, id: string): MapNode[] {
  return Object.values(nodes).filter((n) => n.next.includes(id));
}

function assignTypes(rng: RngState, nodes: Record<string, MapNode>, floors: number): void {
  const treasureFloor = Math.ceil(floors / 2) + 1; // 9 of 15
  const ordered = Object.values(nodes)
    .filter((n) => n.type !== 'boss')
    .sort((a, b) => a.floor - b.floor || a.col - b.col);
  for (const node of ordered) {
    if (node.floor === 1) node.type = 'battle';
    else if (node.floor === treasureFloor) node.type = 'treasure';
    else if (node.floor === floors) node.type = 'rest';
    else {
      const parents = parentsOf(nodes, node.id);
      const siblings = parents.flatMap((p) => p.next).filter((id) => id !== node.id);
      const weights: [NodeType, number][] = [
        ['battle', 46],
        ['event', 24],
        ['elite', node.floor >= 6 ? 11 : 0],
        ['rest', node.floor >= 6 && node.floor !== floors - 1 ? 12 : 0],
        ['shop', node.floor >= 3 ? 7 : 0],
      ];
      const ok = weights.map(([type, w]): [NodeType, number] => {
        if (w === 0) return [type, 0];
        if (NO_REPEAT.has(type) && parents.some((p) => p.type === type)) return [type, 0];
        // Siblings prefer variety.
        if (type !== 'battle' && siblings.some((id) => nodes[id]?.type === type && nodes[id]!.floor === node.floor && nodes[id]!.col < node.col)) {
          return [type, w * 0.3];
        }
        return [type, w];
      });
      node.type = weightedPick(rng, ok);
    }
  }
  // Make sure each act has at least one shop and a couple of elites.
  ensureAtLeast(rng, nodes, 'shop', 1, 3, floors - 2, ordered);
  ensureAtLeast(rng, nodes, 'elite', 2, 6, floors - 1, ordered);
}

function ensureAtLeast(
  rng: RngState,
  nodes: Record<string, MapNode>,
  type: NodeType,
  count: number,
  minFloor: number,
  maxFloor: number,
  ordered: MapNode[],
): void {
  let have = ordered.filter((n) => n.type === type).length;
  let guard = 0;
  while (have < count && guard++ < 50) {
    const candidates = ordered.filter(
      (n) =>
        n.floor >= minFloor &&
        n.floor <= maxFloor &&
        (n.type === 'battle' || n.type === 'event') &&
        !parentsOf(nodes, n.id).some((p) => p.type === type) &&
        !n.next.some((id) => nodes[id]?.type === type),
    );
    if (!candidates.length) return;
    const chosen = candidates[Math.floor(nextFloat(rng) * candidates.length)]!;
    chosen.type = type;
    have++;
  }
}

/** Nodes the player may move to next. */
export function availableNodes(map: MapState, position: string | null): string[] {
  if (position === null) {
    return Object.values(map.nodes)
      .filter((n) => n.floor === 1)
      .sort((a, b) => a.col - b.col)
      .map((n) => n.id);
  }
  return map.nodes[position]?.next ?? [];
}
