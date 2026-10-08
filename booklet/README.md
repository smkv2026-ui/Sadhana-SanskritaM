# Garbha Gyan: a 40-week pregnancy activity booklet

*A 40-Week Journey of Mind, Body & Spirit*. This is an 88-page, print-ready A4 workbook for an expecting mother, her partner and family.
It combines current prenatal science with India's Garbha Saṃskāra heritage, and is honest about which is which.

| Output | What it is |
|---|---|
| `dist/booklet-A4.pdf` | Full colour, A4, for home or office printing (no bleed) |
| `dist/booklet-A4-bleed.pdf` | Full colour, A4 trim plus 3 mm bleed (216 × 303 mm sheet; TrimBox and BleedBox set) for a print shop |
| `dist/booklet-lowink.pdf` | Low-ink edition: white ground, outline art, same layout and page numbers |
| `dist/preview/page-001.png … page-088.png` | A preview image of every page |
| `QA-report.md` | Automated checks, the "needs verification" register and recommended reviewers |
| `research/` | `research-notes.md` (findings with citations) and `evidence-table.csv` (activity → badge → source → confidence) |
| `PLAN.md` | Page-by-page outline, content schema, design tokens and tooling |

> ⚠️ **Draft for expert review.** Before you distribute it, have it reviewed by an obstetrician, an Ayurvedic physician,
> a Sanskrit scholar and native speakers of each lullaby language. Every item flagged "needs verification" is listed in
> `QA-report.md`.

## What's inside (88 pages)

| Section | Contents |
|---|---|
| Front | Cover · dedication · title · contents · how to use · medical and inclusivity note · choose your own path · when to call your doctor |
| Journey | Science of the three trimesters · "what the sages observed" side by side |
| Foundations | What Garbha Saṃskāra is · Tradition and evidence · Pañca Kośa · Cakras · Mudrās · Śrī Yantra (history and colouring) · Kolam · Sound and mantra · 6 mantras · 9 lullabies in 9 languages · 4 stories · Nourish · traditional month-wise care |
| Weeks 1–40 | 3 trimester dividers (full-page mandalas) · 37 weekly pages (weeks 1–4 combined), each with MIND, BODY, HEART, SPIRIT and NOURISH activities, evidence badges, time chips, safety lines and a weekly check-in · 3 colouring and reflection pages |
| Life & family | Morning and evening routines · sound-bath playlist · baby-talk prompts · partner and grandparent tasks · voice-message log · family tree · celebration planner |
| Trackers & keepsakes | Baby's movement pattern log · appointments and questions · hospital bag · birth preferences · first weeks with baby · names · bump photos and ultrasound · the day we met |
| Back | Glossary · references · tradition vs evidence table · index of activities by badge and time |

## Rebuild

Requirements: Node 18+ and Playwright with Chromium. Chromium is used because it shapes every Indic script with HarfBuzz.

```bash
cd booklet
npm install                      # installs pdf-lib
npx playwright install chromium  # only if Chromium is not already available
node src/build.mjs --all         # three PDFs + PNG previews + dist/qa-results.json (~30 s)
node src/qa.mjs                  # writes QA-report.md and dist/qa/indic-check.png
```

Other build options:

```bash
node src/build.mjs                         # colour A4 only
node src/build.mjs --theme lowink          # low-ink only
node src/build.mjs --bleed                 # print-shop file with 3 mm bleed
node src/build.mjs --pages 1-8,51 --png    # render selected pages (fast proofing)
node src/build.mjs --spiritual secular     # or: light | full
```

Fonts are committed as static TrueType instances so they embed as CID TrueType rather than Type 3, which print shops
prefer. To regenerate them from the official OFL variable fonts:
`pip install fonttools && python3 scripts/make-static-fonts.py`.

## Customise

Edit `config.json`:

| Key | Effect |
|---|---|
| `mother_name`, `partner_name`, `baby_nickname`, `due_date` | Printed on the cover, the dedication page and the family tree |
| `title`, `titleDeva`, `subtitle` | Book title (e.g. use your own title in place of "Garbha Gyan") |
| `theme` | `colour` or `lowink` |
| `spiritual` | `full` (everything) · `light` (keeps art, mudrās and peace mantras; cakra, yantra and initiation-sensitive practices become secular twins) · `secular` (every tradition-based activity is replaced by its secular twin) |
| `languages` | Reserved for choosing which lullaby languages to print |

