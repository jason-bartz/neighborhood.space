import BrandGuidelines from './documents/BrandGuidelines';
import ChapterHandbook from './documents/ChapterHandbook';
import LPRecruiting from './documents/LPRecruiting';
import ReviewingPitches from './documents/ReviewingPitches';
import PortalTour from './documents/PortalTour';
import ChapterDirectorPlaybook from './documents/ChapterDirectorPlaybook';
import ChapterCommittees from './documents/ChapterCommittees';

// PDF components are loaded on-demand. They pull in @react-pdf/renderer
// and the font subsets, which together add ~500KB gzipped. Only the doc
// a user actually opens pays that cost.
const loadBrandGuidelinesPDF = () => import('./pdf/BrandGuidelinesPDF');
const loadChapterHandbookPDF = () => import('./pdf/ChapterHandbookPDF');
const loadLPRecruitingPDF = () => import('./pdf/LPRecruitingPDF');
const loadReviewingPitchesPDF = () => import('./pdf/ReviewingPitchesPDF');
const loadPortalTourPDF = () => import('./pdf/PortalTourPDF');
const loadChapterDirectorPlaybookPDF = () => import('./pdf/ChapterDirectorPlaybookPDF');
const loadChapterCommitteesPDF = () => import('./pdf/ChapterCommitteesPDF');

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
      'Everything you need to launch a Neighborhood. Mission, structure, timeline, operations, and the answers to common questions.',
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
  {
    id: 'reviewing-pitches',
    title: 'Reviewing Pitches',
    summary:
      'How the Review tab works, what each button does, and how to think about scoring when a term sheet isn’t the point.',
    category: 'Review',
    number: '04',
    accent: 'tangerine',
    readingTime: '6 min read',
    Component: ReviewingPitches,
    loadPDF: loadReviewingPitchesPDF,
    pdfFilename: 'GNF-Reviewing-Pitches.pdf',
  },
  {
    id: 'portal-tour',
    title: 'Using the Portal',
    summary:
      'Pitch map, trophy case, social share kit, Slack, and renewing your LP seat. A tour of everything beyond reviewing pitches.',
    category: 'Portal',
    number: '05',
    accent: 'butter',
    readingTime: '7 min read',
    Component: PortalTour,
    loadPDF: loadPortalTourPDF,
    pdfFilename: 'GNF-Using-the-Portal.pdf',
  },
  {
    id: 'chapter-director-playbook',
    title: 'Chapter Director Playbook',
    summary:
      'Inviting LPs, managing the review, assigning winners, publishing them live. Every admin tool in the portal and the rhythm for using them.',
    category: 'Admin',
    number: '06',
    accent: 'grape',
    readingTime: '10 min read',
    Component: ChapterDirectorPlaybook,
    loadPDF: loadChapterDirectorPlaybookPDF,
    pdfFilename: 'GNF-Chapter-Director-Playbook.pdf',
  },
  {
    id: 'chapter-committees',
    title: 'Chapter Committees',
    summary:
      'Optional scaffolding for a growing chapter. The committees other chapters have found useful, how to run them on Slack, and when to skip them.',
    category: 'Admin',
    number: '07',
    accent: 'aqua',
    readingTime: '5 min read',
    Component: ChapterCommittees,
    loadPDF: loadChapterCommitteesPDF,
    pdfFilename: 'GNF-Chapter-Committees.pdf',
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
