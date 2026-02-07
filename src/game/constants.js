// Creature type definitions
export const CREATURE_TYPES = {
  DRONE: 0,
  PULSE: 1,
  PLUCK: 2,
  GRANULAR: 3,
};

export const CREATURE_TYPE_NAMES = ['Drone', 'Pulse', 'Pluck', 'Granular'];

// Frequency palettes per creature type (in Hz)
export const FREQUENCY_PALETTES = {
  [CREATURE_TYPES.DRONE]: [65.41, 82.41, 98.0, 116.54],       // C2, E2, G2, Bb2
  [CREATURE_TYPES.PULSE]: [220.0, 261.63, 329.63, 392.0],     // A3, C4, E4, G4
  [CREATURE_TYPES.PLUCK]: [293.66, 369.99, 440.0, 523.25],    // D4, F#4, A4, C5
  [CREATURE_TYPES.GRANULAR]: [174.61, 207.65, 277.18, 349.23], // F3, Ab3, Db4, F4
};

// Envelope settings per creature type
export const ENVELOPES = {
  [CREATURE_TYPES.DRONE]: { attack: 0.8, decay: 0.3, sustain: 0.7, release: 1.5 },
  [CREATURE_TYPES.PULSE]: { attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.3 },
  [CREATURE_TYPES.PLUCK]: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 },
  [CREATURE_TYPES.GRANULAR]: { attack: 0.05, decay: 0.05, sustain: 0, release: 0.05 },
};

// Creature visual colors per type
export const CREATURE_COLORS = {
  [CREATURE_TYPES.DRONE]: ['#4a9eff', '#2d7cd4', '#1a5fa8'],
  [CREATURE_TYPES.PULSE]: ['#ff6b6b', '#e04545', '#b82e2e'],
  [CREATURE_TYPES.PLUCK]: ['#51cf66', '#37b24d', '#2b8a3e'],
  [CREATURE_TYPES.GRANULAR]: ['#ffd43b', '#fab005', '#e67700'],
};

// Evolution thresholds
export const EVOLUTION_STAGES = [
  { resonanceExposure: 0, timeAlive: 0 },       // Stage 0: sine
  { resonanceExposure: 200, timeAlive: 5000 },   // Stage 1: triangle-like
  { resonanceExposure: 600, timeAlive: 15000 },   // Stage 2: saw-like
  { resonanceExposure: 1200, timeAlive: 30000 },  // Stage 3: complex
];

export const OSCILLATOR_TYPES = ['sine', 'triangle', 'sawtooth', 'square'];

// Lorenz attractor parameters
export const LORENZ = {
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
  dt: 0.005,
  freqMin: 80,
  freqMax: 1200,
  // Lorenz x range is roughly -20 to 20
  xMin: -20,
  xMax: 20,
};

// How close (in Hz) the resonant frequency needs to be to activate a creature
export const RESONANCE_BANDWIDTH = 40;

// Microphone effect types
export const EFFECT_TYPES = ['Reverb', 'Delay', 'PitchShift', 'Distortion', 'Filter', 'Chorus'];

// Microphone spatial influence radius (fraction of canvas size)
export const MIC_INFLUENCE_RADIUS = 0.2;

// Maximum number of creatures
export const MAX_CREATURES = 25;

// Movement parameters
export const MOVEMENT = {
  baseSpeed: 0.3,
  brownianStrength: 0.15,
  micAttraction: 0.02,
  repulsionRadius: 0.05,
  repulsionStrength: 0.01,
  edgePadding: 0.03,
};

// Pulse timing
export const PULSE_INTERVAL_MIN = 400;
export const PULSE_INTERVAL_MAX = 1000;

// Granular timing
export const GRANULAR_DENSITY = 0.03; // probability per frame of triggering
