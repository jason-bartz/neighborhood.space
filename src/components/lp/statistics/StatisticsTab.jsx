import React, { useMemo, useState } from "react";
import "./StatisticsTab.css";
import { useChapterStats } from "./useChapterStats";
import KPITiles from "./components/KPITiles";
import ApplicationsOverTime from "./components/ApplicationsOverTime";
import CategoryBreakdown from "./components/CategoryBreakdown";
import CategoriesOverTime from "./components/CategoriesOverTime";
import CategoryByDemographics from "./components/CategoryByDemographics";
import CategoryByChapter from "./components/CategoryByChapter";
import SelfIdBreakdown from "./components/SelfIdBreakdown";
import ReferralSources from "./components/ReferralSources";
import GeographicReach from "./components/GeographicReach";
import ReviewerEngagement from "./components/ReviewerEngagement";
import PipelineHealth from "./components/PipelineHealth";

// Chapter Statistics tab.
//
// Reads the caller's role off `user`:
//   • superAdmin              → chapter filter dropdown (All or a specific chapter)
//   • chapter_director / lp   → scoped to user.chapter (no toggle shown)
//
// Data loads via useChapterStats. Intermediate aggregations live in
// statsAggregations.js and render through small display components so the
// container stays composition-only.
export default function StatisticsTab({ user, chaptersFromPortal }) {
  const isSuperAdmin = user?.role === "superAdmin";
  const userChapter = user?.chapter || null;

  // For supers, state holds the selected filter. An empty string means
  // "All chapters" (aggregated view). Non-supers never read this state —
  // effectiveChapter comes from user.chapter in the hook.
  const [superFilter, setSuperFilter] = useState("");

  const chapterFilter = isSuperAdmin ? (superFilter || null) : userChapter;

  const stats = useChapterStats({
    user,
    chapterFilter: isSuperAdmin ? superFilter || null : undefined,
    chaptersFromPortal,
  });

  const scopeLabel = useMemo(() => {
    if (isSuperAdmin) return superFilter ? superFilter : "All chapters";
    return userChapter || "Your chapter";
  }, [isSuperAdmin, superFilter, userChapter]);

  const chapterOptions = useMemo(() => {
    return stats.chapters
      .filter((c) => c && c.name)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [stats.chapters]);

  // Non-super with no chapter assignment — show a benign explanation rather
  // than a spinner that never resolves.
  if (!isSuperAdmin && !userChapter) {
    return (
      <div className="lp-statistics-tab lp-statistics-print-root">
        <ScopeBar
          scopeLabel="No chapter assigned"
          isSuperAdmin={false}
          chapterOptions={[]}
          superFilter=""
          onFilterChange={() => {}}
          onPrint={() => {}}
        />
        <div style={{
          padding: 24,
          textAlign: "center",
          color: "var(--mb-ink-60, #666)",
          fontSize: 13,
          border: "2px solid var(--mb-ink)",
          background: "var(--mb-paper)",
        }}>
          Your account doesn't have a chapter set yet. Ask an admin to assign you to a chapter,
          then come back.
        </div>
      </div>
    );
  }

  return (
    <div className="lp-statistics-tab lp-statistics-print-root">
      <ScopeBar
        scopeLabel={scopeLabel}
        isSuperAdmin={isSuperAdmin}
        chapterOptions={chapterOptions}
        superFilter={superFilter}
        onFilterChange={setSuperFilter}
        onPrint={() => window.print()}
        loading={stats.loading}
      />

      {stats.error && (
        <div style={{
          padding: 12,
          marginBottom: 16,
          border: "2px solid var(--mb-ink)",
          background: "var(--mb-chalk)",
          color: "var(--mb-magenta-deep, #b0306b)",
          fontSize: 13,
        }}>
          Couldn't load statistics: {stats.error.message || String(stats.error)}
        </div>
      )}

      {stats.loading ? (
        <LoadingState />
      ) : (
        <>
          <KPITiles
            pitches={stats.pitches}
            chaptersByName={stats.chaptersByName}
            scopeLabel={scopeLabel}
          />
          <ApplicationsOverTime pitches={stats.pitches} />
          <CategoryBreakdown
            pitches={stats.pitches}
            chaptersByName={stats.chaptersByName}
          />
          <CategoriesOverTime pitches={stats.pitches} />
          <SelfIdBreakdown pitches={stats.pitches} chaptersByName={stats.chaptersByName} />
          <CategoryByDemographics pitches={stats.pitches} />
          {/* Cross-chapter heatmap is only meaningful when the loaded set spans
              multiple chapters — i.e. super-admin viewing "All chapters". For
              any single-chapter scope the row collapses and the chart is just
              a re-do of CategoryBreakdown. */}
          {isSuperAdmin && !chapterFilter && (
            <CategoryByChapter pitches={stats.pitches} />
          )}
          <ReferralSources pitches={stats.pitches} />
          <GeographicReach pitches={stats.pitches} />
          <PipelineHealth pitches={stats.pitches} />
          <ReviewerEngagement
            reviews={stats.reviews}
            users={stats.users}
            chapterFilter={chapterFilter}
          />
        </>
      )}
    </div>
  );
}

function ScopeBar({ scopeLabel, isSuperAdmin, chapterOptions, superFilter, onFilterChange, onPrint, loading }) {
  return (
    <div className="lp-statistics-tab__scopebar">
      <div className="lp-statistics-tab__scopebar__filter">
        <span style={{
          fontFamily: "var(--font-pixel)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--mb-ink-60, #555)",
        }}>
          Chapter scope
        </span>
        {isSuperAdmin ? (
          <select
            aria-label="Chapter filter"
            value={superFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            style={{
              border: "1.5px solid var(--mb-ink)",
              background: "var(--mb-paper)",
              padding: "4px 8px",
              fontFamily: "inherit",
              fontSize: 13,
              minWidth: 180,
            }}
          >
            <option value="">All chapters</option>
            {chapterOptions.map((c) => (
              <option key={c.id || c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        ) : (
          <strong style={{ fontSize: 14 }}>{scopeLabel}</strong>
        )}
        {loading && (
          <span style={{ fontSize: 11, color: "var(--mb-ink-60, #666)" }}>Loading…</span>
        )}
      </div>
      <div className="lp-statistics-tab__scopebar__actions">
        <button
          type="button"
          onClick={onPrint}
          style={{
            background: "var(--mb-paper)",
            color: "var(--mb-ink)",
            border: "2px solid var(--mb-ink)",
            boxShadow: "var(--shadow-hard-sm)",
            padding: "4px 12px",
            fontFamily: "inherit",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Print / Save Report
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{
      padding: 60,
      textAlign: "center",
      fontSize: 14,
      color: "var(--mb-ink-60, #666)",
      border: "2px solid var(--mb-ink)",
      boxShadow: "var(--shadow-hard-sm)",
      background: "var(--mb-paper)",
    }}>
      Loading chapter statistics…
    </div>
  );
}
