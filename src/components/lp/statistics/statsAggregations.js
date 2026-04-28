// Pure aggregations for the chapter Statistics tab.
//
// These functions take already-loaded pitch, review, and chapter arrays and
// derive the metrics the tab renders. Keeping them pure and free of React /
// Firestore means they can be reasoned about in isolation and recomposed for
// exports (year-in-review card, printable report) without re-fetching.
//
// Min-sample gating: percentages backed by fewer than MIN_SAMPLE_FOR_PCT
// observations return null, and the caller renders an em-dash. The threshold
// is deliberately visible so future tuning (e.g. "show at 3 for small chapters")
// happens in one place.

import { resolveAwardAmount } from "../../../helpers/awardAmount";
import { isLMIZip } from "../../../helpers/lmiZips";

export const MIN_SAMPLE_FOR_PCT = 5;

// Self-identification buckets — the superset the application form exposes.
// Rendered in this order so the breakdown chart is stable across chapters
// and time periods. Pitches may carry multiple tags; one founder can be e.g.
// both "Women Owned/Led" and "BIPOC Owned/Led" so category counts sum to
// MORE than the total applicant pool.
export const SELF_ID_CATEGORIES = [
  "Women Owned/Led",
  "BIPOC Owned/Led",
  "Minority Owned/Led",
  "LGBTQ+ Owned/Led",
  "Veteran Owned/Led",
  "Disabled Owned/Led",
  "Student Owned/Led",
];

// ── Date / quarter helpers ─────────────────────────────────────────────
// Firestore returns Timestamp objects in some paths, ISO strings in others,
// and plain Dates after .toDate() calls — this accepts all three.
export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    try { return value.toDate(); } catch (_) { return null; }
  }
  if (value instanceof Date) return isNaN(value) ? null : value;
  const parsed = new Date(value);
  return isNaN(parsed) ? null : parsed;
}

export function quarterKey(date) {
  if (!date) return null;
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} ${date.getFullYear()}`;
}

export function monthKey(date) {
  if (!date) return null;
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${m}`;
}

export function yearKey(date) {
  if (!date) return null;
  return String(date.getFullYear());
}

// Chronological compare for "Q1 2024"-style keys.
export function compareQuarterKey(a, b) {
  const pa = a.match(/Q(\d) (\d{4})/);
  const pb = b.match(/Q(\d) (\d{4})/);
  if (!pa || !pb) return a.localeCompare(b);
  const ya = Number(pa[2]); const yb = Number(pb[2]);
  if (ya !== yb) return ya - yb;
  return Number(pa[1]) - Number(pb[1]);
}

// ── Percentages with min-sample gating ────────────────────────────────
export function pctOrNull(numerator, denominator, minSample = MIN_SAMPLE_FOR_PCT) {
  if (!Number.isFinite(denominator) || denominator < minSample) return null;
  if (!Number.isFinite(numerator) || numerator < 0) return null;
  return Math.round((numerator / denominator) * 100);
}

// ── KPI summary ────────────────────────────────────────────────────────
export function summarizeKPIs(pitches, chaptersByName) {
  const total = pitches.length;
  const winners = pitches.filter((p) => p.isWinner);
  const winnerCount = winners.length;
  const dollars = winners.reduce((sum, p) => sum + resolveAwardAmount(p, chaptersByName), 0);
  const winRate = pctOrNull(winnerCount, total);
  return {
    totalApplications: total,
    winnerCount,
    dollarsDeployed: dollars,
    winRatePct: winRate, // null when total < MIN_SAMPLE_FOR_PCT
  };
}

// ── Applications over time (grouped by month or quarter) ──────────────
export function applicationsOverTime(pitches, granularity = "quarter") {
  const keyFn = granularity === "month" ? monthKey : quarterKey;
  const buckets = new Map();
  for (const p of pitches) {
    const key = keyFn(toDate(p.createdAt));
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, { key, total: 0, winners: 0 });
    const b = buckets.get(key);
    b.total += 1;
    if (p.isWinner) b.winners += 1;
  }
  const list = Array.from(buckets.values());
  list.sort((a, b) => granularity === "quarter"
    ? compareQuarterKey(a.key, b.key)
    : a.key.localeCompare(b.key));
  return list;
}

