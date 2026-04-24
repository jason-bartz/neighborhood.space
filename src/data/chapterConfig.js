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
  },
  'Upstate New York': {
    lpMembership: {
      annualUrl: 'https://buy.stripe.com/9B66oH0o00rC4jEfJ08EM0b',
      semiAnnualUrl: 'https://buy.stripe.com/4gMcN5eeQfmw9DYdAS8EM0a',
    },
  },
  'Capital Region': {
    lpMembership: {
      annualUrl: 'https://buy.stripe.com/14A00j7Qs2zK6rMgN48EM0d',
      semiAnnualUrl: 'https://buy.stripe.com/eVqbJ1fiUcak8zU1Sa8EM0c',
    },
  },
  'Denver': {
    lpMembership: {
      annualUrl: 'https://buy.stripe.com/00wdR97Qs8Y86rM8gy8EM09',
      semiAnnualUrl: 'https://buy.stripe.com/00w3cv7Qs8Y803obsK8EM08',
    },
  },
};

export function getChapterConfig(chapter) {
  return (chapter && CHAPTER_CONFIG[chapter]) || null;
}

export function getChapterMembershipLinks(chapter) {
  const cfg = getChapterConfig(chapter);
  return cfg?.lpMembership || null;
}

export default CHAPTER_CONFIG;
