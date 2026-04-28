import React, { useState, useEffect, useMemo } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../firebaseConfig";
import ResourceCard from "../shared/ResourceCard";

const recommendCallable = httpsCallable(functions, "recommendResources");

const STAGE_ALIASES = {
  Ideation: ["Ideation", "All"],
  Early: ["Early", "Early Stage", "All"],
  "Early Stage": ["Early Stage", "Early", "All"],
  Growth: ["Growth", "All"],
  Established: ["Established", "All"],
};

// Stable key for caching recommendations in localStorage. Slug-friendly,
// avoids ; / : that some keys complain about.
function cacheKey({ chapter, stage, chips, needText }) {
  const safe = (s) => String(s || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `rn-rec:${safe(chapter)}|${safe(stage)}|${chips.slice().sort().join(",")}|${safe(needText).slice(0, 80)}`;
}

function loadCached(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts || !parsed.data) return null;
    // Cache for 24h — corpus changes slowly, founder's needs not at all.
    if (Date.now() - parsed.ts > 24 * 60 * 60 * 1000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function saveCached(key, data) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // Quota or disabled storage — silently skip.
  }
}

// Used while the AI call is in flight, and as the fallback if it fails. Keeps
// the user from staring at a spinner with nothing useful behind it.
function deterministicShortlist({ resources, chapter, stage, chips, needText }) {
  const stageList = stage ? STAGE_ALIASES[stage] || [stage] : null;
  const filtered = resources.filter((r) => {
    if (chapter && r.Chapter && r.Chapter !== chapter) return false;
    if (stageList) {
      const rs = r["Business Stage"];
      if (!rs || !stageList.includes(rs)) return false;
    }
    return true;
  });

  const chipKeywords = {
    capital: ["capital", "venture", "angel", "funding", "investment", "equity", "loan", "grant"],
    customers: ["community", "network", "marketing", "sales", "customer"],
    mentors: ["mentor", "advisor", "coach", "education", "training"],
    legal: ["legal", "law", "incorporation"],
    space: ["coworking", "incubator", "office", "space", "campus"],
    hiring: ["hiring", "talent", "recruiting", "workforce"],
  };

  function score(r) {
    const hay = [r.Resource, r.Type, r["Focus Area"], r["Expanded Details"]]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    let s = 0;
    for (const w of (needText || "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2)) {
      if (hay.includes(w)) s += 2;
    }
    for (const c of chips) {
      const keys = chipKeywords[c] || [c];
      if (keys.some((k) => hay.includes(k))) s += 3;
    }
    return s;
  }

  return filtered
    .map((r) => ({ resource: r, score: score(r) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ resource }) => ({
      resourceId: resource.id,
      reason: resource["Focus Area"]
        ? `${resource.Type} focused on ${resource["Focus Area"].toLowerCase()}.`
        : `${resource.Type} serving founders at your stage.`,
    }));
}

export default function ConciergeResults({ answers, resources, onReset, onBrowseAll, modeToggle }) {
  const [recommendations, setRecommendations] = useState(null);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const resourceById = useMemo(() => {
    const m = new Map();
    for (const r of resources) m.set(r.id, r);
    return m;
  }, [resources]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRecommendations(null);

    const key = cacheKey(answers);
    const cached = loadCached(key);
    if (cached) {
      setRecommendations(cached.recommendations);
      setSource(cached.source);
      setLoading(false);
      return () => {};
    }

    recommendCallable({
      chapter: answers.chapter,
      stage: answers.stage,
      chips: answers.chips,
      needText: answers.needText,
    })
      .then((result) => {
        if (cancelled) return;
        const data = result.data || {};
        const recs = Array.isArray(data.recommendations) ? data.recommendations : [];
        if (recs.length === 0) {
          // Empty AI result — fall back so user always sees something.
          const fallback = deterministicShortlist({ resources, ...answers });
          setRecommendations(fallback);
          setSource("deterministic");
          saveCached(key, { recommendations: fallback, source: "deterministic" });
        } else {
          setRecommendations(recs);
          setSource(data.source || "ai");
          saveCached(key, { recommendations: recs, source: data.source || "ai" });
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("recommendResources call failed:", err);
        const fallback = deterministicShortlist({ resources, ...answers });
        setRecommendations(fallback);
        setSource("deterministic");
        setError(null); // Soft fail — show fallback, no error UI
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [answers, resources]);

  const cards = useMemo(() => {
    if (!recommendations) return [];
    return recommendations
      .map((rec) => ({
        resource: resourceById.get(rec.resourceId),
        reason: rec.reason,
      }))
      .filter((c) => c.resource);
  }, [recommendations, resourceById]);

  const filterSummary = [
    answers.chapter,
    answers.stage,
    answers.chips.length ? answers.chips.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <section className="rn-hero">
        <div className="rn-hero-text">
          <span className="rn-hero-eyebrow">Your shortlist</span>
          <h2 className="rn-hero-title">
            {loading ? "Looking for matches…" : `${cards.length} resources to start with.`}
          </h2>
          <p className="rn-hero-lede">{filterSummary}</p>
        </div>
        <div className="rn-hero-actions">
          {modeToggle}
          <button type="button" className="mb-btn mb-btn-chalk rn-btn-compact" onClick={onReset}>
            Start over
          </button>
          <button type="button" className="mb-btn mb-btn-chalk rn-btn-compact" onClick={onBrowseAll}>
            Browse all
          </button>
        </div>
      </section>

      <section className="rn-action">
        {loading ? (
          <div className="rn-results-loading">
            <div className="rn-spinner" aria-hidden="true" />
            <p className="mb-body">Asking the concierge…</p>
          </div>
        ) : null}

        {!loading && cards.length === 0 ? (
          <div className="rn-results-empty">
            <p className="mb-body">
              No close matches in {answers.chapter} for that combination yet. Try browsing the full directory or loosening your filters.
            </p>
            <button type="button" className="mb-btn" onClick={onBrowseAll}>
              Browse the full directory
              <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
            </button>
          </div>
        ) : null}

        {!loading && cards.length > 0 ? (
          <>
            <div className="rn-results-grid">
              {cards.map(({ resource, reason }) => (
                <ResourceCard key={resource.id} resource={resource} reason={reason} />
              ))}
            </div>

            <div className="rn-results-footer">
              <button type="button" className="mb-btn mb-btn-chalk rn-btn-compact" onClick={onBrowseAll}>
                Browse all resources in {answers.chapter}
                <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
              </button>
              {source === "ai" ? (
                <span className="rn-results-source">Matched by AI concierge</span>
              ) : null}
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}