// ── Self-identification breakdown ──────────────────────────────────────
// Returns rows in SELF_ID_CATEGORIES order with counts + dollar totals for
// applicants and winners. `winPct` uses min-N gating against applicants in
// the category; `sharePct` is that category's share of the applicant pool
// (no gating — share of a sample is meaningful even at small n, it's the
// percentage-of-a-percentage inference that becomes noisy).
//
// Founders may tag multiple categories; rows do not sum to the pool total.
export function selfIdBreakdown(pitches, chaptersByName) {
  const totalPitches = pitches.length;
  const totalWinners = pitches.filter((p) => p.isWinner).length;
  const notSpecified = {
    category: "Not specified",
    applicants: 0,
    winners: 0,
    dollars: 0,
    applicantShare: null,
    winShare: null,
    winPct: null,
  };
  const rows = SELF_ID_CATEGORIES.map((cat) => {
    let applicants = 0;
    let winners = 0;
    let dollars = 0;
    for (const p of pitches) {
      const tags = Array.isArray(p.selfIdentification) ? p.selfIdentification : [];
      if (!tags.includes(cat)) continue;
      applicants += 1;
      if (p.isWinner) {
        winners += 1;
        dollars += resolveAwardAmount(p, chaptersByName);
      }
    }
    return {
      category: cat,
      applicants,
      winners,
      dollars,
      applicantShare: totalPitches > 0 ? Math.round((applicants / totalPitches) * 100) : 0,
      winShare: totalWinners > 0 ? Math.round((winners / totalWinners) * 100) : 0,
      winPct: pctOrNull(winners, applicants),
    };
  });

  // Applicants who tagged nothing. Useful to understand how complete the
  // self-ID data is before reading too much into the percentages above.
  for (const p of pitches) {
    const tags = Array.isArray(p.selfIdentification) ? p.selfIdentification : [];
    if (tags.length === 0) {
      notSpecified.applicants += 1;
      if (p.isWinner) {
        notSpecified.winners += 1;
        notSpecified.dollars += resolveAwardAmount(p, chaptersByName);
      }
    }
  }
  notSpecified.applicantShare = totalPitches > 0
    ? Math.round((notSpecified.applicants / totalPitches) * 100)
    : 0;
  notSpecified.winShare = totalWinners > 0
    ? Math.round((notSpecified.winners / totalWinners) * 100)
    : 0;
  notSpecified.winPct = pctOrNull(notSpecified.winners, notSpecified.applicants);

  return { rows, notSpecified, totalPitches, totalWinners };
}

// ── Referral / acquisition channels (heardAbout) ──────────────────────
// Groups by the heardAbout string verbatim (no keyword normalization so we
// don't accidentally merge distinct sources). Blanks roll into "Not specified".
export function referralBreakdown(pitches) {
  const map = new Map();
  for (const p of pitches) {
    const raw = typeof p.heardAbout === "string" ? p.heardAbout.trim() : "";
    const key = raw.length > 0 ? raw : "Not specified";
    if (!map.has(key)) map.set(key, { source: key, applicants: 0, winners: 0 });
    const row = map.get(key);
    row.applicants += 1;
    if (p.isWinner) row.winners += 1;
  }
  const rows = Array.from(map.values())
    .map((r) => ({ ...r, winPct: pctOrNull(r.winners, r.applicants) }))
    .sort((a, b) => b.applicants - a.applicants);
  return rows;
}

// ── Geographic reach ──────────────────────────────────────────────────
// Groups pitches by zipCode. Only accepts real 5-digit US zips — imported
// pitch docs sometimes carry "nan" / "N/A" / blank values, and those would
// otherwise show up as a fake top row in the ranked list. Invalid zips are
// silently excluded; the count of skipped pitches is reported separately by
// the map component so the director knows the coverage gap exists.
export function zipDistribution(pitches) {
  const map = new Map();
  for (const p of pitches) {
    const zip = normalizeUSZip(p.zipCode);
    if (!zip) continue;
    if (!map.has(zip)) map.set(zip, { zip, applicants: 0, winners: 0 });
    const row = map.get(zip);
    row.applicants += 1;
    if (p.isWinner) row.winners += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.applicants - a.applicants);
}

// Share of applicants from low-to-moderate-income ZIPs. Denominator is the
// pitches we *can* classify (those carrying a real 5-digit US zip), so the
// percentage isn't dragged down by missing-zip rows. The caller renders the
// raw counts alongside so a reviewer can see the coverage gap.
export function lmiShare(pitches) {
  let applicantsWithZip = 0;
  let lmiApplicants = 0;
  let lmiWinners = 0;
  let winnersWithZip = 0;
  for (const p of pitches) {
    const zip = normalizeUSZip(p.zipCode);
    if (!zip) continue;
    applicantsWithZip += 1;
    const lmi = isLMIZip(zip);
    if (lmi) lmiApplicants += 1;
    if (p.isWinner) {
      winnersWithZip += 1;
      if (lmi) lmiWinners += 1;
    }
  }
  return {
    applicantsWithZip,
    lmiApplicants,
    winnersWithZip,
    lmiWinners,
    applicantSharePct: applicantsWithZip > 0
      ? Math.round((lmiApplicants / applicantsWithZip) * 100)
      : null,
    winnerSharePct: winnersWithZip > 0
      ? Math.round((lmiWinners / winnersWithZip) * 100)
      : null,
  };
}

