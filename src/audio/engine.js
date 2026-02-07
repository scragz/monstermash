import * as Tone from 'tone';
import { LorenzAttractor } from './lorenz.js';
import {
  CREATURE_TYPES,
  ENVELOPES,
  OSCILLATOR_TYPES,
  RESONANCE_BANDWIDTH,
  EFFECT_TYPES,
  PULSE_INTERVAL_MIN,
  PULSE_INTERVAL_MAX,
  GRANULAR_DENSITY,
} from '../game/constants.js';

class AudioEngine {
  constructor() {
    this.initialized = false;
    this.lorenz = new LorenzAttractor();
    this.creatureSynths = new Map(); // creatureId -> synth data
    this.micEffects = new Map(); // micId -> effect node
    this.masterFilter = null;
    this.masterGain = null;
    this.feedbackGain = null;
    this.limiter = null;
    this.compressor = null;
    this.currentFrequency = 80;
    this._animFrameId = null;
    this._lastTime = 0;
  }

  async init() {
    if (this.initialized) return;
    await Tone.start();

    // Master signal chain:
    // creatures -> masterGain -> masterFilter (Lorenz-driven) -> compressor -> limiter -> destination
    // feedbackGain taps from after filter and feeds back to masterGain

    this.masterGain = new Tone.Gain(0.6);
    this.masterFilter = new Tone.Filter({
      frequency: 200,
      type: 'bandpass',
      Q: 4,
    });
    this.feedbackGain = new Tone.Gain(0.15);
    this.compressor = new Tone.Compressor({
      threshold: -20,
      ratio: 6,
      attack: 0.01,
      release: 0.1,
    });
    this.limiter = new Tone.Limiter(-3);
    this.masterVolume = new Tone.Gain(0.7);

    // Main chain
    this.masterGain.connect(this.masterFilter);
    this.masterFilter.connect(this.compressor);
    this.compressor.connect(this.limiter);
    this.limiter.connect(this.masterVolume);
    this.masterVolume.connect(Tone.getDestination());

    // Feedback path
    this.masterFilter.connect(this.feedbackGain);
    this.feedbackGain.connect(this.masterGain);

    this.initialized = true;
  }

