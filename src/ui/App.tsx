import { useState } from 'react';
import { CONTENT } from '../content';
import { createRun } from '../engine';
import { RunView } from './run/RunView';
import { clearRun, loadRun, saveRun, type SavedRun } from './save';
import { ArtGallery } from './screens/ArtGallery';
import { MainMenu, type NewRunOptions } from './screens/MainMenu';
import { TestFightScreen } from './screens/TestFightScreen';
import { randomSeed } from './seed';
import { SettingsProvider } from './settings';

type Screen = { type: 'menu' } | { type: 'run'; saved: SavedRun; key: number } | { type: 'practice' };

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
  if (window.location.hash === '#gallery') return <ArtGallery />;

  let body;
  switch (screen.type) {
    case 'practice':
      body = <TestFightScreen onExit={() => setScreen({ type: 'menu' })} />;
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
        />
      );
    }
  }
  return <SettingsProvider>{body}</SettingsProvider>;
}
