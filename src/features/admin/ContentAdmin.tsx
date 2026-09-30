import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { backend } from '@/data';
import type { Coupon, SiteSettings, SiteStats, Subhashita, Teacher, Testimonial } from '@/data/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { autoId } from '@/lib/ids';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/overlays';
import { Badge, Checkbox, Field, Input, Textarea } from '@/shared/ui/primitives';
import { AdminHeader } from './AdminApp';
import { fromLocalInput, toLocalInput } from './courseForm';
import { TaxonomyEditor } from './TaxonomyEditor';

type FieldType = 'text' | 'textarea' | 'number' | 'bool' | 'datetime' | 'list' | 'deva';
interface FieldDef<T> {
  key: keyof T & string;
  label: string;
  type: FieldType;
}

interface CrudProps<T> {
  title: string;
  queryKey: string[];
  load: () => Promise<T[]>;
  save: (item: T) => Promise<void>;
  remove: (item: T) => Promise<void>;
  blank: () => T;
  fields: FieldDef<T>[];
  getId: (item: T) => string;
  summary: (item: T) => React.ReactNode;
  validate?: (item: T) => string | null;
}

function SimpleCrud<T extends object>({ title, queryKey, load, save, remove, blank, fields, getId, summary, validate }: CrudProps<T>) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const q = useQuery({ queryKey, queryFn: load });
  const [editing, setEditing] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setField = (key: string, value: unknown) => setEditing((e) => (e ? ({ ...e, [key]: value } as T) : e));
  const audit = async (action: string, target: string) => (await backend()).writeAudit({ by: user!.uid, action, target, details: '' });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Button size="sm" onClick={() => setEditing(blank())}>
          <Plus /> Add
        </Button>
      </div>
      <ul className="space-y-2">
        {(q.data ?? []).map((item) => (
          <li key={getId(item)} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
            <div className="min-w-0 flex-1 text-sm">{summary(item)}</div>
            <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(item)}>
              <Pencil />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Delete"
              onClick={async () => {
                if (!confirm('Delete this item?')) return;
                await remove(item);
                await audit(`${title.toLowerCase()}.delete`, getId(item));
                void qc.invalidateQueries();
              }}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              {fields.map((f) => {
                const id = `f-${f.key}`;
                const value = (editing as Record<string, unknown>)[f.key];
                if (f.type === 'bool')
                  return (
                    <label key={f.key} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={Boolean(value)} onCheckedChange={(v) => setField(f.key, v === true)} /> {f.label}
                    </label>
                  );
                return (
                  <Field key={f.key} id={id} label={f.label}>
                    {f.type === 'textarea' ? (
                      <Textarea id={id} value={String(value ?? '')} onChange={(e) => setField(f.key, e.target.value)} />
                    ) : f.type === 'number' ? (
                      <Input id={id} type="number" value={Number(value ?? 0)} onChange={(e) => setField(f.key, Number(e.target.value))} />
                    ) : f.type === 'datetime' ? (
                      <Input id={id} type="datetime-local" value={toLocalInput((value as string) ?? null)} onChange={(e) => setField(f.key, fromLocalInput(e.target.value))} />
                    ) : f.type === 'list' ? (
                      <Input id={id} value={((value as string[]) ?? []).join(', ')} onChange={(e) => setField(f.key, e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} />
                    ) : (
                      <Input id={id} lang={f.type === 'deva' ? 'sa' : undefined} className={f.type === 'deva' ? 'deva' : undefined} value={String(value ?? '')} onChange={(e) => setField(f.key, e.target.value)} />
                    )}
                  </Field>
                );
              })}
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const err = validate?.(editing) ?? null;
                  if (err) return setError(err);
                  try {
                    await save(editing);
                    await audit(`${title.toLowerCase()}.save`, getId(editing));
                    toast.success('Saved');
                    setEditing(null);
                    setError(null);
                    void qc.invalidateQueries();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Save failed');
                  }
                }}
              >
                Save
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function SiteSettingsForm() {
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ['siteStats'], queryFn: async () => (await backend()).getSiteStats() });
  const settings = useQuery({ queryKey: ['settings'], queryFn: async () => (await backend()).getSettings() });
  const [s, setS] = useState<SiteStats | null>(null);
  const [st, setSt] = useState<SiteSettings | null>(null);
  useEffect(() => {
    if (stats.data && !s) setS(stats.data);
    if (settings.data && !st) setSt(settings.data);
  }, [stats.data, settings.data, s, st]);
  if (!s || !st) return <div className="skeleton h-40 rounded-3xl" />;
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (st.whatsappChannelUrl && !/^https:\/\/\S+$/.test(st.whatsappChannelUrl)) return toast.error('Channel link must be https://');
        const b = await backend();
        await Promise.all([b.saveSiteStats(s), b.saveSettings(st)]);
        toast.success('Site settings saved');
        void qc.invalidateQueries();
      }}
    >
      {(['learners', 'courses', 'countries', 'hoursTaught'] as const).map((k) => (
        <Field key={k} id={`st-${k}`} label={`Counter: ${k}`}>
          <Input id={`st-${k}`} type="number" min={0} value={s[k]} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} />
        </Field>
      ))}
      <Field id="st-wa" label="WhatsApp Channel / Community link" className="sm:col-span-2">
        <Input id="st-wa" value={st.whatsappChannelUrl} onChange={(e) => setSt({ ...st, whatsappChannelUrl: e.target.value })} placeholder="https://whatsapp.com/channel/…" />
      </Field>
      <Field id="st-ann" label="Announcement (reserved)" className="sm:col-span-2">
        <Input id="st-ann" value={st.announcement} onChange={(e) => setSt({ ...st, announcement: e.target.value })} />
      </Field>
      <div>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