  // Create a synth for a creature
  createCreatureSynth(creature) {
    if (!this.initialized) return;

    const envelope = { ...ENVELOPES[creature.type] };
    let synth;

    if (creature.type === CREATURE_TYPES.DRONE) {
      synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope,
      });
    } else if (creature.type === CREATURE_TYPES.PULSE) {
      synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope,
      });
    } else if (creature.type === CREATURE_TYPES.PLUCK) {
      synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope,
      });
    } else {
      // GRANULAR
      synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope,
      });
    }

    // Individual gain for spatial mixing
    const gainNode = new Tone.Gain(0.3);
    synth.connect(gainNode);
    gainNode.connect(this.masterGain);

    const synthData = {
      synth,
      gainNode,
      isPlaying: false,
      pulseTimer: null,
      currentOscType: 0, // index into OSCILLATOR_TYPES
    };

    this.creatureSynths.set(creature.id, synthData);
    return synthData;
  }

  removeCreatureSynth(creatureId) {
    const data = this.creatureSynths.get(creatureId);
    if (data) {
      if (data.pulseTimer) clearTimeout(data.pulseTimer);
      try {
        data.synth.triggerRelease();
      } catch { /* ignore */ }
      setTimeout(() => {
        data.synth.disconnect();
        data.gainNode.disconnect();
        data.synth.dispose();
        data.gainNode.dispose();
      }, 500);
      this.creatureSynths.delete(creatureId);
    }
  }

  // Create effect node for a microphone
  createMicEffect(micId, effectType) {
    if (!this.initialized) return null;
    const effect = this._makeEffect(effectType);
    this.micEffects.set(micId, { effect, type: effectType });
    return effect;
  }

  cycleMicEffect(micId) {
    const micData = this.micEffects.get(micId);
    if (!micData) return null;
    const currentIdx = EFFECT_TYPES.indexOf(micData.type);
    const nextIdx = (currentIdx + 1) % EFFECT_TYPES.length;
    const newType = EFFECT_TYPES[nextIdx];

    // Dispose old effect
    micData.effect.dispose();

    // Create new effect
    const newEffect = this._makeEffect(newType);
    this.micEffects.set(micId, { effect: newEffect, type: newType });
    return newType;
  }

  _makeEffect(type) {
    switch (type) {
      case 'Reverb':
        return new Tone.Reverb({ decay: 3, wet: 0.5 }).toDestination();
      case 'Delay':
        return new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.3, wet: 0.4 }).toDestination();
      case 'PitchShift':
        return new Tone.PitchShift({ pitch: 7, wet: 0.4 }).toDestination();
      case 'Distortion':
        return new Tone.Distortion({ distortion: 0.4, wet: 0.3 }).toDestination();
      case 'Filter':
        return new Tone.Filter({ frequency: 800, type: 'lowpass', Q: 8 }).toDestination();
      case 'Chorus':
        return new Tone.Chorus({ frequency: 2, delayTime: 3.5, depth: 0.7, wet: 0.4 }).toDestination().start();
      default:
        return new Tone.Gain(1).toDestination();
    }
  }

  // Apply microphone spatial effect to a creature based on proximity
  applyMicProximity(creatureId, micId, proximity) {
    // proximity: 0 = far, 1 = on top of mic
    const synthData = this.creatureSynths.get(creatureId);
    const micData = this.micEffects.get(micId);
    if (!synthData || !micData || proximity <= 0) return;

    // Connect creature to mic effect with proximity-based gain
    // We use a simple approach: route some signal to the mic effect
    const wetAmount = proximity * 0.3;
    try {
      synthData.gainNode.connect(micData.effect, 0, 0);
      // Adjust the wet of the effect based on proximity (approximate)
      if (micData.effect.wet) {
        micData.effect.wet.value = Math.min(1, wetAmount + 0.1);
      }
    } catch { /* connection may already exist */ }
  }

  // Trigger creature audio based on type and resonance activation
  triggerCreature(creature, synthData) {
    if (!synthData || !synthData.synth) return;

    const freq = creature.frequency;
    try {
      switch (creature.type) {
        case CREATURE_TYPES.DRONE:
          if (!synthData.isPlaying) {
            synthData.synth.triggerAttack(freq);
            synthData.isPlaying = true;
          }
          break;

        case CREATURE_TYPES.PULSE:
          if (!synthData.isPlaying) {
            synthData.isPlaying = true;
            this._startPulse(creature, synthData);
          }
          break;

        case CREATURE_TYPES.PLUCK:
          // Only trigger once per activation (handled externally)
          synthData.synth.triggerAttackRelease(freq, 0.15);
          break;

        case CREATURE_TYPES.GRANULAR:
          // Random sparse triggering
          if (Math.random() < GRANULAR_DENSITY) {
            synthData.synth.triggerAttackRelease(freq, 0.05);
          }
          break;
      }
    } catch { /* synth may be disposed */ }
  }

  _startPulse(creature, synthData) {
    if (!synthData.isPlaying) return;
    const interval = PULSE_INTERVAL_MIN + Math.random() * (PULSE_INTERVAL_MAX - PULSE_INTERVAL_MIN);
    try {
      synthData.synth.triggerAttackRelease(creature.frequency, 0.15);
    } catch { /* */ }
    synthData.pulseTimer = setTimeout(() => {
      if (synthData.isPlaying) {
        this._startPulse(creature, synthData);
      }
    }, interval);
  }

  releaseCreature(creature, synthData) {
    if (!synthData) return;
    try {
      if (synthData.isPlaying) {
        if (creature.type === CREATURE_TYPES.DRONE) {
          synthData.synth.triggerRelease();
        }
        if (creature.type === CREATURE_TYPES.PULSE && synthData.pulseTimer) {
          clearTimeout(synthData.pulseTimer);
          synthData.pulseTimer = null;
        }
        synthData.isPlaying = false;
      }
    } catch { /* */ }
  }

  // Update creature oscillator type based on evolution stage
  evolveCreature(creatureId, stage) {
    const synthData = this.creatureSynths.get(creatureId);
    if (!synthData || stage === synthData.currentOscType) return;

    const oscType = OSCILLATOR_TYPES[Math.min(stage, OSCILLATOR_TYPES.length - 1)];
    try {
      synthData.synth.oscillator.type = oscType;
      synthData.currentOscType = stage;
    } catch { /* */ }
  }

  // Update the master resonant filter with the Lorenz frequency
  updateLorenzFrequency() {
    // Run multiple Lorenz steps per frame for smoother sweeping
    for (let i = 0; i < 3; i++) {
      this.currentFrequency = this.lorenz.step();
    }

    if (this.masterFilter) {
      this.masterFilter.frequency.value = this.currentFrequency;
    }

    return this.currentFrequency;
  }

  getLorenzState() {
    return this.lorenz.getState();
  }

  isCreatureActive(creatureFreq) {
    return Math.abs(this.currentFrequency - creatureFreq) < RESONANCE_BANDWIDTH;
  }

  setMasterVolume(vol) {
    if (this.masterVolume) {
      this.masterVolume.gain.value = Math.max(0, Math.min(1, vol));
    }
  }

  pause() {
    Tone.getTransport().pause();
    // Release all playing creatures
    this.creatureSynths.forEach((synthData) => {
      if (synthData.isPlaying) {
        try {
          synthData.synth.triggerRelease();
        } catch { /* */ }
        if (synthData.pulseTimer) clearTimeout(synthData.pulseTimer);
        synthData.isPlaying = false;
      }
    });
  }

  resume() {
    Tone.getTransport().start();
  }

  dispose() {
    for (const id of this.creatureSynths.keys()) {
      this.removeCreatureSynth(id);
    }
    this.micEffects.forEach((data) => data.effect.dispose());
    this.micEffects.clear();

    if (this.masterFilter) this.masterFilter.dispose();
    if (this.masterGain) this.masterGain.dispose();
    if (this.feedbackGain) this.feedbackGain.dispose();
    if (this.compressor) this.compressor.dispose();
    if (this.limiter) this.limiter.dispose();
    if (this.masterVolume) this.masterVolume.dispose();

    this.initialized = false;
  }
}

// Singleton
export const audioEngine = new AudioEngine();
