/**
 * Enemy illustrations, drawn in code from a small set of body plans.
 * Each enemy picks a body, a palette and optional extras in `ENEMY_ART`
 * (see specs.ts). All enemies face left, toward the player.
 * viewBox 0 0 200 200; feet/base sit near y = 190.
 */
import type { JSX } from 'react';

const O = 'var(--space-950)';
const S = { stroke: O, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export type BodyPlan =
  | 'mite'
  | 'worm'
  | 'drone'
  | 'turret'
  | 'scavenger'
  | 'blob'
  | 'crab'
  | 'orb'
  | 'construct'
  | 'swarm'
  | 'jelly'
  | 'warden'
  | 'hive'
  | 'heart';

export type Feature = 'antenna' | 'spikes' | 'horns' | 'crown' | 'jet' | 'stripes' | 'scar' | 'glow' | 'shield' | 'saw';

export interface EnemyArtSpec {
  body: BodyPlan;
  main: string;
  accent: string;
  eye: string;
  /** Visual size multiplier (bosses ~1.4). */
  scale?: number;
  features?: Feature[];
}

interface P {
  m: string;
  a: string;
  e: string;
  f: Set<Feature>;
}

function eyeDot(cx: number, cy: number, r: number, color: string): JSX.Element {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} stroke={O} strokeWidth="3" />
      <circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.3} fill="#fff" opacity="0.85" />
    </g>
  );
}

function hazardBand(x: number, y: number, w: number, h: number, id: string): JSX.Element {
  return (
    <g>
      <defs>
        <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="12" fill="var(--amber)" />
          <rect x="6" width="6" height="12" fill={O} />
        </pattern>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} stroke={O} strokeWidth="3" />
    </g>
  );
}

