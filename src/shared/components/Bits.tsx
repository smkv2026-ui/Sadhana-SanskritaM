import { motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/features/experience/preferences';
import { Reveal } from './Motion';

/** Small gold lotus between two tapering lines, above every section heading. */
function HeadingOrnament() {
  return (
    <svg aria-hidden viewBox="0 0 140 18" className="h-4 w-32 text-primary" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M4 12 H52" strokeWidth="0.8" className="ornament-line-l" />
      <path d="M136 12 H88" strokeWidth="0.8" className="ornament-line-r" />
      <circle cx="56" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="84" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <path d="M70 15 C65 11 65 5 70 1 C75 5 75 11 70 15Z" strokeWidth="0.9" fill="hsl(var(--primary) / 0.18)" />
      <path d="M69 15.5 C63 14.5 59 11 58 6.5 C64 7.5 67.5 11 69 15.5Z" strokeWidth="0.8" />
      <path d="M71 15.5 C77 14.5 81 11 82 6.5 C76 7.5 72.5 11 71 15.5Z" strokeWidth="0.8" />
    </svg>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'center',
  className,
  id,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
  id?: string;
}) {
  return (
    <Reveal className={cn('mb-12 flex flex-col gap-3', align === 'center' ? 'items-center text-center' : 'items-start', className)}>
      <HeadingOrnament />
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 id={id} className="max-w-3xl text-balance text-3xl font-semibold sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {lead && <p className="max-w-2xl text-pretty text-lg text-muted-foreground">{lead}</p>}
    </Reveal>
  );
}

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { feedback } = usePreferences();
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          feedback();
          toast.success(`${label} copied`);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error('Copy failed — please select and copy manually.');
        }
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1.5 text-xs font-semibold transition hover:border-accent active:scale-95',
        className,
      )}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/** Live "seats left" meter. */
export function SeatMeter({ limit, taken, compact }: { limit: number; taken: number; compact?: boolean }) {
  if (!limit) return <p className="text-xs font-medium text-muted-foreground">Open seats</p>;
  const left = Math.max(0, limit - taken);
  const pct = Math.min(1, taken / limit);
  const tone = left === 0 ? 'bg-destructive' : left <= Math.max(3, limit * 0.15) ? 'bg-amber-500' : 'bg-gradient-to-r from-saffron-deep to-saffron';
  return (
    <div className={cn('w-full', compact ? 'space-y-1' : 'space-y-2')}>
      <div className="flex items-center justify-between text-xs font-medium">
        <span aria-live="polite" className={left <= 3 && left > 0 ? 'text-amber-600 dark:text-amber-300' : undefined}>
          {left === 0 ? 'Sold out' : `${left} seat${left === 1 ? '' : 's'} left`}
        </span>
        {!compact && <span className="text-muted-foreground">{limit} total</span>}
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={taken}
        aria-label="Seats taken"
      >
        <motion.div className={cn('h-full rounded-full', tone)} initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </div>
  );
}
