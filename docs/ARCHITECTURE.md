# Architecture & plan

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Hosting | **GitHub Pages** (Firebase Hosting optional for PR previews) | Works on the very first push with zero secrets, no credit card, generous bandwidth; the site is fully static. Firebase Hosting is kept for PR preview channels once a service account exists. |
| Router | React Router 7 `createBrowserRouter` + static per-route HTML shells + `404.html` fallback | Clean URLs (`/courses/x`, not `/#/courses/x`), and crawlers get correct `<title>`/OG tags without JS. |
| Backend | Firebase **Spark**: Auth (Google + email link) + Firestore under Security Rules | Free, no server. No Cloud Functions, Storage, SMS auth. |
| Demo backend | In-browser implementation of the same `Backend` interface | The live URL works before Firebase is configured; the whole product (incl. admin) is testable in a browser. |
| Fonts | Tiro Devanagari Sanskrit (display) + Mukta (body), self-hosted via Fontsource | Both designed for Devanagari; unicode-range subsets; no third-party font requests. |

## Layers

```
src/
  brand/         logoGeometry.ts (single source) · Logo.tsx · IntroAnimation.tsx · brand.css
  config/env.ts  typed config + feature flags from VITE_* variables
  providers/     PaymentProvider · EmailProvider · WhatsAppProvider · AccessProvider (+ email templates)
  data/          types.ts · backend.ts (interface) · firebase/firestoreBackend.ts · demo/demoBackend.ts · queries.ts (TanStack Query)
  features/      experience · courses · finder · registration · notifications · custom-requests · learning · admin · auth
  shared/        ui (shadcn-style) · components · layout · hooks
  pages/         home, about, contact, legal, auth
```

Swapping an implementation = one adapter + one variable:

| Interface | Now | Later (stub present) | Switch |
|---|---|---|---|
| `PaymentProvider` | `ManualUpiProvider` | `RazorpayProvider` | `VITE_PAYMENT_PROVIDER=razorpay` + `VITE_FLAG_ONLINE_PAYMENTS=true` |
| `EmailProvider` | `EmailJsProvider` (falls back to `ConsoleProvider`) | `ServerEmailProvider` | `VITE_EMAIL_PROVIDER=server` |
| `WhatsAppProvider` | `WaMeLinkProvider` | `CloudApiProvider` | `VITE_WHATSAPP_PROVIDER=cloud-api` + flag |
| `AccessProvider` | `FirestoreRulesAccessProvider` | `SignedUrlAccessProvider` | `VITE_ACCESS_PROVIDER=signed-url` |
| `Backend` | `FirestoreBackend` | `DemoBackend` (or a future REST backend) | automatic / `VITE_BACKEND=demo` |

## Firestore data model

| Collection | Doc id | Who reads | Who writes |
|---|---|---|---|
| `admins` | uid | that user (to learn they're admin) | console only |
| `courses` | courseId | public (published) / admins | admins |
| `courseStats` | courseId | public | learner +1 in the same batch as their registration; admins |
| `courseSecrets` | courseId | admins + learner with APPROVED registration | admins |
| `registrations` | `{uid}_{courseId}` | owner, admins | owner creates (price/status enforced), owner submits UTR / renews hold; only admins approve/reject |
| `utrIndex` | the 12-digit UTR | owner of that entry, admins | created atomically with the UTR submission → uniqueness |
| `progress` | `{uid}_{courseId}` | owner | owner |
| `users` | uid | owner | owner (streak) |
| `subscribers` | 160-bit token | admins only | public create (validated, consent recorded); token-link updates of consent fields |
| `customRequests` (+`/notes`) | auto | owner, admins | owner creates; admins update; notes admin-only |
| `teachers`, `testimonials`, `subhashitas`, `site/{stats,settings}` | – | public | admins |
| `coupons` | CODE | get by code (no listing) | admins |
| `notificationLog`, `auditLog` | auto | admins | admins (append-only) |
| `contactMessages` | auto | admins | public create (validated) |

Denormalised on purpose: registrations copy course title/slug/type/start so My Learning and the admin
tables never need joins; counters live in `courseStats` so the catalogue shows seats with one read per course.

## Rules outline (see `firestore.rules`)

* Deny by default.
* Registration create requires: own uid in id and data; published course; exact price (early-bird window, coupon
  validity and discount recomputed in rules); `PENDING_PAYMENT` (or `PENDING_VERIFICATION` for free seats);
  24 h hold; valid participant; the seat counter incremented by exactly one in the same write, within the limit.
* Learner updates are limited to: UTR submission (12 digits, `utrIndex` created in the same batch, hold not expired),
  renewing a lapsed hold, or restarting an EXPIRED/REJECTED registration. Status changes to APPROVED/REJECTED: admins only.
* `courseSecrets` readable only with an APPROVED registration (via `get()`), so links are unreadable before approval
  even by direct queries.
* Subscribers: no public get/list; ids are secret tokens; updates can only touch consent/preference fields.

## Routes

`/` · `/courses` · `/courses/:slug` · `/courses/:slug/register` · `/events` · `/find-your-path` · `/about` ·
`/custom-apps` · `/custom-apps/track` · `/my-learning` · `/my-learning/receipt/:id` · `/contact` · `/privacy` ·
`/terms` · `/refund-policy` · `/subscribe` (+ `/confirm`, `/preferences`, `/unsubscribe`) · `/sign-in` ·
`/auth/finish` · `/admin/*`

## CI/CD

* **ci.yml** — every branch push & PR: `npm ci` → ESLint → `tsc -b` → Vitest → production build; in parallel,
  Security Rules tests on the Firestore emulator (Java 21 + firebase-tools via npx, emulator binaries cached).
* **deploy.yml** — push to `main`: reuses ci.yml, then builds with repository Variables and publishes to GitHub
  Pages; if `FIREBASE_SERVICE_ACCOUNT` exists, also deploys `firestore.rules` + `firestore.indexes.json`.
* **preview.yml** — PRs get a 7-day Firebase Hosting preview channel when the service account exists.
* **Dependabot** — weekly npm (grouped minor/patch) and Actions updates.

## Milestones (all delivered; site deployable after each)

1. Repo + CI/CD + live page · 2. Design system, Logo, Intro · 3. Public site & scroll story · 4. Auth ·
5. Catalogue & explorer · 6. Find Your Path · 7. Subscriptions · 8. Registration & UPI stepper ·
9. Admin verification & access unlock · 10. Notifications · 11. Custom app builder · 12. My Learning ·
13. Command palette & assistant · 14. Hardening (rules tests, budget, SEO, a11y).
