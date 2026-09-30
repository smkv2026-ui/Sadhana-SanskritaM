import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ChevronDown, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { backend } from '@/data';
import { qk, useTaxonomy } from '@/data/queries';
import { CATEGORY_HUES, categoryHue, DEFAULT_TAXONOMY, type Category, type SubCategory, type Taxonomy } from '@/data/taxonomy';
import { useAuth } from '@/features/auth/AuthProvider';
import { autoId, slugify } from '@/lib/ids';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/primitives';

/**
 * Admin editor for the whole course taxonomy (`site/taxonomy`): categories (paths),
 * their sub-categories and per-item options (e.g. Theory / Practical). Nothing is fixed —
 * add, rename, recolour, reorder or remove anything. Existing ids never change on rename,
 * so courses stay linked; new items get an id from their name.
 */
type EditSub = SubCategory & { key: string; isNew: boolean };
type EditCat = Omit<Category, 'subs'> & { key: string; isNew: boolean; subs: EditSub[] };

const toEdit = (t: Taxonomy): EditCat[] =>
  t.categories.map((c) => ({ ...c, key: autoId(), isNew: false, subs: c.subs.map((s) => ({ ...s, key: autoId(), isNew: false })) }));

function uniqueSlug(label: string, taken: string[]): string {
  const base = slugify(label).slice(0, 36) || 'item';
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/** Final ids: keep saved ids, derive new ones from the (current) label. */
export function finalizeTaxonomy(cats: EditCat[]): Taxonomy {
  const catIds: string[] = [];
  return {
    categories: cats.map((c) => {
      const id = c.isNew ? uniqueSlug(c.label, catIds) : c.id;
      catIds.push(id);
      const subIds: string[] = [];
      return {
        id,
        label: c.label.trim(),
        labelSa: c.labelSa.trim(),
        emoji: c.emoji.trim() || '🪷',
        blurb: c.blurb.trim(),
        ...(c.hue ? { hue: c.hue } : {}),
        subs: c.subs.map((s) => {
          const sid = s.isNew ? uniqueSlug(s.label, subIds) : s.id;
          subIds.push(sid);
          return { id: sid, label: s.label.trim(), ...(s.variants?.length ? { variants: s.variants } : {}) };
        }),
      };
    }),
  };
}

function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const next = [...list];
  const [x] = next.splice(i, 1);
  next.splice(i + d, 0, x as T);
  return next;
}

