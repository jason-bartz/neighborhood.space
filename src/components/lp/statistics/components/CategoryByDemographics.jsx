import React, { useMemo } from "react";
import SectionCard from "./SectionCard";
import { categoryBySelfId, MIN_SAMPLE_FOR_PCT } from "../statsAggregations";

// Heatmap: AI categories down the rows, self-ID tags across the columns.
// Each cell = % of that category's applicants who carry that self-ID tag.
//
// Founders can carry multiple self-ID tags, so a row's cell percentages can
// sum past 100% — same caveat as SelfIdBreakdown applied per-category.
//
// Cell shading uses the magenta brand color at variable opacity. Cells whose
// row total falls below MIN_SAMPLE_FOR_PCT show a dash and stay neutral —
// percentages off tiny n are noise.
//
// Short-label map keeps the column header from running 7 wide. Hover/title
// preserves the full label for accessibility.
const SELF_ID_SHORT = {
  "Women Owned/Led": "Women",
  "BIPOC Owned/Led": "BIPOC",
  "Minority Owned/Led": "Minority",
  "LGBTQ+ Owned/Led": "LGBTQ+",
  "Veteran Owned/Led": "Veteran",
  "Disabled Owned/Led": "Disabled",
  "Student Owned/Led": "Student",
};

export default function CategoryByDemographics({ pitches }) {
  const { rows, selfIds } = useMemo(() => categoryBySelfId(pitches), [pitches]);

  const visibleRows = rows.filter((r) => r.total > 0);
  if (visibleRows.length === 0) {
    return (
      <SectionCard eyebrow="Cross-tab" title="Categories × founder identity">
        <EmptyNote>
          Not enough categorized applications yet — this matrix unlocks once
          pitches start picking up both a category and self-ID tags.
        </EmptyNote>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      eyebrow="Cross-tab"
      title="Categories × founder identity"
      note={`Each cell shows the share of that category's applicants who carry that self-ID tag. Cells with fewer than ${MIN_SAMPLE_FOR_PCT} applicants show a dash. Founders can carry multiple tags, so row percentages may sum past 100%. The LGBTQ+ tag was added to the application form in April 2026, so its column only reflects submissions from that point forward.`}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: 720,
            borderCollapse: "separate",
            borderSpacing: 0,
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              <th style={headStickyCellStyle("left")}>Category</th>
              <th style={headCellStyle("center")}>Apps</th>
              {selfIds.map((sid) => (
                <th
                  key={sid}
                  style={headCellStyle("center")}
                  title={sid}
                >
                  {SELF_ID_SHORT[sid] || sid}
                </th>
              ))}
              <th style={headCellStyle("center")}>Not specified</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIdx) => (
              <tr key={row.category}>
                <td style={bodyLabelStyle(rowIdx)}>{row.category}</td>
                <td style={bodyNumStyle(rowIdx)}>
                  <strong>{row.total}</strong>
                </td>
                {selfIds.map((sid) => {
                  const count = row.tags[sid] || 0;
                  const pct = row.total >= MIN_SAMPLE_FOR_PCT
                    ? Math.round((count / row.total) * 100)
                    : null;
                  return (
                    <td
                      key={sid}
                      style={cellStyle(pct, rowIdx)}
                      title={`${row.category} × ${sid}: ${count} of ${row.total}${pct == null ? "" : ` (${pct}%)`}`}
                    >
                      {pct == null ? (
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
                <td style={bodyNumStyle(rowIdx)}>
                  {row.notSpecified}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Legend />
    </SectionCard>
  );
}

// Magenta-on-paper shading. Higher pct → more saturated fill. Caps at 60%
// alpha so the text remains legible without flipping to white.
function cellStyle(pct, rowIdx) {
  const baseAlpha = pct == null ? 0 : Math.min(0.6, 0.05 + (pct / 100) * 0.55);
  const stripe = rowIdx % 2 === 0 ? "var(--mb-paper)" : "var(--mb-paper-deep, var(--mb-paper))";
  const fill =
    pct == null
      ? stripe
      : `rgba(176, 48, 107, ${baseAlpha})`; // magenta-deep at variable alpha
  return {
    padding: "8px 10px",
    textAlign: "center",
    borderTop: "1px solid var(--mb-ink-15, rgba(0,0,0,0.12))",
    borderRight: "1px solid var(--mb-ink-15, rgba(0,0,0,0.12))",
    background: fill,
    fontFamily: "var(--font-numeral, inherit)",
    fontSize: 12,
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
    minWidth: 140,
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
      <span>Cell shading</span>
      <div style={{ display: "inline-flex", border: "1.5px solid var(--mb-ink)" }}>
        {stops.map((pct) => {
          const alpha = Math.min(0.6, 0.05 + (pct / 100) * 0.55);
          return (
            <div
              key={pct}
              style={{
                background: `rgba(176, 48, 107, ${alpha})`,
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
