import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, MessageCircle, SkipForward } from 'lucide-react';
import { useState } from 'react';
import { maskPhone } from '@/lib/format';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/shared/ui/button';
import { logWhatsApp, waLink, type WaQueueItem } from './sendService';

/**
 * Free WhatsApp "sending": each tap opens a prefilled wa.me chat; the admin presses Send in
 * WhatsApp. Opened items are logged so nobody gets messaged twice.
 */
export function WhatsAppQueue({ items, title = 'WhatsApp queue' }: { items: WaQueueItem[]; title?: string }) {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const current = items[index];

  const sendNext = () => {
    if (!current) return;
    window.open(waLink(current), '_blank', 'noopener,noreferrer');
    if (user) void logWhatsApp(current, user.uid);
    setDone((d) => [...d, current.id]);
    setIndex((i) => i + 1);
  };

  if (items.length === 0) return <p className="text-sm text-muted-foreground">No WhatsApp recipients (only people with a number and WhatsApp consent appear here).</p>;

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold">
          <MessageCircle className="h-4 w-4 text-success" /> {title}
        </p>
        <p className="text-sm tabular-nums text-muted-foreground">
          {Math.min(index, items.length)} / {items.length} opened
        </p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full bg-success" animate={{ width: `${(Math.min(index, items.length) / items.length) * 100}%` }} />
      </div>
      <AnimatePresence mode="wait">
        {current ? (
          <motion.div key={current.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-4 rounded-xl bg-muted/50 p-3 text-sm">
            <p className="font-medium">
              Next: {current.name} · {maskPhone(current.to)}
            </p>
            <p className="mt-1 line-clamp-3 whitespace-pre-line text-muted-foreground">{current.text}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="success" onClick={sendNext}>
                <MessageCircle /> Send next
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIndex((i) => i + 1)}>
                <SkipForward /> Skip
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.p key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Queue complete ({done.length} opened).
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
