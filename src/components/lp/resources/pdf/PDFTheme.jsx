import React from 'react';
import {
  Font,
  StyleSheet,
  View,
  Text,
  Page,
  Document,
} from '@react-pdf/renderer';

// ---------- Font registration ---------------------------------------------
// We pull woff2 files from Google Fonts' raw CDN so react-pdf can embed them.
// Only weights actually used below are registered to keep bundle small.

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2JL7SUc.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1pL7SUc.woff2', fontWeight: 700 },
  ],
});

Font.register({
  family: 'Instrument Serif',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/instrumentserif/v6/jizDREVItHgc8qDIbSTKq4XIRfQ7q-wxLHo.woff2', fontWeight: 400 },
  ],
});

Font.register({
  family: 'JetBrains Mono',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/jetbrainsmono/v20/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/jetbrainsmono/v20/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.woff2', fontWeight: 700 },
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
    fontFamily: 'Inter',
    fontSize: 11,
    lineHeight: 1.55,
    color: PDF_COLORS.ink,
  },
  coverPage: {
    padding: 0,
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
    opacity: 0.85,
  },
  coverTitle: {
    fontFamily: 'Instrument Serif',
    fontSize: 64,
    lineHeight: 0.95,
    marginBottom: 16,
  },
  coverSummary: {
    fontFamily: 'Inter',
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
    fontFamily: 'Instrument Serif',
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
    fontFamily: 'Instrument Serif',
    fontSize: 32,
    lineHeight: 1.1,
    marginBottom: 14,
    color: PDF_COLORS.ink,
  },
  h2: {
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 15,
    lineHeight: 1.2,
    marginTop: 18,
    marginBottom: 8,
    color: PDF_COLORS.ink,
  },
  h3: {
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
    fontWeight: 700,
  },
  lede: {
    fontFamily: 'Instrument Serif',
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
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

// Reusable wrapper — takes a cover + a set of section pages.
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
