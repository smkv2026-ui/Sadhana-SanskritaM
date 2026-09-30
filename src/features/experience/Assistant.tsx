import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, MessageCircle, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogoMark } from '@/brand/Logo';
import { cn } from '@/lib/utils';
import { GREETING, answer, chipRoute, type Intent } from './assistantBrain';
import { OPEN_ASSISTANT_EVENT } from './commandBus';
import { usePreferences } from './preferences';

interface Msg {
  id: number;
  from: 'user' | 'bot';
  text: string;
  intent?: Intent;
}

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, from: 'bot', text: GREETING.answer, intent: GREETING }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { reducedMotion, feedback } = usePreferences();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpen);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [msgs, typing, reducedMotion]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q) return;
    feedback();
    const route = chipRoute(q);
    if (route) {
      navigate(route);
      setOpen(false);
      return;
    }
    const id = Date.now();
    setMsgs((m) => [...m, { id, from: 'user', text: q }]);
    setInput('');
    setTyping(true);
    setTimeout(
      () => {
        const intent = answer(q);
        setMsgs((m) => [...m, { id: id + 1, from: 'bot', text: intent.answer, intent }]);
        setTyping(false);
      },
      reducedMotion ? 0 : 550,
    );
  };

  const last = msgs[msgs.length - 1];

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))] z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring no-print"
        aria-label={open ? 'Close assistant' : 'Open help assistant'}
        aria-expanded={open}
        initial={reducedMotion ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.2, type: 'spring' }}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Help assistant"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-[min(560px,calc(100dvh-8rem))] w-[calc(100vw-2rem)] max-w-sm origin-bottom-right flex-col overflow-hidden rounded-3xl border bg-popover shadow-lift"
          >
            <header className="flex items-center gap-3 border-b bg-gradient-to-r from-midnight to-midnight-700 px-4 py-3 text-pearl">
              <LogoMark size={34} compact variant="full-dark" decorative />
              <div>
                <p className="font-display text-base font-semibold leading-tight">Sadhana guide</p>
                <p className="text-xs text-pearl/70">Instant answers · no AI, no tracking</p>
              </div>
            </header>
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {msgs.map((m) => (
                <motion.div
                  key={m.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex', m.from === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      m.from === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted',
                    )}
                  >
                    {m.text}
                    {m.intent?.link && (
                      <Link
                        to={m.intent.link.to}
                        onClick={() => setOpen(false)}
                        className="mt-2 flex items-center gap-1 font-semibold text-accent underline-offset-4 hover:underline"
                      >
                        {m.intent.link.label} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
              {typing && (
                <div className="flex gap-1 px-2" aria-label="Assistant is typing">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-2 w-2 rounded-full bg-muted-foreground/50"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.12 }}
                    />
                  ))}
                </div>
              )}
            </div>
            {!typing && last.intent && (
              <div className="flex flex-wrap gap-1.5 border-t px-3 py-2.5">
                {last.intent.chips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => ask(c)}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium transition hover:border-accent hover:bg-accent/10 active:scale-95"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            <form
              className="flex items-center gap-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <label htmlFor="assistant-input" className="sr-only">
                Ask a question
              </label>
              <input
                ref={inputRef}
                id="assistant-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={200}
                placeholder="Ask about fees, payment, access…"
                className="h-10 min-w-0 flex-1 rounded-full border bg-background px-4 text-base outline-none sm:text-sm focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label="Send">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
