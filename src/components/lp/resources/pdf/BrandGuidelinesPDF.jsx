import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import {
  pdfStyles,
  PDF_COLORS,
  CoverPage,
  PageFooter,
  Bullet,
  Callout,
  Paragraph,
} from './PDFTheme';

const DOC_TITLE = 'GNF Brand Guidelines';

const COLORS = [
  { name: 'Magenta', role: 'Primary / CTA', hex: '#e93a7d', light: false },
  { name: 'Magenta Deep', role: 'Hover', hex: '#c21d61', light: false },
  { name: 'Magenta Soft', role: 'Tint', hex: '#fde0ec', light: true },
  { name: 'Grape', role: 'Accent', hex: '#6b4fbb', light: false },
  { name: 'Grape Deep', role: 'Accent bold', hex: '#4a2f95', light: false },
  { name: 'Aqua', role: 'Accent', hex: '#2bb3c4', light: false },
  { name: 'Aqua Deep', role: 'Accent bold', hex: '#157b8a', light: false },
  { name: 'Tangerine', role: 'Warmth', hex: '#f28c3b', light: false },
  { name: 'Butter', role: 'Warmth soft', hex: '#f0c94b', light: false },
  { name: 'Paper', role: 'Cream ground', hex: '#faf4e3', light: true },
  { name: 'Ink', role: 'Borders / text', hex: '#141419', light: false },
  { name: 'Chalk', role: 'Text on dark', hex: '#ffffff', light: true },
];

function Swatch({ color }) {
  return (
    <View style={pdfStyles.swatch} wrap={false}>
      <View style={[pdfStyles.swatchChip, { backgroundColor: color.hex }]} />
      <View style={pdfStyles.swatchMeta}>
        <Text style={pdfStyles.swatchName}>{color.name}</Text>
        <Text style={pdfStyles.swatchHex}>{color.hex.toUpperCase()}</Text>
      </View>
    </View>
  );
}

