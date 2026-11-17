/**
 * Behind every fight: stars, drifting debris and the distant hulk of the
 * colony ship Meridian. `act` tints the scene (1 = belt, 2 = hulk, 3 = heart).
 */
import { memo } from 'react';

function stars(seed: number, count: number) {
  let s = seed;
  const next = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  return Array.from({ length: count }, () => ({ x: next() * 1600, y: next() * 700, r: next() < 0.12 ? 1.8 : 1, o: 0.25 + next() * 0.6 }));
}

const STARS = stars(9001, 140);

const TINT: Record<number, { hull: string; glow: string }> = {
  1: { hull: '#1a2340', glow: 'rgba(46, 196, 182, 0.18)' },
  2: { hull: '#20183a', glow: 'rgba(155, 107, 255, 0.2)' },
  3: { hull: '#2a1426', glow: 'rgba(255, 122, 61, 0.22)' },
};

export const StageBackdrop = memo(function StageBackdrop({ act = 1 }: { act?: number }) {
  const t = TINT[act] ?? TINT[1]!;
  return (
    <svg className="stage-backdrop" viewBox="0 0 1600 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {STARS.map((st, i) => (
        <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#c9d3ea" opacity={st.o} />
      ))}
      <ellipse cx="1150" cy="260" rx="420" ry="160" fill={t.glow} />
      {/* The Meridian: a long, broken colony ship on the horizon */}
      <g fill={t.hull} stroke="#05080f" strokeWidth="4" opacity="0.95">
        <path d="M560 330 L700 300 L1180 290 L1240 250 L1300 262 L1330 300 L1520 312 L1560 340 L1500 372 L1160 382 L700 380 L590 360 Z" />
        <rect x="760" y="250" width="70" height="52" />
        <rect x="900" y="232" width="40" height="70" />
        <path d="M980 292 L1010 210 L1030 292 Z" />
        <path d="M1380 312 L1420 250 L1440 252 L1420 312 Z" />
        <path d="M600 345 L520 330 L470 352 L540 368 Z" />
      </g>
      <g fill="none" stroke="#05080f" strokeWidth="3" opacity="0.6">
        <path d="M700 330 H1160 M760 352 H1120" />
      </g>
      {[730, 810, 870, 1040, 1100, 1210, 1450].map((x, i) => (
        <rect key={x} x={x} y={i % 2 ? 318 : 340} width="8" height="5" fill="#f5a524" opacity={0.35 + (i % 3) * 0.2} />
      ))}
      {/* Near debris */}
      <g fill="#141c33" stroke="#05080f" strokeWidth="4">
        <path d="M80 140 L170 120 L190 170 L120 196 Z" />
        <path d="M1420 90 L1500 70 L1530 110 L1470 130 Z" />
        <path d="M300 60 L330 52 L338 74 L310 82 Z" />
      </g>
    </svg>
  );
});
