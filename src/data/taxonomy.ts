/**
 * Course taxonomy: category → sub-category → optional variants.
 * These defaults ship with the app; admins can add/rename sub-categories and variants
 * (e.g. a new language or scripture) in Admin → Content → Categories, stored in `site/taxonomy`.
 */
export type CategoryId = 'language' | 'yoga' | 'chanting' | 'meaning' | 'reading';

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
  subs: SubCategory[];
}

export interface Taxonomy {
  categories: Category[];
}

export const DEFAULT_TAXONOMY: Taxonomy = {
  categories: [
    {
      id: 'language',
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

/** Merge an admin-saved taxonomy over the defaults (unknown categories are ignored). */
export function mergeTaxonomy(saved: Partial<Taxonomy> | null | undefined): Taxonomy {
  if (!saved?.categories?.length) return DEFAULT_TAXONOMY;
  return {
    categories: DEFAULT_TAXONOMY.categories.map((def) => {
      const s = saved.categories?.find((c) => c.id === def.id);
      return s ? { ...def, ...s, id: def.id, subs: Array.isArray(s.subs) && s.subs.length ? s.subs : def.subs } : def;
    }),
  };
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