**Content is data.** Nothing on the weekly pages is hand-written:

- `content/weeks.json`: 37 weekly entries (theme, size, milestone, honest note, the five activity IDs with this week's focus, partner task, calm minute)
- `content/activities.json`: 82 activities and secular twins (badge, minutes, steps, safety lines, sources)
- `content/mantras.json`: mantras, lullabies and wisdom lines (native script, IAST, meaning, source, secular twin)
- `content/nutrition.json`: foods of the week with recipes and do / don't notes
- `content/stories.json`, `content/glossary.json`, `content/references.json`
- `i18n/en.json`: every heading, label and paragraph of the static pages

**To translate**, copy `i18n/en.json` to a new locale file (e.g. `hi.json`), translate the values, and set
`"locale": "hi"` in `config.json`. Content strings in `content/*.json` can be translated the same way.

**Art** is generated in `src/art.mjs`:
- Mandalas use true n-fold and mirror symmetry, verified in code.
- The Śrī Yantra is solved numerically: 22 incidence conditions, residual about 10⁻¹⁶.
- Kolam uses mirror curves, each verified to be one continuous line.
- Lotus, paisley, moon phases, fruit-size icons, mudrā hands and cakra glyphs are all drawn in code.

## Printing

| | Recommendation |
|---|---|
| Inner pages | 100–130 gsm uncoated or matt paper (takes pencil and pen; mandalas colour well) |
| Cover | 250–300 gsm, matt or soft-touch lamination |
| Duplex | Print both sides, **flip on long edge**. Page 1 is a right-hand page. |
| Binding | **Wire-O / spiral** is recommended: it lies flat for writing, and 88 pages at 100–130 gsm is at or beyond the comfortable limit for saddle-stitch. Saddle-stitch is possible (88 is divisible by 4), but ask the printer about creep compensation. Perfect binding also works. |
| Home print | Use `booklet-A4.pdf` (or `booklet-lowink.pdf` to save ink) at "Actual size / 100%". The design keeps a 14 mm outer margin and an 18 mm gutter, so most printers will not clip anything. |
| Print shop | Send `booklet-A4-bleed.pdf`. It is RGB, so ask whether they convert to CMYK, and request a hard proof. |

Known limits:
- The A5 edition is not built yet. The weekly layout is designed in two halves, so it can be split for A5.
- Chromium rounds the no-bleed page to 594.96 × 841.92 pt, about 0.1 mm under A4. This has no visible effect.

## Garbha Khel: the activity book (`mini/`)

This is a 24-page A5 book of things you do directly on paper. Each page carries a spiritual significance line and a music suggestion. Answers are on pages 22–23.

**Colouring**
- Śrī Yantra (a real render)
- Colour-by-number lotus
- Lotus mandala

**Puzzles**
- Chakravyūha circular maze
- Bee-to-lotus maze
- Sacred-symbol sudoku (6×6) and Navagraha sudoku (9×9), each with a unique solution
- Virtue word search
- Sacred crossword (15 words)
- Brain teasers, including the Kubera yantra magic square
- Mantra fill-in, unscramble and meaning match

**Drawing and tracing**
- Dot-to-dot ॐ, traced from the real Noto Devanāgarī glyph
- Tracing sacred words
- Complete the rangoli (symmetry)
- Kolam loop
- Continue the pattern
- Flower of Life with a coin or bangle

**Observation and matching**
- Spot 7 differences
- Match the vāhana

```bash
node mini/build.mjs   # → mini/dist/garbha-khel-A5.pdf, garbha-khel-A4-booklet.pdf, preview/
```

Puzzles are generated with fixed seeds in `mini/puzzles.mjs`, so every build is identical.

To print the booklet, print `garbha-khel-A4-booklet.pdf` double-sided on A4 (flip on the short edge), then fold and staple.

Images come from:
- Microsoft Fluent Emoji 3D (MIT)
- the `sri-yantra` package (MIT)
