import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Recording } from '@/data/types';
import { autoId } from '@/lib/ids';
import { parseVideoUrl, PROVIDER_LABEL, timeLeftLabel } from '@/lib/video';
import { cn } from '@/lib/utils';
import { VideoPlayer } from '@/features/learning/VideoPlayer';
import { Button } from '@/shared/ui/button';
import { Badge, Input } from '@/shared/ui/primitives';
import { fromLocalInput, toLocalInput } from './courseForm';

/**
 * Structured editor for course recordings: paste any YouTube (unlisted) / Vimeo / Google Drive /
 * Bunny Stream / direct .mp4 link, the provider is detected and previewed in the same protected
 * player learners see. Each recording can have its own "available until" date.
 */
export function RecordingsEditor({ value, onChange }: { value: Recording[]; onChange: (r: Recording[]) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const update = (i: number, patch: Partial<Recording>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x as Recording);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {value.map((r, i) => {
          const parsed = r.url ? parseVideoUrl(r.url) : null;
          const left = timeLeftLabel(r.availableUntil);
          return (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="rounded-2xl border bg-background/60 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold tabular-nums">{i + 1}</span>
                <Input aria-label={`Recording ${i + 1} title`} placeholder="Lesson title" value={r.title} onChange={(e) => update(i, { title: e.target.value })} />
                <Input
                  aria-label={`Recording ${i + 1} minutes`}
                  type="number"
                  min={0}
                  className="w-20 shrink-0"
                  value={r.durationMinutes || ''}
                  placeholder="min"
                  onChange={(e) => update(i, { durationMinutes: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  aria-label={`Recording ${i + 1} link`}
                  placeholder="https://youtu.be/… · vimeo.com/… · drive.google.com/file/d/… · …/video.mp4"
                  value={r.url}
                  className="text-sm"
                  onChange={(e) => update(i, { url: e.target.value.trim() })}
                />
                <Button type="button" size="icon" variant="ghost" disabled={!parsed} onClick={() => setPreview(preview === r.id ? null : r.id)} aria-label="Preview">
                  {preview === r.id ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {r.url ? (
                  parsed ? (
                    <Badge variant="success">{PROVIDER_LABEL[parsed.provider]}</Badge>
                  ) : (
                    <Badge variant="destructive">Unsupported link</Badge>
                  )
                ) : (
                  <Badge variant="muted">No link yet</Badge>
                )}
                <label className="ml-auto flex items-center gap-2 text-muted-foreground">
                  Available until
                  <input
                    type="datetime-local"
                    className="rounded-lg border bg-background px-2 py-1 text-xs"
                    value={toLocalInput(r.availableUntil ?? null)}
                    onChange={(e) => update(i, { availableUntil: fromLocalInput(e.target.value) })}
                  />
                </label>
                {left && <span className={cn('rounded-full px-2 py-0.5', left === 'Expired' ? 'bg-destructive/10 text-destructive' : 'bg-muted')}>{left}</span>}
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                    <ArrowUp />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                    <ArrowDown />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove recording">
                    <Trash2 />
                  </Button>
                </div>
              </div>
              {preview === r.id && parsed && (
                <div className="mt-3">
                  <VideoPlayer url={r.url} title={r.title || 'Preview'} watermark="admin preview" />
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { id: `r-${autoId().slice(0, 8)}`, title: '', url: '', durationMinutes: 0, availableUntil: null }])}>
        <Plus /> Add recording
      </Button>
    </div>
  );
}
