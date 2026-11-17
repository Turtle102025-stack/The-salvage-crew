import { useMemo, useState } from 'react';
import type { CardInstance, Content } from '../../engine';
import { CardView } from './Card';
import { Modal } from './Bits';

const TYPE_ORDER = ['attack', 'skill', 'power', 'status', 'curse'];

export function sortDeck(content: Content, deck: CardInstance[]): CardInstance[] {
  return [...deck].sort((a, b) => {
    const da = content.cards[a.id];
    const db = content.cards[b.id];
    return TYPE_ORDER.indexOf(da?.type ?? '') - TYPE_ORDER.indexOf(db?.type ?? '') || (da?.name ?? '').localeCompare(db?.name ?? '') || Number(a.upgraded) - Number(b.upgraded);
  });
}

export function DeckModal({ content, deck, onClose }: { content: Content; deck: CardInstance[]; onClose: () => void }) {
  const [preview, setPreview] = useState(false);
  const cards = useMemo(() => sortDeck(content, deck), [content, deck]);
  return (
    <Modal
      title={`Deck (${deck.length})`}
      onClose={onClose}
      wide
      actions={
        <label className="chip-button" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} /> Show upgrades
        </label>
      }
    >
      <div className="card-grid">
        {cards.map((c) => (
          <CardView key={c.uid} content={content} id={c.id} upgraded={c.upgraded || preview} width={150} />
        ))}
      </div>
    </Modal>
  );
}
