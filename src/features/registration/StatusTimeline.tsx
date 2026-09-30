import { motion } from 'framer-motion';
import { Check, CircleDashed, Hourglass, Send, ShieldCheck, XCircle } from 'lucide-react';
import type { Registration, RegistrationStatus } from '@/data/types';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Step {
  key: string;
  label: string;
  detail: string;
  icon: typeof Check;
  state: 'done' | 'current' | 'todo' | 'failed';
}

export function timelineSteps(reg: Registration, status: RegistrationStatus): Step[] {
  const submitted = status !== 'PENDING_PAYMENT' && status !== 'EXPIRED';
  const verifying = status === 'PENDING_VERIFICATION';
  const approved = status === 'APPROVED';
  const rejected = status === 'REJECTED';
  return [
    {
      key: 'reserved',
      label: 'Seat reserved',
      detail: formatDateTime(reg.createdAt),
      icon: Check,
      state: 'done',
    },
    {
      key: 'submitted',
      label: reg.amountInr === 0 ? 'Request submitted' : 'Payment submitted',
      detail: reg.utrSubmittedAt ? `UTR ${reg.utr} · ${formatDateTime(reg.utrSubmittedAt)}` : status === 'EXPIRED' ? 'Seat hold expired' : 'Waiting for your UTR',
      icon: Send,
      state: submitted ? 'done' : status === 'EXPIRED' ? 'failed' : 'current',
    },
    {
      key: 'verifying',
      label: 'Verifying',
      detail: verifying ? 'Our team is matching your payment — usually a few hours' : submitted ? 'Checked' : '—',
      icon: Hourglass,
      state: verifying ? 'current' : approved || rejected ? 'done' : 'todo',
    },
    {
      key: 'decision',
      label: rejected ? 'Not approved' : 'Approved',
      detail: approved
        ? `Access unlocked · ${formatDateTime(reg.decidedAt)}`
        : rejected
          ? reg.rejectionReason || 'Please contact us'
          : 'Your access unlocks here',
      icon: rejected ? XCircle : ShieldCheck,
      state: approved ? 'done' : rejected ? 'failed' : 'todo',
    },
  ];
}

export function StatusTimeline({ reg, status }: { reg: Registration; status: RegistrationStatus }) {
  const steps = timelineSteps(reg, status);
  return (
    <ol className="relative space-y-6" aria-label="Registration status">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-4">
          {i < steps.length - 1 && (
            <span aria-hidden className="absolute left-[19px] top-10 h-[calc(100%-8px)] w-0.5 overflow-hidden bg-border">
              <motion.span
                className="block w-full bg-success"
                initial={{ height: 0 }}
                animate={{ height: s.state === 'done' ? '100%' : '0%' }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              />
            </span>
          )}
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.12, type: 'spring' }}
            className={cn(
              'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
              s.state === 'done' && 'border-success bg-success text-success-foreground',
              s.state === 'current' && 'border-accent bg-accent/15 text-accent',
              s.state === 'todo' && 'border-border bg-background text-muted-foreground',
              s.state === 'failed' && 'border-destructive bg-destructive/10 text-destructive',
            )}
          >
            {s.state === 'current' ? (
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}>
                <CircleDashed className="h-5 w-5" />
              </motion.span>
            ) : (
              <s.icon className="h-5 w-5" />
            )}
          </motion.span>
          <div className="pt-1.5">
            <p className="font-semibold">
              {s.label}
              <span className="sr-only"> — {s.state === 'done' ? 'complete' : s.state === 'current' ? 'in progress' : s.state === 'failed' ? 'failed' : 'pending'}</span>
            </p>
            <p className="text-sm text-muted-foreground">{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