export function TaxonomyEditor() {
  const saved = useTaxonomy();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [cats, setCats] = useState<EditCat[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const courses = useQuery({ queryKey: qk.coursesAdmin, queryFn: async () => (await backend()).listCourses({ includeUnpublished: true }) });

  useEffect(() => {
    if (!cats) setCats(toEdit(saved));
  }, [saved, cats]);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of courses.data ?? []) {
      m.set(c.category, (m.get(c.category) ?? 0) + 1);
      m.set(`${c.category}/${c.subcategory}`, (m.get(`${c.category}/${c.subcategory}`) ?? 0) + 1);
    }
    return m;
  }, [courses.data]);

  if (!cats) return <div className="skeleton h-40 rounded-3xl" />;

  const setCat = (i: number, patch: Partial<EditCat>) => setCats(cats.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const setSub = (ci: number, si: number, patch: Partial<EditSub>) =>
    setCat(ci, { subs: (cats[ci] as EditCat).subs.map((s, j) => (j === si ? { ...s, ...patch } : s)) });

  const addCategory = () => {
    const c: EditCat = { key: autoId(), isNew: true, id: '', label: '', labelSa: '', emoji: '🪷', blurb: '', hue: categoryHue({}, cats.length), subs: [] };
    setCats([...cats, c]);
    setOpen(c.key);
  };

  const removeCategory = (i: number) => {
    const c = cats[i] as EditCat;
    const n = c.isNew ? 0 : (usage.get(c.id) ?? 0);
    if (n && !window.confirm(`${n} course(s) use “${c.label}”. Remove it anyway? Those courses will no longer appear under a path until you re-assign them.`)) return;
    setCats(cats.filter((_, j) => j !== i));
  };

  const removeSub = (ci: number, si: number) => {
    const c = cats[ci] as EditCat;
    const s = c.subs[si] as EditSub;
    const n = s.isNew ? 0 : (usage.get(`${c.id}/${s.id}`) ?? 0);
    if (n && !window.confirm(`${n} course(s) use “${s.label}”. Remove it anyway? They stay listed under “${c.label}”.`)) return;
    setCat(ci, { subs: c.subs.filter((_, j) => j !== si) });
  };

  const save = async () => {
    if (!cats.length) return toast.error('Keep at least one category.');
    for (const c of cats) {
      if (!c.label.trim()) return toast.error('Every category needs a name.');
      if (c.subs.some((s) => !s.label.trim())) return toast.error(`Every item in “${c.label}” needs a name.`);
    }
    const labels = cats.map((c) => c.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) return toast.error('Two categories have the same name.');
    const t = finalizeTaxonomy(cats);
    setBusy(true);
    try {
      const b = await backend();
      await b.saveTaxonomy(t);
      await b.writeAudit({ by: user!.uid, action: 'taxonomy.update', target: 'site/taxonomy', details: t.categories.map((c) => `${c.id}:${c.subs.length}`).join(' ') });
      await qc.invalidateQueries({ queryKey: qk.taxonomy });
      setCats(toEdit(t));
      toast.success('Categories saved — the site updates immediately');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="rounded-2xl bg-muted/50 p-3 text-sm text-muted-foreground">
        Everything here is yours to change: add a new path (category), rename or recolour one, and add, rename, reorder or remove its
        sub-categories — e.g. a new language, a yoga or meditation programme, a stotra, or a scripture for sat-saṅga. <strong>Options</strong>{' '}
        (comma separated) become a third level such as <em>Theory, Practical, Theory + Practical</em>. Renaming keeps courses linked.
        Click <strong>Save categories</strong> when done.
      </p>

      <AnimatePresence initial={false}>
        {cats.map((cat, ci) => {
          const isOpen = open === cat.key;
          const hue = categoryHue(cat, ci);
          return (
            <motion.section
              key={cat.key}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="overflow-hidden rounded-3xl border bg-card"
              style={{ boxShadow: `inset 3px 0 0 hsl(${hue})` }}
            >
              <div className="flex flex-wrap items-center gap-2 p-4">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : cat.key)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl" style={{ background: `hsl(${hue} / 0.18)` }} aria-hidden>
                    {cat.emoji || '🪷'}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg font-semibold">{cat.label || 'New category'}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {cat.subs.length} sub-categor{cat.subs.length === 1 ? 'y' : 'ies'}
                      {!cat.isNew && usage.get(cat.id) ? ` · ${usage.get(cat.id)} course(s)` : ''}
                      {cat.subs.length ? ` · ${cat.subs.map((s) => s.label).filter(Boolean).slice(0, 4).join(', ')}${cat.subs.length > 4 ? '…' : ''}` : ''}
                    </span>
                  </span>
                  <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')} />
                </button>
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={ci === 0} onClick={() => setCats(move(cats, ci, -1))} aria-label="Move category up">
                    <ArrowUp />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={ci === cats.length - 1} onClick={() => setCats(move(cats, ci, 1))} aria-label="Move category down">
                    <ArrowDown />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeCategory(ci)} aria-label={`Remove ${cat.label}`}>
                    <Trash2 />
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="space-y-4 border-t p-4">
                  <div className="grid gap-3 sm:grid-cols-[5rem_1fr_1fr]">
                    <label className="text-xs text-muted-foreground">
                      Icon
                      <Input className="mt-1 text-center text-xl" maxLength={4} value={cat.emoji} onChange={(e) => setCat(ci, { emoji: e.target.value })} />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Name
                      <Input className="mt-1" value={cat.label} placeholder="e.g. Ayurveda" onChange={(e) => setCat(ci, { label: e.target.value })} />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Sanskrit name (optional)
                      <Input className="deva mt-1" lang="sa" value={cat.labelSa} placeholder="e.g. आयुर्वेदः" onChange={(e) => setCat(ci, { labelSa: e.target.value })} />
                    </label>
                  </div>
                  <label className="block text-xs text-muted-foreground">
                    One-line description
                    <Input className="mt-1" value={cat.blurb} onChange={(e) => setCat(ci, { blurb: e.target.value })} />
                  </label>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    Colour
                    {CATEGORY_HUES.map((h) => (
                      <button
                        key={h.hue}
                        type="button"
                        title={h.name}
                        aria-label={h.name}
                        aria-pressed={hue === h.hue}
                        onClick={() => setCat(ci, { hue: h.hue })}
                        className={cn('h-6 w-6 rounded-full ring-offset-2 ring-offset-background transition', hue === h.hue && 'ring-2 ring-foreground')}
                        style={{ background: `hsl(${h.hue})` }}
                      />
                    ))}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Sub-categories</p>
                    <ul className="space-y-2">
                      {cat.subs.map((sub, si) => (
                        <li key={sub.key} className="grid items-center gap-2 rounded-2xl border bg-background/50 p-2 sm:grid-cols-[1.1fr_1.6fr_auto]">
                          <Input aria-label="Sub-category name" placeholder="e.g. Yoga for Seniors" value={sub.label} onChange={(e) => setSub(ci, si, { label: e.target.value })} />
                          <VariantsInput value={sub.variants ?? []} onCommit={(variants) => setSub(ci, si, { variants: variants.length ? variants : undefined })} />
                          <div className="flex justify-end gap-1">
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={si === 0} onClick={() => setCat(ci, { subs: move(cat.subs, si, -1) })} aria-label="Move up">
                              <ArrowUp />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={si === cat.subs.length - 1} onClick={() => setCat(ci, { subs: move(cat.subs, si, 1) })} aria-label="Move down">
                              <ArrowDown />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeSub(ci, si)} aria-label={`Remove ${sub.label}`}>
                              <Trash2 />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setCat(ci, { subs: [...cat.subs, { key: autoId(), isNew: true, id: '', label: '' }] })}
                    >
                      <Plus /> Add sub-category
                    </Button>
                  </div>
                </div>
              )}
            </motion.section>
          );
        })}
      </AnimatePresence>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="button" variant="outline" onClick={addCategory}>
          <Plus /> Add category
        </Button>
        <Button onClick={() => void save()} loading={busy}>
          Save categories
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            if (window.confirm('Replace your categories with the original defaults? (Nothing is saved until you click Save.)')) setCats(toEdit(DEFAULT_TAXONOMY));
          }}
        >
          <RotateCcw /> Reset to defaults
        </Button>
      </div>
    </div>
  );
}

/** Free-typing comma list; parsed on blur so commas can be typed naturally. */
function VariantsInput({ value, onCommit }: { value: string[]; onCommit: (v: string[]) => void }) {
  const [raw, setRaw] = useState(value.join(', '));
  return (
    <Input
      aria-label="Options"
      placeholder="Options, comma separated (optional)"
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        const v = raw.split(',').map((x) => x.trim()).filter(Boolean);
        setRaw(v.join(', '));
        onCommit(v);
      }}
    />
  );
}
