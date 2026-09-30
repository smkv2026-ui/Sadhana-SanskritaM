import type {
  Coupon,
  Course,
  CourseSecrets,
  SiteSettings,
  SiteStats,
  Subhashita,
  Teacher,
  Testimonial,
} from './types';

/**
 * Demo content. Used by the in-browser demo backend and by the admin "Load demo data" button.
 * Teachers and testimonials are illustrative placeholders — replace them in the admin.
 * Dates are generated relative to "now" so the demo always has upcoming sessions.
 */
const DAY = 86_400_000;

function at(daysFromNow: number, hour = 19, minute = 0): string {
  const d = new Date(Date.now() + daysFromNow * DAY);
  // Express in IST (UTC+5:30) for realism.
  d.setUTCHours(hour - 5, minute - 30, 0, 0);
  return d.toISOString();
}

export const seedTeachers: Teacher[] = [
  {
    id: 't-meera',
    name: 'Dr. Meera Krishnan',
    nameSa: 'मीरा कृष्णन्',
    title: 'Lead Acharya · Vyakarana',
    bio: 'Two decades teaching Pāṇinian grammar to beginners and scholars alike; believes every learner can speak Sanskrit in a month.',
    order: 1,
  },
  {
    id: 't-vinay',
    name: 'Acharya Vinay Deshpande',
    nameSa: 'विनय देशपाण्डे',
    title: 'Vedic chanting & svara',
    bio: 'Trained in the traditional gurukula system; teaches chanting with precise svara, rhythm and breath.',
    order: 2,
  },
  {
    id: 't-ananya',
    name: 'Smt. Ananya Rao',
    nameSa: 'अनन्या राव',
    title: 'Spoken Sanskrit & children’s programmes',
    bio: 'Makes Sanskrit playful through stories, songs and conversation games for learners aged 7 to 70.',
    order: 3,
  },
];

const nowIso = new Date().toISOString();

function course(partial: Partial<Course> & Pick<Course, 'id' | 'slug' | 'title' | 'type' | 'level'>): Course {
  return {
    kind: 'course',
    titleSa: '',
    goals: [],
    tags: [],
    summary: '',
    description: '',
    outcomes: [],
    syllabus: [],
    teacherIds: ['t-meera'],
    startsAt: null,
    endsAt: null,
    timezone: 'Asia/Kolkata',
    durationMinutes: 60,
    sessionsCount: 1,
    weeklyHours: 2,
    scheduleText: '',
    language: 'English + Sanskrit',
    priceInr: 0,
    earlyBirdPriceInr: null,
    earlyBirdEndsAt: null,
    seatLimit: 0,
    coverImage: '',
    accent: '#D9A441',
    status: 'published',
    featured: false,
    createdAt: nowIso,
    updatedAt: nowIso,
    ...partial,
  };
}

