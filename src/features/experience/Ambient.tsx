import { useEffect, useRef } from 'react';
import { env } from '@/config/env';
import { usePreferences } from './preferences';

/** Soft glow that follows the cursor (desktop pointers only, transform-only). */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const { reducedMotion } = usePreferences();

  useEffect(() => {
    if (reducedMotion || !env.flags.ambient) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 3;
    let x = tx;
    let y = ty;
    const tick = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      el.style.transform = `translate3d(${x - 250}px, ${y - 250}px, 0)`;
      if (Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) frame = requestAnimationFrame(tick);
      else frame = 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      el.style.opacity = '1';
      if (!frame) frame = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, [reducedMotion]);

  if (reducedMotion || !env.flags.ambient) return null;
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-0 h-[500px] w-[500px] rounded-full opacity-0 transition-opacity duration-700"
      style={{ background: 'radial-gradient(circle, hsl(var(--glow) / 0.10), transparent 60%)', willChange: 'transform' }}
    />
  );
}

interface Petal {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  alpha: number;
}

/**
 * A few floating lotus petals on a canvas behind content. Paused when the tab is hidden or the
 * canvas is off-screen; disabled under prefers-reduced-motion.
 */
export function PetalParticles({ count = 14, className }: { count?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { reducedMotion, theme } = usePreferences();

  useEffect(() => {
    if (reducedMotion || !env.flags.ambient) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const petals: Petal[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 5 + Math.random() * 7,
      vx: -0.15 + Math.random() * 0.3,
      vy: 0.12 + Math.random() * 0.25,
      rot: Math.random() * Math.PI * 2,
      vr: -0.01 + Math.random() * 0.02,
      alpha: 0.25 + Math.random() * 0.4,
    }));
    const color = theme === 'dusk' ? '255, 250, 240' : '217, 164, 65';

    let frame = 0;
    let visible = true;
    let onScreen = true;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of petals) {
        p.x += p.vx + Math.sin(p.y / 60) * 0.15;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > h + 20) {
          p.y = -20;
          p.x = Math.random() * w;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(p.r, -p.r * 0.6, p.r * 0.6, -p.r * 1.8, 0, -p.r * 2.2);
        ctx.bezierCurveTo(-p.r * 0.6, -p.r * 1.8, -p.r, -p.r * 0.6, 0, 0);
        ctx.fillStyle = `rgba(${color}, ${p.alpha})`;
        ctx.fill();
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    const start = () => {
      if (!frame && visible && onScreen) frame = requestAnimationFrame(draw);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const onVisibility = () => {
      visible = document.visibilityState === 'visible';
      if (visible) start();
      else stop();
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
      else stop();
    });
    io.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', resize);
    start();
    return () => {
      stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
    };
  }, [count, reducedMotion, theme]);

  if (reducedMotion || !env.flags.ambient) return null;
  return <canvas ref={canvasRef} aria-hidden className={className ?? 'pointer-events-none absolute inset-0 h-full w-full'} />;
}
