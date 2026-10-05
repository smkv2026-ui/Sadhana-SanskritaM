# QA report — Garbha Gyan booklet

Generated 2026-10-05 by `src/qa.mjs`. Status: **all automated checks passed**.


## 1. Output files

| File | Pages | ÷4 | Media box | Trim box | Fonts | Type 3 | Fallback fonts | Words | Size |
|---|---|---|---|---|---|---|---|---|---|
| booklet-A4.pdf | 88 | ✓ | 209.9 × 297.0 mm | 209.9 × 297.0 mm | 18 families, all embedded & subset | 0 | 0 | 27160 | 2421 KB |
| booklet-A4-bleed.pdf | 88 | ✓ | 215.9 × 303.0 mm | 210.0 × 297.0 mm | 18 families, all embedded & subset | 0 | 0 | 27161 | 2420 KB |
| booklet-lowink.pdf | 88 | ✓ | 209.9 × 297.0 mm | 209.9 × 297.0 mm | 18 families, all embedded & subset | 0 | 0 | 27160 | 2385 KB |

Embedded font families: CormorantGaramond-Bold, CormorantGaramond-Regular, CormorantGaramond-SemiBold, CormorantGaramondItalic-Italic, NotoSans-Bold, NotoSans-Regular, NotoSans-SemiBold, NotoSansBengali-Regular, NotoSansGujarati-Regular, NotoSansItalic-Italic, NotoSansKannada-Regular, NotoSansMalayalam-Regular, NotoSansSymbols2-Regular, NotoSansTamil-Regular, NotoSansTelugu-Regular, NotoSerifDevanagari-Medium, NotoSerifDevanagari-Regular, NotoSerifDevanagari-SemiBold.
All fonts are static TrueType instances (CID TrueType in the PDF), cut from the OFL variable fonts by `scripts/make-static-fonts.py` so that no glyphs are converted to Type 3. Word counts are compared across editions to catch text dropped by late font loading (the build forces every font face to load before printing).

## 2. Layout checks (every page, every edition)

Run inside Chromium on the final layout: content overflow, elements outside the safe area (≥ 14 mm outer, 18 mm gutter), activity-box overflow, orphaned headings at the foot of a page, smallest rendered text.

| Edition | Pages | Layout issues | Cross-reference errors |
|---|---|---|---|
| colour | 88 | 0 | 0 |
| bleed | 88 | 0 | 0 |
| lowink | 88 | 0 | 0 |

Cross-references (e.g. “see page 20”, “page 78”) are asserted against the page plan at build time. Smallest type: references page (6.8 pt) and fine-print notes (7.4–7.8 pt); body text is 9.6–11 pt (10.5 pt on text pages; activity steps 9.6 pt to fit the weekly layout).

## 3. Indic script rendering

Chromium shapes text with HarfBuzz. All samples below (conjuncts such as क्ष ज्ञ द्ध र्व श्री, Tamil ஸ்ரீ, Telugu/Kannada శ్రీ ಶ್ರೀ, Malayalam ത്തി, Bengali ঙ্ক) were rendered with the bundled fonts and inspected: see `dist/qa/indic-check.png`. No missing glyphs (a coverage scan of every character in the book against the bundled fonts found none missing after replacing ⚕ with a drawn icon).

## 4. Contrast (WCAG 2.1, text on ivory #FBF6EC)

| Token | Ratio |
|---|---|
| ink #2E2A26 (body text) | 13.2:1 |
| maroon #7A1F2B (headings, labels) | 9.5:1 |
| ivory on maroon (week header) | 9.5:1 |
| soft ink (notes) | 6.4:1 |
| gold #B8913A (running heads, 7.5pt caps) | 2.7:1 |
| marigold #E0952B (ornament only) | 2.3:1 |

Body text and headings exceed AAA (7:1). Gold is used only for 7.5 pt running heads and ornaments; marigold is never used for text. The low-ink edition uses maroon/ink on white.

## 5. Generated art

- **Śrī Yantra**: 9 triangles solved numerically (Gauss–Newton) from our own starting proportions, subject to 22 incidence conditions (2 apexes and 2 base corners on the circle, 7 apexes on opposite bases, 3 corners on other sides, 8 triple meeting points). Max residual: 2.8e-16 (unit circle). Planar arrangement: 76 regions, 49 of them triangular — identical to the published TeXample reference construction (used only to read off which lines meet; no coordinates copied). The traditional count of 43 refers to the triangles of the five enclosures around the bindu.
- **Mandalas** (lotus, flower, sun, moon, tree, small): every motif is mirror-symmetric and every ring maps onto itself under rotation by 360°/n. Symmetry errors: 0.
- **Kolam** (mirror-curve method): loops per traced design = 1, 1, 1 (each is one continuous line).

## 6. Factual items flagged “needs verification”

