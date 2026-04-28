// Static print-ready assets exposed to chapter directors in the LP portal
// Resources tab. Files live under /public/assets/giant-checks and are served
// as static files by Firebase Hosting.
export const ASSETS = [
  {
    id: 'giant-check-1000',
    title: 'Giant Check — $1,000 Pre-Filled',
    summary:
      'Reusable presentation check pre-printed with $1,000 — saves writing the standard grant amount on every reveal.',
    category: 'Print Asset',
    number: 'A1',
    accent: 'aqua',
    files: [
      {
        label: 'Download PDF',
        href: '/assets/giant-checks/gnf-giant-check-1000.pdf',
        filename: 'gnf-giant-check-1000.pdf',
      },
      {
        label: 'Download SVG',
        href: '/assets/giant-checks/gnf-giant-check-1000.svg',
        filename: 'gnf-giant-check-1000.svg',
      },
    ],
  },
  {
    id: 'giant-check-blank',
    title: 'Giant Check — Blank',
    summary:
      'Same template with the amount left blank. Use a dry-erase marker on-site for non-standard awards.',
    category: 'Print Asset',
    number: 'A2',
    accent: 'butter',
    files: [
      {
        label: 'Download PDF',
        href: '/assets/giant-checks/gnf-giant-check-blank.pdf',
        filename: 'gnf-giant-check-blank.pdf',
      },
      {
        label: 'Download SVG',
        href: '/assets/giant-checks/gnf-giant-check-blank.svg',
        filename: 'gnf-giant-check-blank.svg',
      },
    ],
  },
];

// Recommended sizes from the printer we&rsquo;ve historically used. Hand these
// straight to a local print shop along with the PDF or SVG.
export const PRINT_SPECS = [
  {
    size: '36" × 18"',
    detail:
      'Full Color, Single Sided (4/0), Bleed, Gloss Vinyl Mounted to 4mm Coroplast. Includes minor typesetting.',
  },
  {
    size: '48" × 24"',
    detail:
      'Full Color, Single Sided, Gloss Vinyl Mounted to 4mm Coroplast.',
  },
];

export const ORDERING_NOTES = [
  'Recommended printer: Minuteman Press — they have a national footprint and offer a 20% nonprofit discount. A check typically runs about $80.',
  'Checks are reusable — write the recipient and amount with a dry-erase marker and wipe off after the presentation.',
  'New chapter setup: Jason orders one 36" × 18" check for each chapter. The chapter director picks it up locally.',
  'Any additional checks beyond the initial one are the chapter’s responsibility to order and fund.',
];
