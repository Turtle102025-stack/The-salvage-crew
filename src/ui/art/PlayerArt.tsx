/**
 * Juno Kade, the Rigger: orange work suit, teal visor, wrench in hand.
 * Faces right, toward the enemies. viewBox 0 0 200 220.
 */
const O = 'var(--space-950)';
const S = { stroke: O, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export function PlayerArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 220" overflow="visible" aria-hidden="true">
      <ellipse cx="96" cy="210" rx="56" ry="7" fill="#000" opacity="0.35" />
      {/* Backpack + antenna */}
      <rect x="50" y="72" width="36" height="62" rx="8" fill="var(--steel-500)" {...S} />
      <path d="M58 72 L50 34" stroke={O} strokeWidth="4" />
      <circle cx="49" cy="30" r="5" fill="var(--teal)" stroke={O} strokeWidth="3" />
      <rect x="56" y="86" width="22" height="8" rx="2" fill="var(--teal-deep)" />
      {/* Legs */}
      <path d="M84 150 L78 204 M110 150 L118 204" stroke={O} strokeWidth="22" strokeLinecap="round" />
      <path d="M84 150 L78 204 M110 150 L118 204" stroke="var(--amber-deep)" strokeWidth="15" strokeLinecap="round" />
      <path d="M64 206 H92 M106 206 H134" stroke={O} strokeWidth="10" strokeLinecap="round" />
      {/* Torso */}
      <path d="M70 78 Q96 66 124 78 L128 156 H66 Z" fill="var(--amber)" {...S} />
      <path d="M96 76 V154" stroke={O} strokeWidth="3" opacity="0.4" />
      <rect x="66" y="132" width="62" height="14" fill="var(--steel-600)" {...S} strokeWidth="3" />
      <rect x="74" y="128" width="12" height="20" rx="2" fill="var(--steel-400)" stroke={O} strokeWidth="2.5" />
      <rect x="106" y="128" width="12" height="20" rx="2" fill="var(--steel-400)" stroke={O} strokeWidth="2.5" />
      <rect x="102" y="92" width="16" height="10" rx="2" fill="var(--teal)" stroke={O} strokeWidth="2.5" />
      {/* Back arm */}
      <path d="M76 90 Q66 116 74 134" fill="none" stroke={O} strokeWidth="18" strokeLinecap="round" />
      <path d="M76 90 Q66 116 74 134" fill="none" stroke="var(--amber-deep)" strokeWidth="11" strokeLinecap="round" />
      {/* Front arm + wrench */}
      <path d="M118 90 Q140 104 150 92" fill="none" stroke={O} strokeWidth="18" strokeLinecap="round" />
      <path d="M118 90 Q140 104 150 92" fill="none" stroke="var(--amber)" strokeWidth="11" strokeLinecap="round" />
      <path d="M150 96 L176 40" stroke={O} strokeWidth="13" strokeLinecap="round" />
      <path d="M150 96 L176 40" stroke="var(--steel-300)" strokeWidth="7" strokeLinecap="round" />
      <path d="M168 30 A13 13 0 1 0 190 40 L183 41 L176 33 L178 26 Z" fill="var(--steel-300)" {...S} strokeWidth="3.5" />
      <circle cx="150" cy="94" r="9" fill="var(--steel-600)" {...S} strokeWidth="3" />
      {/* Helmet */}
      <circle cx="100" cy="50" r="30" fill="var(--steel-300)" {...S} />
      <path d="M100 30 Q128 32 128 52 Q126 68 104 70 Q96 56 100 30 Z" fill="var(--teal)" stroke={O} strokeWidth="3.5" />
      <path d="M108 38 Q118 40 120 48" fill="none" stroke="#e9fffc" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <rect x="70" y="40" width="10" height="20" rx="3" fill="var(--amber)" stroke={O} strokeWidth="3" />
    </svg>
  );
}
