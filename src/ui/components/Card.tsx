import { memo, type CSSProperties, type ReactNode } from 'react';
import { describeCard, resolveCard, type CardDef, type Content } from '../../engine';
import { Glyph } from '../art/glyphs';
import { cardArt } from '../art/specs';
import { highlightTerms } from '../glossary';
import './Card.css';

function RulesText({ text, terms }: { text: string; terms: string[] }) {
  const pattern = new RegExp(`\\b(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    const i = m.index ?? 0;
    if (i > last) parts.push(text.slice(last, i));
    parts.push(<b key={i}>{m[0]}</b>);
    last = i + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

const TYPE_BG: Record<string, [string, string]> = {
  attack: ['#5a2516', '#8e3b22'],
  skill: ['#0f3d3f', '#17605f'],
  power: ['#2e1d57', '#4b2f8a'],
  status: ['#2b3654', '#3a4766'],
  curse: ['#2a1420', '#46202f'],
};

export function CardArt({ id, type }: { id: string; type: string }) {
  const art = cardArt(id, type as CardDef['type']);
  const [bg1, bg2] = TYPE_BG[type] ?? TYPE_BG.status!;
  const gid = `cardbg-${type}`;
  return (
    <svg className="card-art" viewBox="0 0 100 58" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bg2} />
          <stop offset="1" stopColor={bg1} />
        </linearGradient>
      </defs>
      <rect width="100" height="58" fill={`url(#${gid})`} />
      <circle cx="50" cy="29" r="24" fill="#000" opacity="0.18" />
      <path d="M0 50 L100 36 V58 H0 Z" fill="#000" opacity="0.2" />
      {[8, 22, 81, 93, 70].map((x, i) => (
        <circle key={x} cx={x} cy={[9, 40, 12, 30, 6][i]} r="0.9" fill="#fff" opacity="0.5" />
      ))}
      <svg x="27" y="6" width="46" height="46" viewBox="0 0 48 48" overflow="visible">
        <Glyph name={art.glyph} color={art.color} color2={art.color2} size={48} />
      </svg>
      {art.badge && (
        <svg x="68" y="30" width="24" height="24" viewBox="0 0 48 48" overflow="visible">
          <Glyph name={art.badge} color={art.badgeColor} size={48} />
        </svg>
      )}
    </svg>
  );
}

export interface CardViewProps {
  content: Content;
  id: string;
  upgraded?: boolean;
  /** Card width in px (everything scales from it). */
  width?: number;
  dim?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Show the upgrade preview colouring (green changed numbers). */
  hotkey?: string;
}

export const CardView = memo(function CardView({ content, id, upgraded = false, width, dim, className, style, hotkey }: CardViewProps) {
  const def = content.cards[id];
  if (!def) return null;
  const card = resolveCard(def, upgraded);
  const text = describeCard(content, def, upgraded);
  const baseCost = resolveCard(def, false).cost;
  const cheaper = upgraded && card.cost !== baseCost;
  return (
    <div
      className={`card card-${def.type} rarity-${def.rarity}${upgraded ? ' upgraded' : ''}${dim ? ' dim' : ''}${className ? ` ${className}` : ''}`}
      style={{ ...(width ? ({ '--cw': `${width}px` } as CSSProperties) : {}), ...style }}
    >
      <div className="card-frame">
        <div className="card-name">{card.name}</div>
        <div className="card-art-wrap">
          <CardArt id={def.id} type={def.type} />
        </div>
        <div className="card-type">
          <span>{def.type}</span>
          <span className={`card-gem gem-${def.rarity}`} title={def.rarity} />
        </div>
        <div className="card-text">
          <span>
            <RulesText text={text} terms={highlightTerms(content)} />
          </span>
        </div>
      </div>
      {!(card.keywords ?? []).includes('unplayable') && <div className={`card-cost${cheaper ? ' cheaper' : ''}`}>{card.cost}</div>}
      {hotkey && <div className="card-hotkey">{hotkey}</div>}
    </div>
  );
});
