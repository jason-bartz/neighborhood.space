import React, { useMemo } from "react";
import SectionCard from "./SectionCard";
import BarRow from "./BarRow";
import StatCard from "./StatCard";
import { reviewerEngagement, MIN_SAMPLE_FOR_PCT } from "../statsAggregations";

// How the review panel is functioning: coverage per pitch and the
// distribution of ratings. "Active reviewers" was intentionally removed —
// directors cared more about the coverage/distribution view than the
// headcount tile, which largely echoed the Chapter Members tab anyway.
export default function ReviewerEngagement({ reviews, users, chapterFilter }) {
  const data = useMemo(
    () => reviewerEngagement(reviews, users, chapterFilter),
    [reviews, users, chapterFilter]
  );

  const coverage = data.totalReviews === 0 ? 0 : data.avgReviewsPerPitch;

  const ratingTotal = Object.values(data.ratingDistribution).reduce((s, v) => s + v, 0);
  const ratingRows = ["Favorite", "Consideration", "Pass", "Ineligible"].map((rating) => ({
    rating,
    count: data.ratingDistribution[rating] || 0,
  }));
  const maxRating = Math.max(1, ...ratingRows.map((r) => r.count));

  return (
    <SectionCard
      eyebrow="Reviewer engagement"
      title="How the panel is reviewing"
      note="Activity from LPs in this chapter scope. Rating distribution reveals whether the panel is spread across options or leaning toward indecision."
    >
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        marginBottom: 16,
      }}>
        <StatCard
          label="Total reviews"
          numeric={data.totalReviews}
          format={(n) => Math.round(n).toLocaleString()}
          value={data.totalReviews.toLocaleString()}
          caption={`Across ${data.pitchesReviewed} pitch${data.pitchesReviewed === 1 ? "" : "es"}`}
        />
        <StatCard
          label="Avg reviews / pitch"
          numeric={coverage}
          format={(n) => n.toFixed(1)}
          value={coverage.toFixed(1)}
          caption="Coverage depth"
        />
      </div>

      {ratingTotal > 0 ? (
        <>
          <div style={{ display: "grid", gap: 4 }}>
            {ratingRows.map((row, i) => (
              <BarRow
                key={row.rating}
                label={row.rating}
                value={row.count}
                maxValue={maxRating}
                delay={60 * i}
                valueLabel={`${row.count}`}
                secondaryLabel={
                  ratingTotal >= MIN_SAMPLE_FOR_PCT
                    ? `${Math.round((row.count / ratingTotal) * 100)}%`
                    : undefined
                }
                tone={
                  row.rating === "Favorite" ? "pink"
                    : row.rating === "Consideration" ? "aqua"
                      : row.rating === "Pass" ? "butter"
                        : "pink"
                }
              />
            ))}
          </div>
          <p style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: "1px dashed var(--mb-ink-15, rgba(0,0,0,0.12))",
            fontSize: 11,
            color: "var(--mb-ink-60, #666)",
          }}>
            A healthy distribution has meaningful Favorite / Pass numbers. A heavy lean toward
            Consideration is a signal the panel may be under-committing.
          </p>
        </>
      ) : (
        <EmptyNote>No reviews submitted yet in this scope.</EmptyNote>
      )}
    </SectionCard>
  );
}

function EmptyNote({ children }) {
  return (
    <div style={{ padding: 24, textAlign: "center", color: "var(--mb-ink-60, #666)", fontSize: 13 }}>
      {children}
    </div>
  );
}
