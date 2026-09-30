import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Megaphone, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { backend } from '@/data';
import { useTeachers } from '@/data/queries';
import type { Course, CourseSecrets, Level } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatDate } from '@/lib/format';
import { autoId, slugify } from '@/lib/ids';
import { routes } from '@/lib/links';
import { formatInr } from '@/lib/pricing';
import { EmptyState } from '@/shared/components/States';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/overlays';
import { Badge, Checkbox, Field, Input, Label, NativeSelect, Textarea } from '@/shared/ui/primitives';
import { AdminHeader } from './AdminApp';
import { fromLocalInput, recordingsToText, syllabusToText, textToRecordings, textToSyllabus, toLocalInput, validateCourse, validateSecrets } from './courseForm';

function blankCourse(): Course {
  const now = new Date().toISOString();
  return {
    id: `c-${autoId().slice(0, 8).toLowerCase()}`,
    slug: '',
    kind: 'course',
    title: '',
    titleSa: '',
    type: 'live',
    level: 'beginner',
    goals: [],
    tags: [],
    summary: '',
    description: '',
    outcomes: [],
    syllabus: [],
    teacherIds: [],
    startsAt: null,
    endsAt: null,
    timezone: 'Asia/Kolkata',
    durationMinutes: 60,
    sessionsCount: 1,
    weeklyHours: 2,
    scheduleText: '',
    language: 'English + Sanskrit',
    priceInr: 0,
    earlyBirdPriceInr: null,
    earlyBirdEndsAt: null,
    seatLimit: 0,
    coverImage: '',
    accent: '#D9A441',
    status: 'draft',
    featured: false,
    createdAt: now,
    updatedAt: now,
  };
}

const GOALS = ['speak', 'read-texts', 'chanting', 'grammar', 'philosophy', 'kids'] as const;

