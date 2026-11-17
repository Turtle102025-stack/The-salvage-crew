/** The act map: a vertical climb from floor 1 to the boss. */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { availableNodes, describeEnemies, type Content, type MapNode, type NodeType, type RunState } from '../../engine';
import { Glyph } from '../art/glyphs';
import { TipBody, Tooltip } from '../components/Tooltip';
import './MapView.css';

export const NODE_INFO: Record<NodeType, { name: string; glyph: string; color: string; text: string }> = {
  battle: { name: 'Fight', glyph: 'claw', color: 'var(--steel-300)', text: 'Local wildlife or a rival crew. Win for Credits and a new card.' },
  elite: { name: 'Hazard', glyph: 'hazard', color: 'var(--card-attack)', text: 'A dangerous enemy. Tough, but it guards Salvage.' },
  rest: { name: 'Docking Bay', glyph: 'moon', color: 'var(--teal)', text: 'Rest to heal, or tinker to upgrade a card.' },
  shop: { name: 'Trader', glyph: 'bag', color: 'var(--rarity-rare)', text: 'Buy cards, Salvage and Canisters, or pay to have a card removed.' },
  event: { name: 'Signal', glyph: 'antenna', color: '#b28cff', text: 'Something out there is broadcasting. Could be anything.' },
  treasure: { name: 'Cargo Pod', glyph: 'crate', color: 'var(--amber)', text: 'Unclaimed cargo. Usually contains Salvage.' },
  boss: { name: 'Boss', glyph: 'skull', color: 'var(--hp)', text: 'The thing standing between you and the next payday.' },
};

const ROW = 74;
const PAD_X = 46;
const PAD_Y = 60;
const WIDTH = 560;

function jitter(id: string, amount: number): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * amount;
}

export function bossName(content: Content, run: RunState): string {
  const act = content.acts.find((a) => a.id === run.act);
  const enc = act?.encounters.boss.find((e) => e.id === run.bossEncounter);
  return enc?.name ?? (enc ? describeEnemies(content, enc.enemies) : 'Unknown');
}

export function MapView({ content, run, onChoose }: { content: Content; run: RunState; onChoose?: (node: string) => void }) {
  const { map } = run;
  const height = (map.floors + 1) * ROW + PAD_Y * 2;
  const available = useMemo(() => new Set(onChoose ? availableNodes(map, run.position) : []), [map, run.position, onChoose]);
  const visited = useMemo(() => new Set(run.path), [run.path]);
  const scroller = useRef<HTMLDivElement>(null);

  const pos = (n: MapNode) => {
    if (n.type === 'boss') return { x: WIDTH / 2, y: PAD_Y - 6 };
    const x = PAD_X + (n.col * (WIDTH - PAD_X * 2)) / (map.cols - 1) + jitter(n.id, 22);
    const y = height - PAD_Y - (n.floor - 1) * ROW + jitter(`${n.id}y`, 14);
    return { x, y };
  };

  // Scroll so the current position / next choices are in view.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const floor = run.position ? (map.nodes[run.position]?.floor ?? 0) : 0;
    const y = height - PAD_Y - floor * ROW;
    el.scrollTop = Math.max(0, y - el.clientHeight * 0.6);
  }, [run.position, map, height]);

  const nodes = Object.values(map.nodes);
  const edges = nodes.flatMap((n) => n.next.map((to) => [n, map.nodes[to]!] as const));
  const lastVisited = run.path.at(-1);

  return (
    <div className="map-view">
      <aside className="map-legend" aria-label="Map legend">
        <h3>Legend</h3>
        {(Object.keys(NODE_INFO) as NodeType[]).map((t) => (
          <div key={t} className="legend-row">
            <span className="legend-icon">
              <Glyph name={NODE_INFO[t].glyph} color={NODE_INFO[t].color} size={22} />
            </span>
            {NODE_INFO[t].name}
          </div>
        ))}
      </aside>
      <div className="map-scroll" ref={scroller}>
        <div className="map-canvas" style={{ width: WIDTH, height }}>
          <svg className="map-edges" width={WIDTH} height={height} aria-hidden="true">
            {edges.map(([a, b]) => {
              const p = pos(a);
              const q = pos(b);
              const taken = visited.has(a.id) && visited.has(b.id) && run.path.indexOf(b.id) === run.path.indexOf(a.id) + 1;
              const next = a.id === lastVisited && available.has(b.id);
              return (
                <line
                  key={`${a.id}-${b.id}`}
                  x1={p.x}
                  y1={p.y}
                  x2={q.x}
                  y2={q.y}
                  className={taken ? 'edge taken' : next ? 'edge next' : 'edge'}
                />
              );
            })}
          </svg>
          {nodes.map((n) => {
            const p = pos(n);
            const info = NODE_INFO[n.type];
            const isAvail = available.has(n.id);
            const isVisited = visited.has(n.id);
            const isCurrent = n.id === lastVisited;
            const past = run.position !== null && n.floor <= (map.nodes[run.position]?.floor ?? 0) && !isVisited;
            const label = n.type === 'boss' ? `Boss: ${bossName(content, run)}` : info.name;
            return (
              <Tooltip key={n.id} side="right" content={<TipBody title={label}>{info.text}</TipBody>}>
                <button
                  className={`map-node node-${n.type}${isAvail ? ' available' : ''}${isVisited ? ' visited' : ''}${isCurrent ? ' current' : ''}${past ? ' past' : ''}`}
                  style={{ left: p.x, top: p.y }}
                  disabled={!isAvail}
                  onClick={() => isAvail && onChoose?.(n.id)}
                  aria-label={`${label}, floor ${n.floor}${isAvail ? ' (available)' : ''}`}
                >
                  <Glyph name={info.glyph} color={info.color} size="100%" />
                </button>
              </Tooltip>
            );
          })}
          <div className="map-boss-label" style={{ top: PAD_Y + 34 }}>
            {bossName(content, run)}
          </div>
        </div>
      </div>
    </div>
  );
}
