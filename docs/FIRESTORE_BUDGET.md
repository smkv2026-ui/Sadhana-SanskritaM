# Firestore read/write budget (Spark free quota)

Free daily quota: **50,000 reads · 20,000 writes · 20,000 deletes**, 1 GiB stored, 10 GiB/month egress.

The app keeps reads low with: TanStack Query caching (10–60 min stale times, no refetch on focus), Firestore's
persistent IndexedDB cache, counter documents instead of counting registrations, `getCountFromServer`
aggregations for admin numbers (1 read per 1,000 docs counted), paginated admin tables (25–50 per page), and only
**three** real-time listeners: the seat counter on a course page, the learner's own registration while paying, and
the admin verification queue.

N = number of published courses (≈ 10).

| Page / action | Reads | Writes | Notes |
|---|---|---|---|
| Home (first visit) | N courses + N stats + 3 teachers + 4 testimonials + ~6 subhāṣitas + 2 site docs ≈ **35** | 0 | Cached for the session; revisit ≈ 0 |
| Courses / Events | N + N (shared cache with home) ≈ **0–20** | 0 | |
| Course detail | 1 query (slug) + 1 listener on its counter + 1 per seat change | 0 | |
| Find Your Path | 0 extra (uses cached courses) | 0 | Rule-based, in the browser |
| Sign-in + My Learning | 1 admin check + ≤ 50 own registrations + 1 profile + per active course: 1 secrets + 1 progress | 0–1 (streak, max once/day) | |
| Mark lesson complete | 1 | 1 | Optimistic UI |
| Register (reserve seat) | 4 (course, counter, registration, coupon) in a transaction | 2 | |
| Submit UTR | 2 | 2 (registration + `utrIndex`) | |
| Live status while waiting | 1 + 1 per change | 0 | Listener closes when the page closes |
| Subscribe | 0 | 1 | Confirm / preferences / unsubscribe: 1 write each |
| Custom request | 0 | 1 | Tracker: ≤ 50 reads |
| Admin overview | 5 count aggregations (≈ 5 reads) + N stats | 0 | |
| Admin verification queue | ≤ 50 + 1 per change | 2–3 per decision (registration, counter, audit) | |
| Admin registrations table | 25 per page | – | CSV export uses what's loaded |
| Notify subscribers | ≤ 1,000 (matching subscribers) | 1 log per email sent | EmailJS free = 200/month anyway |

**Rough ceiling:** 1,000 visitors/day × ~40 reads ≈ 40,000 reads — inside the free tier. Returning visitors cost
far less thanks to the caches. If traffic grows past this, the Blaze plan's pay-as-you-go is ~$0.06 per 100k reads;
nothing in the code has to change.
