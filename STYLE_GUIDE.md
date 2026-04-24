# GNF NeighborhoodOS — Style Guide

The GNF/NeighborhoodOS brand is **Windows 95 dressed in pastels**. Every new surface should look at home next to a 1998 Compaq desktop wallpaper. This guide is the single source of truth for that look.

## Architecture

Three files drive the design system, loaded in this exact order:

| # | File | Role |
|---|---|---|
| 1 | [src/win95-tokens.css](src/win95-tokens.css) | Design tokens (colors, typography, spacing, bevels). CSS custom properties only. |
| 2 | [src/win95-base.css](src/win95-base.css) | Resets, global element styles, reusable utility classes. Consumes tokens. |
| 3 | [src/theme-tokens.css](src/theme-tokens.css) | "Millennium Bug" editorial overlay — extra palette + type for *content inside windows*. OS chrome still uses the win95 tokens. |

Page/component CSS loads last. The order is enforced in [src/index.js](src/index.js) — don't reshuffle the imports.

Static HTML pages under `public/` load copies at `public/assets/css/win95-tokens.css` and `public/assets/css/win95-base.css`. **These copies must stay identical to the `src/` originals.** After every change, re-copy:

```bash
cp src/win95-tokens.css src/win95-base.css public/assets/css/
```

Drift between `src/` and `public/assets/css/` is a recurring footgun. If a static page looks off but the SPA looks fine, check this first.

## The Rules

1. **Never hardcode hex.** Use a token variable. If you need a shade that doesn't exist, add it to `win95-tokens.css` first.
2. **Never use `border-radius`.** `win95-base.css` kills it globally with `!important`. The only exception is Leaflet maps, which already have a carve-out.
3. **Never use soft drop shadows** (`0 4px 15px rgba(0,0,0,0.1)` and similar). Depth comes from **beveled borders** + `var(--window-shadow)` (a 2px solid offset). Use `var(--shadow-outset)` / `var(--shadow-inset)` for inset bevels.
4. **Stay on the type scale.** Pick a `--text-*` size. 12 different font-sizes across a page is a code smell.
5. **Prefer utility classes over new one-off CSS.** If a page needs something new, ask whether three other pages need it too — if yes, add a utility to `win95-base.css`.

## Color Palette

Five pastel ramps, three shades each. Every color should come from one of these.

| Ramp | Light | Mid | Dark |
|---|---|---|---|
| **Pink** (primary) | `--pink-light` `#ffeaf5` | `--pink-mid` `#ffd6ec` | `--pink-dark` `#d48fc7` |
| **Blue** (secondary) | `--blue-light` `#e8f0ff` | `--blue-mid` `#d0eaff` | `--blue-dark` `#7aa7d9` |
| **Yellow** (notices) | `--yellow-light` `#fffde7` | `--yellow-mid` `#ffe6b3` | `--yellow-dark` `#d4b96a` |
| **Green** (success) | `--green-light` `#e8f7ee` | `--green-mid` `#b3e6cc` | `--green-dark` `#5ba87d` |
| **Purple** (LP/alt CTA) | `--purple-light` `#f0e4ff` | `--purple-mid` `#e8c8ff` | `--purple-dark` `#9d6dbc` |

**How to pick a shade:** `light` for section backgrounds; `mid` for buttons, chips, filled accents; `dark` for borders, titlebar headers, large stat numbers.

