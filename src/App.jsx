import { useEffect } from 'react';
import GameCanvas from './components/GameCanvas.jsx';
import UI from './components/UI.jsx';
import { useGameStore } from './store/gameStore.js';

function App() {
  const dispose = useGameStore((s) => s.dispose);

  useEffect(() => {
    return () => dispose();
  }, [dispose]);

  return (
    <>
      <GameCanvas />
      <UI />
    </>
  );
}

export default App;
