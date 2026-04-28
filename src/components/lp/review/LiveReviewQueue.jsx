import React, { useEffect, useRef } from "react";

/**
 * Compact left-rail queue of pitches for Live Review mode.
 * Each row shows business name, founder, chapter/quarter, color-only rating
 * chips, and a shortlist dot. Clicking a row sets focus.
 *
 * Keyboard navigation lives in the parent (LiveReviewPane) — this component
 * only renders and reports clicks.
 */

const RATING_CHIP_CLASS = {
  Favorite: "win95-live-review-queue-row__chip--favorite",
  Consideration: "win95-live-review-queue-row__chip--consideration",
  Pass: "win95-live-review-queue-row__chip--pass",
  Ineligible: "win95-live-review-queue-row__chip--ineligible",
  "No Rating": "win95-live-review-queue-row__chip--norating",
};

const RATING_ORDER = { Favorite: 1, Consideration: 2, Pass: 3, Ineligible: 4, "No Rating": 5 };

const LEGEND_ITEMS = [
  { rating: "Favorite", label: "Fav", className: "win95-live-review-queue-row__chip--favorite" },
  { rating: "Consideration", label: "Con", className: "win95-live-review-queue-row__chip--consideration" },
  { rating: "Pass", label: "Pass", className: "win95-live-review-queue-row__chip--pass" },
  { rating: "Ineligible", label: "Inel", className: "win95-live-review-queue-row__chip--ineligible" },
];

function LiveReviewQueue({
  pitches,
  focusedPitchId,
  onFocus,
  getGroupedReviewsForAdmin,
}) {
  const focusedIndex = pitches.findIndex((p) => p.id === focusedPitchId);
  const statusLabel = pitches.length === 0
    ? "0 pitches"
    : `${focusedIndex >= 0 ? focusedIndex + 1 : "—"} of ${pitches.length}`;

  // Keep the active row visible when focus moves via keyboard.
  const activeRowRef = useRef(null);
  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [focusedPitchId]);

  return (
    <div className="win95-live-review-queue" role="region" aria-label="Pitch queue">
      <div className="win95-live-review-queue__header">
        <div className="win95-live-review-queue__status">{statusLabel}</div>
        <div className="win95-live-review-queue__legend" aria-label="Rating chip legend">
          {LEGEND_ITEMS.map((item) => (
            <span
              key={item.rating}
              className={`win95-live-review-queue__legend-item ${item.className}`}
              title={item.rating}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <div className="win95-live-review-queue__list" role="listbox" aria-label="Pitches">
        {pitches.length === 0 ? (
          <div className="win95-live-review-queue__empty">
            No pitches match your filters.
          </div>
        ) : (
          pitches.map((p) => {
            const isActive = p.id === focusedPitchId;
            const grouped = getGroupedReviewsForAdmin(p.id);
            const chips = Object.entries(grouped.byRating || {}).sort(
              ([a], [b]) => (RATING_ORDER[a] || 99) - (RATING_ORDER[b] || 99)
            );
            return (
              <button
                key={p.id}
                ref={isActive ? activeRowRef : undefined}
                type="button"
                role="option"
                aria-selected={isActive}
                className={
                  "win95-live-review-queue-row" +
                  (isActive ? " win95-live-review-queue-row--active" : "")
                }
                onClick={() => onFocus(p.id)}
              >
                <div className="win95-live-review-queue-row__title-line">
                  <span className="win95-live-review-queue-row__title">
                    {p.businessName || "N/A"}
                  </span>
                  {p.shortlisted && (
                    <span
                      className="win95-live-review-queue-row__shortlist-dot"
                      title="Shortlisted"
                      aria-label="Shortlisted"
                    />
                  )}
                </div>
                <div className="win95-live-review-queue-row__by">
                  by {p.founderName || "N/A"}
                </div>
                <div className="win95-live-review-queue-row__meta">
                  {p.chapter || "—"} · {p.quarter || "—"}
                </div>
                {chips.length > 0 && (
                  <div className="win95-live-review-queue-row__chips">
                    {chips.map(([rating, data]) => (
                      <span
                        key={rating}
                        className={
                          "win95-live-review-queue-row__chip " +
                          (RATING_CHIP_CLASS[rating] || "")
                        }
                        title={`${rating}: ${data.count}`}
                      >
                        {data.count}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default LiveReviewQueue;
