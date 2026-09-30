/**
 * Course taxonomy: category → sub-category → optional variants (options).
 * These are only the starting defaults. Admins own the whole tree in Admin → Content → Categories
 * (stored in `site/taxonomy`): add, rename, reorder or remove categories, sub-categories and options.
 */
/** Slug of a category, e.g. "yoga". Free-form: admins can create new ones. */
export type CategoryId = string;

export interface SubCategory {
  id: string;
  label: string;
  /** e.g. Theory / Practical / Theory + Practical */
  variants?: string[];
}

export interface Category {
  id: CategoryId;
  label: string;
  labelSa: string;
  emoji: string;
  blurb: string;
  /** Accent colour as an HSL triple ("152 45% 48%"); optional. */
  hue?: string;
  subs: SubCategory[];
}

/** Jewel-tone palette offered in the editor (and used when a category has no colour yet). */
export const CATEGORY_HUES: { name: string; hue: string }[] = [
  { name: 'Gold', hue: '42 85% 58%' },
  { name: 'Leaf', hue: '152 45% 48%' },
  { name: 'Saffron', hue: '18 85% 60%' },
  { name: 'Amethyst', hue: '265 55% 66%' },
  { name: 'Sky', hue: '205 75% 60%' },
  { name: 'Lotus pink', hue: '335 70% 66%' },
  { name: 'Turquoise', hue: '178 55% 45%' },
  { name: 'Crimson', hue: '355 70% 58%' },
];

export function categoryHue(c: Pick<Category, 'hue'>, index: number): string {
  return c.hue || (CATEGORY_HUES[index % CATEGORY_HUES.length] as { hue: string }).hue;
}

export interface Taxonomy {
  categories: Category[];
}

export const DEFAULT_TAXONOMY: Taxonomy = {
  categories: [
    {
      id: 'language',
      hue: '42 85% 58%',
      label: 'Language',
      labelSa: 'भाषा',
      emoji: '🗣️',
      blurb: 'Speak, read and write — Sanskrit and more.',
      subs: [
        { id: 'sanskrit', label: 'Sanskrit' },
        { id: 'german', label: 'German' },
      ],
    },
    {
      id: 'yoga',
      hue: '152 45% 48%',
      label: 'Yoga',
      labelSa: 'योगः',
      emoji: '🧘',
      blurb: 'Āsana, prāṇāyāma and meditation for every stage of life.',
      subs: [
        { id: 'ashtanga', label: 'Ashtanga Yoga', variants: ['Theory', 'Practical', 'Theory + Practical'] },
        { id: 'yoga-children', label: 'Yoga for Children' },
        { id: 'yoga-pregnancy', label: 'Yoga for Pregnancy' },
        { id: 'meditation-pregnancy', label: 'Meditation for Pregnancy' },
        { id: 'meditation-focus', label: 'Meditation for Focus' },
        { id: 'pranayama-basics', label: 'Prāṇāyāma (Basics)' },
      ],
    },
    {
      id: 'chanting',
      hue: '18 85% 60%',
      label: 'Learn Chanting',
      labelSa: 'पाठः',
      emoji: '🎶',
      blurb: 'Correct pronunciation, svara and rhythm.',
      subs: [
        { id: 'shloka-chanting', label: 'Śloka Chanting' },
        { id: 'stotra-chanting', label: 'Stotra Chanting' },
        { id: 'gita-chanting', label: 'Bhagavad Gītā Chanting' },
      ],
    },
    {
      id: 'meaning',
      hue: '265 55% 66%',
      label: 'Learn Meaning',
      labelSa: 'अर्थः',
      emoji: '📖',
      blurb: 'Understand what you chant — word by word.',
      subs: [
        { id: 'stotras', label: 'Stotras' },
        { id: 'shlokas', label: 'Ślokas' },
        { id: 'gita', label: 'Bhagavad Gītā' },
        { id: 'books', label: 'Books' },
      ],
    },
    {
      id: 'reading',
      hue: '205 75% 60%',
      label: 'Reading (Sat-saṅga)',
      labelSa: 'सत्सङ्गः',
      emoji: '🪔',
      blurb: 'Group reading of the scriptures — just listen and read along.',
      subs: [
        { id: 'bhagavad-gita', label: 'Bhagavad Gītā' },
        { id: 'ramayana', label: 'Rāmāyaṇa' },
        { id: 'mahabharata', label: 'Mahābhārata' },
        { id: 'upanishads', label: 'Upaniṣads' },
        { id: 'bhagavata-purana', label: 'Bhāgavata Purāṇa' },
        { id: 'yoga-sutras', label: 'Yoga Sūtras of Patañjali' },
        { id: 'vishnu-sahasranama', label: 'Viṣṇu Sahasranāma' },
      ],
    },
  ],
};

const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;

/**
 * The admin-saved taxonomy wins entirely (so categories/sub-categories can be removed or
 * reordered); defaults are used only until something is saved. Malformed entries are dropped.
 */
export function mergeTaxonomy(saved: Partial<Taxonomy> | null | undefined): Taxonomy {
  if (!Array.isArray(saved?.categories) || saved.categories.length === 0) return DEFAULT_TAXONOMY;
  const categories = saved.categories
    .filter((c): c is Category => Boolean(c && typeof c.id === 'string' && SLUG.test(c.id) && typeof c.label === 'string'))
    .map((c) => ({
      id: c.id,
      label: c.label,
      labelSa: typeof c.labelSa === 'string' ? c.labelSa : '',
      emoji: typeof c.emoji === 'string' && c.emoji ? c.emoji : '🪷',
      blurb: typeof c.blurb === 'string' ? c.blurb : '',
      ...(typeof c.hue === 'string' && c.hue ? { hue: c.hue } : {}),
      subs: (Array.isArray(c.subs) ? c.subs : [])
        .filter((x) => x && typeof x.id === 'string' && SLUG.test(x.id) && typeof x.label === 'string')
        .map((x) => ({ id: x.id, label: x.label, ...(Array.isArray(x.variants) && x.variants.length ? { variants: x.variants.filter((v) => typeof v === 'string' && v) } : {}) })),
    }));
  return categories.length ? { categories } : DEFAULT_TAXONOMY;
}

export function isCategorySlug(v: string): boolean {
  return SLUG.test(v);
}

export function findCategory(t: Taxonomy, id: string | undefined): Category | undefined {
  return t.categories.find((c) => c.id === id);
}

export function findSub(t: Taxonomy, categoryId: string | undefined, subId: string | undefined): SubCategory | undefined {
  return findCategory(t, categoryId)?.subs.find((s) => s.id === subId);
}

/** "Yoga › Ashtanga Yoga · Theory + Practical" */
export function categoryPath(t: Taxonomy, c: { category?: string; subcategory?: string; variant?: string }): string {
  const cat = findCategory(t, c.category);
  if (!cat) return '';
  const sub = findSub(t, c.category, c.subcategory);
  return [cat.label, sub ? `› ${sub.label}` : '', c.variant ? `· ${c.variant}` : ''].filter(Boolean).join(' ');
}
