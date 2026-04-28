import React, { useMemo, useState } from "react";
import SectionCard from "./SectionCard";
import BarRow from "./BarRow";
import { referralBreakdown, MIN_SAMPLE_FOR_PCT } from "../statsAggregations";

const DEFAULT_VISIBLE = 10;

// "How did you hear about us?" breakdown paired with win rate per channel.
// Volume alone is misleading — a high-traffic channel with a low win rate
// means we're getting unqualified applicants; a small channel with a high
// win rate is punching above its weight.
//
// Collapses to the top 10 channels by default, with an expand toggle for
// the long tail.
export default function ReferralSources({ pitches }) {
  const rows = useMemo(() => referralBreakdown(pitches), [pitches]);
  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) {
    return (
      <SectionCard eyebrow="Acquisition" title="Referral sources">
        <EmptyNote>No referral data yet.</EmptyNote>
      </SectionCard>
    );
  }

  const maxValue = Math.max(1, ...rows.map((r) => r.applicants));
  const totalApplicants = rows.reduce((s, r) => s + r.applicants, 0);
  const visible = expanded ? rows : rows.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = rows.length - visible.length;

  return (
    <SectionCard
      eyebrow="Acquisition"
      title="Where applicants heard about us"
      note="Volume is the whole bar; the dark overlay is winners from that channel. Win rate is gated to avoid noise on tiny channels."
    >
      <div style={{ display: "grid", gap: 4 }}>
        {visible.map((row, i) => {
          const sharePct = Math.round((row.applicants / totalApplicants) * 100);
          return (
            <BarRow
              key={row.source}
              label={row.source}
              value={row.applicants}
              secondaryValue={row.winners}
              maxValue={maxValue}
              tone="aqua"
              delay={40 * i}
              valueLabel={`${row.applicants} (${sharePct}%)`}
              secondaryLabel={
                row.winPct == null
                  ? `${row.winners} winner${row.winners === 1 ? "" : "s"}`
                  : `${row.winPct}% win rate · ${row.winners} winner${row.winners === 1 ? "" : "s"}`
              }
            />
          );
        })}
      </div>

      {rows.length > DEFAULT_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 10,
            background: "transparent",
            border: "1.5px solid var(--mb-ink)",
            padding: "4px 12px",
            fontFamily: "inherit",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {expanded
            ? `Collapse to top ${DEFAULT_VISIBLE}`
            : `Show ${hiddenCount} more source${hiddenCount === 1 ? "" : "s"}`}
        </button>
      )}

      <p style={{
        marginTop: 14,
        paddingTop: 10,
        borderTop: "1px dashed var(--mb-ink-15, rgba(0,0,0,0.12))",
        fontSize: 11,
        color: "var(--mb-ink-60, #666)",
      }}>
        Win rate requires {MIN_SAMPLE_FOR_PCT}+ applicants from a source before it is shown.
      </p>
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
