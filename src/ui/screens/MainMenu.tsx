import { useState } from 'react';
import { CONTENT } from '../../content';
import { HAZARD_LEVELS, normalizeSeed } from '../../engine';
import { BUILD_PHASE, GAME_VERSION } from '../../engine/version';
import { TitleArt } from '../art/TitleArt';
import { Modal } from '../components/Bits';
import { SettingsPanel } from '../components/SettingsPanel';
import { loadProfile, type SavedRun } from '../save';
import './MainMenu.css';

export interface NewRunOptions {
  seed: string | null;
  difficulty: number;
}

export function MainMenu(props: {
  saved: SavedRun | null;
  onContinue: () => void;
  onNewRun: (opts: NewRunOptions) => void;
  onPractice: () => void;
  onHistory?: () => void;
}) {
  const [panel, setPanel] = useState<'new' | 'settings' | 'help' | null>(null);
  const profile = loadProfile();
  const [seed, setSeed] = useState('');
  const [difficulty, setDifficulty] = useState(profile.unlockedHazard);
  const saved = props.saved?.run;

  return (
    <main className="title-screen">
      <header className="title-header">
        <h1 className="title-logo">
          <span className="title-logo-small">The</span>
          Salvage Crew
        </h1>
        <div className="title-rule hazard-stripes" aria-hidden="true" />
        <p className="title-tagline">
          Claim #4471: the colony ship <em>Meridian</em>. Biggest wreck ever found. Hazard pay not included.
        </p>
      </header>

      <TitleArt />

      <nav className="menu-buttons" aria-label="Main menu">
        {saved && (
          <button className="title-cta" onClick={props.onContinue}>
            Continue run
            <small>
              Act {saved.act} · Floor {saved.floor} · {saved.hp}/{saved.maxHp} HP
            </small>
          </button>
        )}
        <button className={saved ? 'menu-button' : 'title-cta'} onClick={() => setPanel('new')}>
          New run
        </button>
        <button className="menu-button" onClick={props.onPractice}>
          Practice fight
        </button>
        {props.onHistory && (
          <button className="menu-button" onClick={props.onHistory}>
            Run history{profile.runs ? ` (${profile.wins}/${profile.runs} won)` : ''}
          </button>
        )}
        <button className="menu-button" onClick={() => setPanel('help')}>
          How to play
        </button>
        <button className="menu-button" onClick={() => setPanel('settings')}>
          Settings
        </button>
      </nav>

      <footer className="title-footer">
        v{GAME_VERSION} · {BUILD_PHASE}
      </footer>

      {panel === 'new' && (
        <Modal title="New run" onClose={() => setPanel(null)}>
          <form
            className="new-run"
            onSubmit={(e) => {
              e.preventDefault();
              props.onNewRun({ seed: normalizeSeed(seed) || null, difficulty });
            }}
          >
            <div className="new-run-char">
              <b>{CONTENT.characters.rigger?.name}</b>, {CONTENT.characters.rigger?.title}
              <p className="muted">{CONTENT.characters.rigger?.flavor}</p>
            </div>
            {saved && <p className="warn">Starting a new run replaces your saved run.</p>}
            <label>
              Seed <span className="muted">(optional: leave blank for a random one)</span>
              <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="e.g. 7KQ2-M9XA" maxLength={19} />
            </label>
            <fieldset>
              <legend>Difficulty</legend>
              {HAZARD_LEVELS.map((h) => {
                const locked = h.level > profile.unlockedHazard;
                return (
                  <label key={h.level} className={`hazard-option${locked ? ' locked' : ''}`}>
                    <input type="radio" name="hazard" checked={difficulty === h.level} disabled={locked} onChange={() => setDifficulty(h.level)} />
                    <span>
                      <b>{h.name}</b>
                      <span className="muted"> {locked ? 'Win a run on the level below to unlock.' : h.description}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <button className="btn" type="submit">
              Launch
            </button>
          </form>
        </Modal>
      )}
      {panel === 'settings' && (
        <Modal title="Settings" onClose={() => setPanel(null)}>
          <SettingsPanel />
        </Modal>
      )}
      {panel === 'help' && (
        <Modal title="How to play" onClose={() => setPanel(null)}>
          <div className="help">
            <p>
              Lead Juno Kade through three acts of the wreck. Each act is a branching map: pick a route of fights,
              Hazards (elites), Docking Bays (rest), the Trader (shop), Signals (events) and Cargo Pods. Beat the boss
              at the top to move on. If Juno runs out of HP, the run is over.
            </p>
            <h3>Fights</h3>
            <ul>
              <li>Each turn you get 3 Energy and draw 5 cards. Cards cost Energy to play.</li>
              <li>Drag a card onto an enemy, or click it then click the enemy. Keys: 1–0 pick a card, ←/→ pick a target, Enter plays, E ends your turn.</li>
              <li>The icon above each enemy shows what it will do next turn. Block absorbs damage and resets at the start of your turn.</li>
              <li>Hover (or long-press) anything for details.</li>
            </ul>
            <h3>Between fights</h3>
            <ul>
              <li>After a fight: Credits, a choice of 1 of 3 cards (or skip), and sometimes a Canister.</li>
              <li>Salvage (relics) give permanent bonuses. Canisters are single-use.</li>
              <li>The run saves itself after every move. Close the tab whenever you like.</li>
            </ul>
          </div>
        </Modal>
      )}
    </main>
  );
}
