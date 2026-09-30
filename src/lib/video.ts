import type { VideoProvider } from '@/data/types';

/**
 * Turns whatever URL an admin pastes into something the in-app player can embed.
 * Free hosting options: YouTube (unlisted), Vimeo, Google Drive ("Anyone with the link"),
 * or any direct .mp4/.webm URL. `bunny` covers Bunny Stream embeds (low-cost, signed URLs).
 */
export interface ParsedVideo {
  provider: VideoProvider;
  /** URL to put in an <iframe> (or <video src> for `file`). */
  embedUrl: string;
  id: string | null;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseVideoUrl(raw: string): ParsedVideo | null {
  const input = raw.trim();
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^www\.|^m\./, '');

  // YouTube: watch?v=, youtu.be/, /embed/, /shorts/, /live/
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
    let id: string | null = null;
    if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0] ?? null;
    else if (url.searchParams.get('v')) id = url.searchParams.get('v');
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      id = m?.[1] ?? null;
    }
    if (!id || !YT_ID.test(id)) return null;
    const params = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1', iv_load_policy: '3', disablekb: '0' });
    return { provider: 'youtube', id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}?${params}` };
  }

  // Vimeo: vimeo.com/123, vimeo.com/123/abcdef (unlisted hash), player.vimeo.com/video/123?h=abc
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = url.pathname.match(/(?:^\/video)?\/(\d+)(?:\/([A-Za-z0-9]+))?/);
    if (!m) return null;
    const id = m[1] as string;
    const hash = url.searchParams.get('h') ?? m[2] ?? null;
    const params = new URLSearchParams({ dnt: '1', title: '0', byline: '0', portrait: '0' });
    if (hash) params.set('h', hash);
    return { provider: 'vimeo', id, embedUrl: `https://player.vimeo.com/video/${id}?${params}` };
  }

  // Google Drive: /file/d/{id}/view, open?id=, uc?id=
  if (host === 'drive.google.com') {
    const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id');
    if (!id || !/^[A-Za-z0-9_-]{10,}$/.test(id)) return null;
    return { provider: 'drive', id, embedUrl: `https://drive.google.com/file/d/${id}/preview` };
  }

  // Bunny Stream: iframe.mediadelivery.net/embed/{lib}/{id} or /play/{lib}/{id}
  if (host === 'iframe.mediadelivery.net' || host === 'player.mediadelivery.net') {
    const m = url.pathname.match(/^\/(?:embed|play)\/(\d+)\/([A-Za-z0-9-]+)/);
    if (!m) return null;
    const embed = new URL(`https://iframe.mediadelivery.net/embed/${m[1]}/${m[2]}`);
    // Keep signed-URL params (token, expires) if the admin pasted them.
    for (const k of ['token', 'expires']) {
      const v = url.searchParams.get(k);
      if (v) embed.searchParams.set(k, v);
    }
    embed.searchParams.set('preload', 'true');
    return { provider: 'bunny', id: m[2] as string, embedUrl: embed.toString() };
  }

  // Direct media files (any static host / CDN).
  if (/\.(mp4|webm|ogv|ogg|m4v|mov)$/i.test(url.pathname)) {
    return { provider: 'file', id: null, embedUrl: url.toString() };
  }
  return null;
}

export const PROVIDER_LABEL: Record<VideoProvider, string> = {
  youtube: 'YouTube (unlisted)',
  vimeo: 'Vimeo',
  drive: 'Google Drive',
  file: 'Direct video file',
  bunny: 'Bunny Stream',
};

/** Recording-level window: available when there is no window or it hasn't passed. */
export function isRecordingAvailable(r: { availableUntil?: string | null }, now: Date = new Date()): boolean {
  return !r.availableUntil || new Date(r.availableUntil).getTime() > now.getTime();
}

/** Human "3 days left" style label for a deadline; null when unlimited. */
export function timeLeftLabel(until: string | null | undefined, now: Date = new Date()): string | null {
  if (!until) return null;
  const ms = new Date(until).getTime() - now.getTime();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'Less than an hour left';
  if (h < 48) return `${h} hour${h === 1 ? '' : 's'} left`;
  const d = Math.floor(h / 24);
  return `${d} days left`;
}
