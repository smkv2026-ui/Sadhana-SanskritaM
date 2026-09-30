import { animate, motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { forwardRef, useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import { usePreferences } from '@/features/experience/preferences';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '../ui/button';

/** Fade/slide in when scrolled into view (instant under reduced motion). */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 24,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const { reducedMotion } = usePreferences();
  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Button that is gently pulled toward the pointer. */
export const MagneticButton = forwardRef<HTMLButtonElement, ButtonProps & { strength?: number }>(function MagneticButton(
  { strength = 0.25, className, onClick, ...props },
  ref,
) {
  const { reducedMotion, feedback } = usePreferences();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 18 });
  const sy = useSpring(y, { stiffness: 250, damping: 18 });

  const onMove = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (reducedMotion || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span className="inline-flex" style={{ x: sx, y: sy }} onPointerMove={onMove} onPointerLeave={reset}>
      <Button
        ref={ref}
        className={className}
        onClick={(e) => {
          feedback();
          onClick?.(e);
        }}
        {...props}
      />
    </motion.span>
  );
});

/** Counts up when visible. */
export function AnimatedCounter({ value, suffix = '', className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const { reducedMotion } = usePreferences();
  const [display, setDisplay] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reducedMotion) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, reducedMotion]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {display.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

/** Card with a subtle 3D tilt that follows the pointer. */
export function TiltCard({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const { reducedMotion } = usePreferences();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20 });
  const glareX = useTransform(sry, [-max, max], ['0%', '100%']);
  const glare = useTransform(glareX, (gx) => `radial-gradient(400px circle at ${gx} 0%, rgba(255,255,255,0.14), transparent 45%)`);

  return (
    <motion.div
      className={cn('group relative [transform-style:preserve-3d]', className)}
      style={reducedMotion ? undefined : { rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (reducedMotion || e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry.set(px * max * 2);
        rx.set(-py * max * 2);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
      {!reducedMotion && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glare }}
        />
      )}
    </motion.div>
  );
}