export default function BrandGuidelinesPDF() {
  return (
    <Document title={DOC_TITLE} author="Good Neighbor Fund">
      <CoverPage
        eyebrow="Identity · 01"
        number="01"
        title="Brand Guidelines"
        summary="Logos, colors, typography, and voice. The playbook for keeping every neighborhood looking and sounding like GNF."
        accent="magenta"
      />

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.lede}>
          GNF isn't polished — it's proud. The brand is loud on belief, quiet
          on ego, and always a little off-kilter on purpose. This guide keeps
          every neighborhood looking and sounding like us, no matter who's at
          the keyboard.
        </Text>

        <Text style={pdfStyles.h1First}>Our Vibe</Text>
        <Paragraph>
          We're inspired by the early internet — that golden window when
          making something didn't require permission or polish. Our design
          language leans into it: saturated color, hard borders, pixel
          labels, editorial serifs, monospace numerals. Y2K warmth without
          the kitsch.
        </Paragraph>
        <Paragraph>
          Keep it bright, keep it human, and don't be afraid of a little
          chaos. If a layout feels too corporate, it is.
        </Paragraph>

        <Text style={pdfStyles.h1}>Logos</Text>
        <Paragraph>
          Three wordmark treatments — color, black, and white — available as
          SVG and PNG. Reach for the SVG whenever the surface supports it;
          fall back to PNG for tools that don't (older slide decks, some
          email clients, social uploads).
        </Paragraph>
        <Text style={pdfStyles.h3}>Files — download from the portal</Text>
        <Bullet>logo-primary.svg / .png — color wordmark</Bullet>
        <Bullet>logo-primary-black.svg / .png — monochrome black wordmark</Bullet>
        <Bullet>logo-primary-white.svg / .png — monochrome white wordmark (dark backgrounds)</Bullet>
        <Bullet>og-card.png — default social / link-preview image (1200×630)</Bullet>

        <Callout label="Clearspace">
          Give the logo at least the height of the "G" as breathing room on
          all sides. Don't crowd it with other logos, text, or stickers.
          Minimum display size: 80px wide for the wordmark.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Color</Text>
        <Paragraph>
          The palette is bold on purpose. Magenta is our primary — reserve it
          for hero moments and the main CTA. Grape, Aqua, Tangerine, and
          Butter are accent colors; use one per composition so nothing
          fights. Paper is our warm ground; Ink is every border and body copy
          on light fills.
        </Paragraph>

        <View style={pdfStyles.swatchGrid}>
          {COLORS.map((c) => (
            <Swatch key={c.name} color={c} />
          ))}
        </View>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Typography</Text>
        <Paragraph>
          Four type families, each with a clear job. Don't swap them. Don't
          mix more than two on a single surface.
        </Paragraph>

        <View style={pdfStyles.typeSample} wrap={false}>
          <Text style={pdfStyles.typeSampleLabel}>Display · Instrument Serif</Text>
          <Text style={{ fontFamily: 'Instrument Serif', fontSize: 30, lineHeight: 1 }}>
            Belief Capital, in the Neighborhood.
          </Text>
          <Text style={pdfStyles.typeSampleMeta}>
            Headlines, doc titles, editorial moments. Weight 400 always.
          </Text>
        </View>

        <View style={pdfStyles.typeSample} wrap={false}>
          <Text style={pdfStyles.typeSampleLabel}>Body · Inter</Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 11, lineHeight: 1.6 }}>
            $1,000 micro-grants for early-stage founders, funded by a local
            neighborhood of Limited Partners. No bureaucracy, no strings —
            just belief, delivered quarterly.
          </Text>
          <Text style={pdfStyles.typeSampleMeta}>
            Paragraphs, UI, navigation. Weights 400 / 600 / 700.
          </Text>
        </View>

        <View style={pdfStyles.typeSample} wrap={false}>
          <Text style={pdfStyles.typeSampleLabel}>Numerals · JetBrains Mono</Text>
          <Text style={{ fontFamily: 'JetBrains Mono', fontSize: 16 }}>
            $1,000 · Q2 2026 · 48 grantees · 12 chapters
          </Text>
          <Text style={pdfStyles.typeSampleMeta}>
            Money, dates, stats, IDs. Never body copy.
          </Text>
        </View>

        <View style={pdfStyles.typeSample} wrap={false}>
          <Text style={pdfStyles.typeSampleLabel}>Micro · Pixelify Sans</Text>
          <Text style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
            NEIGHBORHOOD · IDENTITY · 01
          </Text>
          <Text style={pdfStyles.typeSampleMeta}>
            Pixelify Sans in production; Inter-bold shown here as PDF
            fallback. Eyebrows, labels, tags only. 11–14px.
          </Text>
        </View>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>

      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.h1First}>Voice &amp; Tone</Text>
        <Paragraph>
          We write like we'd talk to a founder at a coffee shop. Warm,
          specific, a little weird.
        </Paragraph>

        <Text style={pdfStyles.h3}>Principles</Text>
        <Bullet><Text style={pdfStyles.bold}>Belief, not gatekeeping.</Text> We fund courage, not polish. Write like it.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Specific over generic.</Text> "48 founders in 2025" beats "supporting entrepreneurs."</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Short sentences. Proper names.</Text> Say the business. Say the city.</Bullet>
        <Bullet><Text style={pdfStyles.bold}>Celebrate, don't puff.</Text> No "thought leader" or "changemaker." Just say what they did.</Bullet>

        <Text style={pdfStyles.h1}>Do's and Don'ts</Text>
        <View style={pdfStyles.doDontRow} wrap={false}>
          <View style={pdfStyles.doDontCol}>
            <Text style={[pdfStyles.doDontHead, { color: PDF_COLORS.aquaDeep }]}>Do</Text>
            <Text style={{ fontSize: 10, marginBottom: 4 }}>• Use hard 2px ink borders on cards and CTAs.</Text>
            <Text style={{ fontSize: 10, marginBottom: 4 }}>• Keep offset hard shadows — no blur.</Text>
            <Text style={{ fontSize: 10, marginBottom: 4 }}>• Name the grantee and city in every post.</Text>
            <Text style={{ fontSize: 10, marginBottom: 4 }}>• Use pixel font for tiny labels only.</Text>
            <Text style={{ fontSize: 10 }}>• Let Paper be the default ground.</Text>
          </View>
          <View style={pdfStyles.doDontCol}>
            <Text style={[pdfStyles.doDontHead, { color: PDF_COLORS.magentaDeep }]}>Don't</Text>
            <Text style={{ fontSize: 10, marginBottom: 4 }}>• Don't add gradients, drop shadows, or glows.</Text>
            <Text style={{ fontSize: 10, marginBottom: 4 }}>• Don't mix more than two accent colors.</Text>
            <Text style={{ fontSize: 10, marginBottom: 4 }}>• Don't set body copy in pixel or serif.</Text>
            <Text style={{ fontSize: 10, marginBottom: 4 }}>• Don't rotate, warp, or recolor the logo.</Text>
            <Text style={{ fontSize: 10 }}>• Don't say "portfolio company."</Text>
          </View>
        </View>

        <Text style={pdfStyles.h1}>Social Accounts</Text>
        <Paragraph>
          Each chapter is encouraged to run local socials — typically on
          Instagram. Handle convention is @gnf.[city] (e.g. @gnf.austin).
        </Paragraph>
        <Bullet>Bio: "$1,000 micro-grants for [City]'s early-stage founders. Funded by neighbors."</Bullet>
        <Bullet>Link in bio: your chapter landing page on neighborhoods.space</Bullet>
        <Bullet>Post the grantee announcement within 7 days of the vote.</Bullet>
        <Bullet>Tag @goodneighbor.fund on every grantee post so we can reshare.</Bullet>

        <Callout label="Need something?">
          Missing a file or a template? Ping us in the #brand channel in
          Slack or email brand@goodneighbor.fund. We'll add it to the
          library.
        </Callout>

        <PageFooter docTitle={DOC_TITLE} />
      </Page>
    </Document>
  );
}
