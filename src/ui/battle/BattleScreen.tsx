/**
 * The battle screen. It never computes rules itself: it sends commands up via
 * `onCommand`, receives the engine's new state plus events, and animates the
 * events one step at a time (see view.ts).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  canPlayCard,
  cardNeedsTarget,
  describeRelic,
  describeStatus,
  getIntent,
  resolveCard,
  type CardInstance,
  type CombatCommand,
  type CombatEvent,
  type CombatState,
  type Content,
  type CreatureId,
} from '../../engine';
import { EnemyArt } from '../art/EnemyArt';
import { Glyph } from '../art/glyphs';
import { PlayerArt } from '../art/PlayerArt';
import { StageBackdrop } from '../art/StageBackdrop';
import { enemyArt, INTENT_ART, relicArt, statusArt } from '../art/specs';
import { formatEvents } from '../combat/log';
import { creatureLabel } from '../combat/names';
import { CardView } from '../components/Card';
import { TipBody, Tooltip } from '../components/Tooltip';
import { cardNotes } from '../glossary';
import { ANIM_SPEED_LABELS, useSettings, type AnimSpeed } from '../settings';
import { eventDuration } from './playback';
import { applyEvent, cardIndex, cloneView, viewFromState, type BattleView, type ViewCreature } from './view';
import './Battle.css';

export interface EventBatch {
  key: number;
  events: CombatEvent[];
  /** State before these events; null for the opening of a fight. */
  from: CombatState | null;
}

export interface BattleScreenProps {
  content: Content;
  state: CombatState;
  batch: EventBatch;
  onCommand: (command: CombatCommand) => void;
  /** Called once the fight is over and its last animation has played. */
  onBattleOver?: (phase: 'victory' | 'defeat') => void;
  /** Extra controls for the top bar (seed, menu…). */
  topLeft?: ReactNode;
  topRight?: ReactNode;
  /** Potion slots etc., rendered next to the relics. */
  extras?: ReactNode;
  /** Overlay (e.g. victory panel) shown on top of the battle. */
  overlay?: ReactNode;
  /** Which act's backdrop to show. */
  act?: number;
}

type FxTone = 'dmg' | 'block' | 'heal' | 'buff' | 'debuff' | 'info' | 'big';
interface Fx {
  id: number;
  target: CreatureId;
  text: string;
  tone: FxTone;
}

const SPEEDS: AnimSpeed[] = [1, 2, 0, 0.5];

function openingView(state: CombatState): BattleView {
  const v = viewFromState(state);
  v.drawCount = state.draw.length + state.hand.length;
  v.hand = [];
  v.energy = 0;
  v.turn = 0;
  v.player.statuses = {};
  for (const e of v.enemies) delete e.moveId;
  return v;
}