const BODIES: Record<BodyPlan, (p: P) => JSX.Element> = {
  mite: ({ m, a, e, f }) => (
    <g>
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${80 + i * 30} 140 L${70 + i * 32} 176 L${62 + i * 32} 186`} fill="none" {...S} strokeWidth="6" />
      ))}
      <ellipse cx="110" cy="125" rx="62" ry="40" fill={m} {...S} />
      <path d="M78 95 Q110 118 142 92 M70 120 Q110 140 168 118" fill="none" stroke={O} strokeWidth="3" opacity="0.5" />
      {f.has('spikes') && <path d="M90 88 L96 70 L104 86 M118 86 L126 66 L132 88 M146 96 L158 80 L158 102" fill={a} {...S} strokeWidth="3" />}
      <circle cx="56" cy="134" r="26" fill={a} {...S} />
      {eyeDot(46, 128, 7, e)}
      {eyeDot(64, 124, 5, e)}
      <path d="M34 146 L28 156 M42 152 L40 162" stroke={O} strokeWidth="5" strokeLinecap="round" />
      {f.has('antenna') && <path d="M50 110 Q40 84 26 80 M60 108 Q60 82 72 74" fill="none" stroke={O} strokeWidth="4" strokeLinecap="round" />}
    </g>
  ),
  worm: ({ m, a, e, f }) => (
    <g>
      <path d="M176 180 Q186 120 140 110 Q96 100 96 70 Q96 44 66 46" fill="none" stroke={O} strokeWidth="44" strokeLinecap="round" />
      <path d="M176 180 Q186 120 140 110 Q96 100 96 70 Q96 44 66 46" fill="none" stroke={m} strokeWidth="36" strokeLinecap="round" />
      {[
        [170, 150],
        [150, 116],
        [116, 104],
        [98, 78],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill={a} stroke={O} strokeWidth="2" />
      ))}
      {f.has('spikes') && <path d="M120 92 L126 76 L134 96 M150 100 L162 86 L164 108" fill={a} {...S} strokeWidth="3" />}
      <circle cx="58" cy="50" r="30" fill={a} {...S} />
      <circle cx="50" cy="54" r="17" fill={O} />
      {Array.from({ length: 8 }, (_, i) => {
        const ang = (Math.PI * 2 * i) / 8;
        const x1 = 50 + 17 * Math.cos(ang);
        const y1 = 54 + 17 * Math.sin(ang);
        const x2 = 50 + 9 * Math.cos(ang + 0.2);
        const y2 = 54 + 9 * Math.sin(ang + 0.2);
        return <path key={i} d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`} stroke="#f3ead2" strokeWidth="3" strokeLinecap="round" />;
      })}
      {eyeDot(74, 32, 6, e)}
    </g>
  ),
  drone: ({ m, a, e, f }) => (
    <g>
      {f.has('jet') && <path d="M88 150 L100 186 L112 150 Z" fill="var(--amber)" stroke={O} strokeWidth="3" />}
      <path d="M40 66 H90 M110 66 H160" stroke={O} strokeWidth="7" strokeLinecap="round" />
      <path d="M40 66 H90 M110 66 H160" stroke="var(--steel-300)" strokeWidth="3" strokeLinecap="round" />
      <path d="M64 66 V84 M136 66 V84" stroke={O} strokeWidth="5" />
      <rect x="44" y="80" width="112" height="72" rx="18" fill={m} {...S} />
      <rect x="56" y="92" width="64" height="44" rx="10" fill={O} />
      {eyeDot(86, 114, 14, e)}
      <rect x="128" y="96" width="16" height="10" rx="2" fill={a} stroke={O} strokeWidth="2" />
      <rect x="128" y="114" width="16" height="10" rx="2" fill={a} stroke={O} strokeWidth="2" />
      {f.has('saw') && (
        <g>
          <path d="M44 132 L20 150" stroke={O} strokeWidth="6" />
          <circle cx="16" cy="154" r="16" fill="var(--steel-300)" {...S} strokeWidth="3" strokeDasharray="6 3" />
        </g>
      )}
      {f.has('antenna') && <path d="M100 80 V46" stroke={O} strokeWidth="4" />}
      {f.has('antenna') && <circle cx="100" cy="42" r="6" fill={a} stroke={O} strokeWidth="3" />}
    </g>
  ),
  turret: ({ m, a, e, f }) => (
    <g>
      <path d="M50 190 L66 140 H150 L166 190 Z" fill="var(--steel-600)" {...S} />
      {f.has('stripes') && hazardBand(62, 168, 92, 14, 'turret-haz')}
      <path d="M58 122 Q60 70 110 70 Q160 70 160 122 Z" fill={m} {...S} />
      <rect x="10" y="94" width="66" height="18" rx="4" fill={a} {...S} />
      <rect x="2" y="90" width="14" height="26" rx="3" fill="var(--steel-500)" {...S} />
      <rect x="54" y="120" width="112" height="22" rx="4" fill={m} {...S} />
      {eyeDot(122, 98, 11, e)}
      {f.has('antenna') && <path d="M140 72 L152 40" stroke={O} strokeWidth="4" />}
    </g>
  ),
  scavenger: ({ m, a, e, f }) => (
    <g>
      <path d="M86 150 L80 188 M118 150 L124 188" stroke={O} strokeWidth="16" strokeLinecap="round" />
      <path d="M86 150 L80 188 M118 150 L124 188" stroke={m} strokeWidth="10" strokeLinecap="round" />
      <rect x="112" y="80" width="40" height="56" rx="8" fill="var(--steel-500)" {...S} />
      <path d="M72 82 Q102 70 132 82 L136 154 H68 Z" fill={m} {...S} />
      {f.has('stripes') && hazardBand(70, 126, 64, 10, 'scav-haz')}
      <path d="M78 98 Q60 108 46 124" stroke={O} strokeWidth="16" strokeLinecap="round" />
      <path d="M78 98 Q60 108 46 124" stroke={m} strokeWidth="10" strokeLinecap="round" />
      {f.has('saw') ? (
        <circle cx="36" cy="128" r="18" fill="var(--steel-300)" {...S} strokeWidth="3" strokeDasharray="6 3" />
      ) : (
        <path d="M20 134 L54 118" stroke={O} strokeWidth="12" strokeLinecap="round" />
      )}
      <circle cx="102" cy="58" r="30" fill="var(--steel-400)" {...S} />
      <path d="M76 56 Q90 44 110 50 L112 70 Q92 76 78 68 Z" fill={e} stroke={O} strokeWidth="3" />
      <path d="M84 56 L94 54" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      {f.has('scar') && <path d="M116 40 L126 62 M120 44 L112 48 M124 54 L116 58" stroke={O} strokeWidth="3" />}
      {f.has('antenna') && <path d="M120 32 L132 6" stroke={O} strokeWidth="4" />}
      {f.has('crown') && <path d="M80 34 L84 18 L94 30 L102 14 L110 30 L120 18 L124 34 Z" fill={a} {...S} strokeWidth="3" />}
      <rect x="86" y="96" width="30" height="16" rx="3" fill={a} stroke={O} strokeWidth="3" />
    </g>
  ),
  blob: ({ m, a, e, f }) => (
    <g>
      <path d="M30 186 Q20 120 60 92 Q100 60 140 92 Q180 120 172 186 Z" fill={m} {...S} />
      <path d="M52 110 Q70 86 96 84" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
      <path d="M60 186 Q62 196 70 196 M120 186 Q118 198 128 198" fill="none" stroke={m} strokeWidth="8" strokeLinecap="round" />
      {f.has('glow') && <circle cx="112" cy="146" r="16" fill={a} opacity="0.7" />}
      {eyeDot(72, 120, 12, e)}
      {eyeDot(104, 112, 9, e)}
      <path d="M66 148 Q84 160 102 146" fill="none" stroke={O} strokeWidth="4" strokeLinecap="round" />
      {f.has('spikes') && <path d="M90 68 L96 46 L104 66 M130 80 L144 60 L144 88" fill={a} {...S} strokeWidth="3" />}
    </g>
  ),
  crab: ({ m, a, e, f }) => (
    <g>
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${96 + i * 22} 150 L${88 + i * 26} 182`} stroke={O} strokeWidth="7" strokeLinecap="round" />
      ))}
      <path d="M50 150 Q50 96 110 92 Q170 96 170 150 Z" fill={m} {...S} />
      {f.has('stripes') && hazardBand(62, 132, 98, 12, 'crab-haz')}
      <path d="M70 116 L30 92" stroke={O} strokeWidth="14" strokeLinecap="round" />
      <path d="M70 116 L30 92" stroke={m} strokeWidth="8" strokeLinecap="round" />
      <path d="M36 98 Q4 96 6 66 Q20 72 30 80 Q22 60 40 52 Q46 76 36 98 Z" fill={a} {...S} />
      <path d="M78 140 L40 156" stroke={O} strokeWidth="12" strokeLinecap="round" />
      <path d="M46 160 Q16 170 14 150 Q26 150 32 144 Q20 136 34 128 Q46 140 46 160 Z" fill={a} {...S} />
      <path d="M92 94 L84 66 M112 92 L112 62" stroke={O} strokeWidth="4" />
      {eyeDot(84, 62, 8, e)}
      {eyeDot(112, 58, 8, e)}
    </g>
  ),
  orb: ({ m, a, e, f }) => (
    <g>
      {f.has('jet') && <path d="M86 168 L100 196 L114 168 Z" fill="var(--teal)" stroke={O} strokeWidth="3" />}
      <circle cx="100" cy="100" r="66" fill={m} {...S} />
      <path d="M44 72 Q100 46 156 72 M40 126 Q100 154 160 126" fill="none" stroke={O} strokeWidth="3" opacity="0.5" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x="92" y="24" width="16" height="22" rx="3" fill={a} stroke={O} strokeWidth="3" transform={`rotate(${i * 90 - 45} 100 100)`} />
      ))}
      <circle cx="88" cy="100" r="30" fill="#e8ecf5" {...S} />
      <circle cx="80" cy="100" r="15" fill={e} stroke={O} strokeWidth="3" />
      <circle cx="78" cy="100" r="6" fill={O} />
      {f.has('glow') && <circle cx="88" cy="100" r="38" fill="none" stroke={e} strokeWidth="3" opacity="0.6" />}
    </g>
  ),
  construct: ({ m, a, e, f }) => (
    <g>
      <rect x="70" y="150" width="24" height="38" fill="var(--steel-600)" {...S} />
      <rect x="112" y="150" width="24" height="38" fill="var(--steel-600)" {...S} />
      <path d="M56 70 L150 64 L158 156 L50 160 Z" fill={m} {...S} />
      <path d="M60 100 L154 96 M58 128 L156 126" stroke={O} strokeWidth="3" opacity="0.6" />
      {[
        [66, 80],
        [140, 76],
        [66, 144],
        [140, 140],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill={O} />
      ))}
      <circle cx="104" cy="112" r="18" fill={a} stroke={O} strokeWidth="4" />
      <circle cx="104" cy="112" r="8" fill="#fff4d6" />
      <path d="M56 84 L26 120 L30 150" fill="none" stroke={O} strokeWidth="16" strokeLinecap="round" />
      <path d="M56 84 L26 120 L30 150" fill="none" stroke="var(--steel-500)" strokeWidth="10" strokeLinecap="round" />
      <rect x="18" y="146" width="26" height="22" rx="4" fill="var(--steel-400)" {...S} />
      <rect x="78" y="30" width="54" height="40" rx="6" fill="var(--steel-500)" {...S} />
      <rect x="84" y="42" width="30" height="12" rx="3" fill={e} stroke={O} strokeWidth="3" />
      {f.has('spikes') && <path d="M84 30 L88 14 L96 30 M114 30 L122 12 L126 30" fill={a} {...S} strokeWidth="3" />}
    </g>
  ),
  swarm: ({ m, a, e }) => (
    <g>
      {[
        [60, 70, 0.7],
        [130, 60, 0.6],
        [100, 120, 0.85],
        [40, 150, 0.65],
        [150, 150, 0.7],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M-20 18 L-30 34 M0 22 L0 38 M20 18 L30 34" stroke={O} strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="0" cy="0" rx="34" ry="24" fill={m} {...S} />
          <circle cx="-30" cy="6" r="15" fill={a} {...S} />
          {eyeDot(-35, 2, 5, e)}
        </g>
      ))}
    </g>
  ),
  jelly: ({ m, a, e, f }) => (
    <g>
      {[60, 82, 104, 126, 148].map((x, i) => (
        <path key={x} d={`M${x} 110 Q${x - 12} ${140 + (i % 2) * 10} ${x + 4} 160 Q${x + 14} 176 ${x - 2} 192`} fill="none" stroke={a} strokeWidth="6" strokeLinecap="round" />
      ))}
      <path d="M40 112 Q40 30 104 30 Q168 30 168 112 Q150 122 132 112 Q118 124 104 112 Q90 124 76 112 Q58 122 40 112 Z" fill={m} {...S} opacity="0.95" />
      <path d="M62 70 Q74 46 100 42" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
      {f.has('glow') && <circle cx="110" cy="78" r="20" fill={a} opacity="0.55" />}
      {eyeDot(84, 84, 10, e)}
      {eyeDot(112, 80, 7, e)}
    </g>
  ),
  warden: ({ m, a, e }) => (
    <g>
      <rect x="44" y="160" width="132" height="34" rx="16" fill="var(--steel-600)" {...S} />
      {[62, 88, 114, 140, 160].map((x) => (
        <circle key={x} cx={x} cy="177" r="8" fill="var(--steel-400)" stroke={O} strokeWidth="3" />
      ))}
      <path d="M58 160 L66 70 Q110 50 154 70 L164 160 Z" fill={m} {...S} />
      {hazardBand(64, 138, 94, 16, 'warden-haz')}
      <rect x="84" y="84" width="54" height="40" rx="6" fill={O} />
      <rect x="90" y="94" width="42" height="12" rx="3" fill={e} />
      <path d="M110 58 V40" stroke={O} strokeWidth="5" />
      <path d="M96 40 Q96 20 110 20 Q124 20 124 40 Z" fill={a} {...S} />
      <path d="M66 86 L30 100 L20 130" fill="none" stroke={O} strokeWidth="20" strokeLinecap="round" />
      <path d="M66 86 L30 100 L20 130" fill="none" stroke="var(--steel-500)" strokeWidth="13" strokeLinecap="round" />
      <path d="M6 128 L22 124 L38 130 L30 160 L22 144 L14 160 Z" fill={a} {...S} />
      <path d="M156 84 L184 110" stroke={O} strokeWidth="16" strokeLinecap="round" />
      <rect x="170" y="104" width="24" height="32" rx="4" fill="var(--steel-400)" {...S} />
    </g>
  ),
  hive: ({ m, a, e }) => (
    <g>
      <path d="M40 190 Q24 120 70 80 Q100 56 132 80 Q178 120 162 190 Z" fill={m} {...S} />
      {(
        [
          [80, 120],
          [116, 116],
          [98, 150],
          [64, 158],
          [134, 154],
          [98, 92],
        ] as [number, number][]
      ).map(([x, y], i) => (
        <path
          key={i}
          d={`M${x - 12} ${y} L${x - 6} ${y - 10} H${x + 6} L${x + 12} ${y} L${x + 6} ${y + 10} H${x - 6} Z`}
          fill={i % 2 ? a : 'var(--space-800)'}
          stroke={O}
          strokeWidth="3"
        />
      ))}
      <path d="M70 80 Q60 40 80 20 M132 80 Q148 44 128 18" fill="none" stroke={O} strokeWidth="6" strokeLinecap="round" />
      <circle cx="100" cy="58" r="26" fill={a} {...S} />
      {eyeDot(90, 54, 8, e)}
      {eyeDot(112, 54, 6, e)}
      <path d="M86 70 Q100 80 114 70" fill="none" stroke={O} strokeWidth="4" />
    </g>
  ),
  heart: ({ m, a, e }) => (
    <g>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const ang = (Math.PI * 2 * i) / 6 + 0.3;
        const x = 100 + 92 * Math.cos(ang);
        const y = 104 + 80 * Math.sin(ang);
        return (
          <path
            key={i}
            d={`M100 104 Q${(100 + x) / 2 + 20} ${(104 + y) / 2 - 20} ${x.toFixed(0)} ${y.toFixed(0)}`}
            fill="none"
            stroke={a}
            strokeWidth="10"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx="100" cy="104" r="62" fill={m} {...S} />
      <circle cx="100" cy="104" r="44" fill={O} />
      <circle cx="100" cy="104" r="32" fill={e} />
      <circle cx="100" cy="104" r="16" fill="#fff4d6" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x="94" y="34" width="12" height="18" rx="3" fill="var(--steel-400)" stroke={O} strokeWidth="3" transform={`rotate(${i * 45} 100 104)`} />
      ))}
    </g>
  ),
};

export function EnemyArt({ spec, className }: { spec: EnemyArtSpec; className?: string }) {
  const p: P = { m: spec.main, a: spec.accent, e: spec.eye, f: new Set(spec.features ?? []) };
  const draw = BODIES[spec.body];
  return (
    <svg className={className} viewBox="-10 0 220 205" overflow="visible" aria-hidden="true">
      <ellipse cx="100" cy="196" rx="70" ry="7" fill="#000" opacity="0.35" />
      {draw(p)}
      {p.f.has('horns') && <path d="M70 60 Q60 30 76 20 Q74 40 86 54 M130 60 Q140 30 124 20 Q126 40 114 54" fill={spec.accent} stroke={O} strokeWidth="3" />}
    </svg>
  );
}
