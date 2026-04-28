import React, { useMemo } from "react";

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

  const sortDisabled =
    adminFavoriteFilterMode === "favsOnly" || adminFavoriteFilterMode === "favsAndCons";

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

      <div className="win95-live-review-filterbar__select">
        <MultiSelectDropdown
          options={quarters}
          selected={adminQuarterFilter}
          onChange={setAdminQuarterFilter}
          placeholder="All Quarters"
        />
      </div>

      <select
        className="win95-live-review-filterbar__select"
        aria-label="Filter by rating"
        value={adminFavoriteFilterMode}
        onChange={(e) => setAdminFavoriteFilterMode(e.target.value)}
      >
        <option value="all">All Ratings</option>
        <option value="favsOnly">Favorites Only</option>
        <option value="favsAndCons">Favs &amp; Considerations</option>
        <option value="shortlisted">Shortlisted Only</option>
      </select>

      <select
        className="win95-live-review-filterbar__select"
        aria-label="Sort order"
        value={adminSortMode}
        onChange={(e) => setAdminSortMode(e.target.value)}
        disabled={sortDisabled}
        title={
          sortDisabled
            ? "Sort is fixed to favorite count while filtering by favorites"
            : "Sort order"
        }
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="avgDesc">Avg Score ↓</option>
        <option value="avgAsc">Avg Score ↑</option>
        <option value="sumDesc">Total Score ↓</option>
        <option value="sumAsc">Total Score ↑</option>
        <option value="mostReviews">Most Reviews</option>
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
        Export CSV
      </button>
    </div>
  );
}

export default LiveReviewFilterBar;