export function seedCourses(): Course[] {
  return [
    course({
      id: 'c-samskrita-pravesha',
      slug: 'speak-sanskrit-in-30-days',
      title: 'Speak Sanskrit in 30 Days',
      titleSa: 'संस्कृत-प्रवेशः',
      type: 'live',
      level: 'beginner',
      goals: ['speak'],
      tags: ['spoken', 'conversation', 'beginner'],
      summary: 'A joyful, conversation-first journey from your first नमः to simple everyday dialogues.',
      description:
        'Twelve live, interactive evenings where you speak from day one. No grammar tables to memorise up-front — patterns emerge from conversation, songs and role-play. Ideal for complete beginners.',
      outcomes: [
        'Introduce yourself and hold a 5-minute conversation',
        'Use present, past and future tense naturally',
        'Read simple Devanagari sentences aloud',
        'Build a daily 15-minute practice habit',
      ],
      syllabus: [
        { id: 'm1', title: 'First words', items: ['Greetings & introductions', 'Numbers 1–100', 'Asking questions'], durationMinutes: 180 },
        { id: 'm2', title: 'Everyday life', items: ['Home & family', 'Time & days', 'Food & shopping role-play'], durationMinutes: 180 },
        { id: 'm3', title: 'Telling stories', items: ['Past tense with -वान्', 'Future tense', 'Retelling a short tale'], durationMinutes: 180 },
        { id: 'm4', title: 'Confidence', items: ['Group conversation circles', 'Mini-presentation', 'Next steps'], durationMinutes: 180 },
      ],
      teacherIds: ['t-ananya', 't-meera'],
      startsAt: at(12),
      endsAt: at(40),
      durationMinutes: 60,
      sessionsCount: 12,
      weeklyHours: 3,
      scheduleText: 'Tue · Thu · Sat, 7:00–8:00 pm IST',
      priceInr: 2499,
      earlyBirdPriceInr: 1999,
      earlyBirdEndsAt: at(6),
      seatLimit: 40,
      accent: '#D9A441',
      featured: true,
    }),
    course({
      id: 'c-varnamala',
      slug: 'devanagari-and-pronunciation',
      title: 'Devanagari & Pronunciation',
      titleSa: 'वर्णमाला',
      type: 'recorded',
      level: 'beginner',
      goals: ['read-texts', 'chanting'],
      tags: ['script', 'pronunciation', 'self-paced'],
      summary: 'Read and write Devanagari with confident, accurate pronunciation — at your own pace.',
      description:
        'Short, beautifully produced lessons on every akṣara, conjunct and diacritic, with slow-motion pronunciation guides and printable practice sheets.',
      outcomes: ['Read any Devanagari text slowly and correctly', 'Write all vowels, consonants and common conjuncts', 'Pronounce aspirated and retroflex sounds'],
      syllabus: [
        { id: 'm1', title: 'Vowels (स्वराः)', items: ['Short & long vowels', 'Anusvāra and visarga'], durationMinutes: 45 },
        { id: 'm2', title: 'Consonants (व्यञ्जनानि)', items: ['The five vargas', 'Semi-vowels & sibilants'], durationMinutes: 60 },
        { id: 'm3', title: 'Conjuncts (संयुक्ताक्षराणि)', items: ['Half-forms', 'Special ligatures क्ष त्र ज्ञ'], durationMinutes: 50 },
      ],
      teacherIds: ['t-meera'],
      durationMinutes: 155,
      sessionsCount: 9,
      weeklyHours: 1,
      scheduleText: 'Self-paced · lifetime access',
      priceInr: 999,
      accent: '#6FDDEB',
      featured: true,
    }),
    course({
      id: 'c-gita-grammar',
      slug: 'bhagavad-gita-reading-with-grammar',
      title: 'Bhagavad Gītā — Reading with Grammar',
      titleSa: 'गीता-पठनम्',
      type: 'hybrid',
      level: 'intermediate',
      goals: ['read-texts', 'philosophy'],
      tags: ['gita', 'texts', 'grammar'],
      summary: 'Read chapters 2 and 12 word-by-word: sandhi, samāsa and meaning — in the original.',
      description:
        'Weekly live readings plus recordings of every session. We split sandhi, identify every word form and discuss the meaning with classical commentaries.',
      outcomes: ['Split common sandhi confidently', 'Identify noun and verb forms in verse', 'Read 2 full chapters in the original'],
      syllabus: [
        { id: 'm1', title: 'Tools for reading', items: ['Sandhi recap', 'Compounds (samāsa)', 'Using a dictionary'] },
        { id: 'm2', title: 'Chapter 2 — Sāṅkhya yoga', items: ['Verses 11–30', 'Verses 31–53', 'Sthitaprajña (54–72)'] },
        { id: 'm3', title: 'Chapter 12 — Bhakti yoga', items: ['Verses 1–12', 'Verses 13–20', 'Chanting the chapter'] },
      ],
      teacherIds: ['t-meera'],
      startsAt: at(20, 7, 30),
      endsAt: at(90),
      durationMinutes: 75,
      sessionsCount: 10,
      weeklyHours: 2,
      scheduleText: 'Sundays, 7:30–8:45 am IST + recordings',
      priceInr: 3999,
      earlyBirdPriceInr: 3299,
      earlyBirdEndsAt: at(10),
      seatLimit: 60,
      accent: '#B7832A',
      featured: true,
    }),
    course({
      id: 'c-panini',
      slug: 'panini-made-friendly',
      title: 'Pāṇini Made Friendly',
      titleSa: 'अष्टाध्यायी-परिचयः',
      type: 'live',
      level: 'advanced',
      goals: ['grammar'],
      tags: ['vyakarana', 'ashtadhyayi', 'advanced'],
      summary: 'Foundations of the Aṣṭādhyāyī: sūtra style, meta-rules and your first prakriyā derivations.',
      description:
        'A rigorous but friendly cohort for learners who already read Sanskrit. We learn how Pāṇini’s sūtras work together and derive real word forms step by step.',
      outcomes: ['Read and interpret sūtras with vṛtti', 'Understand saṃjñā and paribhāṣā sūtras', 'Derive subanta and tiṅanta forms'],
      syllabus: [
        { id: 'm1', title: 'The architecture', items: ['Māheśvara sūtras & pratyāhāra', 'Anuvṛtti', 'Types of sūtras'] },
        { id: 'm2', title: 'Derivation', items: ['Prakriyā walkthroughs', 'Sandhi sūtras', 'Practice sets'] },
      ],
      teacherIds: ['t-meera'],
      startsAt: at(26, 18, 30),
      endsAt: at(80),
      durationMinutes: 90,
      sessionsCount: 16,
      weeklyHours: 3,
      scheduleText: 'Mon & Wed, 6:30–8:00 pm IST',
      priceInr: 5999,
      seatLimit: 25,
      accent: '#2A3270',
    }),
    course({
      id: 'c-vedic-chanting',
      slug: 'vedic-chanting-svara-and-rhythm',
      title: 'Vedic Chanting — Svara & Rhythm',
      titleSa: 'वेद-पाठः',
      type: 'recorded',
      level: 'beginner',
      goals: ['chanting'],
      tags: ['chanting', 'svara', 'self-paced'],
      summary: 'Chant the Śānti mantras and Puruṣa Sūktam with correct svara, pace and breath.',
      description:
        'Call-and-response recordings with visual svara markings. Practise at your own pace and loop any line as many times as you like.',
      outcomes: ['Understand udātta, anudātta and svarita', 'Chant 5 Śānti mantras', 'Chant the Puruṣa Sūktam'],
      syllabus: [
        { id: 'm1', title: 'Foundations', items: ['Posture & breath', 'Reading svara marks'] },
        { id: 'm2', title: 'Śānti mantras', items: ['Oṃ saha nāvavatu', 'Oṃ bhadraṃ karṇebhiḥ'] },
        { id: 'm3', title: 'Puruṣa Sūktam', items: ['Verses 1–8', 'Verses 9–16', 'Full recitation'] },
      ],
      teacherIds: ['t-vinay'],
      durationMinutes: 240,
      sessionsCount: 8,
      weeklyHours: 1,
      scheduleText: 'Self-paced · lifetime access',
      priceInr: 1499,
      accent: '#6FDDEB',
    }),
    course({
      id: 'c-kids',
      slug: 'sanskrit-for-kids',
      title: 'Sanskrit for Kids — Stories & Ślokas',
      titleSa: 'बाल-संस्कृतम्',
      type: 'live',
      level: 'beginner',
      goals: ['kids', 'speak'],
      tags: ['kids', 'stories', 'shlokas'],
      summary: 'Weekend story circles with songs, games and ślokas for ages 7–12.',
      description: 'Small groups, lots of laughter. Children learn vocabulary through Pañcatantra stories and memorise a śloka every week.',
      outcomes: ['100+ everyday words', '8 ślokas with meaning', 'Retell a Pañcatantra story in Sanskrit'],
      syllabus: [
        { id: 'm1', title: 'Animal friends', items: ['The monkey and the crocodile', 'Vocabulary games'] },
        { id: 'm2', title: 'Clever tales', items: ['The lion and the hare', 'Role-play'] },
      ],
      teacherIds: ['t-ananya'],
      startsAt: at(15, 10, 0),
      endsAt: at(60),
      durationMinutes: 45,
      sessionsCount: 8,
      weeklyHours: 1,
      scheduleText: 'Saturdays, 10:00–10:45 am IST',
      priceInr: 1799,
      seatLimit: 20,
      accent: '#F1C66E',
    }),
    course({
      id: 'e-subhashita-workshop',
      slug: 'workshop-reading-subhashitas',
      kind: 'event',
      title: 'Workshop: The Art of Subhāṣitas',
      titleSa: 'सुभाषित-कार्यशाला',
      type: 'live',
      level: 'beginner',
      goals: ['read-texts', 'philosophy'],
      tags: ['workshop', 'subhashita'],
      summary: 'A 2-hour live workshop reading five timeless subhāṣitas — meter, meaning and memory.',
      description: 'Bring a notebook. We read, chant and unpack five famous verses, and you leave with a technique for memorising any verse.',
      outcomes: ['Read five famous subhāṣitas', 'Recognise the anuṣṭubh meter', 'A memorisation technique'],
      syllabus: [{ id: 'm1', title: 'Agenda', items: ['Welcome & chanting', 'Five verses, word by word', 'Memory technique', 'Q&A'] }],
      teacherIds: ['t-meera', 't-vinay'],
      startsAt: at(9, 17, 0),
      durationMinutes: 120,
      sessionsCount: 1,
      weeklyHours: 2,
      scheduleText: 'One evening · 5:00–7:00 pm IST',
      priceInr: 299,
      seatLimit: 100,
      accent: '#D9A441',
    }),
    course({
      id: 'e-sanskrit-day',
      slug: 'sanskrit-day-open-satsang',
      kind: 'event',
      title: 'Sanskrit Day Open Satsang',
      titleSa: 'संस्कृत-दिवसः',
      type: 'live',
      level: 'beginner',
      goals: ['speak', 'chanting'],
      tags: ['free', 'community'],
      summary: 'A free community evening of chanting, short talks and a live Q&A with our teachers.',
      description: 'Everyone is welcome. Registration is free; the joining link unlocks once your seat is confirmed.',
      outcomes: ['Meet the community', 'Chant together', 'Ask anything about learning Sanskrit'],
      syllabus: [{ id: 'm1', title: 'Agenda', items: ['Group chanting', 'Three short talks', 'Open Q&A'] }],
      teacherIds: ['t-meera', 't-vinay', 't-ananya'],
      startsAt: at(33, 18, 0),
      durationMinutes: 90,
      sessionsCount: 1,
      weeklyHours: 1.5,
      scheduleText: 'One evening · 6:00–7:30 pm IST',
      priceInr: 0,
      seatLimit: 300,
      accent: '#6FDDEB',
    }),
  ];
}

