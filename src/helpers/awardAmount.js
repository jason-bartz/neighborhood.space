// Award amount resolution.
//
// A pitch's dollar value cascades: pitch.awardAmount → chapter.defaultGrantAmount → HISTORICAL_DEFAULT.
// HISTORICAL_DEFAULT preserves "$1,000 each" semantics for the winners that
// predate the awardAmount field. New winners always carry an explicit
// awardAmount written by handleAssignWinner.

export const HISTORICAL_DEFAULT_GRANT = 1000;

export function resolveAwardAmount(pitch, chaptersByName) {
  if (!pitch) return 0;
  const explicit = Number(pitch.awardAmount);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const chapter = chaptersByName && pitch.chapter ? chaptersByName.get(pitch.chapter) : null;
  const chapterDefault = Number(chapter?.defaultGrantAmount);
  if (Number.isFinite(chapterDefault) && chapterDefault > 0) return chapterDefault;

  return HISTORICAL_DEFAULT_GRANT;
}

export function sumAwarded(winners, chaptersByName) {
  if (!Array.isArray(winners)) return 0;
  return winners.reduce((total, pitch) => total + resolveAwardAmount(pitch, chaptersByName), 0);
}

// Build a Map keyed by chapter name from the raw chapters array loaded by the
// portal. Passed into resolve/sum helpers so the fallback lookup is O(1).
export function chaptersByNameMap(chapters) {
  const map = new Map();
  if (!Array.isArray(chapters)) return map;
  for (const c of chapters) {
    if (c && c.name) map.set(c.name, c);
  }
  return map;
}