These are marked in the text with [needs verification] or listed in `research/research-notes.md` §9. They must be resolved before distribution.

**References**
- Partanen E et al. Prenatal music exposure induces long-term neural effects. PLoS One 2013;8(10):e78946. [needs verification]
- Moon C, Lagercrantz H, Kuhl PK. Language experienced in utero affects vowel perception after birth. Acta Paediatr 2013;102(2):156–160. [needs verification]
- Persico G et al. Maternal singing of lullabies during pregnancy and after birth: effects on mother–infant bonding and on newborns’ behaviour. Women Birth 2017;30(4):e214–e220. [needs verification]
- Curry NA, Kasser T. Can coloring mandalas reduce anxiety? Art Therapy 2005;22(2):81–85. [needs verification]
- Davis DE et al. Thankful for the little things: a meta-analysis of gratitude interventions. J Couns Psychol 2016;63(1):20–31. [needs verification]
- Field T. Pregnancy and labor massage. Expert Rev Obstet Gynecol 2010;5(2):177–181. [needs verification]
- Pradhan B, Derle SG. Comparison of effect of Gayatri Mantra and poem chanting on digit letter substitution task. Int J Yoga 2012;5(2):150–153. [needs verification]
- Vāgbhaṭa. Aṣṭāṅga Hṛdaya, Śārīrasthāna ch. 1; Aṣṭāṅga Saṅgraha, Śārīrasthāna ch. 3. [needs verification]
- Mārkaṇḍeya Purāṇa ch. 25 (Madālasā); Madālasā Upadeśa (traditional compilation). [needs verification]
- Saundaryalaharī (attributed to Śaṅkara), v. 11 — description of the Śrī Cakra. [verse number needs verification]
- Kulaichev AP. Śrīyantra and its mathematical properties. Indian J Hist Sci 1984;19(3):279–292. [needs verification]
- Siromoney G, Siromoney R, Krithivasan K. Array grammars and kolam. Comput Graph Image Process 1974;3:63–82. [needs verification]

**Texts and lullabies**
- Mantra “Sarve bhavantu sukhinaḥ — for all”: Traditional prayer (often attributed to the Upaniṣads; a close parallel appears in the Garuḍa Purāṇa) [needs verification]
- Mantra “Madālasā’s lullaby”: Mārkaṇḍeya Purāṇa (Madālasā episode); Madālasā Upadeśa tradition [wording needs verification]
- Lullaby (Telugu): Annamācārya (1408–1503), public domain [wording needs verification]
- Lullaby (Kannada): Purandara Dāsa (1484–1564), public domain [wording needs verification]
- Lullaby (Bengali): Traditional chhaṛā, public domain [wording needs verification]
- Lullaby (Sanskrit) native-script spelling and translation — native-speaker check
- Lullaby (Hindi) native-script spelling and translation — native-speaker check
- Lullaby (Marathi) native-script spelling and translation — native-speaker check
- Lullaby (Gujarati) native-script spelling and translation — native-speaker check
- Lullaby (Tamil) native-script spelling and translation — native-speaker check
- Lullaby (Telugu) native-script spelling and translation — native-speaker check
- Lullaby (Kannada) native-script spelling and translation — native-speaker check
- Lullaby (Malayalam) native-script spelling and translation — native-speaker check
- Lullaby (Bengali) native-script spelling and translation — native-speaker check

**Other content to confirm**
- Helpline and emergency numbers (Tele-MANAS 14416, 108, 102) at the time of printing.
- ICMR-NIN 2020 values quoted (≈ +350 kcal/day; protein increments), NFHS-5 anaemia figure (research notes only).
- Indian fish names mapped to FDA/EPA mercury categories (surmai / king mackerel).
- Śītalī cautions; Apāna mudrā “near term” custom (presented as custom only).
- Fruit-size comparisons are approximate averages (crown–rump to week 19, crown–heel from week 20).
- Suśruta Śā. 3/30–31 and 10/3–4, Caraka Śā. 4 and 8/32 verse numbers; Abhimanyu episode status in the BORI Critical Edition.

## 7. Recommended expert review before distribution

1. **Obstetrician–gynaecologist** (FOGSI member): every BODY page, breath practices, warning signs, kick-pattern guidance, nutrition and food safety, newborn danger signs.
2. **Ayurvedic physician (BAMS/MD Ayu)**: the classical summaries (pages 10, 11, 27) and the tradition-vs-evidence tables.
3. **Sanskrit scholar**: Devanāgarī and IAST of all mantras and wisdom lines, translations, verse references.
4. **Native speakers** of Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada, Malayalam and Bengali: lullaby spelling, transliteration and meaning; confirm public-domain status of traditional refrains.
5. **Print shop**: run a preflight on `booklet-A4-bleed.pdf` (RGB output; ask whether they convert to CMYK) and request a hard proof on the chosen paper.
