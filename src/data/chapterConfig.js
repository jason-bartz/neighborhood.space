// Per-chapter configuration. Keyed by the exact chapter name stored on the
// LP user record (user.chapter), matching the CHAPTERS constant in
// LimitedPartnerPortal.jsx.
//
// To add/update a chapter's Stripe payment links, edit the URLs below.
// Leave a URL as an empty string to hide that button for that chapter.

const CHAPTER_CONFIG = {
  'Western New York': {
    lpMembership: {
      annualUrl: 'https://buy.stripe.com/fZu8wPb2Edeo4jE68q8EM07',
      semiAnnualUrl: 'https://buy.stripe.com/14AbJ1eeQcak3fA2We8EM06',
    },
    gnfChapterFee: {
      monthlyUrl: 'https://buy.stripe.com/cNi9AT1s44HS3fA0O68EM0e',
    },
    donation: {
      oneTimeUrl: 'https://buy.stripe.com/14A7sLdaM1vGg2mfJ08EM0i',
    },
  },
  'Central New York': {
    lpMembership: {
      annualUrl: 'https://buy.stripe.com/9B66oH0o00rC4jEfJ08EM0b',
      semiAnnualUrl: 'https://buy.stripe.com/4gMcN5eeQfmw9DYdAS8EM0a',
    },
    gnfChapterFee: {
      monthlyUrl: 'https://buy.stripe.com/aFa14n0o0eisdUe40i8EM0f',
    },
    donation: {
      oneTimeUrl: 'https://buy.stripe.com/00w4gzgmY3DObM654m8EM0j',
    },
  },
  'Capital Region': {
    lpMembership: {
      annualUrl: 'https://buy.stripe.com/14A00j7Qs2zK6rMgN48EM0d',
      semiAnnualUrl: 'https://buy.stripe.com/eVqbJ1fiUcak8zU1Sa8EM0c',
    },
    gnfChapterFee: {
      monthlyUrl: 'https://buy.stripe.com/aFafZhb2E1vG5nI2We8EM0g',
    },
    donation: {
      oneTimeUrl: 'https://buy.stripe.com/7sYdR9gmYeis5nI54m8EM0k',
    },
  },
  'Denver': {
    lpMembership: {
      annualUrl: 'https://buy.stripe.com/00wdR97Qs8Y86rM8gy8EM09',
      semiAnnualUrl: 'https://buy.stripe.com/00w3cv7Qs8Y803obsK8EM08',
    },
    gnfChapterFee: {
      monthlyUrl: 'https://buy.stripe.com/14A7sL8Uwcak5nI0O68EM0h',
    },
    donation: {
      oneTimeUrl: 'https://buy.stripe.com/fZudR91s41vG8zU40i8EM0l',
    },
  },
};

export const CHAPTER_NAMES = ['Western New York', 'Central New York', 'Capital Region', 'Denver'];

export function getChapterConfig(chapter) {
  return (chapter && CHAPTER_CONFIG[chapter]) || null;
}

export function getChapterMembershipLinks(chapter) {
  const cfg = getChapterConfig(chapter);
  return cfg?.lpMembership || null;
}

export function getChapterFeeLinks(chapter) {
  const cfg = getChapterConfig(chapter);
  return cfg?.gnfChapterFee || null;
}

export function getDonationLinks(chapter) {
  const cfg = getChapterConfig(chapter);
  return cfg?.donation || null;
}

export default CHAPTER_CONFIG;
