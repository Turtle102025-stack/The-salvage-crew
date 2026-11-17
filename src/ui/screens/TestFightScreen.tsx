/**
 * Phase 3 bare-bones battle: proves the engine works end to end.
 * Phase 4 replaces this with the real battle screen and animations.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONTENT, TEST_FIGHT_ENEMIES, TEST_FIGHT_EXTRA_CARDS } from '../../content';
import {
  canPlayCard,
  cardNeedsTarget,
  createCombat,
  describeCard,
  describeRelic,
  describeStatus,
  dispatchCombat,
  getIntent,
  livingEnemies,
  normalizeSeed,
  resolveCard,
  setupFromSeed,
  type CardInstance,
  type CombatCommand,
  type CombatResult,
  type CombatState,
  type Creature,
  type IntentView,
} from '../../engine';
import { formatEvents } from '../combat/log';
import { creatureLabel } from '../combat/names';
import { randomSeed } from '../seed';
import './TestFightScreen.css';

const LOG_LIMIT = 300;

function startFight(seed: string): CombatResult {
  return createCombat(
    CONTENT,
    setupFromSeed(CONTENT, {
      seed,
      characterId: 'rigger',
      enemies: TEST_FIGHT_ENEMIES,
      extraCards: TEST_FIGHT_EXTRA_CARDS.map((id) => ({ id })),
    }),
  );
}

interface FightView {
  seed: string;
  state: CombatState;
  /** Oldest first. */
  log: string[];
}

function newFight(seed: string): FightView {
  const { state, events } = startFight(seed);
  return { seed, state, log: formatEvents(CONTENT, state, events) };
}

