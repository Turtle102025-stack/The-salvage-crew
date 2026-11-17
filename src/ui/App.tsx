import { useState } from 'react';
import { ArtGallery } from './screens/ArtGallery';
import { TestFightScreen } from './screens/TestFightScreen';
import { TitleScreen } from './screens/TitleScreen';
import { SettingsProvider } from './settings';

type Screen = 'title' | 'testFight';

export function App() {
  const [screen, setScreen] = useState<Screen>('title');
  if (window.location.hash === '#gallery') return <ArtGallery />;
  return (
    <SettingsProvider>
      {screen === 'testFight' ? <TestFightScreen onExit={() => setScreen('title')} /> : <TitleScreen onTestFight={() => setScreen('testFight')} />}
    </SettingsProvider>
  );
}
