# CLAUDE.md

Guidance for Claude Code sessions in this repo. Start here; [README.md](README.md) has the full tour.

## What this is

A React SPA + Firebase backend for the Good Neighbor Fund — public pitch submissions on one side, a role-gated reviewer portal on the other. The UI is a deliberate Windows-95-in-pastels desktop environment. The vibe is load-bearing, not decorative.

## Commands

```bash
npm start                          # CRA dev server on :3000
npm run build                      # Production build to ./build
cd functions && npm run start-emulator   # Firebase emulator (functions + firestore)
cd functions && npm run deploy     # Deploy functions only
firebase deploy --only hosting     # Deploy built SPA + static HTML
firebase deploy --only firestore:rules,storage
```

No test runner, no ESLint, no Prettier are configured. If you add one, update this file.

## Architecture you must know before editing

### Routing
Routes are declared in [src/index.js](src/index.js). Every top-level page is its own `Standalone*` component at the root of `src/` — this is intentional (matches the static-HTML-per-chapter pattern). The one exception is `/` which mounts `DesktopEnvironment` from [src/pages/desktop/](src/pages/desktop/).

### Static pages beat the SPA
Chapter landings at `/denver`, `/wny`, `/upstate`, `/capital-region` are **static HTML files** in [public/](public/). Firebase Hosting serves them before falling through to the SPA rewrite. The dynamic `/:chapterSlug` route in [src/index.js](src/index.js) only fires for chapters that *don't* have a hand-built HTML file. If you need to change a chapter page, check for a static HTML file first — editing the React component won't touch it.

### CSS cascade is load-order sensitive
[src/index.js](src/index.js) imports CSS in this exact order and it must stay that way:
1. `win95-tokens.css` — CSS custom properties
2. `win95-base.css` — resets + utility classes (consumes tokens)
3. `theme-tokens.css` — "Millennium Bug" editorial overlay (consumes + overrides)
4. `App.css`

Static pages under `public/` load copies at `public/assets/css/`. After editing tokens or base, re-copy:
```bash
cp src/win95-tokens.css src/win95-base.css public/assets/css/
```
This pair of files (src ↔ public) drifting out of sync is a recurring footgun.

### Firestore is the source of truth for access control
All role checks live in [firestore.rules](firestore.rules). Three tiers: `superAdmin`, `chapter_director` (chapter-scoped), `lp` (read-mostly reviewer). Client-side role gates in the portal are UX only — the rules are what actually enforce. If you add a new collection or a new write path, add the rule in the same change.

### Cloud Functions are CommonJS
[functions/](functions/) uses `require`/`module.exports`, not ESM. Target runtime is Node 20. See [functions/CLAUDE.md](functions/CLAUDE.md) for the details.

## Design system — non-negotiable rules

Full guide: [STYLE_GUIDE.md](STYLE_GUIDE.md). The hot list:

- **Never hardcode hex.** Use a token from [src/win95-tokens.css](src/win95-tokens.css). If the shade doesn't exist, add it there first.
- **Never use `border-radius`.** [src/win95-base.css](src/win95-base.css) kills it globally with `!important`. Maps have a carve-out.
- **Never use soft drop shadows.** Depth = beveled borders + hard 2px offset shadows. Use `--shadow-outset` / `--shadow-inset`.
- **Stick to the type scale.** `--text-xs` through `--text-5xl`. No in-between values.
- **Utility classes before custom CSS.** Everything new is `.win95-*`. No new `.retro-*` classes.
- **The 2002 clock year is intentional.** Part of the Y2K aesthetic; don't "fix" it.

## Conventions

### Components
- One component per file, `.jsx` extension, PascalCase filename matches export.
- Top-level page components are named `Standalone*` and live at `src/`.
- Feature components group under `src/components/<feature>/` (see `grant-management/`, `limited-partner/`).
- UI primitives live in `src/components/ui/`. Icons in `src/components/icons/`.
- Refactor files that exceed ~400–500 lines.

### State & data
- Firestore reads via `firebase/firestore` directly — no Redux, no React Query. Keep it that way unless a feature genuinely warrants it.
- `firebaseConfig.js` at the repo root holds the client SDK bootstrap. The API key there is public — security is in Firestore rules.

### Forms
- Submission helpers live in [src/helpers/formSubmission.js](src/helpers/formSubmission.js). Reuse before inventing.
- Pitch/LP form → Firestore doc → Cloud Function triggers Slack + Sheets export.

### Badges
- Definitions: [src/data/badgeDefinitions.js](src/data/badgeDefinitions.js).
- Names must be **timeless, trophy-style** (e.g., "First Steps", "Trailblazer"). No tech/pop-culture references.

## How to work in this repo

- **Read before writing.** Grep for existing patterns before adding a new one. If three components already do something a certain way, do it the same way.
- **Don't introduce a new dependency without asking.** The stack is deliberately boring (React + Firebase + Leaflet). Adding a state library, form library, or CSS framework needs a conversation first.
- **Don't add fallbacks, feature flags, or backwards-compat shims.** This is a single-deploy production app. Change the code.
- **Scope changes tightly.** Fixing a bug in `StandalonePitchPage` shouldn't also rewrite `StandaloneLPApplication`.
- **When something looks wrong, investigate before deleting.** Stray files or branches may be in-progress work.
- **Kill old dev servers before starting a new one.** Port collisions have burned hours.

## Commit hygiene

- Small, focused commits. One logical change per commit.
- Commit messages describe *why*, not *what* — the diff shows the what.
- Follow the existing short imperative style (see `git log`).
- No "Generated with Claude Code" / co-author trailers on commits in this repo.

## When you're unsure

- Design decisions → [STYLE_GUIDE.md](STYLE_GUIDE.md).
- Data model / access rules → [firestore.rules](firestore.rules).
- Cloud Function behavior → [functions/CLAUDE.md](functions/CLAUDE.md) + [functions/index.js](functions/index.js).
- Original product spec → [Claude Showcase Requirements.md](Claude%20Showcase%20Requirements.md) (historical; parts have drifted).
- Everything else → ask.
