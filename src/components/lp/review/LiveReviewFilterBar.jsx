import React, { useEffect, useMemo } from "react";

const LIVE_SORT_OPTIONS = ["avgDesc", "avgAsc", "sumDesc", "sumAsc"];

/**
 * Inline filter + sort controls for Live Review mode. Renders directly in
 * the LiveReviewPane toolbar — no popover. Same prop surface as the old
 * LiveReviewFiltersPopover minus `onClose`, so wiring stays compatible.
 *
 * MultiSelectDropdown is passed in as a prop because it's defined inline in
 * LimitedPartnerPortal.jsx and not yet a shared primitive.
 */
function LiveReviewFilterBar({
  isSuperAdmin,
  adminPitches,
  adminChapterFilter,
  setAdminChapterFilter,
  adminQuarterFilter,
  setAdminQuarterFilter,
  adminFavoriteFilterMode,
  setAdminFavoriteFilterMode,
  adminSortMode,
  setAdminSortMode,
  adminSearch,
  setAdminSearch,
  adminHidePassed,
  setAdminHidePassed,
  handleAdminPitchExport,
  MultiSelectDropdown,
}) {
  const chapters = useMemo(
    () => [...new Set(adminPitches.map((p) => p.chapter).filter(Boolean))].sort(),
    [adminPitches]
  );
  const quarters = useMemo(
    () =>
      [...new Set(adminPitches.map((p) => p.quarter).filter(Boolean))].sort((a, b) => {
        const [aQ, aY] = a.split(" ");
        const [bQ, bY] = b.split(" ");
        if (bY !== aY) return parseInt(bY) - parseInt(aY);
        return parseInt(bQ.substring(1)) - parseInt(aQ.substring(1));
      }),
    [adminPitches]
  );

  const shortlistOnly = adminFavoriteFilterMode === "shortlisted";

  // Sort state is shared with the main Review Pitches tab, which exposes a
  // wider option set (newest/oldest/mostReviews). If we land on Live Review
  // while one of those is active, snap to avgDesc so the dropdown isn't blank.
  useEffect(() => {
    if (!LIVE_SORT_OPTIONS.includes(adminSortMode)) {
      setAdminSortMode("avgDesc");
    }
  }, [adminSortMode, setAdminSortMode]);

  const sortValue = LIVE_SORT_OPTIONS.includes(adminSortMode) ? adminSortMode : "avgDesc";

  return (
    <div className="win95-live-review-filterbar" role="group" aria-label="Filter and sort">
      {isSuperAdmin && (
        <select
          className="win95-live-review-filterbar__select"
          aria-label="Filter by chapter"
          value={adminChapterFilter}
          onChange={(e) => setAdminChapterFilter(e.target.value)}
        >
          <option value="">All Chapters</option>
          {chapters.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}

      <div className="win95-live-review-filterbar__multi">
        <MultiSelectDropdown
          options={quarters}
          selected={adminQuarterFilter}
          onChange={setAdminQuarterFilter}
          placeholder="All Quarters"
        />
      </div>

      <button
        type="button"
        className="win95-live-review-filterbar__btn win95-live-review-filterbar__btn--toggle"
        aria-pressed={shortlistOnly}
        onClick={() =>
          setAdminFavoriteFilterMode(shortlistOnly ? "all" : "shortlisted")
        }
        title={
          shortlistOnly
            ? "Show all pitches"
            : "Show only pitches on the group shortlist"
        }
      >
        Shortlist Only
      </button>

      <select
        className="win95-live-review-filterbar__select"
        aria-label="Sort order"
        value={sortValue}
        onChange={(e) => setAdminSortMode(e.target.value)}
        title="Sort order"
      >
        <option value="avgDesc">Sort: Wtd Avg ↓</option>
        <option value="avgAsc">Sort: Wtd Avg ↑</option>
        <option value="sumDesc">Sort: Total Score ↓</option>
        <option value="sumAsc">Sort: Total Score ↑</option>
      </select>

      <input
        className="win95-live-review-filterbar__search"
        type="search"
        aria-label="Search pitches"
        placeholder="Search name, business, email…"
        value={adminSearch}
        onChange={(e) => setAdminSearch(e.target.value)}
      />

      <button
        type="button"
        className="win95-live-review-filterbar__btn win95-live-review-filterbar__btn--toggle"
        aria-pressed={adminHidePassed}
        onClick={() => setAdminHidePassed(!adminHidePassed)}
        title={
          adminHidePassed
            ? "Show pitches with only Pass/Ineligible reviews"
            : "Hide pitches with only Pass/Ineligible reviews"
        }
      >
        {adminHidePassed ? "Show Passes" : "Hide Passes"}
      </button>

      <button
        type="button"
        className="win95-live-review-filterbar__btn"
        onClick={handleAdminPitchExport}
        title="Download current results as CSV"
      >
        Export
      </button>
    </div>
  );
}

export default LiveReviewFilterBar;
