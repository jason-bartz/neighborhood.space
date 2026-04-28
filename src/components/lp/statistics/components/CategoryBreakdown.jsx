import React, { useMemo, useState } from "react";
import SectionCard from "./SectionCard";
import BarRow from "./BarRow";
import StatCard from "./StatCard";
import { categoryBreakdown, MIN_SAMPLE_FOR_PCT } from "../statsAggregations";

// What kinds of businesses are applying — and getting funded. Mirrors the
// SelfIdBreakdown shape, with one important difference: each pitch is in
// exactly one AI-assigned category, so rows DO sum to the applicant total
// (plus an "Uncategorized" row for pitches that haven't been classified).
//
// Three views via toggle:
//   • Counts  — applicants per category, winners overlaid in ink
//   • Dollars — total $ deployed per category
//   • Avg     — average award size per category (winners only)
//
// The Avg view is the funding-concentration angle: even if dollars look
// spread evenly, a category whose few winners each got a big check is
// telling a different story than one whose many winners each got a small
// check.
export default function CategoryBreakdown({ pitches, chaptersByName }) {
  const [view, setView] = useState("count");
  const data = useMemo(
    () => categoryBreakdown(pitches, chaptersByName),
    [pitches, chaptersByName]
  );
  const { rows, uncategorized, totalPitches, totalWinners } = data;

  const visibleRows = rows.filter((r) => r.applicants > 0);
  const hasAny = visibleRows.length > 0 || uncategorized.applicants > 0;

  if (!hasAny) {
    return (
      <SectionCard eyebrow="Categories" title="What we're funding">
        <EmptyNote>
          No category data yet. Pitches pick up a category once the AI summary
          step runs on them.
        </EmptyNote>
      </SectionCard>
    );
  }

  const maxValue =
    view === "dollars"
      ? Math.max(1, ...visibleRows.map((r) => r.dollars))
      : view === "avg"
      ? Math.max(1, ...visibleRows.map((r) => r.avgAward))
      : Math.max(1, ...visibleRows.map((r) => r.applicants));

  // Tiles: top categories by winner count, so the "where did our grants go"
  // answer leads. Falls back to top applicant categories if nothing has won
  // yet (early-chapter case).
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

  const note =
    view === "count"
      ? "Tiles: each category's share of our winners. Bar chart: applicants per category, with winners overlaid in ink. Each pitch lands in exactly one category, so rows sum to the applicant total."
      : view === "dollars"
      ? "Total dollars deployed to each category. Reveals where the money is concentrated, not just where the volume is."
      : "Average award size per winner in each category. A category with a few large checks reads very differently than one with many small ones.";

  return (
    <SectionCard
      eyebrow="Categories"
      title="What we're funding"
      note={note}
      actions={<ViewToggle value={view} onChange={setView} />}
    >
      {showWinnerTiles && view === "count" && (
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
            value={
              view === "dollars"
                ? row.dollars
                : view === "avg"
                ? row.avgAward
                : row.applicants
            }
            secondaryValue={view === "count" ? row.winners : undefined}
            maxValue={maxValue}
            tone={view === "dollars" || view === "avg" ? "aqua" : "pink"}
            delay={60 * i}
            valueLabel={
              view === "dollars"
                ? `$${row.dollars.toLocaleString()}`
                : view === "avg"
                ? row.avgAward > 0
                  ? `$${row.avgAward.toLocaleString()} avg`
                  : "—"
                : `${row.applicants.toLocaleString()} applicants`
            }
            secondaryLabel={
              view === "count"
                ? `${row.winners} winner${row.winners === 1 ? "" : "s"}${
                    row.winPct == null ? "" : ` · ${row.winPct}% win rate`
                  }`
                : view === "dollars"
                ? `${row.winners} winner${row.winners === 1 ? "" : "s"}`
                : `${row.winners} winner${row.winners === 1 ? "" : "s"}`
            }
          />
        ))}
        {uncategorized.applicants > 0 && view === "count" && (
          <BarRow
            label="Uncategorized"
            value={uncategorized.applicants}
            secondaryValue={uncategorized.winners}
            maxValue={maxValue}
            tone="butter"
            delay={60 * visibleRows.length}
            valueLabel={`${uncategorized.applicants} applicants`}
            secondaryLabel={`${uncategorized.winners} winner${
              uncategorized.winners === 1 ? "" : "s"
            }${uncategorized.winPct == null ? "" : ` · ${uncategorized.winPct}%`}`}
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
        Categories are AI-assigned during summary generation.
        {uncategorized.applicants > 0 && (
          <> <strong>{uncategorized.applicants}</strong> pitch{uncategorized.applicants === 1 ? " is" : "es are"} still uncategorized — usually pre-AI submissions.</>
        )}
        {" "}Win-rate percentages require at least {MIN_SAMPLE_FOR_PCT} applications in a category before a value is shown.
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
  const options = [
    { key: "count", label: "Counts" },
    { key: "dollars", label: "Dollars" },
    { key: "avg", label: "Avg award" },
  ];
  return (
    <div role="group" aria-label="View mode" style={{ display: "inline-flex" }}>
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          style={value === opt.key ? active : base}
        >
          {opt.label}
        </button>
      ))}
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
