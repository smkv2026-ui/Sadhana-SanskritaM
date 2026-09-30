# Course recordings — in-app, time-limited, no download button

Recordings are added per course in **Admin → Courses → Edit → Access**. Paste a link, the provider
is detected automatically and previewed in the same player learners use.

## Where to host the videos (free options first)

| Option | Cost | How | Notes |
| --- | --- | --- | --- |
| **YouTube — Unlisted** | Free, unlimited | Upload → Visibility: *Unlisted* → paste the link | Best quality/bandwidth. Embedded via `youtube-nocookie.com`; the "Watch on YouTube" escape is blocked by the sandboxed iframe. The link itself is only stored in `courseSecrets`, which only approved learners can read. |
| **Google Drive** | Free (15 GB) | Share → *Anyone with the link* → paste | Played via Drive's `/preview` player; pop-out and download button are covered/blocked in-app. Large files can be slow to start. |
| **Vimeo** | Free tier / paid | Paste the (unlisted) link incl. hash | Enable *Hide from Vimeo* and domain-restricted embeds on paid plans. |
| **Direct .mp4 / .webm** | Depends on host | Any static host / CDN URL | Played with a native `<video>` with `controlsList="nodownload"`, PiP and casting disabled. |
| **Bunny Stream** (upgrade) | ~US$ 1/month for small libraries | Paste the iframe/play URL (token params are kept) | Real signed, expiring URLs + domain lock + DRM options — the strongest protection if you ever need it. |

> Firebase Cloud Storage is intentionally **not** used — it requires the paid Blaze plan.

## How the time limit works

* Each course has **Access days after approval** (Admin → Courses → Schedule & price). `0` = unlimited.
* When an admin approves a registration, `accessUntil = approval time + accessDays`.
* **Firestore Security Rules** refuse to return `courseSecrets` (meeting link + recordings) once
  `request.time >= accessUntil` — enforced server-side, covered by the rules tests in CI.
* Each recording can also have its own **Available until** date (e.g. a live-class replay for 7 days).
* Admins can extend a learner by 30 days from **Admin → Registrations → +30 days**.
* Learners see a "N days left" badge in My Learning and a friendly "access ended" state afterwards.

## What "no download" means — honestly

The player hides every download control, disables right-click, picture-in-picture and casting,
blocks links out to YouTube/Drive, and overlays a drifting watermark with the learner's email
(kept visible in full-screen). This stops casual downloading and sharing. No website can stop
screen recording or a determined user with developer tools; the watermark is the deterrent.
For DRM-level protection use Bunny Stream (above) with token authentication.
