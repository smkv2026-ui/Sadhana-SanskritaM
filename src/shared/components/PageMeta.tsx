import { useEffect } from 'react';
import { BRAND } from '@/brand/logoGeometry';
import { absUrl } from '@/lib/links';

interface Props {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  jsonLd?: Record<string, unknown>;
  noindex?: boolean;
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

/**
 * Per-page metadata for the running SPA. Crawlers that don't run JS get the static
 * per-route HTML generated at build time (scripts/postbuild.mjs).
 */
export function PageMeta({ title, description, path, image, jsonLd, noindex }: Props) {
  useEffect(() => {
    const full = title ? `${title} · ${BRAND.name}` : `${BRAND.name} — ${BRAND.tagline}`;
    document.title = full;
    const desc = description ?? 'Learn Sanskrit joyfully — live cohorts, recorded courses and events rooted in tradition.';
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:image', image ?? absUrl('og-image.png'));
    setMeta('name', 'twitter:card', 'summary_large_image');
    if (path !== undefined) {
      setMeta('property', 'og:url', absUrl(path));
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = absUrl(path);
    }
    setMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.page = 'true';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => script?.remove();
  }, [title, description, path, image, jsonLd, noindex]);
  return null;
}
