import { useState } from 'react';
import { HAZARD_LEVELS } from '../../engine';
import { Glyph } from '../art/glyphs';
import { loadProfile, saveProfile, type Profile } from '../save';
import './HistoryScreen.css';

function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export function HistoryScreen({ onBack, onReplay }: { onBack: () => void; onReplay: (seed: string, difficulty: number) => void }) {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const best = profile.history.reduce((m, h) => Math.max(m, h.score), 0);
  const fastest = profile.history.filter((h) => h.won).reduce((m, h) => Math.min(m, h.playMs), Infinity);
  return (
    <main className="history">
      <header className="history-head">
        <button className="chip-button" onClick={onBack}>
          ← Menu
        </button>
        <h1>Run history</h1>
      </header>
      <section className="history-summary">
        <div className="stat">
          <span>Runs</span>
          <b>{profile.runs}</b>
        </div>
        <div className="stat">
          <span>Wins</span>
          <b>{profile.wins}</b>
        </div>
        <div className="stat">
          <span>Win rate</span>
          <b>{profile.runs ? `${Math.round((100 * profile.wins) / profile.runs)}%` : '—'}</b>
        </div>
        <div className="stat">
          <span>Best score</span>
          <b>{best || '—'}</b>
        </div>
        <div className="stat">
          <span>Fastest win</span>
          <b>{Number.isFinite(fastest) ? formatTime(fastest) : '—'}</b>
        </div>
        <div className="stat">
          <span>Hazard unlocked</span>
          <b>{profile.unlockedHazard}</b>
        </div>
      </section>
      {profile.history.length === 0 ? (
        <p className="muted history-empty">No runs yet. Go strip a wreck.</p>
      ) : (
        <ol className="history-list">
          {profile.history.map((h, i) => (
            <li key={`${h.date}-${i}`} className={h.won ? 'won' : 'lost'}>
              <span className="history-icon">
                <Glyph name={h.won ? 'star' : 'skull'} color={h.won ? 'var(--rarity-rare)' : 'var(--steel-300)'} size={30} />
              </span>
              <span className="history-main">
                <b>{h.won ? 'Contract complete' : `Down on Act ${h.act}, floor ${h.floor}`}</b>
                <span className="muted">
                  {new Date(h.date).toLocaleString()} · {HAZARD_LEVELS[h.difficulty]?.name ?? `Hazard ${h.difficulty}`}
                  {h.killedBy && !h.won ? ` · ${h.killedBy}` : ''}
                </span>
                <span className="muted">
                  {h.floorsClimbed} floors · {h.enemiesKilled} enemies · {h.deckSize} cards · {h.relics} Salvage · {formatTime(h.playMs)}
                </span>
              </span>
              <span className="history-score">
                <small>Score</small>
                <b>{h.score}</b>
              </span>
              <span className="history-seed">
                <small>Seed</small>
                <b className="seed-code">{h.seed}</b>
                <button className="chip-button" onClick={() => onReplay(h.seed, h.difficulty)}>
                  Replay seed
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      {profile.history.length > 0 && (
        <button
          className="btn btn-secondary history-clear"
          onClick={() => {
            if (!window.confirm('Clear your run history? Unlocked Hazard levels are kept.')) return;
            const next = { ...profile, history: [] };
            saveProfile(next);
            setProfile(next);
          }}
        >
          Clear history
        </button>
      )}
    </main>
  );
}
