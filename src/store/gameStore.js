import { create } from 'zustand';
import {
  CREATURE_TYPES,
  FREQUENCY_PALETTES,
  MAX_CREATURES,
  MIC_INFLUENCE_RADIUS,
  MOVEMENT,
  EVOLUTION_STAGES,
  EFFECT_TYPES,
} from '../game/constants.js';
import { audioEngine } from '../audio/engine.js';

let nextCreatureId = 1;
let nextMicId = 1;

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomCreatureType() {
  return Math.floor(Math.random() * 4);
}

// Calculate initial microphone positions spread around the canvas
function generateMicPositions(count) {
  const mics = [];
  const effectNames = [...EFFECT_TYPES];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const radius = 0.3;
    mics.push({
      id: nextMicId++,
      x: 0.5 + Math.cos(angle) * radius,
      y: 0.5 + Math.sin(angle) * radius,
      effectType: effectNames[i % effectNames.length],
      activeLevel: 0, // visual feedback level (0-1)
    });
  }
  return mics;
}

export const useGameStore = create((set, get) => ({
  // State
  creatures: [],
  microphones: generateMicPositions(5),
  paused: false,
  audioReady: false,
  showTutorial: true,
  lorenzState: { x: 1, y: 1, z: 1, frequency: 80 },
  currentFrequency: 80,

  // Actions
  initAudio: async () => {
    await audioEngine.init();
    // Initialize mic effects
    const mics = get().microphones;
    mics.forEach((mic) => {
      audioEngine.createMicEffect(mic.id, mic.effectType);
    });
    set({ audioReady: true });
  },

  spawnCreature: (x, y) => {
    const state = get();
    if (!state.audioReady || state.paused) return;
    if (state.creatures.length >= MAX_CREATURES) return;

    const type = randomCreatureType();
    const frequency = randomFromArray(FREQUENCY_PALETTES[type]);

    const creature = {
      id: nextCreatureId++,
      type,
      frequency,
      x,
      y,
      vx: (Math.random() - 0.5) * MOVEMENT.baseSpeed * 0.01,
      vy: (Math.random() - 0.5) * MOVEMENT.baseSpeed * 0.01,
      evolutionStage: 0,
      resonanceExposure: 0,
      timeAlive: 0,
      spawnTime: performance.now(),
      isActive: false,
      wasActive: false, // for pluck threshold detection
      size: 8 + Math.random() * 6,
      angle: Math.random() * Math.PI * 2,
    };

    audioEngine.createCreatureSynth(creature);

    set((s) => ({ creatures: [...s.creatures, creature] }));
  },

  cycleMicEffect: (micId) => {
    const newType = audioEngine.cycleMicEffect(micId);
    if (!newType) return;
    set((s) => ({
      microphones: s.microphones.map((m) =>
        m.id === micId ? { ...m, effectType: newType } : m
      ),
    }));
  },

  togglePause: () => {
    const state = get();
    if (state.paused) {
      audioEngine.resume();
    } else {
      audioEngine.pause();
    }
    set({ paused: !state.paused });
  },

  clearAll: () => {
    const state = get();
    state.creatures.forEach((c) => audioEngine.removeCreatureSynth(c.id));
    set({ creatures: [] });
  },

  dismissTutorial: () => set({ showTutorial: false }),

  // Game loop tick - called from requestAnimationFrame
  tick: (dt) => {
    const state = get();
    if (state.paused || !state.audioReady) return;

    // Update Lorenz
    const currentFreq = audioEngine.updateLorenzFrequency();
    const lorenzState = audioEngine.getLorenzState();

    // Update creatures
    const updatedCreatures = state.creatures.map((creature) => {
      const c = { ...creature };
      c.timeAlive = performance.now() - c.spawnTime;

      // Movement - Brownian motion with drift
      c.angle += (Math.random() - 0.5) * 0.3;
      c.vx += Math.cos(c.angle) * MOVEMENT.brownianStrength * 0.001;
      c.vy += Math.sin(c.angle) * MOVEMENT.brownianStrength * 0.001;

      // Damping
      c.vx *= 0.98;
      c.vy *= 0.98;

      // Mic attraction when active
      const isActive = audioEngine.isCreatureActive(c.frequency);
      if (isActive) {
        state.microphones.forEach((mic) => {
          const dx = mic.x - c.x;
          const dy = mic.y - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.01 && dist < 0.4) {
            c.vx += (dx / dist) * MOVEMENT.micAttraction * 0.001;
            c.vy += (dy / dist) * MOVEMENT.micAttraction * 0.001;
          }
        });
      }

      // Repulsion from other creatures
      state.creatures.forEach((other) => {
        if (other.id === c.id) return;
        const dx = c.x - other.x;
        const dy = c.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOVEMENT.repulsionRadius && dist > 0.001) {
          c.vx += (dx / dist) * MOVEMENT.repulsionStrength * 0.001;
          c.vy += (dy / dist) * MOVEMENT.repulsionStrength * 0.001;
        }
      });

      // Apply velocity
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // Edge wrapping with padding
      const pad = MOVEMENT.edgePadding;
      if (c.x < pad) { c.x = pad; c.vx = Math.abs(c.vx) * 0.5; }
      if (c.x > 1 - pad) { c.x = 1 - pad; c.vx = -Math.abs(c.vx) * 0.5; }
      if (c.y < pad) { c.y = pad; c.vy = Math.abs(c.vy) * 0.5; }
      if (c.y > 1 - pad) { c.y = 1 - pad; c.vy = -Math.abs(c.vy) * 0.5; }

      // Audio activation
      c.wasActive = c.isActive;
      c.isActive = isActive;
      const synthData = audioEngine.creatureSynths.get(c.id);

      if (isActive) {
        c.resonanceExposure += 1;

        if (c.type === CREATURE_TYPES.PLUCK) {
          // Trigger only on threshold crossing
          if (!c.wasActive) {
            audioEngine.triggerCreature(c, synthData);
          }
        } else if (c.type === CREATURE_TYPES.GRANULAR) {
          audioEngine.triggerCreature(c, synthData);
        } else {
          audioEngine.triggerCreature(c, synthData);
        }
      } else {
        audioEngine.releaseCreature(c, synthData);
      }

      // Microphone proximity effects
      state.microphones.forEach((mic) => {
        const dx = mic.x - c.x;
        const dy = mic.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = MIC_INFLUENCE_RADIUS;
        if (dist < maxDist) {
          const proximity = 1 - dist / maxDist;
          audioEngine.applyMicProximity(c.id, mic.id, proximity);
        }
      });

      // Evolution
      const prevStage = c.evolutionStage;
      for (let i = EVOLUTION_STAGES.length - 1; i >= 0; i--) {
        const threshold = EVOLUTION_STAGES[i];
        if (
          c.resonanceExposure >= threshold.resonanceExposure &&
          c.timeAlive >= threshold.timeAlive
        ) {
          c.evolutionStage = i;
          break;
        }
      }
      if (c.evolutionStage !== prevStage) {
        audioEngine.evolveCreature(c.id, c.evolutionStage);
      }

      return c;
    });

    // Update microphone activity levels
    const updatedMics = state.microphones.map((mic) => {
      let level = 0;
      updatedCreatures.forEach((c) => {
        if (!c.isActive) return;
        const dx = mic.x - c.x;
        const dy = mic.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MIC_INFLUENCE_RADIUS) {
          level += (1 - dist / MIC_INFLUENCE_RADIUS) * 0.3;
        }
      });
      return { ...mic, activeLevel: Math.min(1, level) };
    });

    set({
      creatures: updatedCreatures,
      microphones: updatedMics,
      lorenzState,
      currentFrequency: currentFreq,
    });
  },

  dispose: () => {
    audioEngine.dispose();
    set({ audioReady: false, creatures: [], paused: false });
  },
}));
