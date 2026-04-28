import React, { useEffect, useRef, forwardRef } from "react";
import { RetroButton, RetroPill } from "../../ui/retro";
import StatusIcon from "../../icons/StatusIcon";
import ReviewRatingIcon from "../../icons/ReviewRatingIcon";
import { ratingTonePill } from "../../../helpers/labels";

const RATING_ORDER = { Favorite: 1, Consideration: 2, Pass: 3, Ineligible: 4, "No Rating": 5 };

/**
 * Right pane in Live Review mode. Shows the focused pitch as three stacked
 * sections: Header (with action bar + nav), LP Comments + ratings, Discussion
 * Notes (with sticky composer).
 *
 * Forwarded ref points at the notes textarea so the parent can focus it
 * when the `n` shortcut fires.
 */
const LiveReviewDetail = forwardRef(function LiveReviewDetail(
  {
    pitch,
    grouped,
    formatDate,
    onPrev,
    onNext,
    onOpenDetailsDrawer,
    actionProps,
    notesProps,
    isFirst,
    isLast,
  },
  notesTextareaRef
) {
  const scrollRef = useRef(null);
  // Reset scroll to top whenever the focused pitch changes — prevents the
  // previous pitch's scroll position from carrying over.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0 });
    }
  }, [pitch?.id]);

  if (!pitch) {
    return (
      <div className="win95-live-review-detail" ref={scrollRef}>
        <div className="win95-live-review-detail__empty">
          No pitch selected.
        </div>
      </div>
    );
  }

  const {
    handleToggleShortlist,
    handleAssignWinner,
    shortlistTogglingId,
  } = actionProps;

  const {
    user,
    isSuperAdmin,
    adminNotesByPitch,
    adminNoteDrafts,
    setAdminNoteDrafts,
    editingAdminNoteId,
    editingAdminNoteText,
    setEditingAdminNoteText,
    adminNoteSavingId,
    handleAddAdminNote,
    handleStartEditAdminNote,
    handleSaveEditAdminNote,
    handleCancelEditAdminNote,
    handleDeleteAdminNote,
  } = notesProps;

  const notesForPitch = adminNotesByPitch[pitch.id] || [];
  const formattedDate = formatDate(pitch.createdAt || pitch.createdDate);
  const ratingChips = Object.entries(grouped.byRating || {}).sort(
    ([a], [b]) => (RATING_ORDER[a] || 99) - (RATING_ORDER[b] || 99)
  );

  return (
    <div className="win95-live-review-detail" ref={scrollRef}>
      {/* Section 1 — Header + actions */}
      <section className="win95-live-review-section">
        <div className="win95-live-review-section__head">
          <div className="win95-live-review-section__title-row">
            <h3 className="win95-live-review-section__title">
              {pitch.businessName || "N/A"}
              <span className="win95-live-review-section__title-by">
                by {pitch.founderName || "N/A"}
              </span>
            </h3>
            <div
              className="win95-live-review-scoreblock"
              title={
                grouped.scoredCount > 0
                  ? `Weighted score. Favorite +2, Consideration +1, Pass 0, Ineligible -2. Average across ${grouped.scoredCount} rated review(s).`
                  : "No rated reviews yet."
              }
            >
              <div className="win95-live-review-scoreblock__row">
                <span className="win95-live-review-scoreblock__label">Score</span>
                <span className="win95-live-review-scoreblock__num">
                  {grouped.scoredCount > 0
                    ? (grouped.score > 0 ? `+${grouped.score}` : grouped.score)
                    : "—"}
                </span>
              </div>
              <div className="win95-live-review-scoreblock__row">
                <span className="win95-live-review-scoreblock__label">Avg</span>
                <span className="win95-live-review-scoreblock__num">
                  {grouped.averageScore != null ? grouped.averageScore.toFixed(2) : "—"}
                </span>
              </div>
            </div>
          </div>
          <div className="win95-live-review-section__action-bar">
            <div className="win95-live-review-section__nav" role="group" aria-label="Navigate pitches">
              <RetroButton size="sm" onClick={onPrev} disabled={isFirst} title="Previous pitch (↑ or k)">
                ‹
              </RetroButton>
              <RetroButton size="sm" onClick={onNext} disabled={isLast} title="Next pitch (↓ or j)">
                ›
              </RetroButton>
            </div>
            <div className="win95-live-review-section__actions">
              <RetroButton
                size="sm"
                variant={pitch.shortlisted ? "primary" : "default"}
                onClick={() => handleToggleShortlist(pitch.id, pitch.shortlisted)}
                disabled={shortlistTogglingId === pitch.id}
                title={pitch.shortlisted ? "Remove from group shortlist (s)" : "Add to group shortlist (s)"}
              >
                {pitch.shortlisted ? "Shortlisted" : "Shortlist"}
              </RetroButton>
              <RetroButton
                size="sm"
                onClick={() => handleAssignWinner(pitch.id, pitch.isWinner)}
              >
                {pitch.isWinner ? "Remove Winner" : "Assign Winner"}
              </RetroButton>
              <RetroButton size="sm" variant="primary" onClick={onOpenDetailsDrawer} title="Open full pitch details">
                Pitch Details
              </RetroButton>
            </div>
          </div>
        </div>

        {pitch.aiSummary ? (
          <p className="win95-live-review-summary">{pitch.aiSummary}</p>
        ) : (
          <p className="win95-live-review-summary win95-live-review-summary--fallback">
            <em>{pitch.valueProp ? pitch.valueProp.substring(0, 240) + (pitch.valueProp.length > 240 ? "…" : "") : "No AI summary yet."}</em>
          </p>
        )}

        <div className="win95-live-review-meta">
          <span>{pitch.chapter || "N/A"}</span>
          <span className="win95-live-review-meta__sep">·</span>
          <span style={{ fontFamily: "var(--font-numeral)" }}>{pitch.quarter || "N/A"}</span>
          <span className="win95-live-review-meta__sep">·</span>
          <span>Submitted {formattedDate}</span>
        </div>

        {(pitch.isContest || pitch.isWinner || pitch.shortlisted) && (
          <div className="win95-live-review-pills">
            {pitch.isContest && <RetroPill tone="purple">Contest Submission</RetroPill>}
            {pitch.isWinner && (
              <RetroPill tone="green" icon={<StatusIcon type="trophy" size={14} />}>
                Grant Winner
              </RetroPill>
            )}
            {pitch.shortlisted && <RetroPill tone="yellow">Shortlisted</RetroPill>}
          </div>
        )}
      </section>

      {/* Section 2 — LP ratings + comments */}
      <section className="win95-live-review-section">
        <p className="win95-live-review-section__label">
          LP Reviews ({grouped.count})
        </p>
        {grouped.count > 0 ? (
          <>
            <div className="win95-live-review-rating-row">
              {ratingChips.map(([rating, data]) => (
                <RetroPill
                  key={rating}
                  tone={ratingTonePill(rating)}
                  icon={<ReviewRatingIcon rating={rating} size={14} />}
                  title={`Reviewers: ${data.reviewers.join(", ")}`}
                >
                  {rating}: <span style={{ fontFamily: "var(--font-numeral)", marginLeft: 2 }}>{data.count}</span>
                </RetroPill>
              ))}
            </div>
            <p className="win95-live-review-section__label">
              Comments ({grouped.comments.length})
            </p>
            {grouped.comments.length > 0 ? (
              <ul className="win95-live-review-comments-list">
                {grouped.comments.map((comment, i) => (
                  <li key={i} className="win95-live-review-comment">
                    <div className="win95-live-review-comment__author">
                      {comment.reviewer}
                    </div>
                    <div className="win95-live-review-comment__text">
                      {comment.text}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="win95-live-review-empty">
                No comments left in any reviews.
              </p>
            )}
          </>
        ) : (
          <p className="win95-live-review-empty">
            No LP reviews submitted yet.
          </p>
        )}
      </section>

      {/* Section 3 — Discussion notes */}
      <section className="win95-live-review-section">
        <p className="win95-live-review-section__label">
          Discussion Notes ({notesForPitch.length})
        </p>
        <div className="win95-live-review-notes">
          {notesForPitch.length > 0 ? (
            <ul className="win95-live-review-notes__list">
              {notesForPitch.map((note) => {
                const isAuthor = note.authorId === user.uid;
                const canManage = isAuthor || isSuperAdmin;
                const isEditing = editingAdminNoteId === note.id;
                const timestampLabel = formatDate(note.createdAt);
                const edited = (note.editCount || 0) > 0 ? " · edited" : "";
                return (
                  <li key={note.id} className="win95-live-review-note">
                    <div className="win95-live-review-note__head">
                      <div className="win95-live-review-note__author">
                        {note.authorName || "Admin"}
                        <span className="win95-live-review-note__author-meta">
                          · {timestampLabel}{edited}
                        </span>
                      </div>
                      {canManage && !isEditing && (
                        <div className="win95-live-review-note__manage">
                          <button type="button" onClick={() => handleStartEditAdminNote(note)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAdminNote(note.id)}
                            disabled={adminNoteSavingId === note.id}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div>
                        <textarea
                          value={editingAdminNoteText}
                          onChange={(e) => setEditingAdminNoteText(e.target.value)}
                          rows={3}
                          style={{ width: "100%", fontFamily: "inherit", fontSize: 14, padding: 8, boxSizing: "border-box" }}
                          aria-label="Edit note"
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <RetroButton
                            size="sm"
                            variant="primary"
                            onClick={() => handleSaveEditAdminNote(note.id)}
                            disabled={adminNoteSavingId === note.id || !editingAdminNoteText.trim()}
                          >
                            {adminNoteSavingId === note.id ? "Saving…" : "Save"}
                          </RetroButton>
                          <RetroButton size="sm" onClick={handleCancelEditAdminNote}>
                            Cancel
                          </RetroButton>
                        </div>
                      </div>
                    ) : (
                      <div className="win95-live-review-note__text">{note.text}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="win95-live-review-empty">
              No notes yet. Capture anything that comes up during discussion.
            </p>
          )}

          <div className="win95-live-review-notes__composer">
            <textarea
              ref={notesTextareaRef}
              value={adminNoteDrafts[pitch.id] || ""}
              onChange={(e) =>
                setAdminNoteDrafts((prev) => ({ ...prev, [pitch.id]: e.target.value }))
              }
              placeholder="Add a note from the discussion — follow-ups, questions, a quote you want to remember."
              rows={3}
              aria-label="Add admin note"
            />
            <div className="win95-live-review-notes__composer-row">
              <span className="win95-live-review-notes__composer-hint">
                Press N to focus
              </span>
              <RetroButton
                size="sm"
                variant="primary"
                onClick={() => handleAddAdminNote(pitch)}
                disabled={
                  adminNoteSavingId === pitch.id ||
                  !(adminNoteDrafts[pitch.id] || "").trim()
                }
              >
                {adminNoteSavingId === pitch.id ? "Saving…" : "Add Note"}
              </RetroButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
});

export default LiveReviewDetail;
