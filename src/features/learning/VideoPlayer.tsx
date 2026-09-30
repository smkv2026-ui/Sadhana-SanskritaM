import { Maximize2, Minimize2, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { parseVideoUrl } from '@/lib/video';
import { cn } from '@/lib/utils';

/**
 * In-app player for course recordings. No download button, no picture-in-picture, no
 * "open on YouTube/Drive" escape hatch (sandboxed iframe without popups/top-navigation),
 * right-click disabled, and a drifting watermark with the learner's email that stays
 * visible in our own fullscreen mode.
 *
 * Honest limit: nothing on the web can stop screen recording or a determined user with
 * dev-tools; the watermark is the deterrent. For signed, expiring URLs use Bunny Stream.
 */
export function VideoPlayer({
  url,
  title,
  watermark,
  onEnded,
  className,
}: {
  url: string;
  title: string;
  watermark?: string | null;
  onEnded?: () => void;
  className?: string;
}) {
  const parsed = useMemo(() => parseVideoUrl(url), [url]);
  const wrap = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [spot, setSpot] = useState(0);
  const canFullscreen = typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === wrap.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Move the watermark every few seconds so it can't be cropped out.
  useEffect(() => {
    if (!watermark) return;
    const t = window.setInterval(() => setSpot((s) => (s + 1) % SPOTS.length), 7000);
    return () => window.clearInterval(t);
  }, [watermark]);

  const toggleFull = () => {
    if (!wrap.current) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrap.current.requestFullscreen?.().catch(() => undefined);
  };

  if (!parsed) {
    return (
      <div className={cn('grid aspect-video place-items-center rounded-2xl bg-midnight text-sm text-pearl/70', className)}>
        This recording link isn’t supported yet — please contact support.
      </div>
    );
  }

  return (
    <div
      ref={wrap}
      className={cn('group relative aspect-video w-full select-none overflow-hidden rounded-2xl bg-black shadow-lift', full && 'rounded-none', className)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {parsed.provider === 'file' ? (
        <video
          key={parsed.embedUrl}
          src={parsed.embedUrl}
          title={title}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload noremoteplayback nofullscreen"
          disablePictureInPicture
          disableRemotePlayback
          onEnded={onEnded}
          className="h-full w-full"
        />
      ) : (
        <>
          <iframe
            key={parsed.embedUrl}
            src={parsed.embedUrl}
            title={title}
            className="h-full w-full"
            // No allow-popups / allow-top-navigation → "Watch on YouTube", Drive pop-out etc. can't leave the app.
            sandbox="allow-scripts allow-same-origin allow-presentation"
            allow="autoplay; encrypted-media; picture-in-picture 'none'"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
          {/* Shields over the provider's title bar / pop-out button. */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-14" />
          {parsed.provider === 'drive' && <div aria-hidden className="absolute right-0 top-0 h-16 w-20" />}
        </>
      )}

      {watermark && (
        <span
          aria-hidden
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded bg-black/10 px-2 py-0.5 font-mono text-[11px] text-white/35 transition-all duration-[2000ms] ease-in-out sm:text-xs"
          style={SPOTS[spot]}
        >
          {watermark}
        </span>
      )}

      <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white/80 opacity-0 backdrop-blur transition group-hover:opacity-100">
        <ShieldCheck className="h-3 w-3 text-saffron-light" /> Protected stream
      </div>
      {canFullscreen && (
        <button
          type="button"
          onClick={toggleFull}
          className="absolute right-3 top-3 z-20 rounded-full bg-black/50 p-2 text-white/90 opacity-80 backdrop-blur transition hover:bg-black/70 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
          aria-label={full ? 'Exit full screen' : 'Full screen'}
        >
          {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

const SPOTS: React.CSSProperties[] = [
  { left: '8%', top: '18%' },
  { left: '55%', top: '30%' },
  { left: '20%', top: '62%' },
  { left: '60%', top: '70%' },
  { left: '35%', top: '45%' },
];
