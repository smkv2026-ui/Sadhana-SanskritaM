import { useInfiniteQuery } from '@tanstack/react-query';
import { BellRing, Clock, Download, Mail } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { backend } from '@/data';
import { useCourses } from '@/data/queries';
import { effectiveStatus, isAccessExpired } from '@/data/registrationLogic';
import type { Registration, RegistrationStatus } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { toCsv } from '@/lib/csv';
import { downloadText } from '@/lib/ics';
import { formatDateTime, maskEmail } from '@/lib/format';
import { formatInr } from '@/lib/pricing';
import { sendInBatches, getEmailProvider } from '@/providers/email';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';
import { Badge, NativeSelect } from '@/shared/ui/primitives';
import { AdminHeader } from './AdminApp';
import { reminderMessages, sendConfirmation, type WaQueueItem } from './sendService';
import { WhatsAppQueue } from './WhatsAppQueue';

const STATUSES: RegistrationStatus[] = ['PENDING_PAYMENT', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'EXPIRED'];
const VARIANT = { PENDING_PAYMENT: 'warning', PENDING_VERIFICATION: 'gold', APPROVED: 'success', REJECTED: 'destructive', EXPIRED: 'muted' } as const;

export default function RegistrationsAdmin() {
  const { user } = useAuth();
  const { data: courses } = useCourses();
  const [status, setStatus] = useState<RegistrationStatus | ''>('');
  const [courseId, setCourseId] = useState('');
  const [wa, setWa] = useState<WaQueueItem[]>([]);
  const [progress, setProgress] = useState<string | null>(null);

  const q = useInfiniteQuery({
    queryKey: ['admin', 'registrations', status, courseId],
    queryFn: async ({ pageParam }) => (await backend()).listRegistrations({ status: status || undefined, courseId: courseId || undefined, pageSize: 25, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next,
  });
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

  const exportCsv = () => {
    downloadText(
      `registrations-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        rows.map((r) => ({
          reference: r.reference,
          status: r.status,
          course: r.courseTitle,
          name: r.participant.name,
          email: r.participant.email,
          phone: r.participant.phone,
          city: r.participant.city,
          amount_inr: r.amountInr,
          coupon: r.couponCode ?? '',
          utr: r.utr ?? '',
          created_at: r.createdAt,
          decided_at: r.decidedAt ?? '',
        })),
      ),
      'text/csv',
    );
  };

  const sendReminders = async (when: '24h' | '1h') => {
    if (!courseId) return toast.error('Choose a course first.');
    const approved = rows.filter((r) => r.courseId === courseId && r.status === 'APPROVED');
    if (!approved.length) return toast.error('No approved registrations loaded for this course (filter by Approved and load all pages).');
    const { emails, wa: waItems } = reminderMessages(approved, when);
    const field = when === '24h' ? 'reminder24SentAt' : 'reminder1SentAt';
    const b = await backend();
    const result = await sendInBatches(
      getEmailProvider(),
      emails.map((e) => e.message),
      {
        onProgress: (p) => setProgress(`Sending ${p.sent + p.failed}/${p.total}…`),
        onResult: async (m, r) => {
          const reg = emails.find((e) => e.message === m)?.reg as Registration;
          await b.logNotification({ kind: when === '24h' ? 'reminder-24h' : 'reminder-1h', channel: 'email', recipient: maskEmail(m.to), refId: reg.id, subject: m.subject, status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error, by: user!.uid });
          if (r.ok) await b.markRegistrationNotified(reg.id, field);
        },
      },
    );
    setProgress(null);
    setWa(waItems);
    toast.success(`${result.sent} reminder emails sent${result.failed ? `, ${result.failed} failed` : ''}. WhatsApp queue ready.`);
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Registrations"
        description="Filter, export and message learners."
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download /> Export CSV ({rows.length})
          </Button>
        }
      />
      <div className="flex flex-wrap gap-3">
        <NativeSelect aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as RegistrationStatus | '')} className="w-56">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ').toLowerCase()}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-72">
          <option value="">All courses</option>
          {(courses ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </NativeSelect>
        {courseId && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void sendReminders('24h')} loading={Boolean(progress)}>
              <BellRing /> 24h reminders
            </Button>
            <Button size="sm" variant="outline" onClick={() => void sendReminders('1h')} loading={Boolean(progress)}>
              <BellRing /> 1h reminders
            </Button>
          </div>
        )}
      </div>
      {progress && <p className="text-sm text-muted-foreground" aria-live="polite">{progress}</p>}
      {wa.length > 0 && <WhatsAppQueue items={wa} title="Reminder messages" />}

      {q.isLoading ? (
        <div className="skeleton h-60 rounded-3xl" />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No registrations yet" />
      ) : (
        <div className="overflow-x-auto rounded-3xl border bg-card">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Learner</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = effectiveStatus(r);
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono">{r.reference}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.participant.name}</p>
                      <p className="text-xs text-muted-foreground">{r.participant.email}</p>
                    </td>
                    <td className="px-4 py-3">{r.courseTitle}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatInr(r.amountInr)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={VARIANT[s]}>{s.replace('_', ' ').toLowerCase()}</Badge>
                      {r.status === 'APPROVED' && r.accessUntil && (
                        <p className={`mt-1 text-[11px] ${isAccessExpired(r) ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {isAccessExpired(r) ? 'Access ended ' : 'Access until '}
                          {formatDateTime(r.accessUntil)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(r.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'APPROVED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title={r.confirmationSentAt ? `Confirmation sent ${formatDateTime(r.confirmationSentAt)}` : 'Send confirmation'}
                          onClick={async () => {
                            const res = await sendConfirmation(r, user!.uid);
                            toast[res.email.ok ? 'success' : 'error'](res.email.ok ? 'Confirmation emailed.' : 'Email failed.');
                            setWa([res.wa]);
                          }}
                        >
                          <Mail /> {r.confirmationSentAt ? 'Resend' : 'Confirm'}
                        </Button>
                      )}
                      {r.status === 'APPROVED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Extend the learner's access window by 30 days"
                          onClick={async () => {
                            const base = r.accessUntil && !isAccessExpired(r) ? new Date(r.accessUntil).getTime() : Date.now();
                            const until = new Date(base + 30 * 86_400_000).toISOString();
                            try {
                              await (await backend()).setAccessUntil(r.id, until, user!.uid);
                              toast.success(`Access extended to ${formatDateTime(until)}`);
                              void q.refetch();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Could not extend access');
                            }
                          }}
                        >
                          <Clock /> +30 days
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {q.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void q.fetchNextPage()} loading={q.isFetchingNextPage}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