export function seedSecrets(courses: Course[]): CourseSecrets[] {
  return courses.map((c) => ({
    courseId: c.id,
    meetingLink: c.type === 'recorded' ? '' : `https://meet.google.com/demo-${c.slug.slice(0, 8)}`,
    meetingNotes: c.type === 'recorded' ? '' : 'Join 5 minutes early. Keep your camera on if you can — we speak a lot!',
    recordings:
      c.type === 'live' && c.kind === 'event'
        ? []
        : c.syllabus.flatMap((m, mi) =>
            m.items.map((item, ii) => ({
              id: `${m.id}-${ii}`,
              title: `${mi + 1}.${ii + 1} ${item}`,
              url: `https://www.youtube.com/watch?v=demo-${c.id}-${m.id}-${ii}`,
              durationMinutes: 12 + ((mi + ii) % 4) * 6,
            })),
          ),
    resources: [{ title: 'Course workbook (PDF on Drive)', url: 'https://drive.google.com/' }],
  }));
}

export const seedTestimonials: Testimonial[] = [
  { id: 'tm-1', name: 'Priya S.', role: 'Software engineer, Bengaluru', quote: 'I spoke my first full Sanskrit sentence in week one. The live sessions feel like a warm family.', order: 1 },
  { id: 'tm-2', name: 'Arjun M.', role: 'Student, Pune', quote: 'The grammar finally clicked. Reading the Gītā in the original is a different experience altogether.', order: 2 },
  { id: 'tm-3', name: 'Lakshmi R.', role: 'Parent, Chennai', quote: 'My 9-year-old looks forward to Saturday story circles more than cartoons!', order: 3 },
  { id: 'tm-4', name: 'Daniel K.', role: 'Yoga teacher, Berlin', quote: 'Clear, patient and rigorous. My chanting has never been more precise.', order: 4 },
];

