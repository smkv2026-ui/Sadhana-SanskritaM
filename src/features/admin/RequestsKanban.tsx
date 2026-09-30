import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ExternalLink, StickyNote } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import { backend } from '@/data';
import { CUSTOM_REQUEST_STATUSES, type CustomRequest, type CustomRequestStatus } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { STATUS_LABEL } from '@/features/custom-requests/TrackRequestsPage';
import { formatDate, formatDateTime } from '@/lib/format';
import { formatInr } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/overlays';
import { Field, Textarea } from '@/shared/ui/primitives';
import { AdminHeader } from './AdminApp';

function Detail({ req, onClose }: { req: CustomRequest; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const notes = useQuery({ queryKey: ['admin', 'notes', req.id], queryFn: async () => (await backend()).listCustomRequestNotes(req.id) });
  return (
    <DialogContent side="right">
      <DialogHeader>
        <DialogTitle>{req.projectType}</DialogTitle>
        <DialogDescription>
          {req.reference} · {req.contact.name} · {req.contact.email} {req.contact.phone && `· ${req.contact.phone}`} · prefers {req.preferredChannel}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <p className="whitespace-pre-line">{req.problem}</p>
        <p>
          <strong>Users:</strong> {req.targetUsers}
        </p>
        <p>
          <strong>Features (priority order):</strong> {req.features.join(' → ')}
        </p>
        <p>
          <strong>Budget:</strong> {formatInr(req.budgetInr.min)}–{formatInr(req.budgetInr.max)} · <strong>Timeline:</strong> {req.timelineWeeks} weeks
        </p>
        {req.referenceLinks.length > 0 && (
          <ul className="space-y-1">
            {req.referenceLinks.map((l) => (
              <li key={l}>
                <a href={l} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent underline">
                  <ExternalLink className="h-3.5 w-3.5" /> {l}
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t pt-4">
          <p className="flex items-center gap-2 font-semibold">
            <StickyNote className="h-4 w-4" /> Internal notes (admins only)
          </p>
          <form
            className="mt-2 space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!note.trim()) return;
              await (await backend()).addCustomRequestNote(req.id, note.trim(), user!.email ?? user!.uid);
              setNote('');
              void notes.refetch();
            }}
          >
            <Field id="note" label="Add note">
              <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <Button size="sm" type="submit">
              Save note
            </Button>
          </form>
          <ul className="mt-3 space-y-2">
            {(notes.data ?? []).map((n) => (
              <li key={n.id} className="rounded-xl bg-muted/50 p-3">
                <p>{n.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.by} · {formatDateTime(n.at)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          variant="ghost"
          onClick={() => {
            void qc.invalidateQueries({ queryKey: ['admin', 'requests'] });
            onClose();
          }}
        >
          Close
        </Button>
      </div>
    </DialogContent>
  );
}

export default function RequestsKanban() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'requests'], queryFn: async () => (await backend()).listCustomRequests() });
  const [open, setOpen] = useState<CustomRequest | null>(null);
  const [over, setOver] = useState<CustomRequestStatus | null>(null);

  const move = async (req: CustomRequest, status: CustomRequestStatus) => {
    if (req.status === status) return;
    // Optimistic move.
    qc.setQueryData<CustomRequest[]>(['admin', 'requests'], (list) => list?.map((r) => (r.id === req.id ? { ...r, status } : r)));
    try {
      const b = await backend();
      await b.updateCustomRequestStatus(req.id, status, `Moved to ${STATUS_LABEL[status]}`);
      await b.writeAudit({ by: user!.uid, action: 'request.status', target: req.id, details: status });
      toast.success(`${req.reference} → ${STATUS_LABEL[status]}`);
    } catch {
      toast.error('Could not update status');
    }
    void qc.invalidateQueries({ queryKey: ['admin', 'requests'] });
  };

  const onDrop = (e: DragEvent, status: CustomRequestStatus) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const req = q.data?.find((r) => r.id === id);
    if (req) void move(req, status);
  };

  return (
    <div>
      <AdminHeader title="Custom app requests" description="Drag cards between columns (or use the arrows). Learners see the status live on their tracker." />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {CUSTOM_REQUEST_STATUSES.map((status, col) => {
          const items = (q.data ?? []).filter((r) => r.status === status);
          return (
            <section
              key={status}
              aria-label={STATUS_LABEL[status]}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => onDrop(e, status)}
              className={cn('w-64 shrink-0 rounded-3xl border bg-muted/30 p-3 transition-colors', over === status && 'border-accent bg-accent/10')}
            >
              <h2 className="flex items-center justify-between px-1 pb-3 text-sm font-semibold">
                {STATUS_LABEL[status]} <span className="rounded-full bg-background px-2 text-xs">{items.length}</span>
              </h2>
              <ul className="space-y-2">
                {items.map((r) => (
                  <li
                    key={r.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', r.id)}
                    className="cursor-grab rounded-2xl border bg-card p-3 text-sm shadow-sm active:cursor-grabbing"
                  >
                    <button type="button" className="w-full text-left" onClick={() => setOpen(r)}>
                      <p className="text-xs text-muted-foreground">{r.reference}</p>
                      <p className="font-semibold">{r.projectType}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{r.problem}</p>
                      <p className="mt-2 text-xs">
                        {r.contact.name} · {formatDate(r.createdAt)}
                      </p>
                    </button>
                    <div className="mt-2 flex justify-between">
                      <button type="button" disabled={col === 0} aria-label="Move left" className="rounded-full p-1 hover:bg-muted disabled:opacity-30" onClick={() => void move(r, CUSTOM_REQUEST_STATUSES[col - 1])}>
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={col === CUSTOM_REQUEST_STATUSES.length - 1}
                        aria-label="Move right"
                        className="rounded-full p-1 hover:bg-muted disabled:opacity-30"
                        onClick={() => void move(r, CUSTOM_REQUEST_STATUSES[col + 1])}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <Dialog open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        {open && <Detail req={open} onClose={() => setOpen(null)} />}
      </Dialog>
    </div>
  );
}
