import { useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { backend } from '@/data';
import { qk, useTaxonomy } from '@/data/queries';
import { DEFAULT_TAXONOMY, type Category, type Taxonomy } from '@/data/taxonomy';
import { useAuth } from '@/features/auth/AuthProvider';
import { slugify } from '@/lib/ids';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/primitives';

/**
 * Admin editor for the course taxonomy (`site/taxonomy`). The five top-level categories are
 * fixed (they drive navigation and colours); everything under them — languages, yoga styles,
 * chanting and meaning topics, scriptures for sat-saṅga, and per-item options like
 * “Theory / Practical” — is editable.
 */
export function TaxonomyEditor() {
  const saved = useTaxonomy();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [t, setT] = useState<Taxonomy | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!t) setT(structuredClone(saved));
  }, [saved, t]);
  if (!t) return <div className="skeleton h-40 rounded-3xl" />;

  const setCat = (i: number, patch: Partial<Category>) => setT({ categories: t.categories.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  const save = async () => {
    for (const c of t.categories) {
      if (!c.subs.length) return toast.error(`${c.label} needs at least one item.`);
      const ids = c.subs.map((s) => s.id);
      if (ids.some((id) => !id)) return toast.error(`Every item in ${c.label} needs a name.`);
      if (new Set(ids).size !== ids.length) return toast.error(`Two items in ${c.label} have the same name.`);
    }
    setBusy(true);
    try {
      const b = await backend();
      await b.saveTaxonomy(t);
      await b.writeAudit({ by: user!.uid, action: 'taxonomy.update', target: 'site/taxonomy', details: t.categories.map((c) => `${c.id}:${c.subs.length}`).join(' ') });
      await qc.invalidateQueries({ queryKey: qk.taxonomy });
      toast.success('Categories saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="rounded-2xl bg-muted/50 p-3 text-sm text-muted-foreground">
        Add languages (e.g. German, French), yoga or meditation programmes, chanting and meaning topics, and the scriptures offered for
        sat-saṅga reading. Options (comma separated) become the third level — e.g. <em>Theory, Practical, Theory + Practical</em>.
        Renaming keeps existing courses linked; removing an item hides it from filters (courses using it stay visible under the category).
      </p>
      {t.categories.map((cat, ci) => (
        <fieldset key={cat.id} className="rounded-3xl border bg-card p-5">
          <legend className="px-2 font-display text-lg font-semibold">
            {cat.emoji} {cat.label} <span className="deva text-sm font-normal text-muted-foreground">{cat.labelSa}</span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <Input aria-label={`${cat.label} display name`} value={cat.label} onChange={(e) => setCat(ci, { label: e.target.value })} />
            <Input aria-label={`${cat.label} description`} value={cat.blurb} onChange={(e) => setCat(ci, { blurb: e.target.value })} />
          </div>
          <ul className="mt-4 space-y-2">
            {cat.subs.map((sub, si) => (
              <li key={si} className="grid items-center gap-2 sm:grid-cols-[1.1fr_1.6fr_auto]">
                <Input
                  aria-label="Name"
                  placeholder="Name"
                  value={sub.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    const isNew = !DEFAULT_TAXONOMY.categories.some((d) => d.subs.some((s) => s.id === sub.id)) && !saved.categories.some((d) => d.subs.some((s) => s.id === sub.id));
                    setCat(ci, { subs: cat.subs.map((s, j) => (j === si ? { ...s, label, id: isNew || !s.id ? slugify(label).slice(0, 40) : s.id } : s)) });
                  }}
                />
                <VariantsInput
                  value={sub.variants ?? []}
                  onCommit={(variants) => setCat(ci, { subs: cat.subs.map((s, j) => (j === si ? { ...s, variants: variants.length ? variants : undefined } : s)) })}
                />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${sub.label}`} onClick={() => setCat(ci, { subs: cat.subs.filter((_, j) => j !== si) })}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setCat(ci, { subs: [...cat.subs, { id: '', label: '' }] })}>
            <Plus /> Add {cat.id === 'reading' ? 'scripture' : cat.id === 'language' ? 'language' : 'item'}
          </Button>
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void save()} loading={busy}>
          Save categories
        </Button>
        <Button variant="ghost" onClick={() => setT(structuredClone(DEFAULT_TAXONOMY))}>
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
      placeholder="Options (optional, comma separated)"
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
