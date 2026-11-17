/** The non-battle screens of a run. Each one only sends commands up. */
import { useMemo, useState, type ReactNode } from 'react';
import {
  choiceAvailable,
  describeRelic,
  describeRunEffects,
  difficultyMods,
  HAZARD_LEVELS,
  resolveCard,
  selectableCards,
  shopPrice,
  type CardInstance,
  type Content,
  type RewardState,
  type RunCommand,
  type RunScreen,
  type RunState,
} from '../../engine';
import { Glyph } from '../art/glyphs';
import { PlayerArt } from '../art/PlayerArt';
import { EnemyArt } from '../art/EnemyArt';
import { relicArt } from '../art/specs';
import { Credits, PotionIcon, RelicIcon } from '../components/Bits';
import { CardView } from '../components/Card';
import { sortDeck } from '../components/DeckModal';
import { TipBody, Tooltip } from '../components/Tooltip';
import { cardNotes } from '../glossary';
import { bossName } from './MapView';

type Send = (command: RunCommand) => void;

/** A card with keyword tooltips, clickable. */
function PickableCard(props: { content: Content; id: string; upgraded: boolean; width?: number; onClick?: () => void; disabled?: boolean; selected?: boolean; footer?: ReactNode }) {
  const def = props.content.cards[props.id];
  const notes = def ? cardNotes(props.content, def, props.upgraded) : [];
  return (
    <div className={`pick-card${props.selected ? ' selected' : ''}${props.disabled ? ' disabled' : ''}`}>
      <Tooltip
        side="right"
        wide
        disabled={notes.length === 0 && !def?.flavor}
        content={
          <>
            {notes.map((n) => (
              <TipBody key={n.name} title={n.name}>
                {n.text}
              </TipBody>
            ))}
            {def?.flavor && (
              <TipBody title={def.name} accent="var(--text-dim)">
                <em>{def.flavor}</em>
              </TipBody>
            )}
          </>
        }
      >
        <button className="pick-card-button" onClick={props.onClick} disabled={props.disabled} aria-pressed={props.selected}>
          <CardView content={props.content} id={props.id} upgraded={props.upgraded} width={props.width ?? 180} />
        </button>
      </Tooltip>
      {props.footer}
    </div>
  );
}

function RelicTile({ content, id, onClick, footer, disabled }: { content: Content; id: string; onClick?: () => void; footer?: ReactNode; disabled?: boolean }) {
  const def = content.relics[id];
  const art = relicArt(id);
  return (
    <button className="relic-tile" onClick={onClick} disabled={disabled}>
      <span className={`relic-tile-icon rarity-${def?.rarity}`}>
        <Glyph name={art.glyph} color={art.color} color2={art.color2} size="100%" />
      </span>
      <span className="relic-tile-text">
        <b>{def?.name ?? id}</b>
        <span>{def ? describeRelic(content, def) : ''}</span>
        {def?.flavor && <em>{def.flavor}</em>}
      </span>
      {footer}
    </button>
  );
}

// --- Rewards -------------------------------------------------------------------

