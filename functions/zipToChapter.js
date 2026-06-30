// Zip-prefix → chapter map. The frontend source of truth lives in
// src/data/chapterConfig.js (each chapter's `zipPrefixes`); this backend copy
// must mirror it because Cloud Functions can't import frontend modules.
// Keep both in sync when adding/changing a chapter's prefixes.
// Prefixes are 3-digit because that's how the postal service carves
// regions, and it's plenty accurate for chapter routing.
const ZIP_PREFIX_TO_CHAPTER = {
  // Western New York: Buffalo, Rochester, Niagara, Southern Tier
  140: "Western New York", 141: "Western New York", 142: "Western New York",
  143: "Western New York", 144: "Western New York", 145: "Western New York",
  146: "Western New York", 147: "Western New York", 148: "Western New York",
  // Central New York: Syracuse, Utica, Binghamton
  130: "Central New York", 131: "Central New York", 132: "Central New York",
  133: "Central New York", 134: "Central New York", 135: "Central New York",
  136: "Central New York", 137: "Central New York", 138: "Central New York",
  139: "Central New York",
  // Capital Region: Albany, Schenectady, Troy, Hudson Valley north
  120: "Capital Region", 121: "Capital Region", 122: "Capital Region",
  123: "Capital Region", 124: "Capital Region", 125: "Capital Region",
  126: "Capital Region", 127: "Capital Region", 128: "Capital Region",
  129: "Capital Region",
  // Denver metro / Front Range
  800: "Denver", 801: "Denver", 802: "Denver", 803: "Denver",
  804: "Denver", 805: "Denver",
};

function zipToChapter(zip) {
  if (zip == null) return null;
  const digits = String(zip).replace(/\D/g, "");
  if (digits.length < 5) return null;
  const prefix = Number(digits.slice(0, 3));
  return ZIP_PREFIX_TO_CHAPTER[prefix] || null;
}

module.exports = { zipToChapter };
