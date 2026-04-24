# GNF NeighborhoodOS

The public-facing site and reviewer portal for the **Good Neighbor Fund** — a micro-grant program for early-stage founders in underrepresented neighborhoods. The UI is a browser-based, Windows-95-in-pastels desktop environment. Founders submit pitches from the "desktop," LPs (Limited Partners) review and vote from the portal, and chapter directors manage everything.

Production: [goodneighbor.fund](https://www.goodneighbor.fund)

## Stack

- **Frontend:** React 18, React Router v6, Create React App (`react-scripts` 5)
- **Backend:** Firebase — Firestore, Auth, Cloud Functions (Node 20), Hosting, Storage
- **Maps:** Leaflet + React-Leaflet
- **Admin UI:** `react-admin` on top of `ra-data-firebase-client`
- **Integrations:** Anthropic (pitch summaries), Resend (email), Slack (submission notifications), Stripe (LP payments), Google Sheets (pitch archive)

## Repository Layout

```
.
├── src/                         # React SPA
│   ├── index.js                 # Router entry
│   ├── win95-tokens.css         # Design tokens (load first)
│   ├── win95-base.css           # Resets + utility classes (load second)
│   ├── theme-tokens.css         # "Millennium Bug" editorial overlay
│   ├── pages/desktop/           # The <DesktopEnvironment /> shell
│   ├── components/              # Feature components + icons + UI primitives
│   │   ├── Dock/                # Taskbar dock
│   │   ├── grant-management/    # Grant application form
│   │   ├── limited-partner/     # LP portal (review, voting)
│   │   ├── icons/               # Icon components
│   │   └── ui/                  # WindowFrame, AppIcon, Taskbar, retro primitives
│   ├── data/                    # Static configs (badges, chapters, field guide)
│   ├── helpers/                 # Form submission, labels
│   └── services/                # googleSheets, statsTracking
├── functions/                   # Firebase Cloud Functions (CommonJS, Node 20)
│   ├── index.js                 # Function exports
│   ├── aiSummary.js             # Anthropic pitch-summary generator
│   └── google-sheets-export.js  # Sheets archive writer
├── public/                      # Hosted assets + static chapter pages
│   ├── index.html               # SPA mount
│   ├── denver.html              # Static chapter landings — served by Firebase
│   ├── wny.html                 # Hosting before the SPA fallback kicks in
│   ├── upstate.html
│   ├── capital-region.html
│   └── assets/css/              # Copies of win95 tokens/base for static pages
├── scripts/                     # Operational scripts (seed data, badges, OG images)
├── firestore.rules              # Role-based access control
├── storage.rules
├── firebase.json
├── STYLE_GUIDE.md               # Windows 95 design system — read before touching CSS
└── Claude Showcase Requirements.md  # Original product spec (historical)
```

## Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | `DesktopEnvironment` | The desktop shell — dock, windows, buddy messenger |
| `/pitch` | `StandalonePitchPage` | Founder pitch submission form |
| `/pitch/:pitchId` | `PitchDetailPage` | Public pitch detail view |
| `/lp-application` | `StandaloneLPApplication` | Become-an-LP application |
| `/portal` | `StandaloneLPPortal` | Reviewer portal (auth-gated) |
| `/fieldguide` | `MobileFieldGuide` | Mobile resource guide |
| `/terms`, `/privacy` | | Legal pages |
| `/denver`, `/wny`, `/upstate`, `/capital-region` | | Static HTML — wins over SPA fallback |
| `/:chapterSlug` | `ChapterPage` | Dynamic chapter page for slugs without a static file |

## Data Model

Firestore collections (see [firestore.rules](firestore.rules) for access rules):

| Collection | Purpose |
|---|---|
| `users` | Portal users. Roles: `lp`, `chapter_director`, `superAdmin` |
| `chapters` | Chapter metadata (WNY, Denver, Upstate NY, Capital Region, …) |
| `pitches` | Founder pitch submissions |
| `lpApplications` | LP funding applications |
| `limitedPartners` | Active LPs |
| `reviews` | LP reviews on pitches |
| `votes` | LP votes |
| `invitations` | Invite links for portal signup |
| `resources` | Curated resource database |
| `bulletinPosts`, `bulletinMessages`, `guestMessages` | Community messaging |
| `newsletter` | Newsletter opt-ins |

**Role tiers:**
- `superAdmin` — global write access, migrations, mutating other superAdmins
- `chapter_director` — chapter-scoped user/chapter management
- `lp` — read-mostly reviewer; writes reviews, votes, bulletin messages

## Cloud Functions

Exports in [functions/index.js](functions/index.js):

| Function | Trigger | Purpose |
|---|---|---|
| `sendPitchToSlack` | `pitches` onCreate | Post pitch to chapter Slack channel |
| `sendLPApplicationToSlack` | `lpApplications` onCreate | Post LP app to Slack |
| `generateAboutFromApplication` | onCall | Anthropic-generated founder summary |
| `backfillPitchSummaries` | onCall (admin) | Batch-generate summaries |
| `inviteUser` | onCall | Send portal signup invite |
| `sendSignInLink` | onCall | Resend magic-link auth email |
| `stripeLPWebhook` | HTTPS | Handle Stripe events for LP payments |
| `helloWorld` | HTTPS | Health check |

See [functions/SETUP_GUIDE.md](functions/SETUP_GUIDE.md) for deployment and secret configuration.

## Getting Started

```bash
# Install deps (root + functions)
npm install
(cd functions && npm install)

# Run the React app (Create React App dev server on :3000)
npm start

# Build for production
npm run build

# Run the Firebase emulator (functions + firestore)
cd functions && npm run start-emulator
```

### Environment

Firebase client config is hardcoded in [firebaseConfig.js](firebaseConfig.js) (public-safe by design; security lives in Firestore rules).

Cloud Function secrets are set via `firebase functions:config:set` — see [functions/SETUP_GUIDE.md](functions/SETUP_GUIDE.md). Required namespaces:

- `slack.bot_token`, `slack.wny_webhook`, `slack.denver_webhook`
- `resend.api_key`
- `stripe.*`
- `googlesheets.spreadsheet_id`, `googlesheets.sheet_name`

Root `.env` holds dev-only values (see [.env.example](.env.example)).

## Design System

**Read [STYLE_GUIDE.md](STYLE_GUIDE.md) before writing any CSS.** The short version:

- Two cascading layers: `win95-tokens.css` (tokens) → `win95-base.css` (resets + utilities). `theme-tokens.css` adds an editorial overlay for content inside windows.
- Never hardcode hex, never use `border-radius`, never use soft drop shadows. Depth comes from beveled borders.
- Everything new uses the `.win95-*` namespace. No new `.retro-*` classes.
- Static pages under `public/` load copies at `public/assets/css/`. Keep them identical to `src/` — re-copy after every change:
  ```bash
  cp src/win95-tokens.css src/win95-base.css public/assets/css/
  ```

## Scripts

One-off operational scripts in [scripts/](scripts/):

| Script | Runtime | Purpose |
|---|---|---|
| `addDummyPitchWny.js`, `addDummyPitchDenver.js` | Node (ESM) | Seed test pitches |
| `assignAnniversaryBadges.js` | Node (ESM) | Batch award anniversary badges |
| `resetBadges.js` | Node (ESM) | Clear all badges (admin) |
| `build-og.py` | Python + Pillow | Regenerate `public/assets/og-*.png` OpenGraph images |

## Deployment

Hosting and functions deploy via the Firebase CLI. Hosting serves `build/` (produced by `npm run build`); static chapter HTML files under `public/` are copied in and take precedence over the SPA catch-all.

```bash
npm run build
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules,storage
```

## Additional Docs

- [STYLE_GUIDE.md](STYLE_GUIDE.md) — design system
- [CLAUDE.md](CLAUDE.md) — guidance for Claude Code sessions
- [functions/CLAUDE.md](functions/CLAUDE.md) — Cloud Functions specifics
- [functions/SETUP_GUIDE.md](functions/SETUP_GUIDE.md) — deployment setup
- [Claude Showcase Requirements.md](Claude%20Showcase%20Requirements.md) — original product spec (historical reference)
