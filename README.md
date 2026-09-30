# Sadhana Sanskritam · साधना संस्कृतम्

*Where knowledge blooms into wisdom.*

An immersive Sanskrit-learning platform: a signature lotus intro, a scroll-driven story, a course explorer,
a "Find Your Path" quiz, UPI payments with admin verification, notifications by email + WhatsApp, a custom-app
brief builder, a learner dashboard and a full admin console.

It runs **entirely in the cloud and entirely on free tiers**: GitHub (repo, Actions, Pages) + Firebase **Spark**
(Authentication + Firestore). You never need to install anything or run a command on your computer.

**Live site (after step 1 below):** `https://smkv2026-ui.github.io/Sadhana-SanskritaM/`

> Until Firebase is connected the site runs in **demo mode**: every feature works, and data is saved only in your
> own browser. In the sign-in dialog choose **Learner** or **Admin** to try both sides (e.g. register and pay as a
> learner in one tab, approve the payment as admin in another tab, and watch the learner's page celebrate live).

---

## What's inside

| Area | Highlights |
|---|---|
| Brand | Hand-built inline-SVG logo (open book → stem → white lotus → diamond) from one geometry source; full-colour, dark, mono, icon, horizontal lockup and OpenGraph image generated from it (`public/brand/`). |
| Intro | ~5.5 s, once per session: book opens, stem draws, petals unfold inner→outer, diamond glints, logo travels to the header. Skip button / Esc / tap; reduced-motion = 1 s static fade; petals lean toward the pointer or device tilt; optional chime (off by default). |
| Experience | Scroll story with a pinned lotus that blooms per chapter · Find Your Path quiz with shareable results · explorer with live filters, tilt cards, hover previews, live seat meters · Devanāgarī / IAST / meaning toggle · Subhāṣita of the day · ⌘/Ctrl-K command palette · rule-based assistant · dawn/dusk theme with a lotus-shaped transition · cursor glow, petal particles, magnetic buttons, animated counters. |
| Learning | Registration stepper → UPI QR + "Open my UPI app" + copy buttons + 24 h hold countdown → UTR → live status timeline → lotus celebration on approval · My Learning with recordings, progress, resume, streak, next-session countdown, add-to-calendar, receipts. |
| Admin (`/admin`) | Live verification queue with bank-CSV matching · registrations table + CSV export + reminders · course/event CRUD incl. locked links & recordings · notify subscribers (throttled email batches with quota meter + BCC fallback, WhatsApp tap-to-send queue) · subscribers + send log · custom-request kanban with private notes · content (subhāṣitas, teachers, testimonials, coupons, counters, WhatsApp channel) · audit log & inbox · "Load demo data". |
| Security | Deny-by-default Firestore rules, **33 emulator tests in CI**: secrets unreadable before approval, no self-approval, exact price enforcement, seat limits, unique UTRs, no reading others' data, no listing subscribers. |

Architecture, data model and CI design: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) ·
Read/write budget per page: [`docs/FIRESTORE_BUDGET.md`](docs/FIRESTORE_BUDGET.md)

---

## Setup — all in the browser

### 1. Put the site online (≈ 3 minutes, no Firebase yet)

1. **Create `main`.** On GitHub open the repository → **branch dropdown** (top-left of the file list) → type `main` →
   **Create branch: main from `claude/youthful-babbage-d1tw9a`**.
   *(If `main` already exists, open a pull request from the `claude/…` branch into `main` and merge it.)*
2. **Settings → General → Default branch** → switch to `main` → **Update**.
3. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
4. **Actions** tab → **Deploy** → **Run workflow** (branch `main`). It runs lint, type-check, unit tests, the
   Security Rules tests and the build, then publishes. When it turns green, the link appears on the run page and
   under **Settings → Pages**.

From now on, every push to `main` redeploys automatically; any failing check blocks the deploy.

### 2. Create the Firebase project (free Spark plan, no card)

1. Open <https://console.firebase.google.com> → **Add project** → name it (e.g. `sadhana-sanskritam`) →
   Google Analytics is optional → **Create**. Stay on the **Spark** plan — never click "Upgrade".
2. On the project home click the **Web `</>`** icon → nickname `web` → **Register app** (skip Hosting) →
   keep this page open: you'll copy the `firebaseConfig` values in step 5.

### 3. Turn on sign-in

1. **Build → Authentication → Get started.**
2. **Sign-in method → Google → Enable** → choose a support email → **Save**.
3. **Add new provider → Email/Password → Enable "Email link (passwordless sign-in)"** → **Save**
   (you may leave plain email/password off).
4. **Settings → Authorized domains → Add domain** → `smkv2026-ui.github.io` (and your custom domain later).

