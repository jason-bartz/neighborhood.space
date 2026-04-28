import React, { useState, useMemo, useEffect } from "react";
import ResourceCard from "../shared/ResourceCard";

const STAGE_FILTER_OPTIONS = ["Ideation", "Early", "Growth", "Established"];

// Stage filter is permissive — selecting "Early" should still surface
// resources tagged "Early Stage" (legacy) and "All" (every stage).
const STAGE_MATCH = {
  Ideation: ["Ideation", "All"],
  Early: ["Early", "Early Stage", "All"],
  Growth: ["Growth", "All"],
  Established: ["Established", "All"],
};

export default function ResourceDirectory({
  resources,
  chapters,
  initialChapter = "",
  initialStage = "",
  modeToggle,
}) {
  const [chapter, setChapter] = useState(initialChapter);
  const [stage, setStage] = useState(initialStage);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");

  // Keep filters in sync if a parent passes new defaults (e.g. "browse all"
  // from the concierge result screen).
  useEffect(() => setChapter(initialChapter), [initialChapter]);
  useEffect(() => setStage(initialStage), [initialStage]);

  const types = useMemo(() => {
    const set = new Set();
    for (const r of resources) {
      if (r.Type) set.add(r.Type);
    }
    return Array.from(set).sort();
  }, [resources]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const stageList = stage ? STAGE_MATCH[stage] || [stage] : null;
    return resources.filter((r) => {
      if (chapter && r.Chapter !== chapter) return false;
      if (stageList) {
        const rs = r["Business Stage"];
        if (!rs || !stageList.includes(rs)) return false;
      }
      if (type && r.Type !== type) return false;
      if (q) {
        const hay = [r.Resource, r.Type, r["Focus Area"], r["Expanded Details"]]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [resources, chapter, stage, type, search]);

  const chapterOptions = useMemo(
    () => Array.from(new Set(chapters.filter(Boolean))).sort(),
    [chapters]
  );

  return (
    <>
      <section className="rn-hero">
        <div className="rn-hero-text">
          <span className="rn-hero-eyebrow">The full directory</span>
          <h2 className="rn-hero-title">Every resource in the network.</h2>
          <p className="rn-hero-lede">
            Browse {resources.length} resources across {chapterOptions.length} {chapterOptions.length === 1 ? "chapter" : "chapters"}. Filter by stage, type, or search by name and focus.
          </p>
        </div>
        {modeToggle ? <div className="rn-hero-actions">{modeToggle}</div> : null}
      </section>

      <section className="rn-action">
        <div className="rn-directory mb-form-shell">
          <div className="rn-directory-controls">
        <div className="rn-control">
          <label htmlFor="rn-dir-search">Search</label>
          <input
            id="rn-dir-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, focus, or keyword"
          />
        </div>

        <div className="rn-control">
          <label htmlFor="rn-dir-chapter">Chapter</label>
          <select
            id="rn-dir-chapter"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
          >
            <option value="">All chapters</option>
            {chapterOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="rn-control">
          <label htmlFor="rn-dir-stage">Stage</label>
          <select
            id="rn-dir-stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="">All stages</option>
            {STAGE_FILTER_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="rn-control">
          <label htmlFor="rn-dir-type">Type</label>
          <select
            id="rn-dir-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rn-directory-meta">
        <span>
          Showing {filtered.length} of {resources.length} resources
        </span>
        {(chapter || stage || type || search) ? (
          <button
            type="button"
            className="mb-btn mb-btn-chalk rn-btn-compact"
            onClick={() => {
              setChapter("");
              setStage("");
              setType("");
              setSearch("");
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>

          {filtered.length === 0 ? (
            <div className="rn-results-empty">
              <p className="mb-body">No resources match those filters. Try clearing one to widen the search.</p>
            </div>
          ) : (
            <div className="rn-results-grid">
              {filtered.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
