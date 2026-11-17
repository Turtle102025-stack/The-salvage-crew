/** Small shared UI pieces: relic icons, potion slots, credits, modal. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { describePotion, describeRelic, type Content } from '../../engine';
import { Glyph } from '../art/glyphs';
import { potionArt, relicArt } from '../art/specs';
import { TipBody, Tooltip } from './Tooltip';
import './Bits.css';

export function RelicIcon({ content, id, size = 34, flash }: { content: Content; id: string; size?: number; flash?: number }) {
  const def = content.relics[id];
  const art = relicArt(id);
  return (
    <Tooltip
      side="bottom"
      content={
        <TipBody title={def?.name ?? id}>
          {def ? describeRelic(content, def) : ''}
          {def?.flavor ? (
            <>
              {'\n\n'}
              <em>{def.flavor}</em>
            </>
          ) : null}
        </TipBody>
      }
    >
      <span className={`relic-icon rarity-${def?.rarity ?? 'common'}`} style={{ width: size, height: size }} tabIndex={0} key={flash} data-flash={flash ? 'yes' : undefined} aria-label={def?.name ?? id}>
        <Glyph name={art.glyph} color={art.color} color2={art.color2} size="100%" />
      </span>
    </Tooltip>
  );
}

export function RelicBar({ content, relics, flashes = {} }: { content: Content; relics: string[]; flashes?: Record<string, number> }) {
  return (
    <div className="relic-bar" aria-label="Salvage">
      {relics.map((id) => (
        <RelicIcon key={id} content={content} id={id} flash={flashes[id]} />
      ))}
    </div>
  );
}

export function PotionIcon({ content, id, size = 30 }: { content: Content; id: string; size?: number }) {
  const art = potionArt(id);
  void content;
  return <Glyph name={art.glyph} color={art.color} color2={art.color2} size={size} />;
}

/** Canister slots with a Use / Drop menu. */
export function PotionBar(props: {
  content: Content;
  potions: (string | null)[];
  inCombat: boolean;
  onUse: (slot: number) => void;
  onDiscard: (slot: number) => void;
  disabled?: boolean;
}) {
  const { content, potions } = props;
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open === null) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);
  return (
    <div className="potion-bar" ref={ref} aria-label="Canisters">
      {potions.map((id, slot) => {
        const def = id ? content.potions[id] : undefined;
        const usable = !!def && (props.inCombat || !!def.outOfCombat) && !props.disabled;
        return (
          <div className="potion-slot-wrap" key={slot}>
            <Tooltip
              side="bottom"
              disabled={open === slot}
              content={
                def ? (
                  <TipBody title={def.name}>
                    {describePotion(content, def)}
                    {def.flavor ? (
                      <>
                        {'\n\n'}
                        <em>{def.flavor}</em>
                      </>
                    ) : null}
                  </TipBody>
                ) : (
                  <TipBody title="Empty Canister slot">Canisters drop after fights and are sold by the Trader.</TipBody>
                )
              }
            >
              <button className={`potion-slot${id ? '' : ' empty'}`} onClick={() => id && setOpen(open === slot ? null : slot)} aria-label={def ? def.name : 'Empty slot'}>
                {id ? <PotionIcon content={content} id={id} /> : <span className="potion-empty" />}
              </button>
            </Tooltip>
            {open === slot && def && (
              <div className="potion-menu" role="menu">
                <strong>{def.name}</strong>
                <button
                  role="menuitem"
                  disabled={!usable}
                  onClick={() => {
                    setOpen(null);
                    props.onUse(slot);
                  }}
                  title={usable ? undefined : 'Only usable in a fight.'}
                >
                  Use
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setOpen(null);
                    props.onDiscard(slot);
                  }}
                >
                  Drop
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Credits({ amount, size = 22 }: { amount: number; size?: number }) {
  return (
    <span className="credits" aria-label={`${amount} Credits`}>
      <Glyph name="coin" color="var(--rarity-rare)" size={size} />
      <b>{amount}</b>
    </span>
  );
}

export function Modal(props: { title: ReactNode; onClose?: () => void; children: ReactNode; wide?: boolean; subtitle?: ReactNode; actions?: ReactNode }) {
  useEffect(() => {
    if (!props.onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props]);
  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className={`modal${props.wide ? ' modal-wide' : ''}`} role="dialog" aria-label={typeof props.title === 'string' ? props.title : undefined} onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{props.title}</h2>
          {props.subtitle && <p>{props.subtitle}</p>}
          {props.actions}
          {props.onClose && (
            <button className="chip-button" onClick={props.onClose}>
              Close
            </button>
          )}
        </header>
        {props.children}
      </div>
    </div>
  );
}