export default function ContentAdmin() {
  const b = () => backend();
  return (
    <div>
      <AdminHeader title="Categories & content" description="Course categories, teachers, testimonials, the Subhāṣita of the day, coupons and site settings." />
      <Tabs defaultValue="categories">
        <TabsList className="flex-wrap">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="subhashitas">Subhāṣitas</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="site">Site</TabsTrigger>
        </TabsList>
        <TabsContent value="categories">
          <TaxonomyEditor />
        </TabsContent>
        <TabsContent value="subhashitas">
          <SimpleCrud<Subhashita>
            title="Subhashitas"
            queryKey={['subhashitas']}
            load={async () => (await b()).listSubhashitas()}
            save={async (x) => (await b()).saveSubhashita(x)}
            remove={async (x) => (await b()).deleteSubhashita(x.id)}
            blank={() => ({ id: `s-${autoId().slice(0, 8)}`, deva: '', iast: '', meaning: '', source: '', active: true, order: 99 })}
            getId={(x) => x.id}
            fields={[
              { key: 'deva', label: 'Devanāgarī', type: 'deva' },
              { key: 'iast', label: 'IAST transliteration', type: 'text' },
              { key: 'meaning', label: 'Meaning', type: 'textarea' },
              { key: 'source', label: 'Source', type: 'text' },
              { key: 'order', label: 'Order', type: 'number' },
              { key: 'active', label: 'Active (in the daily rotation)', type: 'bool' },
            ]}
            validate={(x) => (x.deva && x.iast && x.meaning ? null : 'Devanāgarī, IAST and meaning are required.')}
            summary={(x) => (
              <>
                <p lang="sa" className="deva">
                  {x.deva}
                </p>
                <p className="text-muted-foreground">
                  {x.meaning} {!x.active && <Badge variant="muted">inactive</Badge>}
                </p>
              </>
            )}
          />
        </TabsContent>
        <TabsContent value="teachers">
          <SimpleCrud<Teacher>
            title="Teachers"
            queryKey={['teachers']}
            load={async () => (await b()).listTeachers()}
            save={async (x) => (await b()).saveTeacher(x)}
            remove={async (x) => (await b()).deleteTeacher(x.id)}
            blank={() => ({ id: `t-${autoId().slice(0, 8)}`, name: '', nameSa: '', title: '', bio: '', photoUrl: '', order: 99 })}
            getId={(x) => x.id}
            fields={[
              { key: 'name', label: 'Name', type: 'text' },
              { key: 'nameSa', label: 'Name (Devanāgarī)', type: 'deva' },
              { key: 'title', label: 'Title / speciality', type: 'text' },
              { key: 'bio', label: 'Bio', type: 'textarea' },
              { key: 'photoUrl', label: 'Photo URL (https, optional)', type: 'text' },
              { key: 'order', label: 'Order', type: 'number' },
            ]}
            validate={(x) => (x.name.trim() ? (x.photoUrl && !/^https:\/\//.test(x.photoUrl) ? 'Photo URL must be https://' : null) : 'Name is required.')}
            summary={(x) => (
              <>
                <p className="font-semibold">{x.name}</p>
                <p className="text-muted-foreground">{x.title}</p>
              </>
            )}
          />
        </TabsContent>
        <TabsContent value="testimonials">
          <SimpleCrud<Testimonial>
            title="Testimonials"
            queryKey={['testimonials']}
            load={async () => (await b()).listTestimonials()}
            save={async (x) => (await b()).saveTestimonial(x)}
            remove={async (x) => (await b()).deleteTestimonial(x.id)}
            blank={() => ({ id: `tm-${autoId().slice(0, 8)}`, name: '', role: '', quote: '', order: 99 })}
            getId={(x) => x.id}
            fields={[
              { key: 'name', label: 'Name', type: 'text' },
              { key: 'role', label: 'Role / city', type: 'text' },
              { key: 'quote', label: 'Quote', type: 'textarea' },
              { key: 'order', label: 'Order', type: 'number' },
            ]}
            validate={(x) => (x.name && x.quote ? null : 'Name and quote are required.')}
            summary={(x) => (
              <>
                <p>“{x.quote}”</p>
                <p className="text-muted-foreground">— {x.name}</p>
              </>
            )}
          />
        </TabsContent>
        <TabsContent value="coupons">
          <SimpleCrud<Coupon>
            title="Coupons"
            queryKey={['admin', 'coupons']}
            load={async () => (await b()).listCoupons()}
            save={async (x) => (await b()).saveCoupon({ ...x, code: x.code.trim().toUpperCase(), kind: x.kind === 'flat' ? 'flat' : 'percent' })}
            remove={async (x) => (await b()).deleteCoupon(x.code)}
            blank={() => ({ code: '', kind: 'percent', value: 10, courseIds: [], validUntil: null, active: true, description: '' })}
            getId={(x) => x.code}
            fields={[
              { key: 'code', label: 'Code (A–Z, 0–9, 3–24 chars)', type: 'text' },
              { key: 'kind', label: 'Kind: percent or flat', type: 'text' },
              { key: 'value', label: 'Value (% or ₹)', type: 'number' },
              { key: 'courseIds', label: 'Limit to course IDs (comma separated, blank = all)', type: 'list' },
              { key: 'validUntil', label: 'Valid until (optional)', type: 'datetime' },
              { key: 'description', label: 'Description', type: 'text' },
              { key: 'active', label: 'Active', type: 'bool' },
            ]}
            validate={(x) =>
              !/^[A-Z0-9_-]{3,24}$/i.test(x.code.trim())
                ? 'Code must be 3–24 letters/digits.'
                : x.kind !== 'percent' && x.kind !== 'flat'
                  ? 'Kind must be “percent” or “flat”.'
                  : x.value <= 0 || (x.kind === 'percent' && x.value > 100)
                    ? 'Value out of range.'
                    : null
            }
            summary={(x) => (
              <>
                <p className="font-mono font-semibold">
                  {x.code} {!x.active && <Badge variant="muted">inactive</Badge>}
                </p>
                <p className="text-muted-foreground">
                  {x.kind === 'percent' ? `${x.value}% off` : `₹${x.value} off`} · {x.courseIds.length ? x.courseIds.join(', ') : 'all courses'}
                </p>
              </>
            )}
          />
        </TabsContent>
        <TabsContent value="site">
          <SiteSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
