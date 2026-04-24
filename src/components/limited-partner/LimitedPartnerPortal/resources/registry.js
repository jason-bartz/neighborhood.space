import BrandGuidelines from './documents/BrandGuidelines';
import ChapterHandbook from './documents/ChapterHandbook';
import LPRecruiting from './documents/LPRecruiting';

// PDF components are loaded on-demand — they pull in @react-pdf/renderer
// and the font subsets, which together add ~500KB gzipped. Only the doc
// a user actually opens pays that cost.
const loadBrandGuidelinesPDF = () => import('./pdf/BrandGuidelinesPDF');
const loadChapterHandbookPDF = () => import('./pdf/ChapterHandbookPDF');
const loadLPRecruitingPDF = () => import('./pdf/LPRecruitingPDF');

export const RESOURCE_DOCUMENTS = [
  {
    id: 'brand-guidelines',
    title: 'Brand Guidelines',
    summary:
      'Logos, colors, typography, and voice. The playbook for keeping every chapter looking and sounding like GNF.',
    category: 'Identity',
    number: '01',
    accent: 'magenta',
    readingTime: '8 min read',
    Component: BrandGuidelines,
    loadPDF: loadBrandGuidelinesPDF,
    pdfFilename: 'GNF-Brand-Guidelines.pdf',
  },
  {
    id: 'chapter-handbook',
    title: 'New Chapter Handbook',
    summary:
      'Everything you need to launch a Neighborhood — mission, structure, timeline, operations, and the answers to common questions.',
    category: 'Operations',
    number: '02',
    accent: 'grape',
    readingTime: '12 min read',
    Component: ChapterHandbook,
    loadPDF: loadChapterHandbookPDF,
    pdfFilename: 'GNF-Chapter-Handbook.pdf',
  },
  {
    id: 'lp-recruiting',
    title: 'Recruiting Limited Partners',
    summary:
      'How to talk about GNF, who to invite, and how to turn a casual coffee into a founding LP commitment.',
    category: 'Growth',
    number: '03',
    accent: 'aqua',
    readingTime: '6 min read',
    Component: LPRecruiting,
    loadPDF: loadLPRecruitingPDF,
    pdfFilename: 'GNF-LP-Recruiting.pdf',
  },
];

export function getResourceById(id) {
  return RESOURCE_DOCUMENTS.find((r) => r.id === id) || null;
}

export const ACCENT_TOKENS = {
  magenta: {
    bg: 'var(--mb-magenta)',
    deep: 'var(--mb-magenta-deep)',
    soft: 'var(--mb-magenta-soft)',
    text: 'var(--mb-chalk)',
  },
  grape: {
    bg: 'var(--mb-grape)',
    deep: 'var(--mb-grape-deep)',
    soft: 'var(--mb-grape-soft)',
    text: 'var(--mb-chalk)',
  },
  aqua: {
    bg: 'var(--mb-aqua)',
    deep: 'var(--mb-aqua-deep)',
    soft: 'var(--mb-aqua-soft)',
    text: 'var(--mb-chalk)',
  },
  tangerine: {
    bg: 'var(--mb-tangerine)',
    deep: 'var(--mb-tangerine-deep)',
    soft: 'var(--mb-tangerine-soft)',
    text: 'var(--mb-ink)',
  },
  butter: {
    bg: 'var(--mb-butter)',
    deep: 'var(--mb-butter-deep)',
    soft: 'var(--mb-butter-soft)',
    text: 'var(--mb-ink)',
  },
};
