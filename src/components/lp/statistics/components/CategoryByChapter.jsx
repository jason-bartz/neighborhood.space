import React, { useMemo } from "react";
import SectionCard from "./SectionCard";
import { categoryByChapter, PITCH_CATEGORIES } from "../statsAggregations";

// Heatmap: chapters down the rows, AI categories across the columns. Cell
// shading = share of that chapter's applications in that category, so each
// row sums to 100% and the eye reads category mix at a glance regardless
// of chapter size.
//
// Only renders when the loaded pitch set spans multiple chapters — the
// StatisticsTab gates this for super-admins viewing "All chapters". For a
// single-chapter scope the row collapses to one and the chart is just a
// re-do of CategoryBreakdown.
//
// Counts are shown alongside the percentage so a tiny chapter with 1 app
// in a category isn't read as "100% of their pipeline is Tech".
export default function CategoryByChapter({ pitches }) {
  const rows = useMemo(() => categoryByChapter(pitches), [pitches]);

  if (rows.length === 0) {
    return (
      <SectionCard eyebrow="Cross-tab" title="Category mix by chapter">
        <EmptyNote>
          No categorized applications across chapters yet — this matrix unlocks
          once pitches with categories accumulate in more than one chapter.
        </EmptyNote>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      eyebrow="Cross-tab"
      title="Category mix by chapter"
      note="Each cell shows that category's share of the chapter's applications, with raw count below. Row totals = 100%, so the mix is comparable across chapters of very different sizes."
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: 880,
            borderCollapse: "separate",
            borderSpacing: 0,
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              <th style={headStickyCellStyle("left")}>Chapter</th>
              <th style={headCellStyle("center")}>Total</th>
              {PITCH_CATEGORIES.map((cat) => (
                <th key={cat} style={headCellStyle("center")} title={cat}>
                  {cat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.chapter}>
                <td style={bodyLabelStyle(rowIdx)}>{row.chapter}</td>
                <td style={bodyNumStyle(rowIdx)}>
                  <strong>{row.total}</strong>
                </td>
                {PITCH_CATEGORIES.map((cat) => {
                  const count = row.byCategory[cat] || 0;
                  const pct = row.total > 0
                    ? Math.round((count / row.total) * 100)
                    : 0;
                  return (
                    <td
                      key={cat}
                      style={cellStyle(pct, count, rowIdx)}
                      title={`${row.chapter} × ${cat}: ${count} of ${row.total} (${pct}%)`}
                    >
                      {count === 0 ? (
                        <span style={{ color: "var(--mb-ink-60, #999)" }}>—</span>
                      ) : (
                        <>
                          <span style={{ fontWeight: 700 }}>{pct}%</span>
                          <span
                            style={{
                              display: "block",
                              fontSize: 10,
                              color: "var(--mb-ink-60, #666)",
                            }}
                          >
                            {count}
                          </span>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Legend />
    </SectionCard>
  );
}

// Aqua-on-paper shading. Higher pct → more saturated fill. Cells with zero
// count stay neutral with a dash.
function cellStyle(pct, count, rowIdx) {
  const stripe = rowIdx % 2 === 0 ? "var(--mb-paper)" : "var(--mb-paper-deep, var(--mb-paper))";
  if (count === 0) {
    return {
      padding: "8px 10px",
      textAlign: "center",
      borderTop: "1px solid var(--mb-ink-15, rgba(0,0,0,0.12))",
      borderRight: "1px solid var(--mb-ink-15, rgba(0,0,0,0.12))",
      background: stripe,
      fontFamily: "var(--font-numeral, inherit)",
      color: "var(--mb-ink-60, #999)",
      minWidth: 64,
    };
  }
  const alpha = Math.min(0.6, 0.08 + (pct / 100) * 0.52);
  return {
    padding: "8px 10px",
    textAlign: "center",
    borderTop: "1px solid var(--mb-ink-15, rgba(0,0,0,0.12))",
    borderRight: "1px solid var(--mb-ink-15, rgba(0,0,0,0.12))",
    background: `rgba(0, 158, 158, ${alpha})`, // aqua at variable alpha
    fontFamily: "var(--font-numeral, inherit)",
    color: "var(--mb-ink)",
    minWidth: 64,
  };
}

function headStickyCellStyle(align) {
  return {
    padding: "8px 10px",
    textAlign: align,
    background: "var(--mb-ink)",
    color: "var(--mb-chalk)",
    fontFamily: "var(--font-pixel)",
    fontSize: 10,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    position: "sticky",
    left: 0,
    zIndex: 1,
  };
}

function headCellStyle(align) {
  return {
    padding: "8px 10px",
    textAlign: align,
    background: "var(--mb-ink)",
    color: "var(--mb-chalk)",
    fontFamily: "var(--font-pixel)",
    fontSize: 10,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
}

function bodyLabelStyle(rowIdx) {
  const stripe = rowIdx % 2 === 0 ? "var(--mb-paper)" : "var(--mb-paper-deep, var(--mb-paper))";
  return {
    padding: "8px 10px",
    textAlign: "left",
    borderTop: "1px solid var(--mb-ink-15, rgba(0,0,0,0.12))",
    borderRight: "1px solid var(--mb-ink-15, rgba(0,0,0,0.12))",
    background: stripe,
    fontWeight: 600,
    color: "var(--mb-ink)",
    position: "sticky",
    left: 0,
    minWidth: 160,
  };
}

function bodyNumStyle(rowIdx) {
  const stripe = rowIdx % 2 === 0 ? "var(--mb-paper)" : "var(--mb-paper-deep, var(--mb-paper))";
  return {
    padding: "8px 10px",
    textAlign: "center",
    borderTop: "1px solid var(--mb-ink-15, rgba(0,0,0,0.12))",
    borderRight: "1px solid var(--mb-ink-15, rgba(0,0,0,0.12))",
    background: stripe,
    fontFamily: "var(--font-numeral, inherit)",
    color: "var(--mb-ink)",
  };
}

function Legend() {
  const stops = [10, 25, 50, 75];
  return (
    <div
      style={{
        marginTop: 14,
        paddingTop: 10,
        borderTop: "1px dashed var(--mb-ink-15, rgba(0,0,0,0.12))",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        fontSize: 11,
        color: "var(--mb-ink-60, #666)",
      }}
    >
      <span>Cell shading (% of chapter's applications)</span>
      <div style={{ display: "inline-flex", border: "1.5px solid var(--mb-ink)" }}>
        {stops.map((pct) => {
          const alpha = Math.min(0.6, 0.08 + (pct / 100) * 0.52);
          return (
            <div
              key={pct}
              style={{
                background: `rgba(0, 158, 158, ${alpha})`,
                padding: "2px 10px",
                fontSize: 10,
                fontFamily: "var(--font-numeral, inherit)",
                color: "var(--mb-ink)",
                borderLeft: pct === stops[0] ? "none" : "1px solid var(--mb-ink-15, rgba(0,0,0,0.12))",
              }}
            >
              {pct}%
            </div>
          );
        })}
      </div>
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
