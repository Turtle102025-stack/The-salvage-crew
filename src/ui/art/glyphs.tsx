/**
 * The shared icon library ("glyphs"). Every icon in the game (card art,
 * relics, potions, statuses, intents, map nodes) is built from these, so the
 * whole game shares one look: chunky flat shapes, dark outlines, amber/teal.
 * All drawn in a 48×48 box.
 */
import type { JSX } from 'react';

const O = 'var(--space-950)'; // outline
const W = 3; // outline width

type Draw = (c: string, c2: string) => JSX.Element;

/** A thick line with a dark outline (two strokes). */
function bar(d: string, color: string, width = 6): JSX.Element {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={O} strokeWidth={width + W * 2} />
      <path d={d} stroke={color} strokeWidth={width} />
    </g>
  );
}

function gearPath(cx: number, cy: number, r: number, teeth: number, depth: number): string {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a1 = (Math.PI * 2 * i) / (teeth * 2) - Math.PI / 2;
    const a2 = (Math.PI * 2 * (i + 1)) / (teeth * 2) - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r - depth;
    pts.push(`${(cx + rr * Math.cos(a1)).toFixed(1)} ${(cy + rr * Math.sin(a1)).toFixed(1)}`);
    pts.push(`${(cx + rr * Math.cos(a2)).toFixed(1)} ${(cy + rr * Math.sin(a2)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

function starPath(cx: number, cy: number, r1: number, r2: number, points: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 === 0 ? r1 : r2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const stroke = { stroke: O, strokeWidth: W, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export const GLYPHS: Record<string, Draw> = {
  wrench: (c) => (
    <g>
      {bar('M12 37 L28 21', c, 7)}
      <path d="M26 12 A10 10 0 1 0 38 26 L33 25 L27 19 L28 14 Z" fill={c} {...stroke} />
      <circle cx="13" cy="36" r="2" fill={O} />
    </g>
  ),
  crowbar: (c) => <g>{bar('M14 40 L32 12 Q35 7 40 11', c, 6)}<path d="M11 41 L17 38" stroke={O} strokeWidth="3" /></g>,
  plate: (c) => (
    <g>
      <rect x="9" y="11" width="30" height="26" rx="4" fill={c} {...stroke} />
      <path d="M14 18 H34" stroke={O} strokeWidth="2" opacity="0.5" />
      {[
        [14, 16],
        [34, 16],
        [14, 32],
        [34, 32],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill={O} />
      ))}
    </g>
  ),
  shield: (c, c2) => (
    <g>
      <path d="M24 5 L39 11 V23 Q39 36 24 43 Q9 36 9 23 V11 Z" fill={c} {...stroke} />
      <path d="M24 11 L33 15 V23 Q33 31 24 36 Z" fill={c2} opacity="0.7" />
    </g>
  ),
  bolt: (c) => <path d="M28 3 L11 27 H22 L18 45 L37 19 H26 Z" fill={c} {...stroke} />,
  flame: (c, c2) => (
    <g>
      <path d="M24 45 Q8 41 11 27 Q13 19 20 12 Q20 21 25 23 Q24 13 31 4 Q35 17 37 23 Q41 41 24 45 Z" fill={c} {...stroke} />
      <path d="M24 41 Q17 39 18 32 Q19 28 23 25 Q24 31 27 31 Q30 34 30 37 Q29 41 24 41 Z" fill={c2} />
    </g>
  ),
  drone: (c, c2) => (
    <g>
      <path d="M8 14 H20 M28 14 H40" stroke={O} strokeWidth="4" strokeLinecap="round" />
      <path d="M14 14 V20 M34 14 V20" stroke={O} strokeWidth="3" />
      <rect x="10" y="19" width="28" height="15" rx="6" fill={c} {...stroke} />
      <circle cx="24" cy="26.5" r="4.5" fill={c2} stroke={O} strokeWidth="2" />
      <path d="M17 34 L14 40 M31 34 L34 40" stroke={O} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  magnet: (c) => (
    <g>
      {bar('M15 9 V25 Q15 37 24 37 Q33 37 33 25 V9', c, 8)}
      <rect x="9.5" y="6" width="11" height="7" fill="var(--steel-300)" {...stroke} />
      <rect x="27.5" y="6" width="11" height="7" fill="var(--steel-300)" {...stroke} />
    </g>
  ),
  gear: (c) => (
    <g>
      <path d={gearPath(24, 24, 18, 8, 5)} fill={c} {...stroke} />
      <circle cx="24" cy="24" r="6" fill={O} />
    </g>
  ),
  crate: (c) => (
    <g>
      <rect x="8" y="12" width="32" height="28" rx="2" fill={c} {...stroke} />
      <path d="M8 22 H40 M8 30 H40" stroke={O} strokeWidth="2.5" />
      <path d="M14 12 V40 M34 12 V40" stroke={O} strokeWidth="2.5" />
    </g>
  ),
  coin: (c) => (
    <g>
      <circle cx="24" cy="24" r="17" fill={c} {...stroke} />
      <circle cx="24" cy="24" r="11" fill="none" stroke={O} strokeWidth="2" opacity="0.6" />
      <path d="M28 18 Q24 15 20 18 Q17 24 20 30 Q24 33 28 30" fill="none" stroke={O} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  heart: (c) => <path d="M24 42 Q6 30 7 18 Q8 9 16 9 Q21 9 24 15 Q27 9 32 9 Q40 9 41 18 Q42 30 24 42 Z" fill={c} {...stroke} />,
  drop: (c, c2) => (
    <g>
      <path d="M24 4 Q38 22 38 30 Q38 43 24 43 Q10 43 10 30 Q10 22 24 4 Z" fill={c} {...stroke} />
      <path d="M17 30 Q17 36 22 38" fill="none" stroke={c2} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  skull: (c) => (
    <g>
      <path d="M24 6 Q40 6 40 21 Q40 29 34 32 V39 H14 V32 Q8 29 8 21 Q8 6 24 6 Z" fill={c} {...stroke} />
      <circle cx="17.5" cy="21" r="4.5" fill={O} />
      <circle cx="30.5" cy="21" r="4.5" fill={O} />
      <path d="M24 26 L21.5 31 H26.5 Z" fill={O} />
      <path d="M19 39 V35 M24 39 V35 M29 39 V35" stroke={O} strokeWidth="2.5" />
    </g>
  ),
  claw: (c) => (
    <g>
      <path d="M10 40 Q12 22 22 8 Q18 24 18 40 Z" fill={c} {...stroke} />
      <path d="M20 42 Q24 22 34 9 Q28 26 28 42 Z" fill={c} {...stroke} />
      <path d="M30 43 Q34 28 42 20 Q38 32 37 43 Z" fill={c} {...stroke} />
    </g>
  ),
  saw: (c) => (
    <g>
      <path d={starPath(24, 24, 20, 14, 12)} fill={c} {...stroke} />
      <circle cx="24" cy="24" r="8" fill="var(--steel-500)" {...stroke} />
      <circle cx="24" cy="24" r="2.5" fill={O} />
    </g>
  ),
  beam: (c, c2) => (
    <g>
      <path d="M17 31 L44 6" stroke={c2} strokeWidth="9" strokeLinecap="round" opacity="0.5" />
      <path d="M17 31 L44 6" stroke="#fff4d6" strokeWidth="3" strokeLinecap="round" />
      <rect x="4" y="27" width="18" height="14" rx="3" fill={c} {...stroke} transform="rotate(-42 13 34)" />
    </g>
  ),
  charge: (c) => (
    <g>
      <rect x="9" y="17" width="30" height="22" rx="3" fill={c} {...stroke} />
      <path d="M9 24 H39 M9 32 H39" stroke={O} strokeWidth="2" opacity="0.5" />
      <path d="M30 17 Q32 9 38 8" fill="none" stroke={O} strokeWidth="2.5" />
      <path d={starPath(39, 7, 6, 2.5, 6)} fill="var(--amber)" stroke={O} strokeWidth="1.5" />
    </g>
  ),
  chain: (c) => (
    <g fill="none">
      <rect x="5" y="17" width="22" height="14" rx="7" stroke={O} strokeWidth="9" />
      <rect x="5" y="17" width="22" height="14" rx="7" stroke={c} strokeWidth="4" />
      <rect x="21" y="17" width="22" height="14" rx="7" stroke={O} strokeWidth="9" />
      <rect x="21" y="17" width="22" height="14" rx="7" stroke={c} strokeWidth="4" />
    </g>
  ),
  target: (c) => (
    <g>
      <circle cx="24" cy="24" r="17" fill={c} {...stroke} />
      <circle cx="24" cy="24" r="10" fill="var(--space-800)" {...stroke} />
      <circle cx="24" cy="24" r="3.5" fill={c} />
      <path d="M24 2 V12 M24 36 V46 M2 24 H12 M36 24 H46" stroke={O} strokeWidth="3" />
    </g>
  ),
  up: (c) => <path d="M24 5 L41 24 H31 V42 H17 V24 H7 Z" fill={c} {...stroke} />,
  down: (c) => <path d="M24 43 L41 24 H31 V6 H17 V24 H7 Z" fill={c} {...stroke} />,
  strike: (c) => (
    <g>
      <path d="M8 40 L34 8 L41 7 L40 14 L12 44 Z" fill={c} {...stroke} />
      <path d="M6 33 L15 42" stroke={O} strokeWidth="5" strokeLinecap="round" />
      <path d="M33 13 L37 11" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </g>
  ),
  question: (c) => (
    <g>
      <circle cx="24" cy="24" r="18" fill={c} {...stroke} />
      <path d="M18 19 Q18 12 24 12 Q31 12 31 18 Q31 23 25 25 V29" fill="none" stroke={O} strokeWidth="4" strokeLinecap="round" />
      <circle cx="25" cy="35" r="2.6" fill={O} />
    </g>
  ),
  star: (c) => <path d={starPath(24, 25, 20, 9, 5)} fill={c} {...stroke} />,
  eye: (c, c2) => (
    <g>
      <path d="M4 24 Q24 4 44 24 Q24 44 4 24 Z" fill="#e8ecf5" {...stroke} />
      <circle cx="24" cy="24" r="8" fill={c} stroke={O} strokeWidth="2.5" />
      <circle cx="24" cy="24" r="3.5" fill={O} />
      <circle cx="21" cy="21" r="1.6" fill={c2} />
    </g>
  ),
  battery: (c) => (
    <g>
      <rect x="10" y="10" width="28" height="32" rx="4" fill="var(--steel-500)" {...stroke} />
      <rect x="18" y="5" width="12" height="6" rx="1" fill="var(--steel-300)" {...stroke} />
      <rect x="15" y="30" width="18" height="7" fill={c} />
      <rect x="15" y="21" width="18" height="7" fill={c} />
      <rect x="15" y="14" width="18" height="5" fill={c} opacity="0.35" />
    </g>
  ),
  hammer: (c) => (
    <g>
      {bar('M18 30 L36 42', 'var(--amber-deep)', 6)}
      <rect x="6" y="8" width="26" height="14" rx="3" fill={c} {...stroke} transform="rotate(35 19 15)" />
    </g>
  ),
  antenna: (c) => (
    <g>
      <path d="M24 22 L15 44 M24 22 L33 44 M19 34 H29" stroke={O} strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="24" cy="20" r="5" fill={c} {...stroke} />
      <path d="M14 11 Q10 20 14 29 M34 11 Q38 20 34 29 M9 6 Q2 20 9 34 M39 6 Q46 20 39 34" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  moon: (c) => (
    <g>
      <path d="M30 5 Q14 8 13 24 Q14 40 31 43 Q16 47 7 35 Q0 24 7 13 Q15 3 30 5 Z" fill={c} {...stroke} />
      <path d={starPath(35, 16, 5, 2, 4)} fill={c} />
      <path d={starPath(40, 30, 3.5, 1.4, 4)} fill={c} />
    </g>
  ),
  bag: (c) => (
    <g>
      <path d="M17 13 L14 7 H34 L31 13 Z" fill={c} {...stroke} />
      <path d="M16 13 H32 Q42 22 41 33 Q40 43 24 43 Q8 43 7 33 Q6 22 16 13 Z" fill={c} {...stroke} />
      <path d="M27 24 Q24 22 21 24 Q19 28 21 32 Q24 34 27 32" fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  ),
  hazard: (c) => (
    <g>
      <path d="M24 5 L44 41 H4 Z" fill={c} {...stroke} />
      <path d="M24 17 V29" stroke={O} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="24" cy="35" r="2.6" fill={O} />
    </g>
  ),
  flask: (c, c2) => (
    <g>
      <rect x="18" y="4" width="12" height="7" rx="2" fill="var(--steel-400)" {...stroke} />
      <path d="M17 11 H31 V16 Q40 21 40 31 Q40 44 24 44 Q8 44 8 31 Q8 21 17 16 Z" fill="var(--steel-600)" {...stroke} />
      <path d="M10.5 29 H37.5 Q37 41 24 41 Q11 41 10.5 29 Z" fill={c} />
      <circle cx="18" cy="34" r="2" fill={c2} />
      <circle cx="27" cy="36" r="1.5" fill={c2} />
    </g>
  ),
  spark: (c) => <path d={starPath(24, 24, 21, 7, 8)} fill={c} {...stroke} />,
  hook: (c) => (
    <g>
      {bar('M24 4 V26 Q24 38 16 38 Q9 38 9 31', c, 6)}
      <path d="M5 30 L9 24 L13 30 Z" fill={c} {...stroke} />
    </g>
  ),
  plus: (c) => <path d="M18 6 H30 V18 H42 V30 H30 V42 H18 V30 H6 V18 H18 Z" fill={c} {...stroke} />,
  snow: (c) => (
    <g stroke={O} strokeWidth="9" strokeLinecap="round">
      <path d="M24 5 V43 M7.5 14.5 L40.5 33.5 M7.5 33.5 L40.5 14.5" />
      <path d="M24 5 V43 M7.5 14.5 L40.5 33.5 M7.5 33.5 L40.5 14.5" stroke={c} strokeWidth="4" />
    </g>
  ),
  rivet: (c) => (
    <g>
      <rect x="20" y="20" width="8" height="22" fill="var(--steel-400)" {...stroke} />
      <path d="M8 22 Q8 8 24 8 Q40 8 40 22 Z" fill={c} {...stroke} />
    </g>
  ),
  ghost: (c, c2) => (
    <g>
      <path d="M10 42 V22 Q10 6 24 6 Q38 6 38 22 V42 L33 37 L28 42 L24 37 L20 42 L15 37 Z" fill={c} {...stroke} />
      <circle cx="19" cy="21" r="3.5" fill={c2} />
      <circle cx="29" cy="21" r="3.5" fill={c2} />
    </g>
  ),
  core: (c, c2) => (
    <g>
      <circle cx="24" cy="24" r="19" fill="var(--steel-600)" {...stroke} />
      <circle cx="24" cy="24" r="11" fill={c} stroke={O} strokeWidth="2.5" />
      <circle cx="24" cy="24" r="5" fill={c2} />
      <path d="M24 2 V9 M24 39 V46 M2 24 H9 M39 24 H46" stroke={O} strokeWidth="3" />
    </g>
  ),
  hand: (c) => (
    <g>
      <path d="M14 44 Q8 34 9 24 L12 14 Q14 11 16 14 L16 24 L17 9 Q19 6 21 9 L22 23 L23 7 Q25 4 27 7 L28 23 L29 10 Q31 7 33 10 L33 27 L36 21 Q39 19 40 22 L36 36 Q33 44 26 44 Z" fill={c} {...stroke} />
    </g>
  ),
  clock: (c) => (
    <g>
      <circle cx="24" cy="25" r="18" fill={c} {...stroke} />
      <path d="M24 14 V25 L32 30" fill="none" stroke={O} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M18 4 H30" stroke={O} strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  card: (c) => (
    <g>
      <rect x="14" y="6" width="22" height="30" rx="3" fill="var(--steel-500)" {...stroke} transform="rotate(-12 25 21)" />
      <rect x="13" y="12" width="22" height="30" rx="3" fill={c} {...stroke} />
      <path d="M18 20 H30 M18 26 H30 M18 32 H26" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  ),
  pile: (c) => (
    <g>
      <rect x="10" y="14" width="24" height="30" rx="3" fill="var(--steel-600)" {...stroke} />
      <rect x="13" y="10" width="24" height="30" rx="3" fill="var(--steel-500)" {...stroke} />
      <rect x="16" y="6" width="24" height="30" rx="3" fill={c} {...stroke} />
    </g>
  ),
  boot: (c) => (
    <g>
      <path d="M14 6 H28 V26 L41 32 Q44 34 43 40 H9 V38 L14 34 Z" fill={c} {...stroke} />
      <path d="M9 40 H43 V44 H9 Z" fill={O} />
      <path d="M14 14 H28 M14 20 H28" stroke={O} strokeWidth="2" opacity="0.5" />
    </g>
  ),
  mask: (c, c2) => (
    <g>
      <path d="M6 16 Q24 6 42 16 Q44 34 32 40 Q24 44 16 40 Q4 34 6 16 Z" fill={c} {...stroke} />
      <path d="M12 20 Q18 17 22 22 L20 26 Q14 26 12 20 Z M36 20 Q30 17 26 22 L28 26 Q34 26 36 20 Z" fill={c2} stroke={O} strokeWidth="2" />
      <path d="M17 34 H31" stroke={O} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  dice: (c) => (
    <g>
      <rect x="8" y="8" width="32" height="32" rx="7" fill={c} {...stroke} />
      {[
        [17, 17],
        [31, 17],
        [24, 24],
        [17, 31],
        [31, 31],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="3" fill={O} />
      ))}
    </g>
  ),
  bandage: (c) => (
    <g>
      <rect x="4" y="16" width="40" height="16" rx="8" fill={c} {...stroke} transform="rotate(-35 24 24)" />
      <rect x="17" y="17" width="14" height="14" fill="#f6e7d0" stroke={O} strokeWidth="2" transform="rotate(-35 24 24)" />
    </g>
  ),
  fist: (c) => (
    <g>
      <rect x="9" y="14" width="28" height="22" rx="7" fill={c} {...stroke} />
      <path d="M16 14 V24 M23 14 V24 M30 14 V24" stroke={O} strokeWidth="2.5" />
      <path d="M10 30 Q4 30 5 24 Q6 20 12 21" fill={c} {...stroke} />
      <rect x="14" y="36" width="20" height="8" rx="2" fill="var(--steel-500)" {...stroke} />
    </g>
  ),
  key: (c) => (
    <g>
      <circle cx="15" cy="16" r="10" fill={c} {...stroke} />
      <circle cx="15" cy="16" r="3.5" fill={O} />
      {bar('M22 23 L40 41', c, 5)}
      <path d="M33 34 L37 30 M37 38 L41 34" stroke={O} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  ring: (c, c2) => (
    <g>
      <circle cx="24" cy="27" r="15" fill="none" stroke={O} strokeWidth="11" />
      <circle cx="24" cy="27" r="15" fill="none" stroke={c} strokeWidth="5" />
      <path d="M17 6 H31 L35 12 L24 20 L13 12 Z" fill={c2} {...stroke} />
    </g>
  ),
};

export type GlyphName = keyof typeof GLYPHS;

export function Glyph(props: { name: string; color?: string; color2?: string; size?: number | string; className?: string; title?: string }) {
  const draw = GLYPHS[props.name] ?? GLYPHS.question!;
  const size = props.size ?? 24;
  return (
    <svg
      className={props.className}
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden={props.title ? undefined : true}
      role={props.title ? 'img' : undefined}
      overflow="visible"
    >
      {props.title && <title>{props.title}</title>}
      {draw(props.color ?? 'var(--amber)', props.color2 ?? 'var(--teal)')}
    </svg>
  );
}
