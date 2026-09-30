import { useQueryClient } from '@tanstack/react-query';
import { Check, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { backend } from '@/data';
import { qk, useTaxonomy } from '@/data/queries';
import { findCategory } from '@/data/taxonomy';
import { slugify } from '@/lib/ids';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/primitives';

/** "+ New" beside the sub-category picker: creates the sub-category in `site/taxonomy` on the spot. */
export function QuickAddSub({ categoryId, onAdded }: { categoryId: string; onAdded: (id: string) => void }) {
  const taxonomy = useTaxonomy();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const cat = findCategory(taxonomy, categoryId);

  const add = async () => {
    const name = label.trim();
    if (!name || !cat) return;
    const existing = cat.subs.find((s) => s.label.toLowerCase() === name.toLowerCase());
    if (existing) {
      onAdded(existing.id);
      setOpen(false);
      return;
    }
    const base = slugify(name).slice(0, 36) || 'item';
    let id = base;
    for (let n = 2; cat.subs.some((s) => s.id === id); n++) id = `${base}-${n}`;
    setBusy(true);
    try {
      const next = { categories: taxonomy.categories.map((c) => (c.id === cat.id ? { ...c, subs: [...c.subs, { id, label: name }] } : c)) };
      await (await backend()).saveTaxonomy(next);
      qc.setQueryData(qk.taxonomy, next);
      toast.success(`Added “${name}” to ${cat.label}`);
      onAdded(id);
      setLabel('');
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add');
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <Button type="button" variant="outline" size="sm" className="h-10 shrink-0" onClick={() => setOpen(true)} disabled={!cat}>
        <Plus /> New
      </Button>
    );
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Input
        autoFocus
        aria-label="New sub-category name"
        placeholder="Name"
        className="w-36"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void add();
          }
          if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      />
      <Button type="button" size="icon" className="h-10 w-10" onClick={() => void add()} loading={busy} aria-label="Add">
        <Check />
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-10 w-10" onClick={() => setOpen(false)} aria-label="Cancel">
        <X />
      </Button>
    </div>
  );
}