function Editor({ initial, onClose }: { initial: Course; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: teachers } = useTeachers();
  const [c, setC] = useState<Course>(initial);
  const [syllabus, setSyllabus] = useState(syllabusToText(initial.syllabus));
  const [outcomes, setOutcomes] = useState(initial.outcomes.join('\n'));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const secretsQ = useQuery({ queryKey: ['admin', 'secrets', initial.id], queryFn: async () => (await backend()).getCourseSecrets(initial.id).catch(() => null) });
  const [secrets, setSecrets] = useState<{ meetingLink: string; meetingNotes: string; recordings: string; resources: string } | null>(null);
  const s = secrets ?? {
    meetingLink: secretsQ.data?.meetingLink ?? '',
    meetingNotes: secretsQ.data?.meetingNotes ?? '',
    recordings: recordingsToText(secretsQ.data?.recordings ?? []),
    resources: (secretsQ.data?.resources ?? []).map((r) => `${r.title} | ${r.url}`).join('\n'),
  };
  const setS = (patch: Partial<typeof s>) => setSecrets({ ...s, ...patch });
  const set = <K extends keyof Course>(k: K, v: Course[K]) => setC((x) => ({ ...x, [k]: v }));
  const num = (v: string) => (v === '' ? 0 : Math.round(Number(v)));

  const save = async () => {
    const course: Course = { ...c, slug: c.slug || slugify(c.title), syllabus: textToSyllabus(syllabus), outcomes: outcomes.split('\n').map((x) => x.trim()).filter(Boolean) };
    const secretsObj: CourseSecrets = {
      courseId: course.id,
      meetingLink: s.meetingLink.trim(),
      meetingNotes: s.meetingNotes.trim(),
      recordings: textToRecordings(s.recordings),
      resources: s.resources
        .split('\n')
        .map((l) => l.split('|').map((p) => p.trim()))
        .filter(([t, u]) => t && u)
        .map(([title, url]) => ({ title, url })),
    };
    const err = validateCourse(course) ?? validateSecrets(secretsObj);
    if (err) return setError(err);
    setBusy(true);
    try {
      const b = await backend();
      await b.saveCourse(course);
      if (secrets) await b.saveCourseSecrets(secretsObj);
      await b.writeAudit({ by: user!.uid, action: initial.title ? 'course.update' : 'course.create', target: course.id, details: course.status });
      void qc.invalidateQueries();
      const newlyPublished = course.status === 'published' && initial.status !== 'published';
      toast.success('Saved', newlyPublished ? { action: { label: 'Notify subscribers', onClick: () => navigate(`/admin/notify?course=${course.id}`) } } : undefined);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent side="right" className="w-[min(100vw,720px)]">
      <DialogHeader>
        <DialogTitle>{initial.title ? `Edit ${initial.title}` : 'New course / event'}</DialogTitle>
        <DialogDescription>Public fields go to `courses`; links and recordings go to the locked `courseSecrets` document.</DialogDescription>
      </DialogHeader>
      <Tabs defaultValue="basics">
        <TabsList>
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="pricing">Schedule & price</TabsTrigger>
          <TabsTrigger value="secrets">Access</TabsTrigger>
        </TabsList>
        <TabsContent value="basics" className="grid gap-4 sm:grid-cols-2">
          <Field id="ce-title" label="Title" className="sm:col-span-2">
            <Input id="ce-title" value={c.title} onChange={(e) => set('title', e.target.value)} onBlur={() => !c.slug && set('slug', slugify(c.title))} />
          </Field>
          <Field id="ce-titlesa" label="Sanskrit title (Devanagari)">
            <Input id="ce-titlesa" lang="sa" className="deva" value={c.titleSa ?? ''} onChange={(e) => set('titleSa', e.target.value)} />
          </Field>
          <Field id="ce-slug" label="URL slug">
            <Input id="ce-slug" value={c.slug} onChange={(e) => set('slug', slugify(e.target.value))} />
          </Field>
          <Field id="ce-kind" label="Kind">
            <NativeSelect id="ce-kind" value={c.kind} onChange={(e) => set('kind', e.target.value as Course['kind'])}>
              <option value="course">Course</option>
              <option value="event">Event</option>
            </NativeSelect>
          </Field>
          <Field id="ce-type" label="Format">
            <NativeSelect id="ce-type" value={c.type} onChange={(e) => set('type', e.target.value as Course['type'])}>
              <option value="live">Live</option>
              <option value="recorded">Recorded</option>
              <option value="hybrid">Hybrid</option>
            </NativeSelect>
          </Field>
          <Field id="ce-level" label="Level">
            <NativeSelect id="ce-level" value={c.level} onChange={(e) => set('level', e.target.value as Level)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </NativeSelect>
          </Field>
          <Field id="ce-status" label="Status">
            <NativeSelect id="ce-status" value={c.status} onChange={(e) => set('status', e.target.value as Course['status'])}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </NativeSelect>
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium">Goals (used by Find Your Path)</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {GOALS.map((g) => (
                <label key={g} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={c.goals.includes(g)} onCheckedChange={(v) => set('goals', v ? [...c.goals, g] : c.goals.filter((x) => x !== g))} /> {g}
                </label>
              ))}
            </div>
          </fieldset>
          <Field id="ce-tags" label="Tags (comma separated)" className="sm:col-span-2">
            <Input id="ce-tags" value={c.tags.join(', ')} onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} />
          </Field>
          <Field id="ce-cover" label="Cover image URL (optional, https)" className="sm:col-span-2" hint="Any https image (e.g. a file committed to the repo’s public/ folder, referenced by its full site URL). No uploads on the Spark plan; leave blank for the generated cover.">
            <Input id="ce-cover" value={c.coverImage} onChange={(e) => set('coverImage', e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={c.featured} onCheckedChange={(v) => set('featured', v === true)} /> Feature on the home page
          </label>
        </TabsContent>
        <TabsContent value="content" className="grid gap-4">
          <Field id="ce-summary" label="Summary (card text)">
            <Textarea id="ce-summary" rows={2} value={c.summary} onChange={(e) => set('summary', e.target.value)} maxLength={300} />
          </Field>
          <Field id="ce-desc" label="Description">
            <Textarea id="ce-desc" rows={4} value={c.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field id="ce-outcomes" label="Outcomes (one per line)">
            <Textarea id="ce-outcomes" rows={4} value={outcomes} onChange={(e) => setOutcomes(e.target.value)} />
          </Field>
          <Field id="ce-syllabus" label="Syllabus / agenda" hint="One module per line — “Module title (minutes): item; item; item”">
            <Textarea id="ce-syllabus" rows={6} className="font-mono text-sm" value={syllabus} onChange={(e) => setSyllabus(e.target.value)} />
          </Field>
          <fieldset>
            <legend className="text-sm font-medium">Teachers</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {(teachers ?? []).map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={c.teacherIds.includes(t.id)} onCheckedChange={(v) => set('teacherIds', v ? [...c.teacherIds, t.id] : c.teacherIds.filter((x) => x !== t.id))} /> {t.name}
                </label>
              ))}
            </div>
          </fieldset>
        </TabsContent>
        <TabsContent value="pricing" className="grid gap-4 sm:grid-cols-2">
          <Field id="ce-start" label="Starts (your local time)">
            <Input id="ce-start" type="datetime-local" value={toLocalInput(c.startsAt)} onChange={(e) => set('startsAt', fromLocalInput(e.target.value))} />
          </Field>
          <Field id="ce-end" label="Ends">
            <Input id="ce-end" type="datetime-local" value={toLocalInput(c.endsAt)} onChange={(e) => set('endsAt', fromLocalInput(e.target.value))} />
          </Field>
          <Field id="ce-sched" label="Schedule text" className="sm:col-span-2">
            <Input id="ce-sched" value={c.scheduleText} onChange={(e) => set('scheduleText', e.target.value)} placeholder="Tue · Thu, 7–8 pm IST" />
          </Field>
          <Field id="ce-dur" label="Session length (min)">
            <Input id="ce-dur" type="number" min={0} value={c.durationMinutes} onChange={(e) => set('durationMinutes', num(e.target.value))} />
          </Field>
          <Field id="ce-sessions" label="Sessions">
            <Input id="ce-sessions" type="number" min={1} value={c.sessionsCount} onChange={(e) => set('sessionsCount', num(e.target.value))} />
          </Field>
          <Field id="ce-weekly" label="Hours / week">
            <Input id="ce-weekly" type="number" min={0} step={0.5} value={c.weeklyHours} onChange={(e) => set('weeklyHours', Number(e.target.value))} />
          </Field>
          <Field id="ce-seats" label="Seat limit (0 = unlimited)">
            <Input id="ce-seats" type="number" min={0} value={c.seatLimit} onChange={(e) => set('seatLimit', num(e.target.value))} />
          </Field>
          <Field id="ce-price" label="Price (INR, 0 = free)">
            <Input id="ce-price" type="number" min={0} value={c.priceInr} onChange={(e) => set('priceInr', num(e.target.value))} />
          </Field>
          <Field id="ce-eb" label="Early-bird price (blank = none)">
            <Input id="ce-eb" type="number" min={0} value={c.earlyBirdPriceInr ?? ''} onChange={(e) => set('earlyBirdPriceInr', e.target.value === '' ? null : num(e.target.value))} />
          </Field>
          <Field id="ce-ebend" label="Early-bird ends">
            <Input id="ce-ebend" type="datetime-local" value={toLocalInput(c.earlyBirdEndsAt)} onChange={(e) => set('earlyBirdEndsAt', fromLocalInput(e.target.value))} />
          </Field>
        </TabsContent>
        <TabsContent value="secrets" className="grid gap-4">
          <p className="rounded-2xl bg-muted/50 p-3 text-sm text-muted-foreground">
            Only admins and learners with an <strong>approved</strong> registration can read these (enforced by Firestore Security Rules).
          </p>
          <Field id="ce-meet" label="Live meeting link (https)">
            <Input id="ce-meet" value={s.meetingLink} onChange={(e) => setS({ meetingLink: e.target.value })} placeholder="https://meet.google.com/…" />
          </Field>
          <Field id="ce-meetnotes" label="Joining notes">
            <Input id="ce-meetnotes" value={s.meetingNotes} onChange={(e) => setS({ meetingNotes: e.target.value })} />
          </Field>
          <Field id="ce-recs" label="Recordings" hint="One per line — “Title | https://url | minutes” (unlisted YouTube, Drive or Vimeo links).">
            <Textarea id="ce-recs" rows={6} className="font-mono text-sm" value={s.recordings} onChange={(e) => setS({ recordings: e.target.value })} />
          </Field>
          <Field id="ce-res" label="Resources" hint="“Title | https://url” per line">
            <Textarea id="ce-res" rows={3} className="font-mono text-sm" value={s.resources} onChange={(e) => setS({ resources: e.target.value })} />
          </Field>
        </TabsContent>
      </Tabs>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => void save()} loading={busy}>
          Save
        </Button>
      </div>
      <Label className="sr-only">End of form</Label>
    </DialogContent>
  );
}

