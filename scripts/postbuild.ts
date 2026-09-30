/**
 * Post-build step for static hosting (GitHub Pages / Firebase Hosting):
 *  - writes one HTML shell per public route with its own <title>, description, canonical and
 *    OpenGraph tags (crawlers and link previews get correct metadata without running JS)
 *  - prerenders shells for published course pages (fetched from Firestore's public REST API when
 *    Firebase is configured, otherwise the demo catalogue)
 *  - 404.html SPA fallback, sitemap.xml, robots.txt, .nojekyll
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND } from '../src/brand/logoGeometry';
import { seedCourses } from '../src/data/seed';
import { siteConfig } from '../src/config/site.config';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const base = (process.env.BASE_PATH ?? '/').replace(/\/?$/, '/').replace(/^\/?/, '/');
const siteUrl = (process.env.VITE_SITE_URL || `https://example.github.io${base}`).replace(/\/?$/, '/');

interface PageDef {
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
  priority?: number;
}

const DEFAULT_DESC = 'Learn Sanskrit joyfully — live cohorts, recorded courses and events rooted in tradition. Speak, read, chant and understand the original texts.';

const PAGES: PageDef[] = [
  { path: '', title: `${BRAND.name} — ${BRAND.tagline}`, description: DEFAULT_DESC, priority: 1 },
  { path: 'courses', title: `Courses · ${BRAND.name}`, description: 'Explore live cohorts, recorded courses and events in spoken Sanskrit, grammar, chanting and the classical texts.', priority: 0.9 },
  { path: 'events', title: `Events · ${BRAND.name}`, description: 'Upcoming live sessions, workshops and satsangs — add them to your calendar.', priority: 0.8 },
  { path: 'find-your-path', title: `Find your path · ${BRAND.name}`, description: 'A 1-minute quiz that recommends the right Sanskrit course for your level, goals, time and format.', priority: 0.8 },
  { path: 'about', title: `About · ${BRAND.name}`, description: 'Our story, our mark and the teachers behind Sadhana Sanskritam.', priority: 0.6 },
  { path: 'custom-apps', title: `Build me a custom app · ${BRAND.name}`, description: 'Describe your learning app or website idea with our interactive brief builder and track it online.', priority: 0.6 },
  { path: 'subscribe', title: `Get notified · ${BRAND.name}`, description: 'Hear first about new Sanskrit courses and events — by email or WhatsApp, on your terms.', priority: 0.5 },
  { path: 'contact', title: `Contact · ${BRAND.name}`, description: 'Questions about courses, payments or custom apps? We would love to hear from you.', priority: 0.5 },
  { path: 'privacy', title: `Privacy policy · ${BRAND.name}`, description: 'How we collect, use and protect your data (DPDP Act, 2023).', priority: 0.3 },
  { path: 'terms', title: `Terms · ${BRAND.name}`, description: 'Terms of use for Sadhana Sanskritam.', priority: 0.3 },
  { path: 'refund-policy', title: `Refund policy · ${BRAND.name}`, description: 'Refunds for live courses, recorded courses and events.', priority: 0.3 },
  { path: 'my-learning', title: `My Learning · ${BRAND.name}`, description: DEFAULT_DESC, noindex: true },
  { path: 'custom-apps/track', title: `Track my request · ${BRAND.name}`, description: DEFAULT_DESC, noindex: true },
  { path: 'sign-in', title: `Sign in · ${BRAND.name}`, description: DEFAULT_DESC, noindex: true },
  { path: 'admin', title: `Admin · ${BRAND.name}`, description: DEFAULT_DESC, noindex: true },
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function render(template: string, p: PageDef, extraHead = ''): string {
  const url = siteUrl + p.path;
  const image = `${siteUrl}og-image.png`;
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(p.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(p.description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(p.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(p.description)}" />`)
    .replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${image}" />`);
  const head = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    p.noindex ? '<meta name="robots" content="noindex,nofollow" />' : '',
    extraHead,
  ].join('\n    ');
  html = html.replace('</head>', `    ${head}\n  </head>`);
  return html;
}

function writePage(template: string, p: PageDef, extraHead = '') {
  const dir = join(dist, p.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), render(template, p, extraHead));
}

interface CourseLite {
  slug: string;
  title: string;
  summary: string;
  kind: string;
}

async function publishedCourses(): Promise<CourseLite[]> {
  const project = process.env.VITE_FIREBASE_PROJECT_ID || siteConfig.firebase.projectId;
  const key = process.env.VITE_FIREBASE_API_KEY || siteConfig.firebase.apiKey;
  if (!project || !key || process.env.VITE_BACKEND === 'demo') {
    return seedCourses().filter((c) => c.status === 'published');
  }
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery?key=${key}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'courses' }],
          where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } } },
          limit: 200,
        },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = (await res.json()) as { document?: { fields: Record<string, { stringValue?: string }> } }[];
    return rows
      .filter((r) => r.document)
      .map((r) => ({
        slug: r.document!.fields.slug?.stringValue ?? '',
        title: r.document!.fields.title?.stringValue ?? '',
        summary: r.document!.fields.summary?.stringValue ?? '',
        kind: r.document!.fields.kind?.stringValue ?? 'course',
      }))
      .filter((c) => /^[a-z0-9-]+$/.test(c.slug));
  } catch (err) {
    console.warn(`  ! Could not fetch courses from Firestore (${String(err)}); course pages fall back to the SPA.`);
    return [];
  }
}

async function main() {
  const indexPath = join(dist, 'index.html');
  if (!existsSync(indexPath)) throw new Error('dist/index.html missing — run vite build first');
  const template = readFileSync(indexPath, 'utf8');

  for (const p of PAGES) writePage(template, p);

  const courses = await publishedCourses();
  for (const c of courses) {
    const jsonLd = `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': c.kind === 'event' ? 'Event' : 'Course',
      name: c.title,
      description: c.summary,
      provider: { '@type': 'Organization', name: BRAND.name, url: siteUrl },
    }).replace(/</g, '\\u003c')}</script>`;
    writePage(template, { path: `courses/${c.slug}`, title: `${c.title} · ${BRAND.name}`, description: c.summary || DEFAULT_DESC, priority: 0.7 }, jsonLd);
  }

  // SPA fallback for any other deep link (GitHub Pages serves 404.html with status 404).
  writeFileSync(join(dist, '404.html'), render(template, { path: '', title: BRAND.name, description: DEFAULT_DESC }));
  writeFileSync(join(dist, '.nojekyll'), '');

  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ...PAGES.filter((p) => !p.noindex).map((p) => ({ loc: siteUrl + p.path, priority: p.priority ?? 0.5 })),
    ...courses.map((c) => ({ loc: `${siteUrl}courses/${c.slug}`, priority: 0.7 })),
  ];
  writeFileSync(
    join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority.toFixed(1)}</priority></url>`)
      .join('\n')}\n</urlset>\n`,
  );
  writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: ${base}admin\nDisallow: ${base}my-learning\n\nSitemap: ${siteUrl}sitemap.xml\n`);

  console.info(`postbuild: ${PAGES.length} route shells, ${courses.length} course shells, sitemap (${urls.length} URLs) for ${siteUrl}`);
}

void main();
