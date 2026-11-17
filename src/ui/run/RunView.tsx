/**
 * A run in progress: the top bar plus whichever screen the run is on.
 * Every command goes through the engine, then the run is autosaved.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { CONTENT } from '../../content';
import {
  currentPotions,
  dispatchRun,
  HAZARD_LEVELS,
  MAX_HAZARD,
  type CombatState,
  type RunCommand,
  type RunEvent,
  type RunState,
} from '../../engine';
import { BattleScreen, type EventBatch } from '../battle/BattleScreen';
import { Glyph } from '../art/glyphs';
import { Credits, Modal, PotionBar, RelicBar } from '../components/Bits';
import { DeckModal } from '../components/DeckModal';
import { SettingsPanel } from '../components/SettingsPanel';
import { clearRun, recordRun, saveRun, type SavedRun } from '../save';
import { MapView } from './MapView';
import { ActIntroView, CardSelectView, EventView, GameOverView, RestView, RewardView, ShopView, TreasureView } from './screens';
import './Run.css';

interface BattleHold {
  key: string;
  state: CombatState;
  batch: EventBatch;
  done: boolean;
}

let batchCounter = 1;

function toastText(e: RunEvent): string | null {
  switch (e.type) {
    case 'relic':
      return `Salvage: ${CONTENT.relics[e.relic]?.name ?? e.relic}`;
    case 'potion':
      return `Canister: ${CONTENT.potions[e.potion]?.name ?? e.potion}`;
    case 'potionFull':
      return 'Canister slots are full.';
    case 'cardAdded':
      return `Added ${CONTENT.cards[e.card]?.name ?? e.card}${e.upgraded ? '+' : ''}`;
    case 'cardRemoved':
      return `Removed ${CONTENT.cards[e.card]?.name ?? e.card}`;
    case 'cardUpgraded':
      return `Upgraded ${CONTENT.cards[e.card]?.name ?? e.card}`;
    case 'gold':
      return e.amount > 0 ? `+${e.amount} Credits` : `${e.amount} Credits`;
    case 'maxHp':
      return `Max HP ${e.amount > 0 ? '+' : ''}${e.amount}`;
    default:
      return null;
  }
}

export function RunView({ saved, onExit, onNewRun }: { saved: SavedRun; onExit: () => void; onNewRun: () => void }) {
  const [run, setRun] = useState<RunState>(saved.run);
  const runRef = useRef(run);
  const playMs = useRef(saved.playMs);
  const [battle, setBattle] = useState<BattleHold | null>(() =>
    saved.run.screen.type === 'combat'
      ? {
          key: `${saved.run.act}-${saved.run.floor}-${saved.run.screen.encounter}`,
          state: saved.run.screen.combat,
          batch: { key: batchCounter++, events: [], from: saved.run.screen.combat },
          done: false,
        }
      : null,
  );
  const [modal, setModal] = useState<'deck' | 'map' | 'menu' | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recorded = useRef(false);

  // Count play time while the tab is visible.
  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      if (document.visibilityState === 'visible' && runRef.current.phase === 'active') playMs.current += now - last;
      last = now;
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Save on tab close too.
  useEffect(() => {
    const onHide = () => runRef.current.phase === 'active' && saveRun({ run: runRef.current, playMs: playMs.current, startedAt: saved.startedAt });
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [saved.startedAt]);

  const toast = useCallback((text: string) => {
    const id = batchCounter++;
    setToasts((t) => [...t.slice(-3), { id, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const send = useCallback(
    (command: RunCommand) => {
      const before = runRef.current;
      const result = dispatchRun(CONTENT, before, command);
      if (result.error) {
        setError(result.error);
        window.setTimeout(() => setError(null), 2600);
        return;
      }
      setError(null);
      runRef.current = result.run;
      setRun(result.run);
      if (result.run.phase === 'active') saveRun({ run: result.run, playMs: playMs.current, startedAt: saved.startedAt });
      else if (!recorded.current) {
        recorded.current = true;
        clearRun();
        recordRun(result.run, playMs.current, MAX_HAZARD);
      }
      if (result.combatEvents && result.combat) {
        const fresh = result.combatFrom === null || result.combatFrom === undefined;
        const screen = result.run.screen;
        const encounter = screen.type === 'combat' ? screen.encounter : (battle?.key ?? 'fight');
        setBattle((b) => ({
          key: fresh ? `${result.run.act}-${result.run.floor}-${encounter}-${batchCounter}` : (b?.key ?? 'fight'),
          state: result.combat!,
          batch: { key: batchCounter++, events: result.combatEvents!, from: result.combatFrom ?? null },
          done: false,
        }));
      }
      // Toasts for out-of-combat pickups.
      if (result.run.screen.type !== 'combat' && command.type !== 'combat') {
        for (const e of result.events) {
          const text = toastText(e);
          if (text && e.type !== 'gold') toast(text);
        }
      }
    },
    [battle?.key, saved.startedAt, toast],
  );

  const showBattle = battle && (run.screen.type === 'combat' || !battle.done);
  const potions = currentPotions(run);
  const act = CONTENT.acts.find((a) => a.id === run.act);

  const menu = modal === 'menu' && (
    <Modal title="Menu" onClose={() => setModal(null)}>
      <div className="menu-body">
        <p>
          Seed <b className="seed-code">{run.seed}</b> · {HAZARD_LEVELS[run.difficulty]?.name}
        </p>
        <SettingsPanel />
        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              saveRun({ run: runRef.current, playMs: playMs.current, startedAt: saved.startedAt });
              onExit();
            }}
          >
            Save &amp; quit to menu
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (!window.confirm('Abandon this run? It will count as a loss.')) return;
              const lost: RunState = { ...runRef.current, phase: 'lost', stats: { ...runRef.current.stats, killedBy: 'abandoning the job' } };
              clearRun();
              recordRun(lost, playMs.current, MAX_HAZARD);
              onExit();
            }}
          >
            Abandon run
          </button>
        </div>
      </div>
    </Modal>
  );

  const modals = (
    <>
      {modal === 'deck' && <DeckModal content={CONTENT} deck={run.deck} onClose={() => setModal(null)} />}
      {modal === 'map' && (
        <Modal title={`Act ${run.act}: ${act?.name ?? ''}`} onClose={() => setModal(null)} wide>
          <div className="map-modal-body">
            <MapView content={CONTENT} run={run} />
          </div>
        </Modal>
      )}
      {menu}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
        {error && <div className="toast toast-error">{error}</div>}
      </div>
    </>
  );

  if (showBattle && battle) {
    return (
      <>
        <BattleScreen
          key={battle.key}
          content={CONTENT}
          state={battle.state}
          batch={battle.batch}
          act={run.act}
          onCommand={(command) => send({ type: 'combat', command })}
          onUsePotion={(slot, target) => send({ type: 'usePotion', slot, ...(target ? { target } : {}) })}
          onDiscardPotion={(slot) => send({ type: 'discardPotion', slot })}
          onBattleOver={() => setBattle((b) => (b ? { ...b, done: true } : b))}
          topLeft={
            <span className="hud-mini">
              <span className="hud-floor">
                Act {run.act} · Floor {run.floor}
              </span>
              <Credits amount={run.gold} size={20} />
            </span>
          }
          topRight={
            <>
              <button className="chip-button" onClick={() => setModal('deck')}>
                Deck {run.deck.length}
              </button>
              <button className="chip-button" onClick={() => setModal('menu')}>
                Menu
              </button>
            </>
          }
        />
        {modals}
      </>
    );
  }

  const s = run.screen;
  let body: React.ReactNode = null;
  switch (s.type) {
    case 'map':
      body = (
        <div className="run-map">
          <div className="run-map-title">
            <h2>
              Act {run.act}: {act?.name}
            </h2>
            <p className="muted">Pick your next stop. Pulsing nodes are within reach.</p>
          </div>
          <MapView content={CONTENT} run={run} onChoose={(node) => send({ type: 'chooseNode', node })} />
        </div>
      );
      break;
    case 'reward':
      body = <RewardView content={CONTENT} run={run} screen={s} send={send} />;
      break;
    case 'rest':
      body = <RestView content={CONTENT} run={run} screen={s} send={send} />;
      break;
    case 'shop':
      body = <ShopView content={CONTENT} run={run} screen={s} send={send} />;
      break;
    case 'event':
      body = <EventView content={CONTENT} run={run} screen={s} send={send} />;
      break;
    case 'treasure':
      body = <TreasureView content={CONTENT} run={run} screen={s} send={send} />;
      break;
    case 'cardSelect':
      body = <CardSelectView key={`${s.purpose}-${run.deck.length}`} content={CONTENT} run={run} screen={s} send={send} />;
      break;
    case 'actIntro':
      body = <ActIntroView content={CONTENT} run={run} send={send} />;
      break;
    case 'gameOver':
      body = <GameOverView content={CONTENT} run={run} playMs={playMs.current} onMenu={onExit} onNewRun={onNewRun} />;
      break;
    case 'combat':
      body = null;
      break;
  }

  return (
    <div className={`run run-act-${run.act}`}>
      {s.type !== 'gameOver' && (
        <header className="hud">
          <div className="hud-left">
            <span className="hud-name">
              {CONTENT.characters[run.characterId]?.name} <small>{CONTENT.characters[run.characterId]?.title}</small>
            </span>
            <span className="hud-hp" aria-label={`HP ${run.hp} of ${run.maxHp}`}>
              <Glyph name="heart" color="var(--hp)" size={20} />
              {run.hp}/{run.maxHp}
            </span>
            <Credits amount={run.gold} />
            <PotionBar
              content={CONTENT}
              potions={potions}
              inCombat={false}
              onUse={(slot) => send({ type: 'usePotion', slot })}
              onDiscard={(slot) => send({ type: 'discardPotion', slot })}
            />
          </div>
          <RelicBar content={CONTENT} relics={run.relics} />
          <div className="hud-right">
            <span className="hud-floor">
              Act {run.act} · Floor {run.floor}
            </span>
            {s.type !== 'map' && (
              <button className="chip-button" onClick={() => setModal('map')}>
                Map
              </button>
            )}
            <button className="chip-button" onClick={() => setModal('deck')}>
              Deck {run.deck.length}
            </button>
            <button className="chip-button" onClick={() => setModal('menu')}>
              Menu
            </button>
          </div>
        </header>
      )}
      <main className="run-body">{body}</main>
      {modals}
    </div>
  );
}
