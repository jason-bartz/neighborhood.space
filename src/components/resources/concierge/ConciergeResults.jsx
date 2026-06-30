import React, { useState, useEffect, useMemo } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../firebaseConfig";
import { zipToChapter } from "../shared/zipToChapter";
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
function cacheKey({ chapter, stage, chips, identities, needText }) {
  const safe = (s) => String(s || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const ids = Array.isArray(identities) ? identities.slice().sort().join(",") : "";
  return `rn-rec:${safe(chapter)}|${safe(stage)}|${chips.slice().sort().join(",")}|${ids}|${safe(needText).slice(0, 80)}`;
}

function loadCached(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts || !parsed.data) return null;
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

function deterministicSummaryClient({ chapter, stage, chips }) {
  const parts = [];
  if (stage) parts.push(stage.toLowerCase());
  if (chips && chips.length) parts.push(chips.join(" + "));
  const focus = parts.length ? ` for ${parts.join(" / ")}` : "";
  const where = chapter ? ` in ${chapter}` : "";
  return `Top resources${where}${focus}, ranked by relevance to your filters.`;
}

export default function ConciergeResults({ answers, resources, onReset, onBrowseAll, modeToggle }) {
  const [recommendations, setRecommendations] = useState(null);
  const [summary, setSummary] = useState("");
  const [resolvedChapter, setResolvedChapter] = useState(answers.chapter || "");
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(true);

  const resourceById = useMemo(() => {
    const m = new Map();
    for (const r of resources) m.set(r.id, r);
    return m;
  }, [resources]);

  // Resolve client-side first so the chip in the hero shows immediately.
  const initialChapter = answers.chapter || zipToChapter(answers.zip) || "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRecommendations(null);
    setSummary("");
    setResolvedChapter(initialChapter);

    const cacheChapter = answers.chapter || zipToChapter(answers.zip) || "";
    const key = cacheKey({ ...answers, chapter: cacheChapter });
    const cached = loadCached(key);
    if (cached) {
      setRecommendations(cached.recommendations);
      setSummary(cached.summary || "");
      setResolvedChapter(cached.resolvedChapter || cacheChapter);
      setSource(cached.source);
      setLoading(false);
      return () => {};
    }

    recommendCallable({
      chapter: answers.chapter || undefined,
      zip: answers.zip || undefined,
      stage: answers.stage,
      chips: answers.chips,
      identities: answers.identities || [],
      needText: answers.needText,
    })
      .then((result) => {
        if (cancelled) return;
        const data = result.data || {};
        const recs = Array.isArray(data.recommendations) ? data.recommendations : [];
        const serverChapter = data.resolvedChapter || cacheChapter;
        if (recs.length === 0) {
          const fallback = deterministicShortlist({ resources, ...answers, chapter: serverChapter });
          const fallbackSummary = deterministicSummaryClient({ ...answers, chapter: serverChapter });
          setRecommendations(fallback);
          setSummary(fallbackSummary);
          setResolvedChapter(serverChapter);
          setSource("deterministic");
          saveCached(key, {
            recommendations: fallback,
            summary: fallbackSummary,
            resolvedChapter: serverChapter,
            source: "deterministic",
          });
        } else {
          setRecommendations(recs);
          setSummary(typeof data.summary === "string" ? data.summary : "");
          setResolvedChapter(serverChapter);
          setSource(data.source || "ai");
          saveCached(key, {
            recommendations: recs,
            summary: typeof data.summary === "string" ? data.summary : "",
            resolvedChapter: serverChapter,
            source: data.source || "ai",
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("recommendResources call failed:", err);
        const fallback = deterministicShortlist({ resources, ...answers, chapter: cacheChapter });
        setRecommendations(fallback);
        setSummary(deterministicSummaryClient({ ...answers, chapter: cacheChapter }));
        setResolvedChapter(cacheChapter);
        setSource("deterministic");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [answers, resources, initialChapter]);

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
    resolvedChapter,
    answers.stage,
    answers.chips.length ? answers.chips.join(", ") : null,
    answers.identities && answers.identities.length ? answers.identities.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <section className="rn-hero">
        <div className="rn-hero-text">
          <span className="rn-hero-eyebrow">AI Concierge · Your shortlist</span>
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
              {summary
                ? summary
                : `No close matches in ${resolvedChapter || "that area"} for that combination yet. Try browsing the full directory or loosening your filters.`}
            </p>
            <button type="button" className="mb-btn" onClick={onBrowseAll}>
              Browse the full directory
              <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
            </button>
          </div>
        ) : null}

        {!loading && cards.length > 0 ? (
          <>
            {summary ? (
              <div className="rn-summary">
                <span className="rn-summary-eyebrow">Why these</span>
                <p className="rn-summary-text">{summary}</p>
              </div>
            ) : null}

            <div className="rn-results-grid">
              {cards.map(({ resource, reason }) => (
                <ResourceCard key={resource.id} resource={resource} reason={reason} />
              ))}
            </div>

            <div className="rn-results-footer">
              <button type="button" className="mb-btn mb-btn-chalk rn-btn-compact" onClick={onBrowseAll}>
                Browse all resources in {resolvedChapter || "the directory"}
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
