/**
 * Stand-alone practice fight (Phase 3/4). Uses the real battle screen.
 * Replaced by full runs in Phase 5.
 */
import { useCallback, useState } from 'react';
import { CONTENT, TEST_FIGHT_ENEMIES, TEST_FIGHT_EXTRA_CARDS } from '../../content';
import { createCombat, dispatchCombat, normalizeSeed, setupFromSeed, type CombatCommand, type CombatState } from '../../engine';
import { BattleScreen, type EventBatch } from '../battle/BattleScreen';
import { randomSeed } from '../seed';
import './TestFightScreen.css';

interface Fight {
  seed: string;
  state: CombatState;
  batch: EventBatch;
  over: 'victory' | 'defeat' | null;
}

let batchKey = 0;

function newFight(seed: string): Fight {
  const { state, events } = createCombat(
    CONTENT,
    setupFromSeed(CONTENT, {
      seed,
      characterId: 'rigger',
      enemies: TEST_FIGHT_ENEMIES,
      extraCards: TEST_FIGHT_EXTRA_CARDS.map((id) => ({ id })),
    }),
  );
  return { seed, state, batch: { key: ++batchKey, events, from: null }, over: null };
}

export function TestFightScreen({ onExit }: { onExit: () => void }) {
  const [fight, setFight] = useState<Fight>(() => newFight(randomSeed()));
  const [seedInput, setSeedInput] = useState('');

  const onCommand = useCallback((command: CombatCommand) => {
    setFight((f) => {
      const result = dispatchCombat(CONTENT, f.state, command);
      if (result.error) return f;
      return { ...f, state: result.state, batch: { key: ++batchKey, events: result.events, from: f.state } };
    });
  }, []);

  const onBattleOver = useCallback((phase: 'victory' | 'defeat') => setFight((f) => ({ ...f, over: phase })), []);

  const s = fight.state;
  return (
    <BattleScreen
      key={fight.batch.from === null ? fight.batch.key : fight.seed + fight.state.version}
      content={CONTENT}
      state={fight.state}
      batch={fight.batch}
      onCommand={onCommand}
      onBattleOver={onBattleOver}
      topLeft={
        <button className="chip-button" onClick={onExit}>
          ← Title
        </button>
      }
      topRight={
        <form
          className="seed-form"
          onSubmit={(e) => {
            e.preventDefault();
            const seed = normalizeSeed(seedInput);
            if (seed) {
              setSeedInput('');
              setFight(newFight(seed));
            }
          }}
        >
          <span className="seed-label">
            Seed <b>{fight.seed}</b>
          </span>
          <input aria-label="Enter a seed" placeholder="Seed" value={seedInput} onChange={(e) => setSeedInput(e.target.value)} maxLength={19} />
          <button className="chip-button" type="submit">
            Use
          </button>
          <button className="chip-button" type="button" onClick={() => setFight(newFight(randomSeed()))}>
            New
          </button>
        </form>
      }
      overlay={
        fight.over && (
          <div className="result-overlay">
            <div className={`result-panel ${fight.over}`}>
              <h2>{fight.over === 'victory' ? 'Claim secured!' : 'Juno is down'}</h2>
              <p>
                {fight.over === 'victory'
                  ? 'The scrap is yours. Hazard pay pending review.'
                  : 'The crew drags you back to the Last Chance. The wreck keeps its secrets, for now.'}
              </p>
              <p className="result-stats">
                Turns {s.stats.turns} · HP lost {s.stats.damageTaken} · Cards played {s.stats.cardsPlayed}
              </p>
              <div className="result-buttons">
                <button className="chip-button" onClick={() => setFight(newFight(fight.seed))}>
                  Fight again (same seed)
                </button>
                <button className="chip-button" onClick={() => setFight(newFight(randomSeed()))}>
                  New fight
                </button>
                <button className="chip-button" onClick={onExit}>
                  Title
                </button>
              </div>
            </div>
          </div>
        )
      }
    />
  );
}
