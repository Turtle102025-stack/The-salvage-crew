/**
 * Title-screen illustration: the salvage tug "Last Chance" hauling scrap
 * through the Graveyard Belt. Pure SVG, drawn in code (art style A:
 * flat chunky shapes, dark outlines, amber + teal accents).
 */

const OUTLINE = 'var(--space-950)';

/** Deterministic star field so the picture looks the same on every load. */
function makeStars(count: number) {
  let s = 4471; // salvage claim number, why not
  const next = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  return Array.from({ length: count }, () => ({
    x: Math.round(next() * 480),
    y: Math.round(next() * 280),
    r: next() < 0.15 ? 1.6 : 0.9,
    o: 0.35 + next() * 0.6,
  }));
}

const STARS = makeStars(46);

export function TitleArt() {
  return (
    <svg
      className="title-art"
      viewBox="0 0 480 280"
      role="img"
      aria-label="The salvage tug Last Chance towing a chunk of scrap through a debris field"
    >
      <defs>
        <pattern id="hazard" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="14" fill="var(--amber)" />
          <rect x="7" width="7" height="14" fill={OUTLINE} />
        </pattern>
      </defs>

      {/* Stars */}
      <g>
        {STARS.map((star, i) => (
          <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="var(--steel-300)" opacity={star.o} />
        ))}
      </g>

      {/* Drifting debris */}
      <g className="debris debris-a">
        <path
          d="M40 40 L92 30 L104 58 L80 74 L46 66 Z"
          fill="var(--steel-600)"
          stroke={OUTLINE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M54 46 L86 40 L92 54" fill="none" stroke="var(--steel-400)" strokeWidth="2" />
      </g>
      <g className="debris debris-b">
        <rect x="392" y="214" width="62" height="14" rx="2" fill="var(--steel-500)" stroke={OUTLINE} strokeWidth="3" />
        <path d="M398 216 L408 226 M412 216 L422 226 M426 216 L436 226 M440 216 L450 226" stroke={OUTLINE} strokeWidth="2" />
      </g>
      <g className="debris debris-c">
        <circle cx="430" cy="40" r="9" fill="var(--steel-500)" stroke={OUTLINE} strokeWidth="3" />
        <circle cx="430" cy="40" r="3" fill={OUTLINE} />
      </g>
      <g className="debris debris-d">
        <path d="M34 214 L58 206 L64 226 L42 236 Z" fill="var(--amber-deep)" stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
      </g>

      {/* The tug */}
      <g className="tug">
        {/* Engine flame */}
        <path className="flame" d="M58 134 L14 148 L58 162 Z" fill="var(--amber)" />
        <path className="flame flame-core" d="M58 140 L32 148 L58 156 Z" fill="#fff4d6" />

        {/* Engine pod + nozzle */}
        <path d="M56 128 L74 122 L74 174 L56 168 Z" fill="var(--steel-600)" stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
        <rect x="72" y="114" width="54" height="68" rx="8" fill="var(--steel-600)" stroke={OUTLINE} strokeWidth="3" />
        <rect x="82" y="124" width="10" height="48" rx="3" fill="var(--steel-400)" />

        {/* Antenna + beacon */}
        <line x1="172" y1="90" x2="164" y2="62" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
        <circle className="beacon" cx="164" cy="60" r="5" fill="var(--teal)" stroke={OUTLINE} strokeWidth="2" />

        {/* Roof module */}
        <rect x="150" y="88" width="84" height="26" rx="4" fill="var(--steel-600)" stroke={OUTLINE} strokeWidth="3" />
        <rect x="160" y="96" width="14" height="10" rx="2" fill="var(--teal-deep)" />
        <rect x="180" y="96" width="14" height="10" rx="2" fill="var(--teal-deep)" />

        {/* Main hull */}
        <path
          d="M122 108 L300 108 Q316 108 328 118 L374 150 L328 184 Q316 192 300 192 L122 192 Q112 192 112 182 L112 118 Q112 108 122 108 Z"
          fill="var(--steel-500)"
          stroke={OUTLINE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Hull highlight */}
        <path d="M124 116 L298 116 Q308 116 316 122 L330 132 L124 132 Z" fill="var(--steel-400)" opacity="0.55" />
        {/* Panel seams + rivets */}
        <path d="M256 134 L256 166 M290 134 L290 166" stroke={OUTLINE} strokeWidth="2" opacity="0.7" />
        {[130, 162, 194, 226, 270, 304].map((x) => (
          <circle key={x} cx={x} cy="140" r="1.8" fill={OUTLINE} opacity="0.7" />
        ))}

        {/* Cockpit */}
        <path d="M318 128 L358 150 L318 172 Z" fill="var(--teal)" stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
        <path d="M324 138 L340 147 L324 147 Z" fill="#c9fff9" opacity="0.8" />

        {/* Hazard band */}
        <rect x="120" y="168" width="196" height="14" fill="url(#hazard)" stroke={OUTLINE} strokeWidth="3" />

        {/* Name */}
        <text
          x="186"
          y="157"
          textAnchor="middle"
          fill="var(--amber)"
          fontFamily="var(--font-display)"
          fontWeight="700"
          fontSize="13"
          letterSpacing="2"
        >
          LAST CHANCE
        </text>

        {/* Salvage crane */}
        <circle cx="262" cy="106" r="9" fill="var(--steel-600)" stroke={OUTLINE} strokeWidth="3" />
        <line x1="262" y1="104" x2="312" y2="54" stroke={OUTLINE} strokeWidth="14" strokeLinecap="round" />
        <line x1="262" y1="104" x2="312" y2="54" stroke="var(--amber)" strokeWidth="8" strokeLinecap="round" />
        <line x1="312" y1="54" x2="404" y2="66" stroke={OUTLINE} strokeWidth="12" strokeLinecap="round" />
        <line x1="312" y1="54" x2="404" y2="66" stroke="var(--amber)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="312" cy="54" r="6" fill="var(--steel-600)" stroke={OUTLINE} strokeWidth="3" />

        {/* Cable + claw + haul (swings gently) */}
        <g className="haul">
          <line x1="404" y1="66" x2="404" y2="104" stroke={OUTLINE} strokeWidth="3" />
          <path d="M392 112 Q392 102 404 102 Q416 102 416 112" fill="none" stroke={OUTLINE} strokeWidth="5" strokeLinecap="round" />
          <path d="M392 112 Q392 102 404 102 Q416 102 416 112" fill="none" stroke="var(--steel-300)" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M380 112 L428 110 L436 136 L414 150 L384 144 Z"
            fill="var(--steel-600)"
            stroke={OUTLINE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M392 122 L424 120 M396 134 L420 132" stroke="var(--teal)" strokeWidth="2" opacity="0.8" />
        </g>
      </g>
    </svg>
  );
}