**Neutrals:** `--gnf-text` (#2d2d2d), `--gnf-text-secondary` (#555), `--gnf-text-muted` (#888), `--gnf-bg` (#fff), `--gnf-bg-gray` (#f0f0f0), `--gnf-bg-silver` (#e0e0e0).

**Status (warn/error — off-palette):** `--warn-bg`, `--warn-text`, `--error-bg`, `--error-text`. Use only for user-facing validation messages; they're deliberately outside the pastel ramp so they stand out.

## Typography

One body font, one heading font, one decorative font, one mono font — all tokenized.

- `--font-body` — MS Sans Serif / Segoe UI. Body copy, buttons, titlebar, forms.
- `--font-heading` — Arial Black. Headings `h1`–`h4`, hero titles, stat numbers.
- `--font-decorative` — Comic Sans MS / ComicRetro. **Opt-in only**: add `class="font-decorative"`. Don't set it globally.
- `--font-mono` — Courier New. Code, clock readouts, hit counter.

**Type scale (locked):** `--text-xs` 11px • `--text-sm` 12px • `--text-base` 13px • `--text-md` 14px • `--text-lg` 16px • `--text-xl` 18px • `--text-2xl` 20px • `--text-3xl` 24px • `--text-4xl` 28px • `--text-5xl` 36px.

## Spacing

4-px grid. `--space-1` (4px) through `--space-12` (48px). Don't invent in-between values.

## Core Utility Classes

**Window chrome** (for React OS windows): `.win95-window`, `.win95-titlebar`, `.win95-close-btn`.
**Surfaces:** `.win95-panel` (raised), `.win95-inset` (sunken).
**Interactive:** `.win95-btn`, `.win95-btn-primary`, `.win95-tab`.

**Marketing page utilities** (for chapter pages & any future lander):
- `.win95-container` — centered 1200px wrapper with taskbar padding
- `.win95-hero` + `.win95-hero-content` + `.win95-hero-left` + `.win95-hero-right` + `.win95-hero-title` + `.win95-hero-caption`
- `.win95-section` + optional `.win95-section--pink / --blue / --yellow / --green / --purple`
- `.win95-two-col` — equal-flex two-column layout, wraps on mobile
- `.win95-chip-grid` + `.win95-chip` — e.g. county/region tags
- `.win95-stat-grid` + `.win95-stat` + `.win95-stat-num` (+ `--pink/--blue/...` modifier)
- `.win95-cta` (primary pink) / `.win95-cta--alt` (purple for secondary / LP actions)
- `.win95-final-cta` — stripy pink/white construction-tape CTA block
- `.win95-lp-grid` + `.win95-lp-card` + `.win95-lp-role` + `.win95-lp-bio` + `.win95-lp-link`
- `.win95-image-grid` + `.win95-image`
- `.win95-taskbar` + `.win95-taskbar-left` + `.win95-taskbar-icon` + `.win95-taskbar-right`
- `.win95-footer`

**Decorative:** `.win95-stripes`, `.win95-crosshatch`, `.win95-striped-rows`, `.win95-hit-counter`, `.win95-badge-new`, `.win95-rainbow`, `.win95-text-shadow`, `.win95-color-squares`.

## Bevel System

Depth comes from bevels, never from blurred shadows. Two pre-baked styles:

```css
/* Raised (button, panel, window — looks "popped out") */
border: 2px solid;
border-color: var(--bevel-outset);
box-shadow: var(--shadow-outset);

/* Sunken (input, inset content, active button — looks "pressed in") */
border: 2px solid;
border-color: var(--bevel-inset);
box-shadow: var(--shadow-inset);
```

## Links

Classic hyperlink blue (`--link-color` = #0077cc), underlined by default, visited purple, hovered pink-dark. No `transition`. No bare anchor styles that drop the underline.

## What NOT to do

- No `border-radius` (except map tiles).
- No `transition` on hover states except explicit opacity fades.
- No `box-shadow` with `blur > 0` on UI elements (okay on `::after` decorative flourishes).
- No `linear-gradient` backgrounds except the titlebar gradient and construction-stripe pattern.
- No custom `font-family` on a component — use the tokenized fonts.
- No new `.retro-*` classes. Everything new uses the `.win95-*` namespace.

## Adding New Pages

1. Link `win95-tokens.css` + `win95-base.css` (in that order).
2. Wrap page in `.win95-container`.
3. Start the taskbar with `.win95-taskbar` + inner classes.
4. Build sections from the utility classes above.
5. Only write custom CSS if you've already checked that no utility covers it.

## Adding New Tokens

Go to [src/win95-tokens.css](src/win95-tokens.css), add the variable under the right section, copy to `public/assets/css/`. Do not define `--` variables outside this file — except for the `--mb-*` overlay in [src/theme-tokens.css](src/theme-tokens.css), which owns the editorial palette.

## When in Doubt

- Open a page already in the system and match it — don't invent.
- If three other surfaces need the same thing, it's a utility. If only this one needs it, it's local CSS.
- Ship the boring, consistent answer over the clever one-off.
