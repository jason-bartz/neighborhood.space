import React from 'react';
import {
  Font,
  StyleSheet,
  View,
  Text,
  Page,
  Document,
} from '@react-pdf/renderer';

// ---------- Font registration ("Broadcast" type system) -------------------
// react-pdf's fontkit can't parse Google's modern woff2 variable fonts, so
// we pull the legacy static .ttf files (served when requested with an older
// UA). If Google rotates these URLs again, the failing fetch surfaces in
// the toolbar's error banner. Refresh them via the legacy-UA CSS feed.
//   Archivo = heavy UPPERCASE masthead · Spectral = reading serif (body,
//   ledes, names) · Hanken Grotesk = UI labels · JetBrains Mono = numerals.

Font.register({
  family: 'Archivo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTT0zRp8B1uJ0o.ttf', fontWeight: 700 },
    { src: 'https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTTtDRp8B1uJ0o.ttf', fontWeight: 800 },
    { src: 'https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTTnTRp8B1uJ0o.ttf', fontWeight: 900 },
  ],
});

Font.register({
  family: 'Spectral',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/spectral/v15/rnCr-xNNww_2s0amA-M-mH_OSQ.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/spectral/v15/rnCs-xNNww_2s0amA9vKsV3GY_GtWA.ttf', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/spectral/v15/rnCs-xNNww_2s0amA9vmtl3GY_GtWA.ttf', fontWeight: 600 },
  ],
});

Font.register({
  family: 'Hanken Grotesk',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/hankengrotesk/v12/ieVq2YZDLWuGJpnzaiwFXS9tYvBRzyFLlZg_f_Ncs2Za4fpLzXk.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/hankengrotesk/v12/ieVq2YZDLWuGJpnzaiwFXS9tYvBRzyFLlZg_f_NcbWFa4fpLzXk.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/hankengrotesk/v12/ieVq2YZDLWuGJpnzaiwFXS9tYvBRzyFLlZg_f_NcVGFa4fpLzXk.ttf', fontWeight: 700 },
  ],
});

Font.register({
  family: 'JetBrains Mono',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPQ.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8L6tjPQ.ttf', fontWeight: 700 },
  ],
});

// Avoid hyphenation which looks awful in editorial typography
Font.registerHyphenationCallback((word) => [word]);

// ---------- Design tokens (mirror of theme-tokens.css) --------------------
export const PDF_COLORS = {
  ink: '#141419',
  ink60: '#60606a',
  ink15: '#e0e0e4',
  chalk: '#ffffff',
  paper: '#faf4e3',
  paperDeep: '#ede0bd',
  magenta: '#e93a7d',
  magentaDeep: '#c21d61',
  magentaSoft: '#fde0ec',
  grape: '#6b4fbb',
  grapeDeep: '#4a2f95',
  grapeSoft: '#e7dffa',
  aqua: '#2bb3c4',
  aquaDeep: '#157b8a',
  aquaSoft: '#d5f1f4',
  tangerine: '#f28c3b',
  butter: '#f0c94b',
  butterSoft: '#fbf1cc',
};

export const ACCENT_MAP = {
  magenta: { bg: PDF_COLORS.magenta, deep: PDF_COLORS.magentaDeep, text: PDF_COLORS.chalk },
  grape: { bg: PDF_COLORS.grape, deep: PDF_COLORS.grapeDeep, text: PDF_COLORS.chalk },
  aqua: { bg: PDF_COLORS.aqua, deep: PDF_COLORS.aquaDeep, text: PDF_COLORS.chalk },
  tangerine: { bg: PDF_COLORS.tangerine, deep: '#c66915', text: PDF_COLORS.ink },
  butter: { bg: PDF_COLORS.butter, deep: '#c89918', text: PDF_COLORS.ink },
};

