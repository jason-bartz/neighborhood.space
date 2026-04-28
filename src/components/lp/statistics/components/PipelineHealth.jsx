import React, { useMemo } from "react";
import SectionCard from "./SectionCard";
import StatCard from "./StatCard";
import {
  quarterOverQuarterGrowth,
  daysToDecision,
  repeatApplicants,
  MIN_SAMPLE_FOR_PCT,
} from "../statsAggregations";

// Quarter-over-quarter growth, days-to-decision, repeat applicants. These
// are the "is the pipeline healthy" numbers — the ones you'd check before
// asking whether this quarter was a hit or a miss.
export default function PipelineHealth({ pitches }) {
  const qoq = useMemo(() => quarterOverQuarterGrowth(pitches), [pitches]);
  const dtd = useMemo(() => daysToDecision(pitches), [pitches]);
  const repeat = useMemo(() => repeatApplicants(pitches), [pitches]);

  const growthValue = qoq.growthPct == null
    ? "—"
    : `${qoq.growthPct > 0 ? "+" : ""}${qoq.growthPct}%`;
  const growthCaption = qoq.growthPct == null
    ? (qoq.current == null
        ? "Need two quarters of data"
        : `Both quarters need ${MIN_SAMPLE_FOR_PCT}+ apps`)
    : qoq.current && qoq.previous
      ? `${qoq.current.key} vs ${qoq.previous.key}`
      : "";

  const dtdValue = dtd.avgDays == null ? "—" : `${dtd.avgDays}d`;
  const dtdCaption = dtd.avgDays == null
    ? (dtd.winnerCount === 0
        ? "No winners yet"
        : "Historical winners predate awardedAt tracking")
    : dtd.sampleSize < dtd.winnerCount
      ? `${dtd.sampleSize} of ${dtd.winnerCount} winners have timestamps`
      : `Across ${dtd.sampleSize} winners · median ${dtd.medianDays}d`;

  const repeatCaption = repeat.uniqueEmails === 0
    ? "No applicants yet"
    : `${repeat.extraSubmissions} extra submission${repeat.extraSubmissions === 1 ? "" : "s"} across ${repeat.uniqueEmails} unique emails`;

  return (
    <SectionCard
      eyebrow="Pipeline health"
      title="Growth, speed, and repeat engagement"
      note="QoQ growth is gated on sample size. Days-to-decision only counts winners marked after awardedAt timestamps began recording."
    >
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
      }}>
        <StatCard
          label="Quarter-over-quarter growth"
          numeric={qoq.growthPct == null ? null : qoq.growthPct}
          format={(n) => `${n > 0 ? "+" : ""}${Math.round(n)}%`}
          value={growthValue}
          caption={growthCaption}
        />
        <StatCard
          label="Avg days to decision"
          numeric={dtd.avgDays == null ? null : dtd.avgDays}
          format={(n) => `${n.toFixed(1)}d`}
          value={dtdValue}
          caption={dtdCaption}
        />
        <StatCard
          label="Repeat applicants"
          numeric={repeat.repeaters}
          format={(n) => Math.round(n).toLocaleString()}
          value={repeat.repeaters.toLocaleString()}
          caption={repeatCaption}
        />
      </div>
    </SectionCard>
  );
}
