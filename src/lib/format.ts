export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!iso) return 'To be announced';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', ...opts }).format(d);
}

export function formatDateTime(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return 'To be announced';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  // dateStyle/timeStyle cannot be combined with timeZoneName, so spell the parts out.
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: timeZone ? 'short' : undefined,
  }).format(d);
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === 'minute') return rtf.format(Math.round(diff / ms), unit);
  }
  return '';
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

export function countdown(target: string | Date, now: Date = new Date()): Countdown {
  const ms = Math.max(0, new Date(target).getTime() - now.getTime());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    seconds: Math.floor((ms % 60_000) / 1000),
    done: ms === 0,
  };
}

/** "priya@example.com" → "pr***@example.com"; "+919876543210" → "+91•••••3210" */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return '•••';
  return `${phone.slice(0, 3)}•••••${phone.slice(-4)}`;
}

export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Streak rules: same day = unchanged, next day = +1, gap = reset to 1. */
export function nextStreak(prevCount: number, prevDay: string | null, today: string): { count: number; day: string } {
  if (prevDay === today) return { count: Math.max(1, prevCount), day: today };
  if (prevDay) {
    const prev = new Date(`${prevDay}T00:00:00`);
    const cur = new Date(`${today}T00:00:00`);
    const days = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (days === 1) return { count: prevCount + 1, day: today };
  }
  return { count: 1, day: today };
}
