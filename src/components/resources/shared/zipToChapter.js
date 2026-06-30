// zip -> chapter resolution. Used to give the concierge wizard instant feedback
// ("Looks like Western New York") while the user types; the backend re-resolves
// on the call so we never trust client input.
//
// The prefix data now lives in src/data/chapterConfig.js (the single source of
// truth — add a chapter there). The backend copy at functions/zipToChapter.js
// must stay in sync because Cloud Functions can't import frontend modules.
import { ZIP_PREFIX_TO_CHAPTER } from "../../../data/chapterConfig";

export function zipToChapter(zip) {
  if (zip == null) return null;
  const digits = String(zip).replace(/\D/g, "");
  if (digits.length < 5) return null;
  const prefix = Number(digits.slice(0, 3));
  return ZIP_PREFIX_TO_CHAPTER[prefix] || null;
}
