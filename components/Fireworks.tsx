"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#e2a63c", "#ddb428", "#c8443c", "#f2e8d5", "#6fae5e"];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

type Shell = {
  x: number;
  y: number;
  vy: number;
  targetY: number;
  color: string;
  exploded: boolean;
};

// Tuned per 60fps frame; every integration below is scaled by elapsed time so
// the display looks identical whether the device manages 12fps or 120.
const GRAVITY = 0.045;
const DRAG = 0.985;
const FRAME_MS = 1000 / 60;
const LAUNCH_EVERY_MS = 340;

/**
 * A full-canvas composite fade runs every frame, so cost scales with backing
 * pixels. On a large desktop at DPR 2 that is ~7.6M pixels per frame, which
 * collapses the loop to single-digit fps. Cap the budget instead.
 */
const MAX_BACKING_PIXELS = 2_400_000;

/**
 * Canvas fireworks over the ballpark. Shells rise from the bottom, burst at a
 * random height, and the embers fall with gravity and drag.
 *
 * Everything runs on one rAF loop against a DPR-scaled canvas; on
 * prefers-reduced-motion we skip the animation entirely and let the caller's
 * text stand on its own.
 */
export function Fireworks({ durationMs = 6000 }: { durationMs?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);
      const area = Math.max(width * height, 1);
      if (area * dpr * dpr > MAX_BACKING_PIXELS) {
        dpr = Math.max(1, Math.sqrt(MAX_BACKING_PIXELS / area));
      }
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const shells: Shell[] = [];
    const particles: Particle[] = [];

    const launch = () => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      shells.push({
        x: width * (0.15 + Math.random() * 0.7),
        y: height,
        vy: -(height * 0.011 + Math.random() * height * 0.004),
        targetY: height * (0.12 + Math.random() * 0.33),
        color,
        exploded: false,
      });
    };

    const burst = (shell: Shell) => {
      const count = 46 + Math.floor(Math.random() * 26);
      // Slight ring bias so bursts read as spheres rather than random noise.
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.22;
        const speed = 1.6 + Math.random() * 3.1;
        particles.push({
          x: shell.x,
          y: shell.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 58 + Math.random() * 34,
          color: shell.color,
          size: 1.4 + Math.random() * 1.8,
        });
      }
    };

    let raf = 0;
    let stopped = false;
    let launchAcc = LAUNCH_EVERY_MS;
    const start = performance.now();
    let last = start;

    const tick = (now: number) => {
      const elapsed = now - start;
      // Clamp so a backgrounded tab resuming doesn't teleport everything.
      const dt = Math.min(now - last, 64);
      last = now;
      const k = dt / FRAME_MS;

      // Fade rather than clear, so embers leave trails.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.55, 0.22 * k)})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      launchAcc += dt;
      if (!stopped && elapsed < durationMs && launchAcc >= LAUNCH_EVERY_MS) {
        launchAcc = 0;
        launch();
        if (Math.random() > 0.55) launch();
      }

      for (let i = shells.length - 1; i >= 0; i--) {
        const s = shells[i];
        s.y += s.vy * k;
        s.vy += GRAVITY * 1.6 * k;
        ctx.beginPath();
        ctx.fillStyle = s.color;
        ctx.globalAlpha = 0.9;
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fill();
        if (s.y <= s.targetY || s.vy >= 0) {
          burst(s);
          shells.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const drag = Math.pow(DRAG, k);
        p.x += p.vx * k;
        p.y += p.vy * k;
        p.vx *= drag;
        p.vy = p.vy * drag + GRAVITY * k;
        p.life += k;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      if (elapsed > durationMs) stopped = true;
      // Keep drawing until the last ember dies, so nothing vanishes abruptly.
      if (!stopped || shells.length || particles.length) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [durationMs]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