// Exported so GeographicReach can share a single definition of "what counts
// as a zip" with the aggregator.
export function normalizeUSZip(value) {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const match = raw.match(/^(\d{5})(?:-\d{4})?$/);
  return match ? match[1] : "";
}

// ── Pipeline health ───────────────────────────────────────────────────
// Repeat applicants: emails (case-insensitive) that appear on >1 pitch.
export function repeatApplicants(pitches) {
  const byEmail = new Map();
  for (const p of pitches) {
    const email = typeof p.email === "string" ? p.email.trim().toLowerCase() : "";
    if (!email) continue;
    byEmail.set(email, (byEmail.get(email) || 0) + 1);
  }
  let repeaters = 0;
  let extraSubmissions = 0;
  for (const count of byEmail.values()) {
    if (count > 1) {
      repeaters += 1;
      extraSubmissions += count - 1;
    }
  }
  return { uniqueEmails: byEmail.size, repeaters, extraSubmissions };
}

// Days from pitch creation to awardedAt, averaged over winners where both
// timestamps are present. Historical winners that predate awardedAt are
// filtered out rather than zero-filled so the average isn't dragged down.
export function daysToDecision(pitches) {
  const winners = pitches.filter((p) => p.isWinner);
  const samples = [];
  for (const p of winners) {
    const created = toDate(p.createdAt);
    const awarded = toDate(p.awardedAt);
    if (!created || !awarded) continue;
    const diffMs = awarded.getTime() - created.getTime();
    if (diffMs < 0) continue;
    samples.push(diffMs / (1000 * 60 * 60 * 24));
  }
  if (samples.length === 0) {
    return { avgDays: null, medianDays: null, sampleSize: 0, winnerCount: winners.length };
  }
  samples.sort((a, b) => a - b);
  const sum = samples.reduce((s, v) => s + v, 0);
  const avg = sum / samples.length;
  const mid = Math.floor(samples.length / 2);
  const median = samples.length % 2 === 0
    ? (samples[mid - 1] + samples[mid]) / 2
    : samples[mid];
  return {
    avgDays: Math.round(avg * 10) / 10,
    medianDays: Math.round(median * 10) / 10,
    sampleSize: samples.length,
    winnerCount: winners.length,
  };
}

// Quarter-over-quarter applicant growth, expressed as (current - previous) /
// previous. Returns null when either quarter has < MIN_SAMPLE_FOR_PCT pitches
// (percentage swings on tiny samples are noise). `previous` and `current` are
// the newest two quarters present in the data.
export function quarterOverQuarterGrowth(pitches) {
  const series = applicationsOverTime(pitches, "quarter");
  if (series.length < 2) return { previous: null, current: null, growthPct: null };
  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  if (previous.total < MIN_SAMPLE_FOR_PCT || current.total < MIN_SAMPLE_FOR_PCT) {
    return { previous, current, growthPct: null };
  }
  const growth = ((current.total - previous.total) / previous.total) * 100;
  return { previous, current, growthPct: Math.round(growth) };
}

// ── Reviewer engagement ───────────────────────────────────────────────
// Operates on raw review docs. `users` is passed so we can tie reviewerId
// back to a chapter for scoped views even when a review was written before
// a chapter was assigned.
export function reviewerEngagement(reviews, users, chapterFilter) {
  const filteredReviews = chapterFilter
    ? reviews.filter((r) => r.chapter === chapterFilter)
    : reviews;
  const reviewerIds = new Set();
  const ratingCounts = { Favorite: 0, Consideration: 0, Pass: 0, Ineligible: 0 };
  const pitchReviewCounts = new Map(); // pitchId → review count

  for (const r of filteredReviews) {
    if (r.reviewerId) reviewerIds.add(r.reviewerId);
    if (r.overallLpRating && ratingCounts[r.overallLpRating] !== undefined) {
      ratingCounts[r.overallLpRating] += 1;
    }
    if (r.pitchId) {
      pitchReviewCounts.set(r.pitchId, (pitchReviewCounts.get(r.pitchId) || 0) + 1);
    }
  }

  const counts = Array.from(pitchReviewCounts.values());
  const avgReviewsPerPitch = counts.length > 0
    ? Math.round((counts.reduce((s, c) => s + c, 0) / counts.length) * 10) / 10
    : 0;

  // LP pool size for this chapter. Used to report "how many of our LPs
  // participated" (not just "how many distinct reviewers", which double-counts
  // people who changed chapters).
  const totalLPsInScope = users.filter((u) => {
    const isPortalRole = u.role === "lp" || u.role === "chapter_director" || u.role === "superAdmin";
    if (!isPortalRole) return false;
    if (!chapterFilter) return true;
    return u.chapter === chapterFilter;
  }).length;

  return {
    activeReviewerCount: reviewerIds.size,
    totalLPsInScope,
    ratingDistribution: ratingCounts,
    avgReviewsPerPitch,
    pitchesReviewed: counts.length,
    totalReviews: filteredReviews.length,
  };
}
