# Monster Mash

A mobile touch-based audiovisual game where users spawn sound-producing creatures that respond to a chaotically-sweeping resonant frequency driven by a Lorenz attractor.

## How to Play

1. **Tap** anywhere on the canvas to spawn a sound creature
2. **Tap a MIC** to cycle through its audio effect
3. Watch creatures evolve their timbre as the chaotic frequency sweeps past them
4. Use **PAUSE** and **CLEAR** buttons in the top-left corner

## Creature Types

- **Drone** (circles, blue) - sustained tones with long attack/release
- **Pulse** (diamonds, red) - rhythmic gated triggering
- **Pluck** (triangles, green) - percussive hits on frequency threshold crossing
- **Granular** (scattered dots, yellow) - random sparse micro-triggers

## Tech Stack

- React + Vite
- Tone.js for audio synthesis and effects
- Zustand for state management
- Canvas API for rendering

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
