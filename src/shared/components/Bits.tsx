import { motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/features/experience/preferences';
import { Reveal } from './Motion';

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