### 4. Create Firestore and its rules

1. **Build → Firestore Database → Create database** → **Production mode** → location **asia-south1 (Mumbai)** → **Create**.
2. **Rules** tab → replace everything with the contents of [`firestore.rules`](firestore.rules) → **Publish**.
3. Indexes — choose one:
   * **Automatic (recommended):** add the `FIREBASE_SERVICE_ACCOUNT` secret (step 8); every deploy then publishes
     `firestore.rules` and `firestore.indexes.json` for you.
   * **Manual:** **Indexes → Composite → Create index** for each entry in [`firestore.indexes.json`](firestore.indexes.json)
     (collection, fields and order are listed there). Alternatively open the admin pages once: Firestore shows an
     error in the browser console with a one-click "create index" link.

### 5. Tell GitHub your settings (repository variables)

**Settings → Secrets and variables → Actions → Variables tab → New repository variable** for each:

| Variable | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | from the `firebaseConfig` (public by design — the rules protect data) |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `sadhana-sanskritam.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | e.g. `sadhana-sanskritam` |
| `VITE_FIREBASE_STORAGE_BUCKET` | from the config (not used, kept for completeness) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | from the config |
| `VITE_FIREBASE_APP_ID` | from the config |
| `VITE_UPI_VPA` | your UPI ID — ideally a **merchant/business** VPA, e.g. `sadhana@okaxis` |
| `VITE_UPI_PAYEE_NAME` | the name registered on that UPI ID |
| `VITE_CONTACT_EMAIL` | public contact email |
| `VITE_CONTACT_WHATSAPP` | optional, `+91…` |
| `VITE_WHATSAPP_CHANNEL_URL` | optional WhatsApp Channel/Community link (also editable in Admin → Categories & content → Site) |
| `VITE_ADMIN_ALERT_EMAIL` | where new custom-app requests are announced |

Then **Actions → Deploy → Run workflow**. The demo banner disappears: you're live on Firebase.

### 6. Make yourself admin

1. Open the live site → **Sign in** (Google or email link) → go to `/admin`. It shows **your UID** with a copy button.
2. Firebase console → **Firestore → Start collection** → Collection ID `admins` → Document ID = **your UID** →
   add a field `role` (string) `owner` → **Save**.
3. Reload `/admin`. On **Overview** press **Load demo data** to seed courses, teachers, subhāṣitas and coupons —
   then edit or replace them in **Courses & events** and **Categories & content** (paths, sub-categories and options are all editable there).

### 7. Email with EmailJS (free: 200 emails / month)

1. Sign up at <https://www.emailjs.com> → **Email Services → Add new service** → e.g. Gmail → connect.
2. **Email Templates → Create new template**:
   * **To email:** `{{to_email}}` · **From name:** Sadhana Sanskritam · **Reply to:** `{{reply_to}}`
   * **Subject:** `{{subject}}`
   * **Content:** switch to the code/HTML editor and put exactly `{{{message_html}}}` (three braces).
3. **Account → General** → copy the **Public key**. **Account → Security** → add your site domain to the allowed
   origins (limits abuse of the public key).
4. Add repository variables `VITE_EMAILJS_PUBLIC_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`
   (and optionally `VITE_EMAILJS_MONTHLY_QUOTA` if your plan differs) → run **Deploy**.

Without these, emails use the mock Console provider (the admin overview warns you) — nothing breaks.

### 8. (Optional) Automatic rules deploys + PR previews

1. Firebase console → **Project settings → Service accounts → Generate new private key** → a JSON file downloads.
2. <https://console.cloud.google.com/iam-admin/iam> (same project) → edit the `firebase-adminsdk-…` account →
   **Add role**: *Firebase Rules Admin*, *Cloud Datastore Index Admin*, and for previews *Firebase Hosting Admin*.
3. GitHub → **Settings → Secrets and variables → Actions → Secrets → New repository secret** →
   name `FIREBASE_SERVICE_ACCOUNT`, value = the whole JSON file content.
4. For PR previews also open Firebase console → **Build → Hosting → Get started** once (no CLI needed; just click through).

Now each deploy also publishes rules + indexes, and every pull request gets a 7-day preview URL comment.

### 9. Personalised address: `https://sadhana-sanskritam.web.app` (free)

Once step 8's `FIREBASE_SERVICE_ACCOUNT` secret exists, every deploy also publishes the site to Firebase Hosting.

1. Firebase console → **Build → Hosting → Get started** → click through (no CLI needed).
2. If your project ID is exactly `sadhana-sanskritam`, you're done: the site is `https://sadhana-sanskritam.web.app`.
   Otherwise (project IDs are global, so it may have a suffix): **Hosting → Add another site** → site ID
   `sadhana-sanskritam` (or the closest free name) → then add a repository variable `FIREBASE_HOSTING_SITE` with that name,
   and add `sadhana-sanskritam.web.app` under **Authentication → Settings → Authorized domains**.