export const seedSubhashitas: Subhashita[] = [
  {
    id: 's-1',
    deva: 'विद्या ददाति विनयं विनयाद् याति पात्रताम्।',
    iast: 'vidyā dadāti vinayaṃ vinayād yāti pātratām',
    meaning: 'Knowledge gives humility; from humility one attains worthiness.',
    source: 'Hitopadeśa',
    active: true,
    order: 1,
  },
  {
    id: 's-2',
    deva: 'उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः।',
    iast: 'udyamena hi sidhyanti kāryāṇi na manorathaiḥ',
    meaning: 'Tasks are accomplished through effort, not by mere wishing.',
    source: 'Hitopadeśa',
    active: true,
    order: 2,
  },
  {
    id: 's-3',
    deva: 'न हि ज्ञानेन सदृशं पवित्रमिह विद्यते।',
    iast: 'na hi jñānena sadṛśaṃ pavitram iha vidyate',
    meaning: 'Truly, nothing in this world purifies like knowledge.',
    source: 'Bhagavad Gītā 4.38',
    active: true,
    order: 3,
  },
  {
    id: 's-4',
    deva: 'उदारचरितानां तु वसुधैव कुटुम्बकम्।',
    iast: 'udāracaritānāṃ tu vasudhaiva kuṭumbakam',
    meaning: 'For the large-hearted, the whole world is one family.',
    source: 'Mahā Upaniṣad 6.71',
    active: true,
    order: 4,
  },
  {
    id: 's-5',
    deva: 'आ नो भद्राः क्रतवो यन्तु विश्वतः।',
    iast: 'ā no bhadrāḥ kratavo yantu viśvataḥ',
    meaning: 'Let noble thoughts come to us from every side.',
    source: 'Ṛgveda 1.89.1',
    active: true,
    order: 5,
  },
  {
    id: 's-6',
    deva: 'सत्यमेव जयते।',
    iast: 'satyam eva jayate',
    meaning: 'Truth alone triumphs.',
    source: 'Muṇḍaka Upaniṣad 3.1.6',
    active: true,
    order: 6,
  },
];

export const seedCoupons: Coupon[] = [
  { code: 'NAMASTE10', kind: 'percent', value: 10, courseIds: [], validUntil: null, active: true, description: '10% off any course' },
  { code: 'GITA500', kind: 'flat', value: 500, courseIds: ['c-gita-grammar'], validUntil: null, active: true, description: '₹500 off the Gītā course' },
];

export const seedStats: SiteStats = { learners: 1240, courses: 18, countries: 14, hoursTaught: 3600 };

export const seedSettings: SiteSettings = {
  whatsappChannelUrl: '',
  announcement: '',
};