export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontFamily: 'Spectral',
    fontSize: 11,
    lineHeight: 1.55,
    color: PDF_COLORS.ink,
  },
  coverPage: {
    padding: 0,
    fontFamily: 'Spectral',
    color: PDF_COLORS.chalk,
  },
  coverBlock: {
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 56,
    flex: 1,
    justifyContent: 'flex-end',
  },
  coverEyebrow: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
    opacity: 0.85,
  },
  coverTitle: {
    fontFamily: 'Archivo',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    fontSize: 64,
    lineHeight: 0.95,
    marginBottom: 16,
  },
  coverSummary: {
    fontFamily: 'Spectral',
    fontSize: 14,
    lineHeight: 1.45,
    maxWidth: 380,
    opacity: 0.95,
  },
  coverNumber: {
    position: 'absolute',
    top: 48,
    right: 56,
    fontFamily: 'JetBrains Mono',
    fontSize: 48,
    fontWeight: 700,
    opacity: 0.3,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 32,
    left: 56,
    right: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  h1: {
    fontFamily: 'Archivo',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: -0.3,
    fontSize: 32,
    lineHeight: 1.1,
    marginTop: 24,
    marginBottom: 14,
    color: PDF_COLORS.ink,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.ink,
    paddingTop: 18,
  },
  h1First: {
    fontFamily: 'Archivo',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: -0.3,
    fontSize: 32,
    lineHeight: 1.1,
    marginBottom: 14,
    color: PDF_COLORS.ink,
  },
  h2: {
    fontFamily: 'Spectral',
    fontWeight: 600,
    fontSize: 15,
    lineHeight: 1.2,
    marginTop: 18,
    marginBottom: 8,
    color: PDF_COLORS.ink,
  },
  h3: {
    fontFamily: 'Hanken Grotesk',
    fontWeight: 700,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
    color: PDF_COLORS.ink60,
  },
  p: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 10,
    color: PDF_COLORS.ink,
  },
  bold: {
    fontFamily: 'Spectral',
    fontWeight: 600,
  },
  lede: {
    fontFamily: 'Spectral',
    fontSize: 16,
    lineHeight: 1.45,
    marginBottom: 18,
    color: PDF_COLORS.ink,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletMarker: {
    width: 14,
    fontSize: 11,
    color: PDF_COLORS.magenta,
    fontFamily: 'Hanken Grotesk',
    fontWeight: 700,
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.55,
  },
  numberRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 4,
  },
  numberMarker: {
    width: 18,
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: 700,
    color: PDF_COLORS.magenta,
  },
  callout: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: PDF_COLORS.ink,
    backgroundColor: PDF_COLORS.butterSoft,
    padding: 14,
    marginVertical: 12,
  },
  calloutLabel: {
    fontFamily: 'Hanken Grotesk',
    fontWeight: 700,
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 11,
    lineHeight: 1.5,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  swatch: {
    width: 150,
    borderWidth: 1,
    borderColor: PDF_COLORS.ink,
    marginBottom: 8,
    marginRight: 8,
  },
  swatchChip: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.ink,
  },
  swatchMeta: {
    padding: 8,
    backgroundColor: PDF_COLORS.chalk,
  },
  swatchName: {
    fontFamily: 'Hanken Grotesk',
    fontWeight: 700,
    fontSize: 10,
    marginBottom: 2,
  },
  swatchHex: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: PDF_COLORS.ink60,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 56,
    right: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    fontFamily: 'JetBrains Mono',
    color: PDF_COLORS.ink60,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.ink15,
    paddingTop: 8,
  },
  pageNumber: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    color: PDF_COLORS.ink60,
  },
  doDontRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  doDontCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: PDF_COLORS.ink,
    padding: 12,
  },
  doDontHead: {
    fontFamily: 'Hanken Grotesk',
    fontWeight: 700,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  typeSample: {
    borderWidth: 1,
    borderColor: PDF_COLORS.ink,
    padding: 14,
    backgroundColor: PDF_COLORS.paper,
    marginBottom: 10,
  },
  typeSampleLabel: {
    fontFamily: 'Hanken Grotesk',
    fontWeight: 700,
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: PDF_COLORS.ink60,
    marginBottom: 6,
  },
  typeSampleMeta: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    color: PDF_COLORS.ink60,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.ink15,
    paddingTop: 6,
  },
});

// ---------- Shared components ---------------------------------------------
export function CoverPage({ eyebrow, title, summary, number, accent = 'magenta' }) {
  const colors = ACCENT_MAP[accent];
  return (
    <Page size="LETTER" style={pdfStyles.coverPage}>
      <View style={[pdfStyles.coverBlock, { backgroundColor: colors.bg, color: colors.text }]}>
        <Text style={[pdfStyles.coverNumber, { color: colors.text }]}>{number}</Text>
        <Text style={[pdfStyles.coverEyebrow, { color: colors.text }]}>{eyebrow}</Text>
        <Text style={[pdfStyles.coverTitle, { color: colors.text }]}>{title}</Text>
        {summary && <Text style={[pdfStyles.coverSummary, { color: colors.text }]}>{summary}</Text>}
        <View style={pdfStyles.coverFooter}>
          <Text>Good Neighbor Fund</Text>
          <Text>goodneighbor.fund</Text>
        </View>
      </View>
    </Page>
  );
}

export function PageFooter({ docTitle }) {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text>{docTitle}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

export function Bullet({ children }) {
  return (
    <View style={pdfStyles.bulletRow} wrap={false}>
      <Text style={pdfStyles.bulletMarker}>◆</Text>
      <Text style={pdfStyles.bulletText}>{children}</Text>
    </View>
  );
}

export function Numbered({ n, children }) {
  return (
    <View style={pdfStyles.numberRow} wrap={false}>
      <Text style={pdfStyles.numberMarker}>{String(n).padStart(2, '0')}</Text>
      <Text style={pdfStyles.bulletText}>{children}</Text>
    </View>
  );
}

export function Callout({ label = 'Note', children }) {
  return (
    <View style={pdfStyles.callout} wrap={false}>
      <Text style={pdfStyles.calloutLabel}>{label}</Text>
      <Text style={pdfStyles.calloutText}>{children}</Text>
    </View>
  );
}

export function Section({ title, first = false, children }) {
  return (
    <View>
      <Text style={first ? pdfStyles.h1First : pdfStyles.h1}>{title}</Text>
      {children}
    </View>
  );
}

export function Paragraph({ children, style }) {
  return <Text style={[pdfStyles.p, style]}>{children}</Text>;
}

// Reusable wrapper. Takes a cover plus a set of section pages.
export function PDFShell({ cover, children, docTitle }) {
  return (
    <Document title={docTitle} author="Good Neighbor Fund">
      {cover}
      <Page size="LETTER" style={pdfStyles.page}>
        {children}
        <PageFooter docTitle={docTitle} />
      </Page>
    </Document>
  );
}
