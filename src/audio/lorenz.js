import { LORENZ } from '../game/constants.js';

export class LorenzAttractor {
  constructor() {
    // Start at a non-equilibrium point
    this.x = 1.0;
    this.y = 1.0;
    this.z = 1.0;
    this.frequency = LORENZ.freqMin;
  }

  step() {
    const { sigma, rho, beta, dt } = LORENZ;

    const dx = sigma * (this.y - this.x);
    const dy = this.x * (rho - this.z) - this.y;
    const dz = this.x * this.y - beta * this.z;

    this.x += dx * dt;
    this.y += dy * dt;
    this.z += dz * dt;

    // Map x to frequency range
    const normalized = (this.x - LORENZ.xMin) / (LORENZ.xMax - LORENZ.xMin);
    const clamped = Math.max(0, Math.min(1, normalized));
    this.frequency = LORENZ.freqMin + clamped * (LORENZ.freqMax - LORENZ.freqMin);

    return this.frequency;
  }

  getState() {
    return { x: this.x, y: this.y, z: this.z, frequency: this.frequency };
  }

  reset() {
    this.x = 1.0;
    this.y = 1.0;
    this.z = 1.0;
  }
}
