import { useState } from 'react';
import { TestFightScreen } from './screens/TestFightScreen';
import { TitleScreen } from './screens/TitleScreen';

type Screen = 'title' | 'testFight';

export function App() {
  const [screen, setScreen] = useState<Screen>('title');
  if (screen === 'testFight') return <TestFightScreen onExit={() => setScreen('title')} />;
  return <TitleScreen onTestFight={() => setScreen('testFight')} />;
}
