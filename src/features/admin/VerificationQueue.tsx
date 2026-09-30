import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, FileSpreadsheet, Mail, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { backend } from '@/data';
import type { Registration } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatDateTime, relativeTime } from '@/lib/format';
import { formatInr } from '@/lib/pricing';
import { CopyButton } from '@/shared/components/Bits';
import { EmptyState } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/overlays';
import { Badge, Field, Textarea } from '@/shared/ui/primitives';
import { AdminHeader } from './AdminApp';
import { matchStatement, parseStatement, type MatchSuggestion } from './csvMatch';
import { sendConfirmation, type WaQueueItem } from './sendService';
import { WhatsAppQueue } from './WhatsAppQueue';

export default function VerificationQueue() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [items, setItems] = useState<Registration[] | null>(null);
  const [rejecting, setRejecting] = useState<Registration | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [approvedNow, setApprovedNow] = useState<Registration[]>([]);
  const [waQueue, setWaQueue] = useState<WaQueueItem[]>([]);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[] | null>(null);

  // Real-time listener (one of only three in the app).
  useEffect(() => {
    let unsub: (() => void) | undefined;
    void backend().then((b) => (unsub = b.watchVerificationQueue(setItems)));
    return () => unsub?.();
  }, []);

  const decide = async (reg: Registration, decision: 'APPROVED' | 'REJECTED', why?: string) => {
    setBusy(reg.id);
    try {
      await (await backend()).decideRegistration(reg.id, decision, user!.uid, why);
      toast.success(decision === 'APPROVED' ? `Approved ${reg.reference}` : `Rejected ${reg.reference}`);
      if (decision === 'APPROVED') setApprovedNow((a) => [{ ...reg, status: 'APPROVED', decidedAt: new Date().toISOString() }, ...a]);
      void qc.invalidateQueries({ queryKey: ['admin'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const confirmAll = async (regs: Registration[]) => {
    const wa: WaQueueItem[] = [];
    let ok = 0;
    for (const r of regs) {
      const res = await sendConfirmation(r, user!.uid);
      if (res.email.ok) ok++;
      wa.push(res.wa);
    }
    setWaQueue(wa);
    toast.success(`${ok}/${regs.length} confirmation emails sent. WhatsApp queue ready.`);
    setApprovedNow([]);
  };

  const onCsv = async (file: File) => {
    const text = await file.text();
    const rows = parseStatement(text);
    setSuggestions(matchStatement(rows, items ?? []));
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Verify payments"
        description="Live queue of submitted UTRs. Match each against your bank/UPI statement, then approve."
        actions={
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:border-accent">
            <FileSpreadsheet className="h-4 w-4" /> Import bank CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && void onCsv(e.target.files[0])} />
          </label>
        }
      />

      {suggestions && (
        <div className="rounded-3xl border border-diamond/40 bg-diamond/5 p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Statement matches ({suggestions.length})</p>
            <Button variant="ghost" size="sm" onClick={() => setSuggestions(null)}>
              <X /> Close
            </Button>
          </div>
          {suggestions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No rows matched a pending UTR or reference.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {suggestions.map((s) => (
                <li key={s.registration.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-background p-3 text-sm">
                  <span>
                    <Badge variant={s.confidence === 'high' ? 'success' : 'warning'}>{s.confidence}</Badge> <strong>{s.registration.reference}</strong> ·{' '}
                    {s.registration.participant.name} · {formatInr(s.registration.amountInr)} — <span className="text-muted-foreground">{s.reason} (line {s.row.line})</span>
                  </span>
                  <Button size="sm" variant="success" loading={busy === s.registration.id} onClick={() => void decide(s.registration, 'APPROVED')}>
                    <Check /> Approve
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {approvedNow.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-success/40 bg-success/5 p-4">
          <p className="text-sm">
            <strong>{approvedNow.length}</strong> newly approved — send their confirmations (email + WhatsApp).
          </p>
          <Button size="sm" onClick={() => void confirmAll(approvedNow)}>
            <Mail /> Send confirmations
          </Button>
        </div>
      )}
      {waQueue.length > 0 && <WhatsAppQueue items={waQueue} title="Confirmation messages" />}

      {items === null ? (
        <div className="skeleton h-40 rounded-3xl" />
      ) : items.length === 0 ? (
        <EmptyState title="All caught up" description="No payments are waiting for verification. New submissions appear here instantly." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Learner / course</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">UTR</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right">Decision</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {items.map((r) => (
                  <motion.tr key={r.id} layout initial={{ opacity: 0, backgroundColor: 'hsl(var(--accent) / 0.2)' }} animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }} exit={{ opacity: 0, x: 40 }} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono font-semibold">{r.reference}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.participant.name}</p>
                      <p className="text-xs text-muted-foreground">{r.courseTitle}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatInr(r.amountInr)}</td>
                    <td className="px-4 py-3">
                      {r.utr ? (
                        <span className="inline-flex items-center gap-2 font-mono">
                          {r.utr} <CopyButton value={r.utr} label="UTR" />
                        </span>
                      ) : (
                        <Badge variant="muted">Free seat</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3" title={formatDateTime(r.utrSubmittedAt ?? r.createdAt)}>
                      {relativeTime(r.utrSubmittedAt ?? r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="success" loading={busy === r.id} onClick={() => void decide(r, 'APPROVED')}>
                          <Check /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejecting(r)}>
                          <X /> Reject
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(rejecting)} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejecting?.reference}?</DialogTitle>
            <DialogDescription>The learner sees this reason and the seat is released.</DialogDescription>
          </DialogHeader>
          <Field id="reject-reason" label="Reason">
            <Textarea id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. No credit found for this UTR — please check and resubmit." maxLength={300} />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 5}
              onClick={() => {
                if (rejecting) void decide(rejecting, 'REJECTED', reason.trim());
                setRejecting(null);
                setReason('');
              }}
            >
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