3. **Actions → Deploy → Run workflow.** The run summary prints the live address.

GitHub Pages keeps deploying as a backup copy.

### 10. (Optional) Custom domain

**Settings → Pages → Custom domain**, then add repository variables `BASE_PATH` = `/` and `SITE_URL` =
`https://your-domain/`, and add the domain to Firebase **Authorized domains**.

---

## Day-to-day

* **Publish a course:** Admin → Courses & events → New → fill tabs (Access tab = private meeting link/recordings) →
  Status *Published* → Save → **Notify subscribers**.
* **Verify payments:** Admin → Verify payments (updates live). Optionally **Import bank CSV** to get match suggestions
  by UTR / amount / reference. Approve → **Send confirmations** (email + WhatsApp queue).
* **Reminders:** Admin → Registrations → pick the course → **24h reminders** / **1h reminders**.
* **Expired holds:** Admin → Overview → **Release expired holds** (holds are also evaluated on read, so learners see
  "expired" immediately and can renew).
* **Replay the intro:** footer → *Replay intro*, or add `?nointro` to a URL to skip it.

## Upgrading later (no rewrites)

| Want | Do |
|---|---|
| Card/UPI gateway | Implement `RazorpayProvider.createPayment` in `src/providers/payment.ts` (needs a small server for orders/webhooks), set `VITE_PAYMENT_PROVIDER=razorpay`, `VITE_FLAG_ONLINE_PAYMENTS=true`. |
| Server email (SES/Resend) | Implement `ServerEmailProvider.send` in `src/providers/email.ts`, set `VITE_EMAIL_PROVIDER=server`. |
| WhatsApp Business API | Implement `CloudApiProvider.send` in `src/providers/whatsapp.ts` (server-held token), set `VITE_WHATSAPP_PROVIDER=cloud-api`, `VITE_FLAG_WHATSAPP_CLOUD_API=true`. |
| Signed video URLs | Implement `SignedUrlAccessProvider` in `src/providers/access.ts`, set `VITE_ACCESS_PROVIDER=signed-url`. |
| Automatic hold expiry / emails | On Blaze, a scheduled Cloud Function can call the same logic; the rules already support it. |

## Assumptions & limitations (honest notes)

* **Mission** used: *"to make authentic Sanskrit learning joyful, accessible and rigorous for every seeker."*
  **Tagline** chosen from three proposals — *Where knowledge blooms into wisdom* (others: *Rooted in śāstra,
  rising in light*; *From the page to the lotus*). Change both in `src/brand/logoGeometry.ts` (`BRAND`).
* Teachers and testimonials in the demo data are **illustrative placeholders** — replace them before launch.
  Legal pages are plain-language templates; have them reviewed.
* **Payments are verified by a human.** UPI apps don't notify a static site, so an admin matches the UTR against the
  bank statement. The rules guarantee price, seat and UTR integrity, not that money actually arrived.
* **Email:** EmailJS sends from the browser (200/month free) and its public key is visible by design — restrict
  origins in EmailJS. The "Copy BCC list" button is the fallback when the quota runs out.
* **WhatsApp** is manual tap-to-send via `wa.me` (free); bulk automation needs the paid Cloud API.
* **SEO:** it's a single-page app. The build writes static HTML shells with correct titles, descriptions, OG tags,
  JSON-LD, a sitemap and robots.txt for every public route and every published course (fetched from Firestore at
  build time), so link previews and crawlers see real metadata. Page *body* content still renders with JavaScript,
  and courses published after the last deploy fall back to the SPA (HTTP 404 status on GitHub Pages) until the next
  deploy. Push any commit or re-run **Deploy** after publishing important courses.
* **Seat holds** expire after 24 h on read; the counter is released when an admin presses *Release expired holds*
  (no server jobs on Spark).
* **Subscribers** can't be de-duplicated on sign-up (they're write-only for the public); the admin tools
  de-duplicate by email when sending.
* The Firestore free quota comfortably covers roughly a thousand daily visitors — see the budget doc.
* The OG PNG shows the Sanskrit motto in IAST because the headless SVG renderer used at build time cannot shape
  Devanāgarī correctly; on the website itself Devanāgarī renders natively.

## For developers (optional)

```bash
npm ci
npm run dev                 # demo backend unless .env.local has Firebase values
npm test                    # unit tests
npm run test:rules:emulator # Security Rules tests (needs Java 21)
npm run brand               # regenerate logo variants, icons and OG image from the geometry source
```