export function RewardItems({ content, run, reward, send }: { content: Content; run: RunState; reward: RewardState; send: Send }) {
  const [choosing, setChoosing] = useState<number | null>(null);
  const slotsFull = !run.potions.includes(null);
  const choice = choosing !== null ? reward.cards[choosing] : undefined;
  return (
    <>
      <div className="reward-list">
        {reward.gold !== null && (
          <button className="reward-row" onClick={() => send({ type: 'takeGold' })}>
            <Glyph name="coin" color="var(--rarity-rare)" size={34} />
            <span>{reward.gold} Credits</span>
          </button>
        )}
        {reward.potion && (
          <button className="reward-row" onClick={() => send({ type: 'takePotion' })} disabled={slotsFull}>
            <PotionIcon content={content} id={reward.potion} size={34} />
            <span>
              {content.potions[reward.potion]?.name ?? reward.potion}
              {slotsFull && <small> (Canister slots full: drop one first)</small>}
            </span>
          </button>
        )}
        {reward.relic && (
          <button className="reward-row" onClick={() => send({ type: 'takeRelic' })}>
            <RelicIcon content={content} id={reward.relic} size={38} />
            <span>{content.relics[reward.relic]?.name ?? reward.relic}</span>
          </button>
        )}
        {reward.cards.map((c, i) =>
          c.taken ? null : (
            <button key={i} className="reward-row" onClick={() => setChoosing(i)}>
              <Glyph name="card" color="var(--card-skill)" size={34} />
              <span>Add a card to your deck</span>
            </button>
          ),
        )}
      </div>
      {reward.bossRelics && (
        <section className="boss-relics">
          <h3>Choose one piece of boss Salvage</h3>
          <div className="relic-tiles">
            {reward.bossRelics.map((id, i) => (
              <RelicTile key={id} content={content} id={id} onClick={() => send({ type: 'takeRelic', index: i })} />
            ))}
          </div>
        </section>
      )}
      {choice && choosing !== null && (
        <div className="modal-backdrop" onClick={() => setChoosing(null)}>
          <div className="modal card-choice" role="dialog" aria-label="Choose a card" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>Choose a card</h2>
              <p>It goes straight into your deck. Or skip it: a lean deck is a fast deck.</p>
            </header>
            <div className="card-grid">
              {choice.options.map((o, i) => (
                <PickableCard
                  key={o.id}
                  content={content}
                  id={o.id}
                  upgraded={o.upgraded}
                  width={190}
                  onClick={() => {
                    setChoosing(null);
                    send({ type: 'takeCard', reward: choosing, option: i });
                  }}
                />
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setChoosing(null)}>
                Back
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setChoosing(null);
                  send({ type: 'skipCard', reward: choosing });
                }}
              >
                Skip card
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function RewardView({ content, run, screen, send }: { content: Content; run: RunState; screen: Extract<RunScreen, { type: 'reward' }>; send: Send }) {
  const title = screen.node === 'boss' ? 'Boss down!' : screen.node === 'elite' ? 'Hazard cleared' : 'Area secured';
  return (
    <div className="run-center">
      <section className="panel reward-panel">
        <h2>{title}</h2>
        <p className="muted">Strip the wreckage for anything worth hauling home.</p>
        <RewardItems content={content} run={run} reward={screen.reward} send={send} />
        <button className="btn" onClick={() => send({ type: 'proceed' })}>
          {screen.node === 'boss' ? (content.acts.some((a) => a.id === run.act + 1) ? 'Onward to the next act' : 'Claim the payout') : 'Continue'}
        </button>
      </section>
    </div>
  );
}

// --- Rest ------------------------------------------------------------------------

export function RestView({ content, run, screen, send }: { content: Content; run: RunState; screen: Extract<RunScreen, { type: 'rest' }>; send: Send }) {
  const percent = difficultyMods(run.difficulty).restHealPercent + run.relics.reduce((s, id) => s + (content.relics[id]?.run?.restHealBonus ?? 0), 0);
  const heal = Math.min(run.maxHp - run.hp, Math.round((run.maxHp * percent) / 100));
  const canUpgrade = selectableCards(content, run, 'upgrade').length > 0;
  return (
    <div className="run-center">
      <section className="panel rest-panel">
        <div className="rest-art">
          <PlayerArt className="rest-juno" />
          <Glyph name="moon" color="var(--teal)" size={64} />
        </div>
        <h2>Docking Bay</h2>
        <p className="muted">A sealed pocket of air, a working heater and a vending machine that only sells soup. Luxury.</p>
        {!screen.done ? (
          <div className="rest-options">
            <button className="rest-option" onClick={() => send({ type: 'rest' })}>
              <Glyph name="heart" color="var(--hp)" size={48} />
              <b>Rest</b>
              <span>Heal {heal} HP ({percent}% of max HP)</span>
            </button>
            <button className="rest-option" onClick={() => send({ type: 'smith' })} disabled={!canUpgrade}>
              <Glyph name="wrench" color="var(--amber)" size={48} />
              <b>Tinker</b>
              <span>{canUpgrade ? 'Upgrade a card' : 'Everything is already upgraded'}</span>
            </button>
          </div>
        ) : (
          <>
            <p className="rest-result">{screen.healed !== undefined ? `You sleep like a rock. Healed ${screen.healed} HP.` : 'Card upgraded. It even works better than before.'}</p>
            <button className="btn" onClick={() => send({ type: 'proceed' })}>
              Continue
            </button>
          </>
        )}
        {!screen.done && (
          <button className="btn btn-secondary" onClick={() => send({ type: 'proceed' })}>
            Leave without resting
          </button>
        )}
      </section>
    </div>
  );
}

// --- Shop ------------------------------------------------------------------------

function PriceTag({ price, affordable, sold, sale }: { price: number; affordable: boolean; sold: boolean; sale?: boolean }) {
  if (sold) return <span className="price sold">Sold</span>;
  return (
    <span className={`price${affordable ? '' : ' too-much'}${sale ? ' sale' : ''}`}>
      <Credits amount={price} size={18} />
      {sale && <small>SALE</small>}
    </span>
  );
}

export function ShopView({ content, run, screen, send }: { content: Content; run: RunState; screen: Extract<RunScreen, { type: 'shop' }>; send: Send }) {
  const { shop } = screen;
  const removePrice = shopPrice(content, run, shop.removePrice);
  const slotsFull = !run.potions.includes(null);
  return (
    <div className="run-scroll">
      <section className="panel shop-panel">
        <header className="shop-header">
          <EnemyArt className="trader-art" spec={{ body: 'scavenger', main: '#5a4a7a', accent: 'var(--rarity-rare)', eye: 'var(--rarity-rare)', features: ['crown', 'antenna'] }} />
          <div>
            <h2>The Trader</h2>
            <p className="muted">"Everything’s salvaged, nothing’s stolen, and all sales are final. Especially the ones that explode."</p>
          </div>
          <button className="btn" onClick={() => send({ type: 'proceed' })}>
            Leave
          </button>
        </header>
        <h3>Cards</h3>
        <div className="shop-row">
          {shop.cards.map((item, i) => {
            const price = shopPrice(content, run, item.price);
            return (
              <PickableCard
                key={item.id}
                content={content}
                id={item.id}
                upgraded={item.upgraded ?? false}
                width={150}
                disabled={item.sold || price > run.gold}
                onClick={() => send({ type: 'buy', kind: 'card', index: i })}
                footer={<PriceTag price={price} affordable={price <= run.gold} sold={item.sold} sale={item.onSale} />}
              />
            );
          })}
        </div>
        <div className="shop-split">
          <div>
            <h3>Salvage</h3>
            <div className="relic-tiles">
              {shop.relics.map((item, i) => {
                const price = shopPrice(content, run, item.price);
                return item.sold ? (
                  <div key={item.id} className="relic-tile sold-out">
                    Sold
                  </div>
                ) : (
                  <RelicTile
                    key={item.id}
                    content={content}
                    id={item.id}
                    disabled={price > run.gold}
                    onClick={() => send({ type: 'buy', kind: 'relic', index: i })}
                    footer={<PriceTag price={price} affordable={price <= run.gold} sold={false} />}
                  />
                );
              })}
            </div>
          </div>
          <div>
            <h3>Canisters</h3>
            <div className="potion-tiles">
              {shop.potions.map((item, i) => {
                const price = shopPrice(content, run, item.price);
                const def = content.potions[item.id];
                return (
                  <button
                    key={`${item.id}-${i}`}
                    className="potion-tile"
                    disabled={item.sold || price > run.gold || slotsFull}
                    onClick={() => send({ type: 'buy', kind: 'potion', index: i })}
                    title={slotsFull ? 'Your Canister slots are full.' : undefined}
                  >
                    <PotionIcon content={content} id={item.id} size={40} />
                    <b>{def?.name}</b>
                    <PriceTag price={price} affordable={price <= run.gold} sold={item.sold} />
                  </button>
                );
              })}
            </div>
            <h3>Services</h3>
            <button className="potion-tile service" disabled={shop.removeUsed || removePrice > run.gold} onClick={() => send({ type: 'removeCard' })}>
              <Glyph name="saw" color="var(--steel-300)" size={40} />
              <b>Remove a card</b>
              <span className="muted">Shrink your deck: fewer weak draws.</span>
              <PriceTag price={removePrice} affordable={removePrice <= run.gold} sold={shop.removeUsed} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// --- Events ----------------------------------------------------------------------

export function EventView({ content, run, screen, send }: { content: Content; run: RunState; screen: Extract<RunScreen, { type: 'event' }>; send: Send }) {
  const def = content.events[screen.event.id];
  const scene = def?.scenes[screen.event.scene];
  if (!def || !scene) return null;
  const done = screen.event.result !== null;
  return (
    <div className="run-center">
      <section className="panel event-panel">
        <div className="event-art">
          <Glyph name={def.art ?? 'antenna'} color="var(--amber)" color2="var(--teal)" size={96} />
        </div>
        <div className="event-body">
          <p className="event-kicker">Signal</p>
          <h2>{def.name}</h2>
          <p className="event-text">{scene.text}</p>
          {!done ? (
            <div className="event-choices">
              {scene.choices.map((c, i) => {
                const ok = choiceAvailable(run, c.requires);
                const effects = describeRunEffects(content, c.effects);
                const why = !ok ? (c.requires?.gold !== undefined && run.gold < c.requires.gold ? `Needs ${c.requires.gold} Credits.` : c.requires?.hp !== undefined ? `Needs more than ${c.requires.hp} HP.` : 'Not available.') : '';
                return (
                  <button key={i} className="event-choice" disabled={!ok} onClick={() => send({ type: 'eventChoice', index: i })}>
                    <b>[{c.label}]</b> <span>{effects || 'Nothing happens.'}</span>
                    {why && <small> {why}</small>}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              {screen.event.result && <p className="event-result">{screen.event.result}</p>}
              {screen.event.outcome.length > 0 && (
                <ul className="event-outcome">
                  {screen.event.outcome.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
              <button className="btn" onClick={() => send({ type: 'proceed' })}>
                Continue
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

// --- Treasure --------------------------------------------------------------------

export function TreasureView({ content, run, screen, send }: { content: Content; run: RunState; screen: Extract<RunScreen, { type: 'treasure' }>; send: Send }) {
  return (
    <div className="run-center">
      <section className="panel reward-panel">
        <div className={`treasure-art${screen.opened ? ' open' : ''}`}>
          <Glyph name="crate" color="var(--amber)" size={110} />
        </div>
        <h2>Cargo Pod</h2>
        {!screen.opened ? (
          <>
            <p className="muted">An intact cargo pod, still sealed. Finders keepers is basically salvage law.</p>
            <button className="btn" onClick={() => send({ type: 'openChest' })}>
              Crack it open
            </button>
          </>
        ) : (
          <>
            {screen.reward && <RewardItems content={content} run={run} reward={screen.reward} send={send} />}
            <button className="btn" onClick={() => send({ type: 'proceed' })}>
              Continue
            </button>
          </>
        )}
      </section>
    </div>
  );
}

// --- Card select -----------------------------------------------------------------

const SELECT_TEXT: Record<string, { title: string; verb: string }> = {
  upgrade: { title: 'Choose a card to upgrade', verb: 'Upgrade' },
  remove: { title: 'Choose a card to remove', verb: 'Remove' },
  transform: { title: 'Choose a card to transform', verb: 'Transform' },
  duplicate: { title: 'Choose a card to copy', verb: 'Copy' },
};

export function CardSelectView({ content, run, screen, send }: { content: Content; run: RunState; screen: Extract<RunScreen, { type: 'cardSelect' }>; send: Send }) {
  const eligible = useMemo(() => sortDeck(content, selectableCards(content, run, screen.purpose)), [content, run, screen.purpose]);
  const need = Math.min(screen.count, eligible.length);
  const [picked, setPicked] = useState<number[]>([]);
  const text = SELECT_TEXT[screen.purpose] ?? SELECT_TEXT.upgrade!;
  const toggle = (c: CardInstance) =>
    setPicked((p) => (p.includes(c.uid) ? p.filter((u) => u !== c.uid) : need === 1 ? [c.uid] : p.length < need ? [...p, c.uid] : p));
  const preview = screen.purpose === 'upgrade' && picked.length === 1 ? eligible.find((c) => c.uid === picked[0]) : undefined;
  return (
    <div className="run-scroll">
      <section className="panel select-panel">
        <header className="select-header">
          <div>
            <h2>{text.title}</h2>
            <p className="muted">
              {need > 1 ? `Pick ${need} cards.` : 'Pick one.'}
              {screen.cost ? ` The Trader charges ${screen.cost} Credits.` : ''}
            </p>
          </div>
          <div className="select-actions">
            {screen.optional && (
              <button className="btn btn-secondary" onClick={() => send({ type: 'cancelSelect' })}>
                Cancel
              </button>
            )}
            <button className="btn" disabled={picked.length !== need} onClick={() => send({ type: 'selectCards', uids: picked })}>
              {text.verb}
            </button>
          </div>
        </header>
        {preview && (
          <div className="upgrade-preview" aria-label="Upgrade preview">
            <CardView content={content} id={preview.id} width={170} />
            <Glyph name="up" color="var(--heal)" size={40} />
            <CardView content={content} id={preview.id} upgraded width={170} />
          </div>
        )}
        <div className="card-grid">
          {eligible.map((c) => (
            <PickableCard key={c.uid} content={content} id={c.id} upgraded={c.upgraded} width={150} selected={picked.includes(c.uid)} onClick={() => toggle(c)} />
          ))}
        </div>
      </section>
    </div>
  );
}

// --- Act intro & game over ----------------------------------------------------------

export function ActIntroView({ content, run, send }: { content: Content; run: RunState; send: Send }) {
  const act = content.acts.find((a) => a.id === run.act);
  return (
    <div className="run-center">
      <section className="panel act-intro">
        <p className="event-kicker">Act {run.act}</p>
        <h2 className="act-title">{act?.name}</h2>
        <p>{act?.intro}</p>
        <p className="act-boss">
          <Glyph name="skull" color="var(--hp)" size={26} /> Boss sighted: <b>{bossName(content, run)}</b>
        </p>
        {run.difficulty > 0 && <p className="muted">{HAZARD_LEVELS[run.difficulty]?.name}</p>}
        <button className="btn" onClick={() => send({ type: 'proceed' })}>
          {run.act === 1 ? 'Suit up' : 'Push deeper'}
        </button>
      </section>
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

export function GameOverView({ content, run, playMs, onMenu, onNewRun }: { content: Content; run: RunState; playMs: number; onMenu: () => void; onNewRun: () => void }) {
  const won = run.phase === 'won';
  const s = run.stats;
  const deck = sortDeck(content, run.deck);
  const stats: [string, string | number][] = [
    ['Floors climbed', s.floorsClimbed],
    ['Enemies scrapped', s.enemiesKilled],
    ['Hazards cleared', s.elitesKilled],
    ['Bosses beaten', s.bossesKilled],
    ['Damage dealt', s.damageDealt],
    ['Damage taken', s.damageTaken],
    ['Cards played', s.cardsPlayed],
    ['Turns', s.turns],
    ['Credits earned', s.goldEarned],
    ['Canisters used', s.potionsUsed],
    ['Time', formatTime(playMs)],
  ];
  return (
    <div className="run-scroll">
      <section className={`panel gameover ${won ? 'won' : 'lost'}`}>
        <div className="gameover-head">
          <PlayerArt className={`gameover-juno${won ? '' : ' down'}`} />
          <div>
            <p className="event-kicker">{won ? 'Contract complete' : 'Run over'}</p>
            <h2 className="act-title">{won ? 'Payday!' : 'Juno is down'}</h2>
            <p>
              {won
                ? 'The Meridian is stripped, the claim is filed and the crew is buying the first round. Hazard pay approved (eventually).'
                : `Taken out by ${s.killedBy ?? 'the wreck'} on floor ${run.floor} of act ${run.act}. The crew drags you back to the Last Chance. The wreck keeps its secrets, for now.`}
            </p>
            <p className="muted">
              Seed <b className="seed-code">{run.seed}</b> · {HAZARD_LEVELS[run.difficulty]?.name}
            </p>
          </div>
        </div>
        <div className="stat-grid">
          {stats.map(([label, value]) => (
            <div key={label} className="stat">
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </div>
        <h3>Salvage ({run.relics.length})</h3>
        <div className="relic-bar">
          {run.relics.map((id) => (
            <RelicIcon key={id} content={content} id={id} size={40} />
          ))}
        </div>
        <h3>Final deck ({run.deck.length})</h3>
        <ul className="deck-list">
          {deck.map((c) => {
            const def = content.cards[c.id];
            return (
              <li key={c.uid} className={`type-${def?.type}`}>
                {def ? resolveCard(def, c.upgraded).name : c.id}
              </li>
            );
          })}
        </ul>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onMenu}>
            Main menu
          </button>
          <button className="btn" onClick={onNewRun}>
            New run
          </button>
        </div>
      </section>
    </div>
  );
}
