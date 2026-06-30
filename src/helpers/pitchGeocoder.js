// Shared geocoder for the pitch + founder maps. Turns a pitch/winner record
// into { lat, lng, approximate } using, in priority order:
//   1. explicit coordinates already on the record (lat/lng or latitude/longitude)
//   2. a precise zip -> lat/lng row from public/data/zipcodes.json
//   3. the record's chapter center (from chapterConfig), nudged by a stable
//      per-record offset so same-chapter pins (even within one zip) spread out
//      instead of stacking on one point.
//
// Step 3 is what makes EVERY chapter show up — including chapters that have no
// precise zip rows in zipcodes.json yet (currently Central New York + Capital
// Region). When real zip rows are added for a chapter, step 2 takes over
// automatically and those pins become exact. New chapters need nothing here:
// add their center + zipPrefixes in src/data/chapterConfig.js and they work.
//
// Both maps load /data/zipcodes.json once, call makeGeocoder(data), then run
// each record through the returned geocode() function.
import { getChapterCenter } from "../data/chapterConfig";
import { zipToChapter } from "../components/resources/shared/zipToChapter";

const isNum = (n) => typeof n === "number" && Number.isFinite(n);

// Normalize to the 5-digit core so ZIP+4 ("14201-1234") and stray spacing still
// match the index (which is keyed by bare 5-digit strings).
function readZip(rec) {
  const raw =
    rec?.zipcode ?? rec?.zip ?? rec?.zipCode ?? rec?.["zip-code"] ?? rec?.postalCode;
  if (raw == null) return null;
  const digits = String(raw).replace(/\D/g, "").slice(0, 5);
  return digits.length === 5 ? digits : null;
}

// Flatten any region shape in zipcodes.json (WNY's nested county arrays,
// Denver's flat zip_codes array, or any future chapter block) into a
// Map<zip5, {lat, lng}>. Picks up entries by shape, so new regions added to the
// JSON are indexed without touching this code.
export function buildZipIndex(zipcodeData) {
  const index = new Map();
  if (!zipcodeData || typeof zipcodeData !== "object") return index;

  const addEntry = (e) => {
    const zip = e?.zip ?? e?.zipcode ?? e?.zip_code ?? e?.postalCode;
    const lat = e?.lat ?? e?.latitude;
    const lng = e?.lng ?? e?.lon ?? e?.longitude;
    if (zip == null || lat == null || lng == null) return;
    const key = String(zip).replace(/\D/g, "").slice(0, 5);
    // First occurrence wins, matching the old county.find() first-match behavior
    // for the handful of zips that appear twice in the dataset.
    if (key.length === 5 && !index.has(key)) {
      index.set(key, { lat: Number(lat), lng: Number(lng) });
    }
  };

  const looksLikeZipEntry = (item) =>
    item &&
    typeof item === "object" &&
    (item.zip != null || item.zipcode != null || item.zip_code != null);

  const walk = (node) => {
    if (Array.isArray(node)) {
      node.forEach((item) => (looksLikeZipEntry(item) ? addEntry(item) : walk(item)));
    } else if (node && typeof node === "object") {
      Object.values(node).forEach(walk);
    }
  };

  for (const [key, value] of Object.entries(zipcodeData)) {
    if (key === "metadata") continue;
    walk(value);
  }
  return index;
}

// Deterministic small offset so multiple pitches that fall back to the same
// chapter center spread into a readable cloud instead of stacking on one pin.
// Seeded by the record's identity so each pitch gets a stable, distinct spot.
const FALLBACK_RADIUS = 0.07; // ~5 miles in degrees
function stableOffset(seed) {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  const angle = (h % 360) * (Math.PI / 180);
  const radius = (((h >>> 9) % 1000) / 1000) * FALLBACK_RADIUS;
  return { dLat: Math.cos(angle) * radius, dLng: Math.sin(angle) * radius };
}

// Build a geocode() closure bound to a loaded zipcodes.json payload.
export function makeGeocoder(zipcodeData) {
  const zipIndex = buildZipIndex(zipcodeData);

  return function geocode(rec) {
    if (!rec) return null;

    // 1. Explicit coordinates already on the record.
    if (isNum(rec.lat) && isNum(rec.lng)) {
      return { lat: rec.lat, lng: rec.lng, approximate: false };
    }
    if (isNum(rec.latitude) && isNum(rec.longitude)) {
      return { lat: rec.latitude, lng: rec.longitude, approximate: false };
    }

    const zip = readZip(rec);

    // 2. Precise zip -> coordinates.
    if (zip) {
      const hit = zipIndex.get(zip);
      if (hit) return { lat: hit.lat, lng: hit.lng, approximate: false };
    }

    // 3. Chapter-center fallback (explicit chapter wins, else infer from zip).
    const chapter = rec.chapter || zipToChapter(zip);
    const center = getChapterCenter(chapter);
    if (center) {
      // Seed the jitter with whatever identity the record carries so two pitches
      // in the same zip spread to distinct points instead of stacking. Stays
      // deterministic — a given record always lands at the same approximate spot.
      const seed =
        [rec.id, zip, rec.businessName || rec["business-name"], chapter]
          .filter(Boolean)
          .join("|") || String(chapter);
      const { dLat, dLng } = stableOffset(seed);
      return { lat: center.lat + dLat, lng: center.lng + dLng, approximate: true };
    }

    return null;
  };
}
