# CLAUDE.md

Guidance for Claude Code sessions in this repo. Start here; [README.md](README.md) has the full tour.

## What this is

A React SPA + Firebase backend for the Good Neighbor Fund — public pitch submissions on one side, a role-gated reviewer portal on the other. The UI is a deliberate two-layer hybrid: a Windows-95 desktop **chrome** (taskbar, dock, window frames) wrapping editorial-modern **content** ("Millennium Bug" — Instrument Serif + Inter + Silkscreen + saturated color blocks on cream paper). The vibe is load-bearing, not decorative.

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

### Chapter-page hydration is anti-flash
[public/assets/js/chapter-hydration.js](public/assets/js/chapter-hydration.js) reads `/chapters/<slug>` and overrides the static fallbacks. Two rules to keep the page from flickering:
1. Every `applyX` / `setStatSlot` helper compares the incoming Firestore value against what's already in the DOM and bails if they match. When you add a new hydrated field, follow the same skip-if-equal pattern.
2. **The hero `<img src>` is not hydrated by JS.** It's the LCP element with `fetchpriority="high"`; reassigning `.src` after the browser commits the fallback triggers a second download and a visible blank frame. The chapter HTML instead hardcodes a stable Firebase Storage URL: `https://firebasestorage.googleapis.com/v0/b/gnf-app-9d7e3.firebasestorage.app/o/chapter-photos%2F<slug>%2Fhero?alt=media`. Admin uploads from the LP portal overwrite the file at that path (see `uploadChapterPhoto` in [LimitedPartnerPortal.jsx](src/components/lp/LimitedPartnerPortal.jsx)) and propagate within ~5 min (Cache-Control max-age). The `<img>` carries an `onerror` fallback to the local `/assets/*.webp` so chapters without an upload don't show a broken icon. `heroImageCaption` is still hydrated by JS (cheap text swap). **The bucket name is hardcoded in five places** — `uploadChapterPhoto`, the four static `public/<slug>.html` files, and [public/assets/js/chapter-hydration.js](public/assets/js/chapter-hydration.js). If [src/firebaseConfig.js](src/firebaseConfig.js) ever changes bucket, all five must change with it or new uploads silently 404 (the `onerror` fallback hides it on the live page; only the LP portal preview shows the broken icon).

### Firestore is the source of truth for access control
All role checks live in [firestore.rules](firestore.rules). Three tiers: `superAdmin`, `chapter_director` (chapter-scoped), `lp` (read-mostly reviewer). Client-side role gates in the portal are UX only — the rules are what actually enforce. If you add a new collection or a new write path, add the rule in the same change.

### Cloud Functions are CommonJS
[functions/](functions/) uses `require`/`module.exports`, not ESM. Target runtime is Node 20. See [functions/CLAUDE.md](functions/CLAUDE.md) for the details.

## Design system — non-negotiable rules

Full guide: [STYLE_GUIDE.md](STYLE_GUIDE.md). The hot list:

### Two layers — pick the right one

The repo has **two parallel design layers** and they are NOT interchangeable. Picking the wrong one ships UI that looks like 2003 instead of the intended editorial-modern feel, and it has happened repeatedly. Be deliberate:

| Layer | When to use | Tokens | Utility classes |
|---|---|---|---|
| **Millennium Bug** (editorial) | **Default for all content inside windows** — pages, cards, forms, modals, dashboards, anything a user reads or fills in | `--mb-*` (magenta, grape, aqua, tangerine, butter, paper, ink, chalk) + `--font-display` / `--font-content` / `--font-pixel` / `--font-numeral` | `.mb-block-*`, `.mb-card`, `.mb-btn` (+ `.mb-btn-ink` / `-chalk` / `-aqua` / `-butter` / `-tangerine` / `-grape` / `-ghost`), `.mb-eyebrow`, `.mb-h1`–`.mb-h4`, `.mb-lede` / `.mb-body` / `.mb-micro`, `.mb-tag`, `.mb-badge`, `.mb-grid` (+ `-2`/`-3`/`-4`), `.mb-form-shell` (auto-themes nested form controls), `.mb-numeral` |
| **Win95** (OS chrome) | **Only for OS chrome** — taskbar, dock, window titlebars, close buttons, the desktop background. New content components should not use `.win95-*` classes. | `--gnf-*`, `--pink-*`, `--blue-*`, `--shadow-outset` / `-inset`, `--bevel-*` | `.win95-window`, `.win95-titlebar`, `.win95-close-btn`, `.win95-taskbar`, etc. |

If you're building inside a window and you find yourself reaching for `.win95-btn`, `--shadow-outset`, or pastel `--gnf-pink-*` tokens, **stop and switch to `.mb-*`**.

Defined in [src/styles/theme-tokens.css](src/styles/theme-tokens.css). Read the top 200 lines before building any new content component — the palette, type scale, spacing scale, and utility class catalog all live there.

### Universal rules

- **Never hardcode hex.** Use an `--mb-*` token (or `--gnf-*` if you're literally building OS chrome). If a shade doesn't exist, add it to the right tokens file first.
- **Never use `border-radius` on `.win95-*` markup.** [src/styles/win95-base.css](src/styles/win95-base.css) kills it globally with `!important`. The `.mb-*` layer has its own opt-in radii (`--r-sm` / `-md` / `-lg`) — use those if you need softening.
- **Never use soft drop shadows in content.** MB depth = ink border + `--shadow-hard` / `-sm` / `-lg` (hard offset). Soft shadows (`--shadow-soft-*`) are reserved for floating UI like modals.
- **Forms: wrap in `.mb-form-shell`.** It auto-themes inputs, selects, textareas, labels, and small text. Don't restyle individual fields.
- **Buttons: `.mb-btn` and variants.** Don't write a custom button. Hard offset, ink border, `mb-btn-arrow` for CTA arrows.
- **Type: stay on the MB scale.** `--tc-eyebrow` / `-micro` / `-body` / `-lede` / `-h4` / `-h3` / `-h2` / `-h1`. Pixel font only for eyebrows + tags + tiny labels.
- **Badge naming:** **timeless, trophy-style** (e.g., "First Steps", "Trailblazer"). No tech / pop-culture references.
- **The 2002 clock year is intentional.** Part of the Y2K aesthetic; don't "fix" it.

### CSS load order — sensitive

[src/index.js](src/index.js) imports CSS in this exact order and it must stay that way:
1. `win95-tokens.css` — Win95 chrome tokens
2. `win95-base.css` — Win95 chrome resets + utilities
3. `theme-tokens.css` — Millennium Bug content layer (palette, typography, utility classes — overrides chrome where it has to)
4. `App.css`

Static pages under `public/` load copies at `public/assets/css/`. After editing tokens or base, re-copy:
```bash
cp src/styles/win95-tokens.css src/styles/win95-base.css public/assets/css/
```
This pair of files (src ↔ public) drifting out of sync is a recurring footgun.

## Conventions

### Components
- One component per file, `.jsx` extension, PascalCase filename matches export.
- Top-level page components are named `Standalone*` and live at `src/`.
- Feature components group under `src/components/<feature>/` (see `grant-management/`, `limited-partner/`).
- UI primitives live in `src/components/ui/`. Icons in `src/components/icons/`.
- Refactor files that exceed ~400–500 lines.

### State & data
- Firestore reads via `firebase/firestore` directly — no Redux, no React Query. Keep it that way unless a feature genuinely warrants it.
- [src/firebaseConfig.js](src/firebaseConfig.js) holds the client SDK bootstrap. The API key there is public — security is in Firestore rules.

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
