import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePreferences, type Script } from './preferences';

export interface Trilingual {
  deva: string;
  iast: string;
  en: string;
}

const LABELS: Record<Script, { short: string; long: string }> = {
  deva: { short: 'अ', long: 'Devanāgarī' },
  iast: { short: 'ā', long: 'IAST' },
  en: { short: 'En', long: 'Meaning' },
};

/** Segmented control that switches every <ScriptText> on the site. */
export function ScriptToggle({ className }: { className?: string }) {
  const { script, setScript, feedback } = usePreferences();
  return (
    <div role="radiogroup" aria-label="Sanskrit display" className={cn('relative inline-flex rounded-full border bg-card/70 p-1 backdrop-blur', className)}>
      {(Object.keys(LABELS) as Script[]).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={script === s}
          title={LABELS[s].long}
          onClick={() => {
            setScript(s);
            feedback();
          }}
          className="relative z-10 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors aria-checked:text-primary-foreground"
        >
          {script === s && (
            <motion.span layoutId="script-pill" className="absolute inset-0 -z-10 rounded-full bg-primary" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
          )}
          <span lang={s === 'deva' ? 'sa' : undefined} className={s === 'deva' ? 'deva' : undefined}>
            {LABELS[s].short}
          </span>
          <span className="sr-only"> {LABELS[s].long}</span>
        </button>
      ))}
    </div>
  );
}

/** Renders Sanskrit in the visitor's chosen script with a smooth cross-fade. */
export function ScriptText({ text, className, as: Tag = 'span' }: { text: Trilingual; className?: string; as?: 'span' | 'p' | 'div' }) {
  const { script, reducedMotion } = usePreferences();
  const value = text[script];
  return (
    <Tag className={cn('relative inline-block', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={script}
          lang={script === 'deva' ? 'sa' : script === 'iast' ? 'sa-Latn' : 'en'}
          className={cn('inline-block', script === 'deva' && 'deva', script === 'iast' && 'italic')}
          initial={reducedMotion ? false : { opacity: 0, y: 6, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -6, filter: 'blur(4px)' }}
          transition={{ duration: 0.25 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </Tag>
  );
}
