import React, { useMemo, useState } from "react";
import SectionCard from "./SectionCard";
import BarRow from "./BarRow";
import { zipDistribution, normalizeUSZip, lmiShare } from "../statsAggregations";
import { isLMIZip, LMI_THRESHOLD, LMI_ACS_YEAR } from "../../../../helpers/lmiZips";

// Zip-code distribution ranked by applicant volume. Rows where the zip falls
// below the LMI threshold are flagged so directors can see how reach maps to
// economic need at a glance.
export default function GeographicReach({ pitches }) {
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(() => zipDistribution(pitches), [pitches]);
  const visible = showAll ? rows : rows.slice(0, 10);
  // Count pitches whose zipCode isn't a real 5-digit zip — catches both
  // blanks and the imported "nan" strings.
  const pitchesMissingZip = pitches.filter((p) => !normalizeUSZip(p.zipCode)).length;
  const lmi = useMemo(() => lmiShare(pitches), [pitches]);

  if (rows.length === 0 && pitchesMissingZip === 0) {
    return (
      <SectionCard eyebrow="Geographic reach" title="Where applicants live">
        <EmptyNote>No zip-code data yet.</EmptyNote>
      </SectionCard>
    );
  }

  const maxValue = Math.max(1, ...rows.map((r) => r.applicants));

  return (
    <SectionCard
      eyebrow="Geographic reach"
      title="Where applicants live"
      note="List: zips ranked by applicant volume. LMI flag marks ZIPs whose ACS median household income is at or below 80% of the US median."
    >
      <LMISummary lmi={lmi} />
      <div style={{ display: "grid", gap: 4 }}>
        {visible.map((row, i) => (
          <BarRow
            key={row.zip}
            label={<ZipLabel zip={row.zip} />}
            value={row.applicants}
            secondaryValue={row.winners}
            maxValue={maxValue}
            tone="butter"
            delay={30 * i}
            valueLabel={`${row.applicants}`}
            secondaryLabel={
              row.winners > 0 ? `${row.winners} winner${row.winners === 1 ? "" : "s"}` : undefined
            }
          />
        ))}
      </div>
      {rows.length > 10 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          style={{
            marginTop: 10,
            background: "transparent",
            border: "1.5px solid var(--mb-ink)",
            padding: "4px 10px",
            fontFamily: "inherit",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {showAll ? "Show top 10" : `Show all ${rows.length} zips`}
        </button>
      )}
      {pitchesMissingZip > 0 && (
        <p style={{ marginTop: 10, fontSize: 11, color: "var(--mb-ink-60, #666)" }}>
          {pitchesMissingZip} application{pitchesMissingZip === 1 ? "" : "s"} arrived without a zip
          code and are not reflected above.
        </p>
      )}
    </SectionCard>
  );
}

function ZipLabel({ zip }) {
  if (!isLMIZip(zip)) return zip;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {zip}
      <span
        title={`ZIP median household income ≤ $${LMI_THRESHOLD.toLocaleString()} (ACS ${LMI_ACS_YEAR} 5-Year)`}
        style={{
          fontFamily: "var(--font-pixel, inherit)",
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "1px 5px",
          border: "1.5px solid var(--mb-ink)",
          background: "var(--gnf-pink-300, #f5b8d8)",
          color: "var(--mb-ink)",
        }}
      >
        LMI
      </span>
    </span>
  );
}

function LMISummary({ lmi }) {
  if (lmi.applicantsWithZip === 0) return null;
  const tile = (label, value, sub) => (
    <div
      style={{
        flex: "1 1 180px",
        minWidth: 160,
        border: "1.5px solid var(--mb-ink)",
        background: "var(--mb-chalk)",
        padding: "8px 12px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--mb-ink-60, #555)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, marginTop: 2 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--mb-ink-60, #666)", marginTop: 2 }}>
        {sub}
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
      {tile(
        "LMI applicants",
        lmi.applicantSharePct == null ? "—" : `${lmi.applicantSharePct}%`,
        `${lmi.lmiApplicants} of ${lmi.applicantsWithZip} with a zip`,
      )}
      {tile(
        "LMI winners",
        lmi.winnerSharePct == null ? "—" : `${lmi.winnerSharePct}%`,
        lmi.winnersWithZip === 0
          ? "No winners with a zip on file yet"
          : `${lmi.lmiWinners} of ${lmi.winnersWithZip} with a zip`,
      )}
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