export function TestFightScreen({ onExit }: { onExit: () => void }) {
  const [fight, setFight] = useState<FightView>(() => newFight(randomSeed()));
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [seedInput, setSeedInput] = useState('');
  const logRef = useRef<HTMLElement>(null);
  const { state } = fight;

  // Keep the newest log line in view.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [fight.log]);

  const send = (command: CombatCommand) => {
    const result = dispatchCombat(CONTENT, state, command);
    setSelected(null);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage(null);
    const lines = formatEvents(CONTENT, result.state, result.events);
    setFight({ ...fight, state: result.state, log: [...fight.log, ...lines].slice(-LOG_LIMIT) });
  };

  const restart = (seed: string) => {
    setFight(newFight(seed));
    setSelected(null);
    setMessage(null);
  };

  const onCardClick = (card: CardInstance) => {
    if (state.phase !== 'player') return;
    if (selected === card.uid) {
      setSelected(null);
      setMessage(null);
      return;
    }
    const check = canPlayCard(CONTENT, state, card.uid);
    if (!check.ok) {
      setMessage(check.reason);
      return;
    }
    const def = CONTENT.cards[card.id];
    if (def && cardNeedsTarget(def, card.upgraded) && livingEnemies(state).length > 1) {
      setSelected(card.uid);
      setMessage('Now click an enemy to target.');
      return;
    }
    send({ type: 'playCard', uid: card.uid });
  };

  const onEnemyClick = (enemy: Creature) => {
    if (selected === null || enemy.dead) return;
    send({ type: 'playCard', uid: selected, target: enemy.id });
  };

  const applySeed = () => {
    const seed = normalizeSeed(seedInput);
    if (!seed) {
      setMessage('Type a seed first: letters and numbers, like 7KQ2-M9XA.');
      return;
    }
    setSeedInput('');
    restart(seed);
  };

  const over = state.phase !== 'player';

  return (
    <main className="tf">
      <header className="tf-top">
        <button className="tf-link" onClick={onExit}>
          ← Title
        </button>
        <h1>Test fight</h1>
        <div className="tf-seed">
          <span>
            Seed <strong className="tf-seed-code">{fight.seed}</strong>
          </span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applySeed();
            }}
          >
            <input
              aria-label="Enter a seed"
              placeholder="Enter seed"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              maxLength={19}
            />
            <button type="submit">Use seed</button>
          </form>
          <button onClick={() => restart(randomSeed())}>New seed</button>
        </div>
      </header>

      <p className="tf-help">
        Click a card to play it. Attacks ask you to click an enemy. Hover anything for details. End your turn when
        you're out of Energy.
      </p>

      <div className="tf-layout">
        <section className="tf-board" aria-label="Battle">
          <div className="tf-enemies">
            {state.enemies.map((enemy) => (
              <EnemyPanel
                key={enemy.id}
                enemy={enemy}
                label={creatureLabel(state, enemy.id)}
                intent={over ? undefined : getIntent(CONTENT, state, enemy)}
                targetable={selected !== null && !enemy.dead}
                onClick={() => onEnemyClick(enemy)}
              />
            ))}
          </div>

          <PlayerPanel state={state} />

          {message && <p className="tf-message" role="status">{message}</p>}

          <div className="tf-hand" aria-label="Your hand">
            {state.hand.map((card) => (
              <CardButton
                key={card.uid}
                card={card}
                playable={!over && canPlayCard(CONTENT, state, card.uid).ok}
                selected={selected === card.uid}
                onClick={() => onCardClick(card)}
              />
            ))}
            {state.hand.length === 0 && <p className="tf-empty">No cards in hand.</p>}
          </div>

          <div className="tf-controls">
            <span className="tf-piles">
              Draw {state.draw.length} · Discard {state.discard.length} · Exhaust {state.exhaust.length}
            </span>
            <button className="tf-end" onClick={() => send({ type: 'endTurn' })} disabled={over}>
              End turn
            </button>
          </div>

          {over && (
            <div className={`tf-result ${state.phase}`}>
              <h2>{state.phase === 'victory' ? 'Claim secured!' : 'Juno is down'}</h2>
              <p>
                {state.phase === 'victory'
                  ? 'The scrap is yours. Hazard pay pending review.'
                  : 'The crew drags you back to the Last Chance. The wreck keeps its secrets, for now.'}
              </p>
              <p className="tf-stats">
                Turns: {state.stats.turns} · HP lost: {state.stats.damageTaken} · Cards played: {state.stats.cardsPlayed}
              </p>
              <div className="tf-result-buttons">
                <button onClick={() => restart(fight.seed)}>Fight again (same seed)</button>
                <button onClick={() => restart(randomSeed())}>New fight</button>
              </div>
            </div>
          )}
        </section>

        <aside className="tf-log" aria-label="Combat log" ref={logRef}>
          <h2>Combat log</h2>
          <ol>
            {fight.log.map((line, i) => (
              <li key={i} className={line.startsWith('──') ? 'turn' : undefined}>
                {line}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </main>
  );
}

function Statuses({ creature }: { creature: Creature }) {
  const entries = Object.entries(creature.statuses);
  if (entries.length === 0) return null;
  return (
    <ul className="tf-statuses">
      {entries.map(([id, stacks]) => {
        const def = CONTENT.statuses[id];
        return (
          <li key={id} className={`tf-status ${def?.kind ?? ''}`} title={def ? describeStatus(def, stacks) : id}>
            {def?.name ?? id} {stacks}
          </li>
        );
      })}
    </ul>
  );
}

function HpBar({ hp, maxHp, block }: { hp: number; maxHp: number; block: number }) {
  return (
    <div className="tf-hp">
      <div className="tf-hp-bar" aria-hidden="true">
        <div className="tf-hp-fill" style={{ width: `${(100 * hp) / maxHp}%` }} />
      </div>
      <span>
        HP {hp}/{maxHp}
      </span>
      {block > 0 && <span className="tf-block">Block {block}</span>}
    </div>
  );
}

function intentText(intent: IntentView): string {
  return intent.kinds
    .map((k) => {
      if (k === 'attack' && intent.damage !== undefined) return `Attack ${intent.damage}${(intent.hits ?? 1) > 1 ? `×${intent.hits}` : ''}`;
      if (k === 'debuff' || k === 'buff') {
        const names = intent.statuses.map((s) => CONTENT.statuses[s]?.name ?? s).join(', ');
        return `${k === 'buff' ? 'Buff' : 'Debuff'}${names ? ` (${names})` : ''}`;
      }
      return k.charAt(0).toUpperCase() + k.slice(1);
    })
    .join(' + ');
}

function EnemyPanel(props: {
  enemy: Creature;
  label: string;
  intent: IntentView | undefined;
  targetable: boolean;
  onClick: () => void;
}) {
  const { enemy, label, intent, targetable, onClick } = props;
  const flavor = CONTENT.enemies[enemy.defId]?.flavor;
  return (
    <button
      className={`tf-enemy${enemy.dead ? ' dead' : ''}${targetable ? ' targetable' : ''}`}
      onClick={onClick}
      disabled={enemy.dead || !targetable}
      title={flavor}
    >
      {intent && (
        <span className={`tf-intent ${intent.kinds[0]}`} title={`Next turn: ${intent.name}`}>
          {intentText(intent)}
        </span>
      )}
      <span className="tf-name">{label}</span>
      {enemy.dead ? (
        <span className="tf-dead">Scrapped</span>
      ) : (
        <>
          <HpBar hp={enemy.hp} maxHp={enemy.maxHp} block={enemy.block} />
          <Statuses creature={enemy} />
        </>
      )}
    </button>
  );
}

function PlayerPanel({ state }: { state: CombatState }) {
  const p = state.player;
  return (
    <section className="tf-player" aria-label="Juno">
      <div className="tf-energy" title="Energy: spend it to play cards. Refills to 3 each turn.">
        <span className="tf-energy-num">{state.energy}</span>
        <span>/{state.maxEnergy} Energy</span>
      </div>
      <div className="tf-player-main">
        <span className="tf-name">
          {p.name} <small>{CONTENT.characters[p.defId]?.title}</small>
        </span>
        <HpBar hp={p.hp} maxHp={p.maxHp} block={p.block} />
        <Statuses creature={p} />
      </div>
      <ul className="tf-relics" aria-label="Relics">
        {state.relics.map((id) => {
          const def = CONTENT.relics[id];
          return (
            <li key={id} title={def ? `${describeRelic(CONTENT, def)}${def.flavor ? `\n\n${def.flavor}` : ''}` : id}>
              {def?.name ?? id}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CardButton(props: { card: CardInstance; playable: boolean; selected: boolean; onClick: () => void }) {
  const { card, playable, selected, onClick } = props;
  const def = CONTENT.cards[card.id];
  const view = useMemo(() => {
    if (!def) return null;
    const resolved = resolveCard(def, card.upgraded);
    return { name: resolved.name, cost: resolved.cost, text: describeCard(CONTENT, def, card.upgraded) };
  }, [def, card.upgraded]);
  if (!def || !view) return null;
  return (
    <button
      className={`tf-card ${def.type}${selected ? ' selected' : ''}${playable ? '' : ' unplayable'}`}
      onClick={onClick}
      aria-pressed={selected}
      title={def.flavor}
    >
      <span className="tf-card-cost">{view.cost}</span>
      <span className="tf-card-name">{view.name}</span>
      <span className="tf-card-type">
        {def.type} · {def.rarity}
      </span>
      <span className="tf-card-text">{view.text}</span>
    </button>
  );
}
