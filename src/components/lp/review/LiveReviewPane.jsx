import React, { useEffect, useMemo, useRef } from "react";
import LiveReviewQueue from "./LiveReviewQueue";
import LiveReviewDetail from "./LiveReviewDetail";
import LiveReviewFilterBar from "./LiveReviewFilterBar";
import PitchDetailsDrawer from "./PitchDetailsDrawer";

/**
 * Top-level container for Live Review mode. Owns the meter strip, filter
 * trigger button, and the two-pane body. Snaps focus to the first pitch
 * when entering Live mode or when the focused pitch falls out of the
 * filtered list.
 *
 * All data and handlers come from the parent (LimitedPartnerPortal). This
 * component never reads from Firestore directly.
 */
function LiveReviewPane({
  pitches,
  focusedPitchId,
  setFocusedPitchId,
  detailsDrawerOpen,
  setDetailsDrawerOpen,
  formatDate,
  getGroupedReviewsForAdmin,
  actionProps,
  notesProps,
  filtersProps,
}) {

  // Track whether the user has actively chosen a pitch (click/keyboard).
  // Until they do, we keep snapping focus to the current pitches[0] so that
  // late-arriving Firestore updates and re-sorts can't leave focus locked
  // onto a pitch that's now buried 40+ rows down (which would force the
  // queue to auto-scroll past the top of the list on entry).
  const userPickedFocusRef = useRef(false);
  const pickFocus = (id) => {
    userPickedFocusRef.current = true;
    setFocusedPitchId(id);
  };

  // Snap focus to the first pitch when the focused id is missing, no longer
  // in the filtered list, or the user hasn't picked one yet.
  useEffect(() => {
    if (pitches.length === 0) {
      if (focusedPitchId !== null) setFocusedPitchId(null);
      return;
    }
    const stillVisible = pitches.some((p) => p.id === focusedPitchId);
    if (!stillVisible || !userPickedFocusRef.current) {
      if (focusedPitchId !== pitches[0].id) {
        setFocusedPitchId(pitches[0].id);
      }
    }
  }, [pitches, focusedPitchId, setFocusedPitchId]);

  const focusedIndex = pitches.findIndex((p) => p.id === focusedPitchId);
  const focusedPitch = focusedIndex >= 0 ? pitches[focusedIndex] : null;
  const grouped = useMemo(
    () => (focusedPitch ? getGroupedReviewsForAdmin(focusedPitch.id) : null),
    [focusedPitch, getGroupedReviewsForAdmin]
  );

  const notesTextareaRef = useRef(null);

  const handlePrev = () => {
    if (focusedIndex > 0) pickFocus(pitches[focusedIndex - 1].id);
  };
  const handleNext = () => {
    if (focusedIndex >= 0 && focusedIndex < pitches.length - 1) {
      pickFocus(pitches[focusedIndex + 1].id);
    }
  };

  // Global keyboard shortcuts. Bound while Live Review is mounted; cleaned
  // up on unmount. Skips when the user is typing in any form control.
  useEffect(() => {
    const handler = (e) => {
      // Skip while typing — the notes textarea, search input, dropdowns,
      // edit-note textareas, etc. all need normal keyboard behavior.
      const t = e.target;
      const tag = t && t.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (t && t.isContentEditable)
      ) {
        return;
      }
      // Don't hijack browser/system shortcuts.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") {
        if (detailsDrawerOpen) {
          setDetailsDrawerOpen(false);
          e.preventDefault();
        }
        return;
      }

      // Movement / action shortcuts only apply when there's a focused pitch.
      if (!focusedPitch) return;

      switch (e.key) {
        case "ArrowDown":
        case "j":
          handleNext();
          e.preventDefault();
          return;
        case "ArrowUp":
        case "k":
          handlePrev();
          e.preventDefault();
          return;
        case "s":
        case "S":
          actionProps.handleToggleShortlist(focusedPitch.id, focusedPitch.shortlisted);
          e.preventDefault();
          return;
        case "n":
        case "N":
          if (notesTextareaRef.current) {
            notesTextareaRef.current.focus();
            notesTextareaRef.current.scrollIntoView({ block: "nearest" });
          }
          e.preventDefault();
          return;
        default:
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    focusedPitch,
    focusedIndex,
    pitches,
    detailsDrawerOpen,
    setDetailsDrawerOpen,
    actionProps,
    setFocusedPitchId,
  ]);

  return (
    <div className="win95-live-review">
      <div className="win95-live-review-toolbar">
        {filtersProps && <LiveReviewFilterBar {...filtersProps} />}
      </div>

      <div className="win95-live-review-body">
        <LiveReviewQueue
          pitches={pitches}
          focusedPitchId={focusedPitchId}
          onFocus={pickFocus}
          getGroupedReviewsForAdmin={getGroupedReviewsForAdmin}
        />
        <LiveReviewDetail
          ref={notesTextareaRef}
          pitch={focusedPitch}
          grouped={grouped || { count: 0, byRating: {}, comments: [] }}
          formatDate={formatDate}
          onPrev={handlePrev}
          onNext={handleNext}
          onOpenDetailsDrawer={() => setDetailsDrawerOpen(true)}
          actionProps={actionProps}
          notesProps={notesProps}
          isFirst={focusedIndex <= 0}
          isLast={focusedIndex < 0 || focusedIndex >= pitches.length - 1}
        />
      </div>

      <PitchDetailsDrawer
        pitch={focusedPitch}
        open={detailsDrawerOpen}
        onClose={() => setDetailsDrawerOpen(false)}
      />
    </div>
  );
}

export default LiveReviewPane;
