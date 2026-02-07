import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore.js';
import {
  CREATURE_COLORS,
  MIC_INFLUENCE_RADIUS,
  LORENZ,
} from '../game/constants.js';

// Draw a single creature
function drawCreature(ctx, creature, canvasW, canvasH, time) {
  const x = creature.x * canvasW;
  const y = creature.y * canvasH;
  const colors = CREATURE_COLORS[creature.type];
  const baseColor = colors[0];
  const stage = creature.evolutionStage;
  const isActive = creature.isActive;

  const baseSize = creature.size + stage * 3;
  const pulse = isActive ? Math.sin(time * 0.006) * 3 : 0;
  const size = baseSize + pulse;

  ctx.save();
  ctx.translate(x, y);

  // Glow when active
  if (isActive) {
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 15 + stage * 5;
  }

  // Draw shape based on type
  ctx.fillStyle = baseColor;
  ctx.globalAlpha = 0.7 + stage * 0.1;

  switch (creature.type) {
    case 0: // Drone - circle
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      // Inner ring for evolution
      if (stage > 0) {
        ctx.strokeStyle = colors[1] || '#fff';
        ctx.lineWidth = 1 + stage;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;

    case 1: // Pulse - square/diamond
      ctx.rotate(Math.PI / 4 + (isActive ? time * 0.002 : 0));
      ctx.fillRect(-size, -size, size * 2, size * 2);
      if (stage > 0) {
        ctx.strokeStyle = colors[1] || '#fff';
        ctx.lineWidth = 1 + stage;
        ctx.strokeRect(-size * 0.5, -size * 0.5, size, size);
      }
      break;

    case 2: // Pluck - triangle
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.2);
      ctx.lineTo(-size, size * 0.8);
      ctx.lineTo(size, size * 0.8);
      ctx.closePath();
      ctx.fill();
      if (stage > 0) {
        ctx.strokeStyle = colors[1] || '#fff';
        ctx.lineWidth = 1 + stage;
        ctx.stroke();
      }
      break;

    case 3: // Granular - star/scattered dots
      for (let i = 0; i < 5 + stage * 2; i++) {
        const angle = (i / (5 + stage * 2)) * Math.PI * 2 + time * 0.003;
        const r = size * (0.4 + Math.random() * 0.6);
        ctx.beginPath();
        ctx.arc(
          Math.cos(angle) * r,
          Math.sin(angle) * r,
          2 + stage,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      break;
  }

  // Evolution indicator - small dots around creature
  if (stage > 0) {
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < stage; i++) {
      const a = (i / stage) * Math.PI * 2 + time * 0.004;
      ctx.beginPath();
      ctx.arc(
        Math.cos(a) * (size + 8),
        Math.sin(a) * (size + 8),
        2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  ctx.restore();
}

// Draw a microphone
function drawMicrophone(ctx, mic, canvasW, canvasH) {
  const x = mic.x * canvasW;
  const y = mic.y * canvasH;
  const radius = MIC_INFLUENCE_RADIUS * Math.min(canvasW, canvasH);

  ctx.save();
  ctx.translate(x, y);

  // Influence radius circle
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${0.03 + mic.activeLevel * 0.08})`);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Mic body
  const micSize = 18;
  const pulseSize = mic.activeLevel * 4;

  // Outer ring (activity indicator)
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + mic.activeLevel * 0.5})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, micSize + pulseSize + 4, 0, Math.PI * 2);
  ctx.stroke();

  // Mic circle
  ctx.fillStyle = `rgba(100, 100, 120, ${0.6 + mic.activeLevel * 0.3})`;
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, micSize + pulseSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Mic icon (simplified)
  ctx.fillStyle = '#ddd';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MIC', 0, -1);

  // Effect label
  ctx.fillStyle = '#888';
  ctx.font = '10px monospace';
  ctx.fillText(mic.effectType, 0, micSize + pulseSize + 16);

  ctx.restore();
}

// Draw Lorenz frequency indicator
function drawLorenzIndicator(ctx, lorenzState, currentFreq, canvasW, canvasH) {
  const padding = 15;
  const barWidth = canvasW - padding * 2;
  const barHeight = 6;
  const barY = canvasH - 35;

  // Background bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(padding, barY, barWidth, barHeight);

  // Current frequency position
  const freqNorm = (currentFreq - LORENZ.freqMin) / (LORENZ.freqMax - LORENZ.freqMin);
  const indicatorX = padding + freqNorm * barWidth;

  // Glow
  const glow = ctx.createRadialGradient(indicatorX, barY + barHeight / 2, 0, indicatorX, barY + barHeight / 2, 30);
  glow.addColorStop(0, 'rgba(255, 180, 50, 0.4)');
  glow.addColorStop(1, 'rgba(255, 180, 50, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(indicatorX, barY + barHeight / 2, 30, 0, Math.PI * 2);
  ctx.fill();

  // Indicator dot
  ctx.fillStyle = '#ffb432';
  ctx.beginPath();
  ctx.arc(indicatorX, barY + barHeight / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // Frequency label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(currentFreq)} Hz`, indicatorX, barY - 6);

  // Range labels
  ctx.textAlign = 'left';
  ctx.fillText(`${LORENZ.freqMin}`, padding, barY - 6);
  ctx.textAlign = 'right';
  ctx.fillText(`${LORENZ.freqMax}`, padding + barWidth, barY - 6);
}

export default function GameCanvas() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const lastTimeRef = useRef(0);
  const {
    creatures,
    microphones,
    paused,
    audioReady,
    lorenzState,
    currentFrequency,
    spawnCreature,
    cycleMicEffect,
    tick,
  } = useGameStore();

  // Stable references for the animation loop
  const stateRef = useRef({ creatures, microphones, lorenzState, currentFrequency, paused, audioReady });
  useEffect(() => {
    stateRef.current = { creatures, microphones, lorenzState, currentFrequency, paused, audioReady };
  });

  const tickRef = useRef(tick);
  useEffect(() => { tickRef.current = tick; });

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const animate = (timestamp) => {
      const dt = lastTimeRef.current ? Math.min(timestamp - lastTimeRef.current, 50) : 16;
      lastTimeRef.current = timestamp;

      const state = stateRef.current;

      // Run game tick
      if (!state.paused && state.audioReady) {
        tickRef.current(dt);
      }

      // Re-read state after tick
      const updatedState = useGameStore.getState();
      const { creatures, microphones, lorenzState, currentFrequency } = updatedState;

      const w = canvas.width;
      const h = canvas.height;

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, w, h);

      // Draw subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let gx = 0; gx < w; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Draw microphones
      microphones.forEach((mic) => drawMicrophone(ctx, mic, w, h));

      // Draw creatures
      creatures.forEach((creature) => drawCreature(ctx, creature, w, h, timestamp));

      // Draw Lorenz frequency indicator
      drawLorenzIndicator(ctx, lorenzState, currentFrequency, w, h);

      // Draw creature count
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`creatures: ${creatures.length}/25`, w - 15, 25);

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Handle touch/click
  const handleInteraction = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;

      // Check if tapping a microphone
      const mics = useGameStore.getState().microphones;
      const micTapRadius = 0.05; // normalized radius for tap detection
      for (const mic of mics) {
        const dx = nx - mic.x;
        const dy = ny - mic.y;
        if (Math.sqrt(dx * dx + dy * dy) < micTapRadius) {
          cycleMicEffect(mic.id);
          return;
        }
      }

      // Spawn creature
      spawnCreature(nx, ny);
    },
    [spawnCreature, cycleMicEffect]
  );

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      handleInteraction(e.clientX, e.clientY);
    },
    [handleInteraction]
  );

  const handleTouchStart = useCallback(
    (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) handleInteraction(touch.clientX, touch.clientY);
    },
    [handleInteraction]
  );

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        touchAction: 'none',
        cursor: 'crosshair',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    />
  );
}
