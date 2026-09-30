import { useQuery } from '@tanstack/react-query';
import { Copy, Mail, Square } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { env } from '@/config/env';
import { backend } from '@/data';
import { useCourses } from '@/data/queries';
import type { Subscriber } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { INTERESTS, interestsForCourse } from '@/features/notifications/interests';
import { maskEmail } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getEmailProvider, sendInBatches, type BatchProgress } from '@/providers/email';
import { courseAnnouncementEmail, whatsappTexts } from '@/providers/emailTemplates';
import { Button } from '@/shared/ui/button';
import { Field, NativeSelect, Textarea } from '@/shared/ui/primitives';
import { AdminHeader } from './AdminApp';
import type { WaQueueItem } from './sendService';
import { WhatsAppQueue } from './WhatsAppQueue';

/** Deduplicate by email (public sign-up can create duplicates since subscribers aren't readable). */
export function dedupeSubscribers(list: Subscriber[]): Subscriber[] {
  const seen = new Map<string, Subscriber>();
  for (const s of list) {
    const key = s.email.toLowerCase();
    const prev = seen.get(key);
    if (!prev || (prev.status !== 'CONFIRMED' && s.status === 'CONFIRMED')) seen.set(key, s);
  }
  return [...seen.values()];
}

export default function NotifyComposer() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { data: courses } = useCourses();
  const [courseId, setCourseId] = useState(params.get('course') ?? '');
  const course = courses?.find((c) => c.id === courseId);
  const [interests, setInterests] = useState<string[] | null>(null);
  const activeInterests = interests ?? (course ? interestsForCourse(course) : []);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [wa, setWa] = useState<WaQueueItem[] | null>(null);
  const abort = useRef<AbortController | null>(null);

  const audience = useQuery({
    queryKey: ['admin', 'audience', activeInterests.join(',')],
    queryFn: async () => dedupeSubscribers(await (await backend()).listSubscribersForSend(activeInterests)),
    enabled: Boolean(course),
  });
  const used = useQuery({ queryKey: ['admin', 'emailsThisMonth'], queryFn: async () => (await backend()).countNotificationsThisMonth('email') });

  const emailList = useMemo(() => (audience.data ?? []).filter((s) => s.status === 'CONFIRMED' && s.channels.email && s.consent.email?.granted), [audience.data]);
  const waList = useMemo(() => (audience.data ?? []).filter((s) => s.channels.whatsapp && s.whatsapp && s.consent.whatsapp?.granted), [audience.data]);
  const remaining = Math.max(0, env.emailjs.monthlyQuota - (used.data ?? 0));

  const sendEmails = async () => {
    if (!course) return;
    if (emailList.length > remaining && !confirm(`Only ${remaining} emails left in this month's quota. Send the first ${remaining} and use “Copy BCC list” for the rest?`)) return;
    const b = await backend();
    abort.current = new AbortController();
    const batch = emailList.slice(0, remaining);
    const result = await sendInBatches(
      getEmailProvider(),
      batch.map((s) => courseAnnouncementEmail(s, course, message || undefined)),
      {
        signal: abort.current.signal,
        onProgress: setProgress,
        onResult: (m, r) =>
          b.logNotification({ kind: 'announcement', channel: 'email', recipient: maskEmail(m.to), refId: course.id, subject: m.subject, status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error, by: user!.uid }),
      },
    );
    await b.writeAudit({ by: user!.uid, action: 'notify.email', target: course.id, details: `${result.sent} sent, ${result.failed} failed` });
    toast.success(`Done: ${result.sent} sent${result.failed ? `, ${result.failed} failed` : ''}.`);
    void used.refetch();
  };

  const pct = progress ? ((progress.sent + progress.failed) / Math.max(1, progress.total)) * 100 : 0;

  return (
    <div className="space-y-6">
      <AdminHeader title="Notify subscribers" description="Announce a published course or event by email (throttled batches) and WhatsApp (tap-to-send queue)." />
      <div className="grid gap-4 rounded-3xl border bg-card p-6 sm:grid-cols-2">
        <Field id="n-course" label="Course / event">
          <NativeSelect
            id="n-course"
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              setInterests(null);
              setWa(null);
            }}
          >
            <option value="">Choose…</option>
            {(courses ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <fieldset>
          <legend className="text-sm font-medium">Audience interests (empty = everyone)</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {INTERESTS.map((i) => {
              const on = activeInterests.includes(i.id);
              return (
                <button
                  key={i.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setInterests(on ? activeInterests.filter((x) => x !== i.id) : [...activeInterests, i.id])}
                  className={cn('rounded-full border px-3 py-1 text-xs', on ? 'border-accent bg-accent/15 font-semibold' : 'hover:border-accent')}
                >
                  {i.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Field id="n-msg" label="Message (optional — defaults to the course summary)" className="sm:col-span-2">
          <Textarea id="n-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={600} />
        </Field>
      </div>

      {course && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-4 rounded-3xl border bg-card p-6" aria-labelledby="email-h">
            <h2 id="email-h" className="flex items-center gap-2 font-semibold">
              <Mail className="h-4 w-4" /> Email
            </h2>
            <p className="text-sm text-muted-foreground">
              {audience.isLoading ? 'Counting…' : `${emailList.length} confirmed, consented recipients.`} Quota left this month: <strong>{remaining}</strong> / {env.emailjs.monthlyQuota}.
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full bg-saffron transition-all" style={{ width: `${pct}%` }} />
            </div>
            {progress && (
              <p className="text-sm tabular-nums" aria-live="polite">
                {progress.sent} sent · {progress.failed} failed · {progress.total} total
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void sendEmails()} disabled={!emailList.length || Boolean(progress && progress.sent + progress.failed < progress.total)}>
                <Mail /> Send in batches of {env.emailjs.batchSize}
              </Button>
              {progress && progress.sent + progress.failed < progress.total && (
                <Button variant="outline" onClick={() => abort.current?.abort()}>
                  <Square /> Stop
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={!emailList.length}
                onClick={async () => {
                  await navigator.clipboard.writeText(emailList.map((s) => s.email).join(', '));
                  toast.success(`${emailList.length} addresses copied — paste into BCC of your own mail app.`);
                }}
              >
                <Copy /> Copy BCC list
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Each email includes personal “manage preferences” and “unsubscribe” links.</p>
          </section>
          <section className="space-y-4 rounded-3xl border bg-card p-6" aria-labelledby="wa-h">
            <h2 id="wa-h" className="font-semibold">WhatsApp</h2>
            <p className="text-sm text-muted-foreground">{waList.length} subscribers consented to WhatsApp. Each tap opens a prefilled chat — press Send in WhatsApp.</p>
            {wa ? (
              <WhatsAppQueue items={wa} title="Announcement queue" />
            ) : (
              <Button
                variant="success"
                disabled={!waList.length}
                onClick={() =>
                  setWa(
                    waList.map((s) => ({
                      id: `${s.id}-${course.id}`,
                      name: s.name,
                      to: s.whatsapp as string,
                      text: whatsappTexts.announcement(s.name, course),
                      refId: course.id,
                      kind: 'announcement' as const,
                    })),
                  )
                }
              >
                Build WhatsApp queue
              </Button>
            )}
            {env.contact.whatsappChannelUrl && <p className="text-xs text-muted-foreground">Tip: also post it in your WhatsApp Channel for everyone else.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
