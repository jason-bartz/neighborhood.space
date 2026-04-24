import React, { useState } from 'react';

// Palette mirrored from src/theme-tokens.css. If you change values there,
// update this list too — it's the single on-brand source LPs will see.
const COLORS = [
  { name: 'Magenta', role: 'Primary / CTA', hex: '#e93a7d', var: '--mb-magenta', light: false },
  { name: 'Magenta Deep', role: 'Hover / emphasis', hex: '#c21d61', var: '--mb-magenta-deep', light: false },
  { name: 'Magenta Soft', role: 'Tint / background', hex: '#fde0ec', var: '--mb-magenta-soft', light: true },
  { name: 'Grape', role: 'Accent', hex: '#6b4fbb', var: '--mb-grape', light: false },
  { name: 'Grape Deep', role: 'Accent — bold', hex: '#4a2f95', var: '--mb-grape-deep', light: false },
  { name: 'Aqua', role: 'Accent', hex: '#2bb3c4', var: '--mb-aqua', light: false },
  { name: 'Aqua Deep', role: 'Accent — bold', hex: '#157b8a', var: '--mb-aqua-deep', light: false },
  { name: 'Tangerine', role: 'Warmth', hex: '#f28c3b', var: '--mb-tangerine', light: false },
  { name: 'Butter', role: 'Warmth — soft', hex: '#f0c94b', var: '--mb-butter', light: false },
  { name: 'Paper', role: 'Warm cream ground', hex: '#faf4e3', var: '--mb-paper', light: true },
  { name: 'Ink', role: 'Text + hard borders', hex: '#141419', var: '--mb-ink', light: false },
  { name: 'Chalk', role: 'Text on dark fills', hex: '#ffffff', var: '--mb-chalk', light: true },
];

const LOGOS = [
  { name: 'Wordmark — Color', base: 'logo-primary', formats: ['svg', 'png'], variant: 'paper' },
  { name: 'Wordmark — Black', base: 'logo-primary-black', formats: ['svg', 'png'], variant: 'paper' },
  { name: 'Wordmark — White', base: 'logo-primary-white', formats: ['svg', 'png'], variant: 'dark' },
];

function ColorSwatch({ color }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(color.hex).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <button type="button" className="bg-swatch" onClick={handleCopy} title={`Copy ${color.hex}`}>
      <div
        className="bg-swatch__chip"
        style={{
          background: color.hex,
          color: color.light ? '#141419' : '#fff',
        }}
      >
        {copied ? 'Copied!' : color.role}
      </div>
      <div className="bg-swatch__info">
        <span className="bg-swatch__name">{color.name}</span>
        <span className="bg-swatch__hex">{color.hex.toUpperCase()}</span>
      </div>
    </button>
  );
}

