// Per-chapter configuration. Keyed by the exact chapter name stored on the
// LP user record (user.chapter) and on every pitch doc (pitch.chapter).
//
// THIS IS THE SINGLE SOURCE OF TRUTH FOR CHAPTER MAP + GEO DATA. To add a
// chapter, add one entry below with:
//   - center:      { lat, lng, zoom } — where the maps center for this chapter
//                  AND the fallback point for any pitch whose zip has no precise
//                  coordinates yet. Drives FounderMap + PitchMap automatically.
//   - zipPrefixes: 3-digit zip prefixes routed to this chapter. Drives both
//                  zip->chapter detection (concierge wizard) and the map's
//                  chapter-center geocoding fallback.
//   - Stripe links (lpMembership / gnfChapterFee / donation). Leave a URL empty
//                  to hide that button for the chapter.
//
// After adding a chapter here, also mirror its zipPrefixes into the backend
// copy at functions/zipToChapter.js (Cloud Functions are CommonJS and can't
// import this file). For pin-accurate placement add the chapter's real
// zip->lat/lng rows to public/data/zipcodes.json; until then the map falls back
// to `center`.

const CHAPTER_CONFIG = {
  'Western New York': {
    center: { lat: 42.89, lng: -78.78, zoom: 8 }, // Buffalo metro (chapter hub + fallback pin point)
    zipPrefixes: [140, 141, 142, 143, 144, 145, 146, 147, 148],
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
    center: { lat: 43.05, lng: -76.15, zoom: 8 },
    zipPrefixes: [130, 131, 132, 133, 134, 135, 136, 137, 138, 139],
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
    center: { lat: 42.65, lng: -73.75, zoom: 9 },
    zipPrefixes: [120, 121, 122, 123, 124, 125, 126, 127, 128, 129],
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
    center: { lat: 39.7392, lng: -104.9903, zoom: 10 },
    zipPrefixes: [800, 801, 802, 803, 804, 805],
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

// Derived from CHAPTER_CONFIG so adding a chapter above updates every consumer.
export const CHAPTER_NAMES = Object.keys(CHAPTER_CONFIG);

// chapter name -> { lat, lng, zoom }. Used to center the maps and as the
// geocoding fallback point for pitches without precise zip coordinates.
export const CHAPTER_CENTERS = Object.fromEntries(
  Object.entries(CHAPTER_CONFIG)
    .filter(([, cfg]) => cfg.center)
    .map(([name, cfg]) => [name, cfg.center])
);

// 3-digit zip prefix -> chapter name. Powers zip->chapter detection and the
// chapter-center geocoding fallback. Mirror prefixes into functions/zipToChapter.js.
export const ZIP_PREFIX_TO_CHAPTER = Object.entries(CHAPTER_CONFIG).reduce(
  (map, [name, cfg]) => {
    (cfg.zipPrefixes || []).forEach((prefix) => {
      map[prefix] = name;
    });
    return map;
  },
  {}
);

export function getChapterConfig(chapter) {
  return (chapter && CHAPTER_CONFIG[chapter]) || null;
}

export function getChapterCenter(chapter) {
  return getChapterConfig(chapter)?.center || null;
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
