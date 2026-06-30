// GrantAwardees.jsx
// Reusable grant-awardees grid + detail modal. Two placements:
//   1. BrowserWindow's Navigator tab — all chapters, chapter-filter dropdown
//   2. ChapterPage (dynamic + static-HTML mirror) — scoped to one chapter,
//      dropdown hidden
//
// Self-manages fetch, filter, sort, and selected-awardee modal state. A
// sessionStorage cache is shared across instances so switching tabs or
// navigating between pages doesn't refetch the full winners list.
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const AWARDEES_CACHE_KEY = "gnf:awardees:v1";
const DEFAULT_CHAPTERS = ["Western New York", "Denver", "Central New York", "Capital Region"];

const loadCached = () => {
  try {
    const raw = sessionStorage.getItem(AWARDEES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveCache = (list) => {
  try {
    sessionStorage.setItem(AWARDEES_CACHE_KEY, JSON.stringify(list));
  } catch {
    // quota/serialization failures are non-fatal
  }
};

const mapDocToAwardee = (doc) => {
  const data = doc.data();
  let quarter = "Unknown Quarter";
  let createdAtMs = 0;
  if (data.createdAt) {
    try {
      const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      const qNum = Math.floor(d.getMonth() / 3) + 1;
      quarter = `Q${qNum} ${d.getFullYear()}`;
      createdAtMs = d.getTime();
    } catch {
      // fall through to defaults
    }
  }
  return {
    id: doc.id,
    businessName: data.businessName || "Unnamed Business",
    founderName: data.founderName || "Unknown Founder",
    about: data.about || "",
    website: data.website || "",
    photoUrl: data["pitch-photo"] || data.founderPhotoUrl || "",
    chapter: data.chapter || "Unknown Chapter",
    quarter,
    createdAtMs,
  };
};

// Props:
//   chapterName — when set, results are filtered to this chapter and the
//                 chapter-filter dropdown is hidden.
//   chapters    — list of chapter names for the dropdown. Ignored when
//                 chapterName is set. Defaults to the 4 live chapters.
export default function GrantAwardees({ chapterName = "", chapters = DEFAULT_CHAPTERS }) {
  const [awardees, setAwardees] = useState(loadCached);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [chapterFilter, setChapterFilter] = useState("");
  const [sort, setSort] = useState("alpha");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (awardees.length === 0) setLoading(true);
      try {
        const snap = await getDocs(
          query(collection(db, "pitches"), where("isWinner", "==", true))
        );
        if (cancelled) return;
        // Hide winners staged in the admin Grant Winners tab but not yet
        // published. Missing field reads as published (existing winners).
        const list = snap.docs
          .filter((d) => d.data().winnerPublished !== false)
          .map(mapDocToAwardee);
        setAwardees(list);
        saveCache(list);
      } catch (e) {
        console.error("GrantAwardees: failed to load awardees", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selected]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const scoped = chapterName
      ? awardees.filter((a) => a.chapter === chapterName)
      : awardees;
    const matched = scoped.filter((a) => {
      const matchesSearch = !term
        || a.businessName.toLowerCase().includes(term)
        || a.founderName.toLowerCase().includes(term);
      const matchesChapter = !chapterFilter || a.chapter === chapterFilter;
      return matchesSearch && matchesChapter;
    });
    const sorted = [...matched];
    if (sort === "newest") sorted.sort((a, b) => b.createdAtMs - a.createdAtMs);
    else if (sort === "oldest") sorted.sort((a, b) => a.createdAtMs - b.createdAtMs);
    else sorted.sort((a, b) => a.businessName.localeCompare(b.businessName));
    return sorted;
  }, [awardees, chapterName, searchTerm, chapterFilter, sort]);

  const showChapterDropdown = !chapterName;

  return (
    <>
      <div
        className={`mb-awardee-filters${showChapterDropdown ? "" : " mb-awardee-filters--two"}`}
        style={{ marginBottom: 24 }}
      >
        <input
          type="search"
          placeholder="Search by founder or business name"
          aria-label="Search by founder or business name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={filterInputStyle}
        />
        {showChapterDropdown && (
          <select
            aria-label="Filter by chapter"
            value={chapterFilter}
            onChange={(e) => setChapterFilter(e.target.value)}
            style={filterInputStyle}
          >
            <option value="">All Chapters</option>
            {chapters.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        <select
          aria-label="Sort awardees"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={filterInputStyle}
        >
          <option value="alpha">Sort · Alphabetical</option>
          <option value="newest">Sort · Newest first</option>
          <option value="oldest">Sort · Oldest first</option>
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <span className="mb-numeral" style={{ fontSize: 14, color: "var(--mb-ink-60)" }}>
            LOADING AWARDEES&hellip;
          </span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={emptyStyle}>
          <p className="mb-body">No awardees match your search criteria. Try adjusting your filters.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="mb-grid mb-grid-4" style={{ gap: 28 }}>
          {filtered.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a)}
              className="mb-card"
              aria-label={`View details for ${a.businessName} by ${a.founderName}`}
              style={cardBtnStyle}
            >
              {a.photoUrl && (
                <div style={{ borderBottom: "var(--border-ink-2)", background: "var(--mb-ink)" }}>
                  <img
                    src={a.photoUrl}
                    alt={`${a.businessName} - ${a.chapter} Good Neighbor Fund $1,000 grant recipient`}
                    width="400"
                    height="400"
                    loading={i < 4 ? "eager" : "lazy"}
                    fetchPriority={i < 4 ? "high" : "auto"}
                    decoding="async"
                    style={cardImgStyle}
                  />
                </div>
              )}
              <div style={cardBodyStyle}>
                <div className="mb-numeral" style={metaRowStyle}>
                  <span>{a.chapter}</span>
                  <span>{a.quarter}</span>
                </div>
                <h3 className="mb-h4" style={cardTitleStyle}>{a.businessName}</h3>
                <div className="mb-italic" style={byLineStyle}>by {a.founderName}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <AwardeeModal awardee={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

// --- Modal ---------------------------------------------------------

function AwardeeModal({ awardee, onClose }) {
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="awardee-modal-title"
      style={backdropStyle}
    >
      <div onClick={(e) => e.stopPropagation()} style={modalShellStyle}>
        <div style={modalHeaderStyle}>
          <span>Grant Awardee</span>
          <button type="button" onClick={onClose} aria-label="Close" style={modalCloseStyle}>
            &times;
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {awardee.photoUrl && (
            <div style={modalImageWrapStyle}>
              <img
                src={awardee.photoUrl}
                alt={`${awardee.businessName} - ${awardee.chapter} Good Neighbor Fund $1,000 grant recipient`}
                style={modalImageStyle}
              />
            </div>
          )}

          <div style={modalBodyStyle}>
            <div className="mb-numeral" style={metaRowStyle}>
              <span>{awardee.chapter}</span>
              <span>{awardee.quarter}</span>
            </div>

            <h2
              id="awardee-modal-title"
              className="mb-h3"
              style={{
                margin: 0,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              {awardee.businessName}
            </h2>

            <div className="mb-italic" style={{ fontSize: 15, color: "var(--mb-ink-60)" }}>
              by {awardee.founderName}
            </div>

            {awardee.about && (
              <p className="mb-body" style={{ fontSize: 14, lineHeight: 1.6, marginTop: 4 }}>
                {awardee.about}
              </p>
            )}

            {awardee.website && (
              <a
                href={awardee.website.startsWith("http") ? awardee.website : `http://${awardee.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-btn mb-btn-ink"
                style={{ marginTop: 8, width: "100%", padding: "12px 14px", fontSize: 13 }}
              >
                Visit Website
                <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Styles --------------------------------------------------------
// Kept co-located so the component is self-contained. Grid + responsive
// breakpoints for the filter toolbar live in theme-tokens.css
// (.mb-awardee-filters) so the static-HTML awardees section can reuse
// them without duplicating layout logic in chapter-hydration.js.

const filterInputStyle = {
  padding: "12px 14px",
  fontFamily: "var(--font-content)",
  fontSize: 14,
  background: "var(--mb-chalk)",
  color: "var(--mb-ink)",
  border: "var(--border-ink-2)",
  boxShadow: "var(--shadow-hard-sm)",
};

const emptyStyle = {
  textAlign: "center",
  padding: "40px 20px",
  marginTop: 20,
  border: "1px dashed var(--mb-ink)",
};

const cardBtnStyle = {
  padding: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  textAlign: "left",
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
  width: "100%",
};

const cardImgStyle = {
  width: "100%",
  height: "auto",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  display: "block",
};

const cardBodyStyle = {
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  flex: 1,
};

const metaRowStyle = {
  fontSize: 11,
  color: "var(--mb-ink-60)",
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
};

const cardTitleStyle = {
  margin: 0,
  fontFamily: "var(--font-serif)",
  fontWeight: 600,
  fontSize: 24,
  lineHeight: 1.1,
  letterSpacing: "-0.01em",
};

const byLineStyle = { fontSize: 14, color: "var(--mb-ink-60)" };

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.55)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  padding: 20,
  boxSizing: "border-box",
};

const modalShellStyle = {
  background: "var(--mb-chalk)",
  border: "var(--border-ink-2)",
  boxShadow: "var(--shadow-hard-lg)",
  width: "100%",
  maxWidth: 640,
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  position: "relative",
};

const modalHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "var(--mb-ink)",
  color: "var(--mb-chalk)",
  padding: "10px 14px",
  flexShrink: 0,
  fontFamily: "var(--font-pixel)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontSize: 11,
  fontWeight: 700,
};

const modalCloseStyle = {
  background: "var(--mb-magenta)",
  border: "1px solid var(--mb-chalk)",
  color: "var(--mb-chalk)",
  width: 22,
  height: 22,
  lineHeight: 1,
  fontSize: 14,
  fontWeight: "bold",
  cursor: "pointer",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-content)",
};

const modalImageWrapStyle = {
  borderBottom: "var(--border-ink-2)",
  background: "var(--mb-ink)",
  flexShrink: 0,
  display: "flex",
  justifyContent: "center",
};

const modalImageStyle = {
  maxHeight: 260,
  maxWidth: "100%",
  width: "auto",
  height: "auto",
  objectFit: "contain",
  display: "block",
};

const modalBodyStyle = {
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};
