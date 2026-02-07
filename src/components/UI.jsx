import { useGameStore } from '../store/gameStore.js';
import { useState } from 'react';

function TutorialOverlay() {
  const dismissTutorial = useGameStore((s) => s.dismissTutorial);
  const initAudio = useGameStore((s) => s.initAudio);
  const audioReady = useGameStore((s) => s.audioReady);

  const handleStart = async () => {
    await initAudio();
    dismissTutorial();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.tutorialBox}>
        <h1 style={styles.title}>Monster Mash</h1>
        <div style={styles.instructions}>
          <p><strong>Tap</strong> anywhere to spawn sound creatures</p>
          <p><strong>Tap a MIC</strong> to cycle its audio effect</p>
          <p>A chaotic frequency sweeps through space, activating creatures when it crosses their pitch</p>
          <p>Watch creatures <strong>evolve</strong> their timbre over time</p>
        </div>
        <button style={styles.startButton} onClick={handleStart}>
          {audioReady ? 'Enter' : 'Start'}
        </button>
        <p style={styles.hint}>Audio requires user interaction to begin</p>
      </div>
    </div>
  );
}

function ControlBar() {
  const paused = useGameStore((s) => s.paused);
  const togglePause = useGameStore((s) => s.togglePause);
  const clearAll = useGameStore((s) => s.clearAll);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClear = () => {
    if (showConfirm) {
      clearAll();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  return (
    <div style={styles.controlBar}>
      <button style={styles.controlButton} onClick={togglePause}>
        {paused ? 'PLAY' : 'PAUSE'}
      </button>
      <button
        style={{
          ...styles.controlButton,
          ...(showConfirm ? styles.confirmButton : {}),
        }}
        onClick={handleClear}
      >
        {showConfirm ? 'CONFIRM?' : 'CLEAR'}
      </button>
    </div>
  );
}

export default function UI() {
  const showTutorial = useGameStore((s) => s.showTutorial);

  return (
    <>
      {showTutorial && <TutorialOverlay />}
      {!showTutorial && <ControlBar />}
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(5, 5, 15, 0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    fontFamily: 'monospace',
  },
  tutorialBox: {
    textAlign: 'center',
    color: '#ccc',
    maxWidth: 340,
    padding: '30px 25px',
  },
  title: {
    fontSize: '28px',
    color: '#fff',
    marginBottom: '24px',
    fontWeight: 300,
    letterSpacing: '3px',
    textTransform: 'uppercase',
  },
  instructions: {
    fontSize: '14px',
    lineHeight: '2',
    marginBottom: '28px',
    color: '#aaa',
  },
  startButton: {
    background: 'none',
    border: '1px solid #555',
    color: '#fff',
    padding: '12px 40px',
    fontSize: '16px',
    fontFamily: 'monospace',
    cursor: 'pointer',
    letterSpacing: '2px',
    transition: 'border-color 0.2s',
  },
  hint: {
    marginTop: '16px',
    fontSize: '10px',
    color: '#555',
  },
  controlBar: {
    position: 'fixed',
    top: 12,
    left: 12,
    display: 'flex',
    gap: '8px',
    zIndex: 50,
  },
  controlButton: {
    background: 'rgba(20, 20, 30, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: 'rgba(255, 255, 255, 0.5)',
    padding: '6px 14px',
    fontSize: '11px',
    fontFamily: 'monospace',
    cursor: 'pointer',
    letterSpacing: '1px',
    backdropFilter: 'blur(4px)',
  },
  confirmButton: {
    borderColor: '#ff4444',
    color: '#ff6666',
  },
};