function Logo({ logo }) {
  const [errored, setErrored] = useState(false);
  const previewFormat = logo.formats.includes('svg') ? 'svg' : logo.formats[0];
  const previewSrc = `/assets/brand/${logo.base}.${previewFormat}`;
  const variantClass =
    logo.variant === 'dark'
      ? 'bg-logo__preview--dark'
      : 'bg-logo__preview--paper';

  return (
    <div className="bg-logo">
      <div className={`bg-logo__preview ${errored ? 'bg-logo__preview--placeholder' : variantClass}`}>
        {errored ? (
          <span>Upload {logo.base}</span>
        ) : (
          <img
            src={previewSrc}
            alt={logo.name}
            onError={() => setErrored(true)}
          />
        )}
      </div>
      <div className="bg-logo__meta">
        <span className="bg-logo__name">{logo.name}</span>
        {errored ? (
          <span className="bg-swatch__hex">pending</span>
        ) : (
          <span className="bg-logo__downloads">
            {logo.formats.map((fmt) => (
              <a
                key={fmt}
                className="bg-logo__download"
                href={`/assets/brand/${logo.base}.${fmt}`}
                download
              >
                {fmt.toUpperCase()}
              </a>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

export default function BrandGuidelines() {
  return (
    <>
      <p className="resource-doc__lede" style={{
        fontFamily: 'var(--font-display)',
        fontSize: '22px',
        lineHeight: 1.4,
        color: 'var(--mb-ink)',
        marginTop: 0,
        marginBottom: 32,
      }}>
        GNF isn't polished — it's proud. The brand is loud on belief, quiet
        on ego, and always a little off-kilter on purpose. This guide keeps
        every neighborhood looking and sounding like us, no matter who's at
        the keyboard.
      </p>

      <h2>Our Vibe</h2>
      <p>
        We're inspired by the early internet — that golden window when making
        something didn't require permission or polish. Our design language
        leans into it: saturated color, hard borders, pixel labels, editorial
        serifs, monospace numerals. Y2K warmth without the kitsch.
      </p>
      <p>
        Keep it bright, keep it human, and don't be afraid of a little chaos.
        If a layout feels too corporate, it is.
      </p>

      <h2>Logos</h2>
      <p>
        Three wordmark treatments — color, black, and white — available as
        SVG and PNG. Reach for the SVG whenever the surface supports it;
        fall back to PNG for tools that don't (older slide decks, some email
        clients, social uploads).
      </p>

      <div className="bg-logo-grid">
        {LOGOS.map((logo) => (
          <Logo key={logo.base} logo={logo} />
        ))}
      </div>

      <h3>Social card</h3>
      <p>
        Our default Open Graph / link-preview image (1200×630). Use it when
        sharing GNF links or as a fallback social image for chapter posts
        that don't have a bespoke card.
      </p>

      <div className="bg-logo-grid bg-logo-grid--wide">
        <div className="bg-logo">
          <div className="bg-logo__preview bg-logo__preview--social">
            <img src="/assets/brand/og-card.png" alt="GNF social card" />
          </div>
          <div className="bg-logo__meta">
            <span className="bg-logo__name">Social Card — 1200×630</span>
            <span className="bg-logo__downloads">
              <a className="bg-logo__download" href="/assets/brand/og-card.png" download>
                PNG
              </a>
            </span>
          </div>
        </div>
      </div>

      <div className="resource-callout">
        <p className="resource-callout__label">Clearspace</p>
        <p style={{ margin: 0 }}>
          Give the logo at least the height of the "G" as breathing room on
          all sides. Don't crowd it with other logos, text, or stickers.
          Minimum display size: 80px wide for the wordmark.
        </p>
      </div>

      <h2>Color</h2>
      <p>
        The palette is bold on purpose. Magenta is our primary — reserve it
        for hero moments and the main CTA. Grape, Aqua, Tangerine, and
        Butter are accent colors; use one per composition so nothing fights.
        Paper is our warm ground; Ink is every border and body copy on
        light fills.
      </p>
      <p style={{ fontSize: 13, color: 'var(--mb-ink-60)', marginTop: -8 }}>
        Tap any swatch to copy its hex.
      </p>

      <div className="bg-swatch-grid">
        {COLORS.map((c) => (
          <ColorSwatch key={c.var} color={c} />
        ))}
      </div>

      <h2>Typography</h2>
      <p>
        Four type families, each with a clear job. Don't swap them. Don't
        mix more than two on a single surface.
      </p>

      <div className="bg-type-sample">
        <p className="bg-type-sample__label">Display · Instrument Serif</p>
        <p
          className="bg-type-sample__display"
          style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 1, margin: 0 }}
        >
          Belief Capital, in the Neighborhood.
        </p>
        <p className="bg-type-sample__meta">Headlines, doc titles, editorial moments. Weight 400 always.</p>
      </div>

      <div className="bg-type-sample">
        <p className="bg-type-sample__label">Body · Inter</p>
        <p
          className="bg-type-sample__display"
          style={{ fontFamily: 'var(--font-content)', fontSize: 16, lineHeight: 1.6, margin: 0 }}
        >
          $1,000 micro-grants for early-stage founders, funded by a local
          neighborhood of Limited Partners. No bureaucracy, no strings — just
          belief, delivered quarterly.
        </p>
        <p className="bg-type-sample__meta">Paragraphs, UI, navigation. Weights 400 / 600 / 700.</p>
      </div>

      <div className="bg-type-sample">
        <p className="bg-type-sample__label">Numerals · JetBrains Mono</p>
        <p
          className="bg-type-sample__display"
          style={{ fontFamily: 'var(--font-numeral)', fontSize: 28, margin: 0, letterSpacing: '-0.02em' }}
        >
          $1,000 · Q2 2026 · 48 grantees · 12 chapters
        </p>
        <p className="bg-type-sample__meta">Money, dates, stats, IDs. Never body copy.</p>
      </div>

      <div className="bg-type-sample">
        <p className="bg-type-sample__label">Micro · Pixelify Sans</p>
        <p
          className="bg-type-sample__display"
          style={{ fontFamily: 'var(--font-pixel)', fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}
        >
          Neighborhood · Identity · 01
        </p>
        <p className="bg-type-sample__meta">Eyebrows, labels, tags, tiny UI stamps. 11–14px only.</p>
      </div>

      <h2>Voice &amp; Tone</h2>
      <p>We write like we'd talk to a founder at a coffee shop. Warm, specific, a little weird.</p>

      <h3>Principles</h3>
      <ul>
        <li><strong>Belief, not gatekeeping.</strong> We fund courage, not polish. Write like it.</li>
        <li><strong>Specific over generic.</strong> "48 founders in 2025" beats "supporting entrepreneurs."</li>
        <li><strong>Short sentences. Proper names.</strong> Say the business. Say the city.</li>
        <li><strong>Celebrate, don't puff.</strong> No "thought leader" or "changemaker." Just say what they did.</li>
      </ul>

      <h2>Do's and Don'ts</h2>
      <div className="bg-do-dont">
        <div className="bg-do-dont__col bg-do-dont__col--do">
          <p className="bg-do-dont__head">Do</p>
          <ul>
            <li>Use hard 2px ink borders on cards and CTAs.</li>
            <li>Keep offset hard shadows (3px, 5px) — no blur.</li>
            <li>Name the grantee and their city in every post.</li>
            <li>Use pixel font for tiny labels only (≤14px).</li>
            <li>Let Paper be the default ground. Magenta is a guest.</li>
          </ul>
        </div>
        <div className="bg-do-dont__col bg-do-dont__col--dont">
          <p className="bg-do-dont__head">Don't</p>
          <ul>
            <li>Don't add gradients, drop shadows, or glows.</li>
            <li>Don't mix more than two accent colors on one surface.</li>
            <li>Don't set body copy in Pixelify Sans or Instrument Serif.</li>
            <li>Don't rotate, warp, or recolor the logo.</li>
            <li>Don't say "portfolio company." Say founder or grantee.</li>
          </ul>
        </div>
      </div>

      <h2>Social Accounts</h2>
      <p>
        Each chapter is encouraged to run local socials — typically on
        Instagram. Handle convention is <code style={{ fontFamily: 'var(--font-numeral)', background: 'var(--mb-paper-deep)', padding: '2px 6px' }}>@gnf.[city]</code> (e.g. <code style={{ fontFamily: 'var(--font-numeral)', background: 'var(--mb-paper-deep)', padding: '2px 6px' }}>@gnf.austin</code>).
      </p>
      <ul>
        <li>Bio line: <em>$1,000 micro-grants for [City]'s early-stage founders. Funded by neighbors.</em></li>
        <li>Link in bio: your chapter landing page on <code style={{ fontFamily: 'var(--font-numeral)' }}>neighborhoods.space</code></li>
        <li>Post the grantee announcement within 7 days of the vote.</li>
        <li>Tag @goodneighbor.fund on every grantee post so we can reshare.</li>
      </ul>

      <div className="resource-callout">
        <p className="resource-callout__label">Need something?</p>
        <p style={{ margin: 0 }}>
          Missing a file or a template? Ping us in the <strong>#brand</strong> channel
          in Slack or email <a href="mailto:brand@goodneighbor.fund">brand@goodneighbor.fund</a>.
          We'll add it here.
        </p>
      </div>
    </>
  );
}
