import React from "react";
import StatCard from "./StatCard";
import { summarizeKPIs, MIN_SAMPLE_FOR_PCT } from "../statsAggregations";

// Four-tile overview. Applications + winners are straight counts; dollars is
// the sum of resolved award amounts (pitch.awardAmount → chapter default →
// historical $1,000). Win rate is min-N gated against total applications.
export default function KPITiles({ pitches, chaptersByName, scopeLabel }) {
  const { totalApplications, winnerCount, dollarsDeployed, winRatePct } = summarizeKPIs(
    pitches,
    chaptersByName
  );

  const winRateDisplay = winRatePct == null ? "—" : `${winRatePct}%`;
  const winRateCaption =
    winRatePct == null
      ? `Needs ${MIN_SAMPLE_FOR_PCT}+ applications`
      : `${winnerCount} of ${totalApplications}`;

  const integerFormat = (n) => Math.round(n).toLocaleString();
  const dollarFormat = (n) => `$${Math.round(n).toLocaleString()}`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        marginBottom: 20,
      }}
    >
      <StatCard
        label="Applications"
        numeric={totalApplications}
        format={integerFormat}
        value={totalApplications.toLocaleString()}
        caption={scopeLabel}
      />
      <StatCard
        label="Grants Funded"
        numeric={winnerCount}
        format={integerFormat}
        value={winnerCount.toLocaleString()}
        caption={scopeLabel}
      />
      <StatCard
        label="Dollars Deployed"
        numeric={dollarsDeployed}
        format={dollarFormat}
        value={dollarFormat(dollarsDeployed)}
        caption={scopeLabel}
      />
      <StatCard
        label="Win Rate"
        numeric={winRatePct == null ? null : winRatePct}
        format={(n) => `${Math.round(n)}%`}
        value={winRateDisplay}
        caption={winRateCaption}
      />
    </div>
  );
}
