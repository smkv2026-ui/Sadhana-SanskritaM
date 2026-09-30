/**
 * Tiny synthesised sounds (no audio files). Only ever played when the visitor has
 * explicitly switched sound on; never autoplays.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function bell(ac: AudioContext, freq: number, start: number, duration: number, gain: number) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** A quiet temple-bell like chime (fundamental + inharmonic partials). */
export function playChime(volume = 0.08): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  bell(ac, 528, t, 2.4, volume);
  bell(ac, 528 * 2.76, t, 1.2, volume * 0.35);
  bell(ac, 528 * 5.4, t, 0.6, volume * 0.15);
}

/** Soft tick used for micro-interactions. */
export function playTick(volume = 0.04): void {
  const ac = audio();
  if (!ac) return;
  bell(ac, 1320, ac.currentTime + 0.005, 0.12, volume);
}
