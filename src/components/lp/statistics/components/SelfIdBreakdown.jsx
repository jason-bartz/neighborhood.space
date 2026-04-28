import React, { useMemo, useState } from "react";
import SectionCard from "./SectionCard";
import BarRow from "./BarRow";
import StatCard from "./StatCard";
import { selfIdBreakdown, MIN_SAMPLE_FOR_PCT } from "../statsAggregations";

// Compares applicant composition to winner composition across self-ID
// categories. Tile row at the top shows each category's share of *winners*
// (the "who did we fund" angle); the normalized bar table below shows
// applicant volume with a winners overlay (the "who applied vs who won"
// angle). Together they answer both questions without forcing the user to
// read percentages off the bar labels.
//
// Founders can identify with multiple categories, so the percentages in the
// tile row can sum to more than 100%. Noted in the footnote.
export default function SelfIdBreakdown({ pitches, chaptersByName }) {
  const [view, setView] = useState("count");
  const data = useMemo(() => selfIdBreakdown(pitches, chaptersByName), [pitches, chaptersByName]);
  const { rows, notSpecified, totalPitches, totalWinners } = data;

  const visibleRows = rows.filter((r) => r.applicants > 0);
  const hasTagged = visibleRows.length > 0 || notSpecified.applicants > 0;

  if (!hasTagged) {
    return (
      <SectionCard eyebrow="Self-identification" title="Who applies vs. who wins">
        <EmptyNote>No self-identification data yet. Pitches include this once applicants fill out the form's identification section.</EmptyNote>
      </SectionCard>
    );
  }

  const maxValue =
    view === "dollars"
      ? Math.max(1, ...visibleRows.map((r) => r.dollars))
      : Math.max(1, ...visibleRows.map((r) => r.applicants));

  // Tiles: top N categories by winner count, so the "where our grants went"
  // picture dominates the headline. Falls back to showing top applicant
  // communities if no category has picked up a winner yet.
  const winnerTiles = useMemo(() => {
    const withWinners = visibleRows
      .filter((r) => r.winners > 0)
      .sort((a, b) => b.winners - a.winners);
    if (withWinners.length > 0) return withWinners.slice(0, 4);
    return visibleRows
      .slice()
      .sort((a, b) => b.applicants - a.applicants)
      .slice(0, 4);
  }, [visibleRows]);

  const showWinnerTiles = totalWinners > 0;

  return (
    <SectionCard
      eyebrow="Self-identification"
      title="Who applies vs. who wins"
      note={
        view === "count"
          ? "Tiles: each category's share of our winners. Bar chart: applicants per category, with winners overlaid in ink. Row widths are normalized — bars start and end at the same x-position."
          : "Dollars deployed to each self-ID category. Founders can tag multiple categories; row totals do not sum to the grand total dollars figure."
      }
      actions={<ViewToggle value={view} onChange={setView} />}
    >
      {showWinnerTiles && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {winnerTiles.map((row) => {
            const winnerShare = totalWinners > 0
              ? Math.round((row.winners / totalWinners) * 100)
              : 0;
            return (
              <StatCard
                key={row.category}
                label={row.category}
                numeric={winnerShare}
                format={(n) => `${Math.round(n)}%`}
                value={`${winnerShare}%`}
                caption={`${row.winners} of ${totalWinners} winners`}
              />
            );
          })}
        </div>
      )}

      <div style={{ display: "grid", gap: 4 }}>
        {visibleRows.map((row, i) => (
          <BarRow
            key={row.category}
            label={row.category}
            value={view === "dollars" ? row.dollars : row.applicants}
            secondaryValue={view === "dollars" ? undefined : row.winners}
            maxValue={maxValue}
            delay={60 * i}
            valueLabel={
              view === "dollars"
                ? `$${row.dollars.toLocaleString()}`
                : `${row.applicants.toLocaleString()} applicants`
            }
            secondaryLabel={
              view === "dollars"
                ? undefined
                : `${row.winners} winner${row.winners === 1 ? "" : "s"}${
                    row.winPct == null ? "" : ` · ${row.winPct}% win rate`
                  }`
            }
          />
        ))}
        {notSpecified.applicants > 0 && view === "count" && (
          <BarRow
            label="Not specified"
            value={notSpecified.applicants}
            secondaryValue={notSpecified.winners}
            maxValue={maxValue}
            tone="butter"
            delay={60 * visibleRows.length}
            valueLabel={`${notSpecified.applicants} applicants`}
            secondaryLabel={`${notSpecified.winners} winner${notSpecified.winners === 1 ? "" : "s"}${
              notSpecified.winPct == null ? "" : ` · ${notSpecified.winPct}%`
            }`}
          />
        )}
      </div>

      <p style={{
        marginTop: 14,
        paddingTop: 10,
        borderTop: "1px dashed var(--mb-ink-15, rgba(0,0,0,0.12))",
        fontSize: 11,
        color: "var(--mb-ink-60, #666)",
      }}>
        Based on <strong>{totalPitches}</strong> applications and <strong>{totalWinners}</strong> winners.
        Founders can identify with multiple categories, so tile percentages and bar rows may sum above 100%.
        Win-rate percentages require at least {MIN_SAMPLE_FOR_PCT} applications in a category before a value is shown.
        The <strong>LGBTQ+ Owned/Led</strong> tag was added to the application form in April 2026, so its
        applicant and winner counts only reflect submissions from that point forward.
      </p>
    </SectionCard>
  );
}

function ViewToggle({ value, onChange }) {
  const base = {
    background: "transparent",
    color: "var(--mb-chalk)",
    border: "1.5px solid var(--mb-chalk)",
    padding: "3px 10px",
    fontFamily: "inherit",
    fontSize: 11,
    cursor: "pointer",
  };
  const active = { ...base, background: "var(--mb-chalk)", color: "var(--mb-ink)" };
  return (
    <div role="group" aria-label="View mode" style={{ display: "inline-flex" }}>
      <button type="button" onClick={() => onChange("count")} style={value === "count" ? active : base}>
        Counts
      </button>
      <button type="button" onClick={() => onChange("dollars")} style={value === "dollars" ? active : base}>
        Dollars
      </button>
    </div>
  );
}

function EmptyNote({ children }) {
  return (
    <div style={{ padding: 24, textAlign: "center", color: "var(--mb-ink-60, #666)", fontSize: 13 }}>
      {children}
    </div>
  );
}
