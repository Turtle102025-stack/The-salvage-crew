import { describe, expect, it } from 'vitest';
import { availableNodes, createRng, generateMap, MAP_FLOORS, type MapState } from '../src/engine';

function parents(map: MapState, id: string) {
  return Object.values(map.nodes).filter((n) => n.next.includes(id));
}

describe('map generation', () => {
  const maps = Array.from({ length: 60 }, (_, i) => generateMap(createRng(`MAP-${i}`, 'map'), 1));

  it('has every floor, and everything leads to the boss', () => {
    for (const map of maps) {
      for (let f = 1; f <= MAP_FLOORS; f++) expect(Object.values(map.nodes).some((n) => n.floor === f)).toBe(true);
      for (const n of Object.values(map.nodes)) {
        if (n.type === 'boss') continue;
        expect(n.next.length).toBeGreaterThan(0);
        for (const id of n.next) expect(map.nodes[id]!.floor).toBe(n.floor + 1);
      }
      // Every node is reachable from the start.
      const seen = new Set<string>();
      const stack = availableNodes(map, null);
      while (stack.length) {
        const id = stack.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        stack.push(...map.nodes[id]!.next);
      }
      expect(seen.size).toBe(Object.keys(map.nodes).length);
    }
  });

  it('never has crossing paths', () => {
    for (const map of maps) {
      const edges = Object.values(map.nodes).flatMap((n) => n.next.filter((id) => id !== 'boss').map((id) => [n.floor, n.col, map.nodes[id]!.col] as const));
      for (const [f, a, b] of edges) {
        for (const [f2, c, d] of edges) {
          if (f !== f2) continue;
          expect(a < c && b > d).toBe(false);
        }
      }
    }
  });

  it('follows the node-type rules', () => {
    for (const map of maps) {
      const nodes = Object.values(map.nodes);
      for (const n of nodes) {
        if (n.floor === 1) expect(n.type).toBe('battle');
        if (n.floor === 9) expect(n.type).toBe('treasure');
        if (n.floor === MAP_FLOORS) expect(n.type).toBe('rest');
        if (n.floor < 6) expect(['elite', 'rest']).not.toContain(n.type);
        if (['elite', 'rest', 'shop', 'treasure'].includes(n.type)) {
          for (const p of parents(map, n.id)) expect(p.type).not.toBe(n.type);
        }
      }
      expect(nodes.filter((n) => n.type === 'elite').length).toBeGreaterThanOrEqual(1);
      expect(nodes.filter((n) => n.type === 'boss')).toHaveLength(1);
    }
  });

  it('is deterministic for a seed', () => {
    expect(generateMap(createRng('SAME', 'map'), 1)).toEqual(generateMap(createRng('SAME', 'map'), 1));
  });
});