export function BattleScreen(props: BattleScreenProps) {
  const { content, state, batch, onCommand, onBattleOver } = props;
  const { settings, update } = useSettings();
  const speed = settings.animSpeed;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // --- Playback -------------------------------------------------------------
  const [view, setView] = useState<BattleView>(() => (batch.from ? viewFromState(batch.from) : openingView(state)));
  const viewRef = useRef(view);
  const queue = useRef<{ event: CombatEvent; cards: Map<number, CardInstance> }[]>([]);
  const latest = useRef(state);
  const timer = useRef<number | undefined>(undefined);
  const lastKey = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [fx, setFx] = useState<Fx[]>([]);
  const [pulse, setPulse] = useState<Record<string, { cls: string; key: number }>>({});
  const [banner, setBanner] = useState<{ text: string; key: number } | null>(null);
  const [ghost, setGhost] = useState<{ card: CardInstance; key: number } | null>(null);
  const [relicFlash, setRelicFlash] = useState<Record<string, number>>({});
  const [log, setLog] = useState<string[]>([]);
  const fxId = useRef(0);
  const reported = useRef(false);

  const addFx = useCallback((target: CreatureId, text: string, tone: FxTone) => {
    const id = ++fxId.current;
    setFx((list) => [...list.slice(-30), { id, target, text, tone }]);
    window.setTimeout(() => setFx((list) => list.filter((f) => f.id !== id)), 1100 / Math.max(speedRef.current || 4, 0.5));
  }, []);

  const doPulse = useCallback((target: string, cls: string) => {
    const key = ++fxId.current;
    setPulse((p) => ({ ...p, [target]: { cls, key } }));
    window.setTimeout(
      () =>
        setPulse((p) => {
          if (p[target]?.key !== key) return p;
          const next = { ...p };
          delete next[target];
          return next;
        }),
      450 / Math.max(speedRef.current || 4, 0.5),
    );
  }, []);

  const showEventFx = useCallback(
    (e: CombatEvent, v: BattleView) => {
      switch (e.type) {
        case 'damage':
          if (e.hpLost > 0) {
            addFx(e.target, `-${e.hpLost}`, 'dmg');
            doPulse(e.target, 'hit');
          }
          if (e.blocked > 0) {
            addFx(e.target, `${e.blocked} blocked`, 'block');
            if (e.hpLost === 0) doPulse(e.target, 'shield');
          }
          if (e.hpLost === 0 && e.blocked === 0) addFx(e.target, '0', 'info');
          break;
        case 'hpLoss':
          addFx(e.target, `-${e.amount}`, 'dmg');
          doPulse(e.target, 'hit');
          break;
        case 'heal':
          addFx(e.target, `+${e.amount}`, 'heal');
          break;
        case 'block':
          addFx(e.target, `+${e.amount} Block`, 'block');
          doPulse(e.target, 'shield');
          break;
        case 'status': {
          const def = content.statuses[e.status];
          const name = def?.name ?? e.status;
          if (e.delta > 0) addFx(e.target, `+${e.delta} ${name}`, def?.kind === 'debuff' ? 'debuff' : 'buff');
          break;
        }
        case 'enemyMove': {
          const enemy = v.enemies.find((x) => x.id === e.enemy);
          const move = enemy ? content.enemies[enemy.defId]?.moves[e.move] : undefined;
          const attacks = !!move?.effects.some((x) => x.type === 'attack' || x.type === 'damage' || x.type === 'repeat');
          doPulse(e.enemy, attacks ? 'lunge' : 'cast');
          addFx(e.enemy, e.name, 'info');
          break;
        }
        case 'death':
          doPulse(e.target, 'die');
          break;
        case 'trigger':
          if (e.source.kind === 'relic') {
            const id = e.source.id;
            setRelicFlash((r) => ({ ...r, [id]: ++fxId.current }));
          } else if (e.source.kind === 'status') {
            const def = content.statuses[e.source.id];
            if (def?.threshold) addFx(e.source.owner, `${(def.threshold.label ?? def.name).toUpperCase()}!`, 'big');
            doPulse(e.source.owner, 'glow');
          }
          break;
        case 'turnStart':
          if (e.who === 'player') setBanner({ text: `Turn ${e.turn}`, key: ++fxId.current });
          break;
        case 'turnEnd':
          if (e.who === 'player' && v.enemies.some((x) => !x.dead)) setBanner({ text: 'Enemy turn', key: ++fxId.current });
          break;
        case 'playCard': {
          const card = v.hand.find((c) => c.uid === e.uid) ?? { uid: e.uid, id: e.card, upgraded: false };
          setGhost({ card, key: ++fxId.current });
          break;
        }
        case 'shuffle':
          doPulse('draw-pile', 'bump');
          break;
        default:
          break;
      }
    },
    [addFx, content, doPulse],
  );

  const pump = useCallback(() => {
    timer.current = undefined;
    if (queue.current.length === 0) {
      const v = viewFromState(latest.current);
      viewRef.current = v;
      setView(v);
      setBusy(false);
      return;
    }
    const v = cloneView(viewRef.current);
    const s = speedRef.current;
    let wait = 0;
    while (queue.current.length) {
      const { event, cards } = queue.current.shift()!;
      const before = cloneView(v);
      applyEvent(v, event, cards);
      if (s !== 0) showEventFx(event, before);
      const d = s === 0 ? 0 : eventDuration(event) / s;
      if (d > 0) {
        wait = d;
        break;
      }
    }
    viewRef.current = v;
    setView(v);
    if (wait > 0) timer.current = window.setTimeout(pump, wait);
    else pump();
  }, [showEventFx]);

  const flush = useCallback(() => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    queue.current = [];
    pump();
  }, [pump]);

  useEffect(() => {
    if (lastKey.current === batch.key) return;
    lastKey.current = batch.key;
    const cards = cardIndex(...(batch.from ? [batch.from] : []), state);
    latest.current = state;
    for (const event of batch.events) queue.current.push({ event, cards });
    setLog((l) => [...l, ...formatEvents(content, state, batch.events)].slice(-400));
    if (timer.current === undefined) {
      setBusy(true);
      pump();
    }
  }, [batch, state, content, pump]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!busy && view.phase !== 'player' && !reported.current) {
      reported.current = true;
      onBattleOver?.(view.phase);
    }
  }, [busy, view.phase, onBattleOver]);

  // --- Input ------------------------------------------------------------------
  const [selected, setSelected] = useState<number | null>(null);
  const [target, setTarget] = useState<CreatureId | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pileView, setPileView] = useState<'draw' | 'discard' | 'exhaust' | null>(null);
  const [showLog, setShowLog] = useState(false);
  const enemyRefs = useRef(new Map<string, HTMLElement>());
  const handRef = useRef<HTMLDivElement>(null);
  const [handGap, setHandGap] = useState(4);

  const live = latest.current;
  const enemyTurn = view.acting === 'enemy' && busy;
  const inputLocked = live.phase !== 'player' || enemyTurn || view.phase !== 'player';
  const livingIds = view.enemies.filter((e) => !e.dead).map((e) => e.id);

  const needsTarget = useCallback(
    (uid: number) => {
      const card = live.hand.find((c) => c.uid === uid);
      const def = card && content.cards[card.id];
      return !!def && cardNeedsTarget(def, card.upgraded) && live.enemies.filter((e) => !e.dead).length > 1;
    },
    [content, live],
  );

  const cancel = useCallback(() => {
    setSelected(null);
    setTarget(null);
    setHint(null);
  }, []);

  const play = useCallback(
    (uid: number, targetId?: CreatureId | null) => {
      const check = canPlayCard(content, latest.current, uid);
      if (!check.ok) {
        setHint(check.reason);
        return;
      }
      cancel();
      onCommand({ type: 'playCard', uid, ...(targetId ? { target: targetId } : {}) });
    },
    [content, onCommand, cancel],
  );

  const select = useCallback(
    (uid: number) => {
      if (inputLocked) return;
      if (selected === uid) {
        if (!needsTarget(uid)) play(uid);
        else cancel();
        return;
      }
      const check = canPlayCard(content, latest.current, uid);
      if (!check.ok) {
        setHint(check.reason);
        setSelected(null);
        return;
      }
      setSelected(uid);
      if (needsTarget(uid)) {
        setTarget((t) => (t && livingIds.includes(t) ? t : (livingIds[0] ?? null)));
        setHint('Choose a target: click an enemy (or ←/→ then Enter).');
      } else {
        setTarget(null);
        setHint('Click the card again (or press Enter) to play it.');
      }
    },
    [inputLocked, selected, needsTarget, play, cancel, content, livingIds],
  );

  const endTurn = useCallback(() => {
    if (inputLocked) return;
    cancel();
    onCommand({ type: 'endTurn' });
  }, [inputLocked, cancel, onCommand]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' && busy) {
        e.preventDefault();
        flush();
        return;
      }
      if (pileView || showLog) {
        if (e.key === 'Escape') {
          setPileView(null);
          setShowLog(false);
        }
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        const index = e.key === '0' ? 9 : Number(e.key) - 1;
        const card = view.hand[index];
        if (card) select(card.uid);
        return;
      }
      switch (e.key) {
        case 'e':
        case 'E':
          endTurn();
          break;
        case 'Escape':
          cancel();
          break;
        case 'ArrowLeft':
        case 'ArrowRight': {
          if (selected === null || !needsTarget(selected) || livingIds.length === 0) return;
          e.preventDefault();
          const i = Math.max(0, livingIds.indexOf(target ?? ''));
          const next = (i + (e.key === 'ArrowRight' ? 1 : livingIds.length - 1)) % livingIds.length;
          setTarget(livingIds[next] ?? null);
          break;
        }
        case 'Enter':
        case ' ':
          if (selected === null) return;
          e.preventDefault();
          play(selected, needsTarget(selected) ? target : undefined);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, flush, pileView, showLog, view.hand, select, endTurn, cancel, selected, needsTarget, livingIds, target, play]);

  // Drop selection if the card left the hand.
  useEffect(() => {
    if (selected !== null && !live.hand.some((c) => c.uid === selected)) cancel();
  }, [live, selected, cancel]);

  // --- Dragging -------------------------------------------------------------
  const enemyAt = useCallback(
    (x: number, y: number): CreatureId | null => {
      for (const [id, el] of enemyRefs.current) {
        if (!livingIds.includes(id)) continue;
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
      }
      return null;
    },
    [livingIds],
  );

  const onDragStart = useCallback(
    (uid: number) => {
      if (inputLocked) return false;
      const check = canPlayCard(content, latest.current, uid);
      if (!check.ok) {
        setHint(check.reason);
        return false;
      }
      setDragging(uid);
      setSelected(uid);
      setHint(needsTarget(uid) ? 'Drop it on an enemy.' : 'Drop it above your hand to play.');
      return true;
    },
    [inputLocked, content, needsTarget],
  );

  const onDragMove = useCallback(
    (uid: number, x: number, y: number) => {
      if (needsTarget(uid)) setTarget(enemyAt(x, y));
    },
    [needsTarget, enemyAt],
  );

  const onDrop = useCallback(
    (uid: number, x: number, y: number) => {
      setDragging(null);
      if (needsTarget(uid)) {
        const t = enemyAt(x, y);
        if (t) play(uid, t);
        else cancel();
        return;
      }
      const handTop = handRef.current?.getBoundingClientRect().top ?? Infinity;
      if (y < handTop - 20) play(uid);
      else cancel();
    },
    [needsTarget, enemyAt, play, cancel],
  );

  // --- Rendering --------------------------------------------------------------
  const targeting = selected !== null && needsTarget(selected);
  const n = view.hand.length;

  // Overlap the cards just enough to fit the hand area.
  useLayoutEffect(() => {
    const hand = handRef.current;
    if (!hand) return;
    const measure = () => {
      const card = hand.querySelector<HTMLElement>('.card');
      const cw = card?.offsetWidth ?? 0;
      const width = hand.clientWidth * 0.9;
      if (!cw || n < 2) return setHandGap(4);
      setHandGap(Math.max(-cw * 0.75, Math.min(cw * 0.04, (width - n * cw) / (n - 1))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(hand);
    return () => ro.disconnect();
  }, [n]);
  const pileCards = pileView ? [...(pileView === 'draw' ? [...live.draw].sort((a, b) => a.id.localeCompare(b.id)) : pileView === 'discard' ? live.discard : live.exhaust)] : [];

  return (
    <div className={`battle${enemyTurn ? ' enemy-turn' : ''}`} onContextMenu={(e) => e.preventDefault()}>
      <header className="battle-top">
        <div className="battle-top-left">
          {props.topLeft}
          <span className="battle-turn">Turn {Math.max(view.turn, 1)}</span>
        </div>
        <div className="battle-relics" aria-label="Relics">
          {live.relics.map((id) => {
            const def = content.relics[id];
            const art = relicArt(id);
            return (
              <Tooltip
                key={id}
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
                <span className="relic-icon" key={relicFlash[id] ?? 0} data-flash={relicFlash[id] ? 'yes' : undefined} tabIndex={0}>
                  <Glyph name={art.glyph} color={art.color} color2={art.color2} size="100%" />
                </span>
              </Tooltip>
            );
          })}
          {props.extras}
        </div>
        <div className="battle-top-right">
          <button
            className="chip-button"
            onClick={() => update({ animSpeed: SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]! })}
            title="Animation speed"
          >
            Speed: {ANIM_SPEED_LABELS[speed]}
          </button>
          <button className="chip-button" onClick={() => setShowLog((s) => !s)} aria-pressed={showLog}>
            Log
          </button>
          {props.topRight}
        </div>
      </header>

      <section
        className="battle-stage"
        onClick={(e) => {
          if (busy && (e.target as HTMLElement).closest('.creature') === null) flush();
          else if (selected !== null && !targeting && (e.target as HTMLElement).closest('.creature-player')) play(selected);
        }}
      >
        <StageBackdrop act={props.act ?? 1} />
        <div className="stage-floor" aria-hidden="true" />
        <div className="stage-player">
          <CreatureBlock content={content} c={view.player} fx={fx} pulse={pulse.player} player>
            <PlayerArt className="creature-art" />
          </CreatureBlock>
        </div>
        <div className="stage-enemies">
          {view.enemies.map((enemy) => {
            const spec = enemyArt(enemy.defId);
            const intent = view.phase === 'player' && !enemy.dead && !enemy.acted && enemy.moveId ? getIntent(content, viewAsState(live, view), { ...asCreature(live, enemy) }) : undefined;
            return (
              <div
                key={enemy.id}
                ref={(el) => {
                  if (el) enemyRefs.current.set(enemy.id, el);
                  else enemyRefs.current.delete(enemy.id);
                }}
                className={`enemy-slot${targeting && !enemy.dead ? ' targetable' : ''}${target === enemy.id && (targeting || dragging !== null) ? ' targeted' : ''}`}
                style={{ '--scale': String(spec.scale ?? 1) } as CSSProperties}
                onClick={(e) => {
                  e.stopPropagation();
                  if (busy && !targeting) {
                    flush();
                    return;
                  }
                  if (targeting && selected !== null && !enemy.dead) play(selected, enemy.id);
                }}
                onPointerEnter={() => targeting && !enemy.dead && setTarget(enemy.id)}
              >
                {intent && <IntentBadge content={content} intent={intent} />}
                <CreatureBlock content={content} c={enemy} fx={fx} pulse={pulse[enemy.id]} label={creatureLabel(live, enemy.id)}>
                  <EnemyArt spec={spec} className="creature-art" />
                </CreatureBlock>
              </div>
            );
          })}
        </div>
        {banner && (
          <div className="turn-banner" key={banner.key} aria-live="polite">
            {banner.text}
          </div>
        )}
        {ghost && (
          <div className="played-ghost" key={ghost.key} aria-hidden="true">
            <CardView content={content} id={ghost.card.id} upgraded={ghost.card.upgraded} />
          </div>
        )}
        {hint && !inputLocked && <p className="stage-hint">{hint}</p>}
        {busy && <p className="stage-skip">Space / tap to skip</p>}
      </section>

      <footer className="battle-bottom">
        <div className="bottom-left">
          <Tooltip content={<TipBody title="Energy">Spend it to play cards. Refills to {view.maxEnergy} at the start of each turn.</TipBody>}>
            <div className={`energy-orb${view.energy === 0 ? ' empty' : ''}`} tabIndex={0} aria-label={`Energy ${view.energy} of ${view.maxEnergy}`}>
              <span className="energy-num">{view.energy}</span>
              <span className="energy-max">/{view.maxEnergy}</span>
            </div>
          </Tooltip>
          <PileButton name="Draw" count={view.drawCount} glyph="pile" onClick={() => setPileView('draw')} bump={pulse['draw-pile']?.key} />
        </div>

        <div className={`hand${dragging !== null ? ' has-drag' : ''}`} ref={handRef} aria-label="Your hand" style={{ '--gap': `${handGap}px` } as CSSProperties}>
          {view.hand.map((card, i) => (
            <HandCard
              key={card.uid}
              content={content}
              card={card}
              index={i}
              count={n}
              playable={!inputLocked && canPlayCard(content, live, card.uid).ok}
              selected={selected === card.uid}
              dragging={dragging === card.uid}
              onSelect={select}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDrop={onDrop}
              tooltipsOff={dragging !== null || selected !== null}
            />
          ))}
        </div>

        <div className="bottom-right">
          <button className="end-turn" onClick={endTurn} disabled={inputLocked}>
            {enemyTurn ? 'Enemy turn…' : 'End turn'}
            <kbd>E</kbd>
          </button>
          <div className="pile-row">
            <PileButton name="Discard" count={view.discardCount} glyph="card" onClick={() => setPileView('discard')} />
            <PileButton name="Exhaust" count={view.exhaustCount} glyph="flame" onClick={() => setPileView('exhaust')} small />
          </div>
        </div>
      </footer>

      {pileView && (
        <div className="modal-backdrop" onClick={() => setPileView(null)}>
          <div className="modal" role="dialog" aria-label={`${pileView} pile`} onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>
                {pileView === 'draw' ? 'Draw pile' : pileView === 'discard' ? 'Discard pile' : 'Exhausted'} ({pileCards.length})
              </h2>
              {pileView === 'draw' && <p>Shown in alphabetical order. The real order is a secret.</p>}
              <button className="chip-button" onClick={() => setPileView(null)}>
                Close
              </button>
            </header>
            <div className="card-grid">
              {pileCards.length === 0 && <p className="empty-note">Nothing here.</p>}
              {pileCards.map((c) => (
                <CardView key={c.uid} content={content} id={c.id} upgraded={c.upgraded} width={150} />
              ))}
            </div>
          </div>
        </div>
      )}

      {showLog && (
        <aside className="log-drawer" aria-label="Combat log">
          <header>
            <h2>Combat log</h2>
            <button className="chip-button" onClick={() => setShowLog(false)}>
              Close
            </button>
          </header>
          <LogList lines={log} />
        </aside>
      )}

      {props.overlay}
    </div>
  );
}

/** Engine helpers want a CombatState; build one that reflects what's on screen. */
function viewAsState(live: CombatState, view: BattleView): CombatState {
  return { ...live, player: { ...live.player, statuses: view.player.statuses } };
}

function asCreature(live: CombatState, c: ViewCreature) {
  const base = live.enemies.find((e) => e.id === c.id)!;
  return { ...base, statuses: c.statuses, dead: c.dead, ...(c.moveId ? { moveId: c.moveId } : {}) };
}

function LogList({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);
  return (
    <ol ref={ref}>
      {lines.map((line, i) => (
        <li key={i} className={line.startsWith('──') ? 'turn' : undefined}>
          {line}
        </li>
      ))}
    </ol>
  );
}

function PileButton(props: { name: string; count: number; glyph: string; onClick: () => void; small?: boolean; bump?: number }) {
  return (
    <button className={`pile-button${props.small ? ' small' : ''}`} onClick={props.onClick} title={`${props.name} pile (click to view)`} key={props.bump}>
      <Glyph name={props.glyph} color={props.glyph === 'flame' ? '#ff7a3d' : 'var(--steel-300)'} color2="#ffd166" size="100%" />
      <span className="pile-count">{props.count}</span>
      <span className="pile-name">{props.name}</span>
    </button>
  );
}

function StatusRow({ content, c }: { content: Content; c: ViewCreature }) {
  const entries = Object.entries(c.statuses);
  if (!entries.length) return <div className="status-row empty" />;
  return (
    <div className="status-row">
      {entries.map(([id, stacks]) => {
        const def = content.statuses[id];
        const art = statusArt(id, def?.kind);
        return (
          <Tooltip key={id} content={<TipBody title={`${def?.name ?? id} ${stacks}`}>{def ? describeStatus(def, stacks) : id}</TipBody>}>
            <span className={`status-icon kind-${def?.kind ?? 'buff'}`} tabIndex={0} aria-label={`${def?.name ?? id} ${stacks}`}>
              <Glyph name={art.glyph} color={art.color} color2={art.color2} size="100%" />
              <span className="status-stacks">{stacks}</span>
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
}

function CreatureBlock(props: {
  content: Content;
  c: ViewCreature;
  fx: Fx[];
  pulse?: { cls: string; key: number } | undefined;
  player?: boolean;
  label?: string;
  children: ReactNode;
}) {
  const { content, c, fx, pulse, player } = props;
  const pct = Math.max(0, (100 * c.hp) / c.maxHp);
  const flavor = player ? content.characters[c.defId]?.flavor : content.enemies[c.defId]?.flavor;
  return (
    <div className={`creature ${player ? 'creature-player' : 'creature-enemy'}${c.dead ? ' dead' : ''}`}>
      <Tooltip side={player ? 'right' : 'top'} content={<TipBody title={props.label ?? c.name}>{flavor}</TipBody>} disabled={!flavor}>
        <div className={`creature-figure${pulse ? ` pulse-${pulse.cls}` : ''}`} key={pulse?.key}>
          {props.children}
        </div>
      </Tooltip>
      <div className="creature-info">
        <div className="creature-name">{props.label ?? c.name}</div>
        <div className="hp-line">
          {c.block > 0 && (
            <Tooltip content={<TipBody title={`Block ${c.block}`}>Absorbs incoming damage. {player ? 'Resets at the start of your turn.' : 'Resets at the start of its turn.'}</TipBody>}>
              <span className="block-badge" tabIndex={0}>
                <Glyph name="shield" color="var(--block)" color2="#bfe0ff" size="100%" />
                <span>{c.block}</span>
              </span>
            </Tooltip>
          )}
          <div className={`hp-bar${c.block > 0 ? ' shielded' : ''}`} role="meter" aria-valuenow={c.hp} aria-valuemin={0} aria-valuemax={c.maxHp} aria-label="HP">
            <div className="hp-fill" style={{ width: `${pct}%` }} />
            <span className="hp-text">
              {c.hp}/{c.maxHp}
            </span>
          </div>
        </div>
        <StatusRow content={content} c={c} />
      </div>
      <div className="fx-layer" aria-hidden="true">
        {fx
          .filter((f) => f.target === c.id)
          .map((f, i) => (
            <span key={f.id} className={`fx fx-${f.tone}`} style={{ '--i': String(i % 4) } as CSSProperties}>
              {f.text}
            </span>
          ))}
      </div>
    </div>
  );
}

function IntentBadge({ content, intent }: { content: Content; intent: ReturnType<typeof getIntent> & object }) {
  const main = intent.kinds[0] ?? 'unknown';
  const art = INTENT_ART[main];
  const parts: string[] = [];
  for (const k of intent.kinds) {
    if (k === 'attack' && intent.damage !== undefined) parts.push(`Attack for ${intent.damage}${(intent.hits ?? 1) > 1 ? ` × ${intent.hits}` : ''} damage.`);
    if (k === 'block') parts.push('Gain Block.');
    if (k === 'buff') parts.push(`Strengthen itself${intent.statuses.length ? ` (${intent.statuses.map((s) => content.statuses[s]?.name ?? s).join(', ')})` : ''}.`);
    if (k === 'debuff') parts.push(`Weaken you${intent.statuses.length ? ` (${intent.statuses.map((s) => content.statuses[s]?.name ?? s).join(', ')})` : ''}.`);
    if (k === 'unknown') parts.push('Something unpredictable.');
  }
  return (
    <Tooltip content={<TipBody title={`Intent: ${intent.name}`}>{`Next turn it will:\n${parts.join('\n')}`}</TipBody>}>
      <div className={`intent intent-${main}`} tabIndex={0}>
        {intent.kinds.slice(0, 2).map((k) => (
          <span key={k} className="intent-icon">
            <Glyph name={INTENT_ART[k].glyph} color={INTENT_ART[k].color} color2={INTENT_ART[k].color2} size="100%" />
          </span>
        ))}
        {intent.damage !== undefined && (
          <span className="intent-num">
            {intent.damage}
            {(intent.hits ?? 1) > 1 ? `×${intent.hits}` : ''}
          </span>
        )}
        <span className="visually-hidden">{art.glyph}</span>
      </div>
    </Tooltip>
  );
}

function HandCard(props: {
  content: Content;
  card: CardInstance;
  index: number;
  count: number;
  playable: boolean;
  selected: boolean;
  dragging: boolean;
  tooltipsOff: boolean;
  onSelect: (uid: number) => void;
  onDragStart: (uid: number) => boolean;
  onDragMove: (uid: number, x: number, y: number) => void;
  onDrop: (uid: number, x: number, y: number) => void;
}) {
  const { content, card, index, count, playable, selected, dragging } = props;
  const start = useRef<{ x: number; y: number; id: number; active: boolean } | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const def = content.cards[card.id];
  const notes = useMemo(() => (def ? cardNotes(content, def, card.upgraded) : []), [content, def, card.upgraded]);
  if (!def) return null;
  const mid = (count - 1) / 2;
  const rot = count > 1 ? (index - mid) * Math.min(4, 24 / count) : 0;
  const lift = Math.abs(index - mid) ** 2 * Math.min(2.2, 14 / count);
  const style = {
    '--rot': `${rot}deg`,
    '--lift': `${lift}px`,
    zIndex: dragging ? 50 : selected ? 40 : index + 1,
    ...(offset ? { '--dx': `${offset.x}px`, '--dy': `${offset.y}px` } : {}),
  } as CSSProperties;
  const hotkey = index < 10 ? String((index + 1) % 10) : undefined;
  const resolved = resolveCard(def, card.upgraded);
  return (
    <Tooltip
      side="top"
      wide
      disabled={props.tooltipsOff || (notes.length === 0 && !def.flavor)}
      content={
        <>
          {notes.map((note) => (
            <TipBody key={note.name} title={note.name}>
              {note.text}
            </TipBody>
          ))}
          {def.flavor && (
            <TipBody title={resolved.name} accent="var(--text-dim)">
              <em>{def.flavor}</em>
            </TipBody>
          )}
        </>
      }
    >
      <div
        className={`hand-card${selected ? ' selected' : ''}${dragging ? ' dragging' : ''}${playable ? ' playable' : ''}`}
        style={style}
        role="button"
        tabIndex={-1}
        aria-label={`${resolved.name}, costs ${resolved.cost}`}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, active: false };
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s || s.id !== e.pointerId) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (!s.active) {
            if (Math.hypot(dx, dy) < 12) return;
            if (!props.onDragStart(card.uid)) {
              start.current = null;
              return;
            }
            s.active = true;
          }
          setOffset({ x: dx, y: dy });
          props.onDragMove(card.uid, e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          setOffset(null);
          if (!s) return;
          if (s.active) props.onDrop(card.uid, e.clientX, e.clientY);
          else props.onSelect(card.uid);
        }}
        onPointerCancel={() => {
          start.current = null;
          setOffset(null);
        }}
      >
        <CardView content={content} id={card.id} upgraded={card.upgraded} hotkey={hotkey} className={playable ? undefined : 'unaffordable'} />
      </div>
    </Tooltip>
  );
}