export default function CoursesAdmin() {
  const [editing, setEditing] = useState<Course | null>(null);
  const q = useQuery({ queryKey: ['courses', 'admin'], queryFn: async () => (await backend()).listCourses({ includeUnpublished: true }) });
  return (
    <div>
      <AdminHeader
        title="Courses & events"
        actions={
          <Button onClick={() => setEditing(blankCourse())}>
            <Plus /> New
          </Button>
        }
      />
      {q.isLoading ? (
        <div className="skeleton h-60 rounded-3xl" />
      ) : !q.data?.length ? (
        <EmptyState title="No courses yet" description="Create one, or load demo data from the overview." />
      ) : (
        <ul className="grid gap-3">
          {q.data
            .sort((a, b) => a.status.localeCompare(b.status) || a.title.localeCompare(b.title))
            .map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.kind} · {c.type} · {formatInr(c.priceInr)} · {c.startsAt ? formatDate(c.startsAt) : 'self-paced'}
                  </p>
                </div>
                <Badge variant={c.status === 'published' ? 'success' : c.status === 'draft' ? 'warning' : 'muted'}>{c.status}</Badge>
                <div className="flex gap-1">
                  <Button asChild size="sm" variant="ghost" aria-label={`Preview ${c.title}`}>
                    <Link to={routes.course(c.slug)}>
                      <Eye />
                    </Link>
                  </Button>
                  {c.status === 'published' && (
                    <Button asChild size="sm" variant="ghost" aria-label={`Notify subscribers about ${c.title}`}>
                      <Link to={`/admin/notify?course=${c.id}`}>
                        <Megaphone />
                      </Link>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                    <Pencil /> Edit
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      )}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <Editor key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
      </Dialog>
    </div>
  );
}
