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
  keyboardHelpOpen,
  setKeyboardHelpOpen,
  formatDate,
  getGroupedReviewsForAdmin,
  actionProps,
  notesProps,
  filtersProps,
}) {

  // Snap focus to the first pitch when the focused id is missing or no
  // longer in the filtered list. Runs whenever the list or focus changes.
  useEffect(() => {
    if (pitches.length === 0) {
      if (focusedPitchId !== null) setFocusedPitchId(null);
      return;
    }
    const stillVisible = pitches.some((p) => p.id === focusedPitchId);
    if (!stillVisible) {
      setFocusedPitchId(pitches[0].id);
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
    if (focusedIndex > 0) setFocusedPitchId(pitches[focusedIndex - 1].id);
  };
  const handleNext = () => {
    if (focusedIndex >= 0 && focusedIndex < pitches.length - 1) {
      setFocusedPitchId(pitches[focusedIndex + 1].id);
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

      switch (e.key) {
        case "Escape":
          // Priority order: drawer > help.
          if (detailsDrawerOpen) {
            setDetailsDrawerOpen(false);
            e.preventDefault();
          } else if (keyboardHelpOpen) {
            setKeyboardHelpOpen(false);
            e.preventDefault();
          }
          return;
        case "?":
          setKeyboardHelpOpen((v) => !v);
          e.preventDefault();
          return;
        default:
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
    keyboardHelpOpen,
    setDetailsDrawerOpen,
    setKeyboardHelpOpen,
    actionProps,
    setFocusedPitchId,
  ]);

  return (
    <div className="win95-live-review">
      <div className="win95-live-review-toolbar">
        {filtersProps && <LiveReviewFilterBar {...filtersProps} />}
        <div className="win95-live-review-filters-anchor">
          <button
            type="button"
            className="win95-live-review-filterbar__btn win95-live-review-toolbar__help-btn"
            aria-expanded={keyboardHelpOpen}
            onClick={() => setKeyboardHelpOpen((v) => !v)}
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
          {keyboardHelpOpen && (
            <div className="win95-live-review-help" role="dialog" aria-label="Keyboard shortcuts">
              <p className="win95-live-review-help__title">Keyboard Shortcuts</p>
              <dl>
                <dt>↓ / J</dt><dd>Next pitch</dd>
                <dt>↑ / K</dt><dd>Previous pitch</dd>
                <dt>S</dt><dd>Toggle shortlist on focused pitch</dd>
                <dt>N</dt><dd>Focus the notes composer</dd>
                <dt>?</dt><dd>Toggle this help</dd>
                <dt>Esc</dt><dd>Close drawer / help</dd>
              </dl>
            </div>
          )}
        </div>
      </div>

      <div className="win95-live-review-body">
        <LiveReviewQueue
          pitches={pitches}
          focusedPitchId={focusedPitchId}
          onFocus={setFocusedPitchId}
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
