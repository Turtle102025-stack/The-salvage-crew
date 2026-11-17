import { useEffect, useState } from 'react';
import { playSfx, unlockAudio } from './audio/sfx';
import { CONTENT } from '../content';
import { createRun } from '../engine';
import { RunView } from './run/RunView';
import { clearRun, loadRun, saveRun, type SavedRun } from './save';
import { ArtGallery } from './screens/ArtGallery';
import { HistoryScreen } from './screens/HistoryScreen';
import { MainMenu, type NewRunOptions } from './screens/MainMenu';
import { TestFightScreen } from './screens/TestFightScreen';
import { randomSeed } from './seed';
import { SettingsProvider } from './settings';

type Screen = { type: 'menu' } | { type: 'run'; saved: SavedRun; key: number } | { type: 'practice' } | { type: 'history' };

let runKey = 0;

function startRun(opts: NewRunOptions): SavedRun {
  clearRun();
  const { run } = createRun(CONTENT, { seed: opts.seed ?? randomSeed(), characterId: 'rigger', difficulty: opts.difficulty });
  const saved: SavedRun = { run, playMs: 0, startedAt: Date.now() };
  saveRun(saved);
  return saved;
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ type: 'menu' });
  const [lastOptions, setLastOptions] = useState<NewRunOptions>({ seed: null, difficulty: 0 });

  // Unlock audio on the first interaction; a soft click for every button press.
  useEffect(() => {
    const onDown = () => unlockAudio();
    const onClick = (e: MouseEvent) => {
      const button = (e.target as HTMLElement | null)?.closest('button');
      if (button && !button.disabled && !button.closest('.hand-card') && !button.closest('.pick-card')) playSfx('click');
    };
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('click', onClick);
    };
  }, []);
  if (window.location.hash === '#gallery') return <ArtGallery />;

  let body;
  switch (screen.type) {
    case 'practice':
      body = <TestFightScreen onExit={() => setScreen({ type: 'menu' })} />;
      break;
    case 'history':
      body = (
        <HistoryScreen
          onBack={() => setScreen({ type: 'menu' })}
          onReplay={(seed, difficulty) => {
            if (loadRun() && !window.confirm('Start a new run with this seed? It replaces your saved run.')) return;
            setLastOptions({ seed, difficulty });
            setScreen({ type: 'run', saved: startRun({ seed, difficulty }), key: ++runKey });
          }}
        />
      );
      break;
    case 'run':
      body = (
        <RunView
          key={screen.key}
          saved={screen.saved}
          onExit={() => setScreen({ type: 'menu' })}
          onNewRun={() => setScreen({ type: 'run', saved: startRun({ seed: null, difficulty: lastOptions.difficulty }), key: ++runKey })}
        />
      );
      break;
    default: {
      const saved = loadRun();
      body = (
        <MainMenu
          saved={saved}
          onContinue={() => saved && setScreen({ type: 'run', saved, key: ++runKey })}
          onNewRun={(opts) => {
            setLastOptions(opts);
            setScreen({ type: 'run', saved: startRun(opts), key: ++runKey });
          }}
          onPractice={() => setScreen({ type: 'practice' })}
          onHistory={() => setScreen({ type: 'history' })}
        />
      );
    }
  }
  return <SettingsProvider>{body}</SettingsProvider>;
}
