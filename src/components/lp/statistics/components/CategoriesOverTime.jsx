import React, { useMemo, useState } from "react";
import SectionCard from "./SectionCard";
import {
  categoriesOverTime,
  PITCH_CATEGORIES,
  toDate,
} from "../statsAggregations";

// Small-multiples sparkline grid — one mini chart per AI category, all
// sharing the same x-axis (period buckets) and the same y-axis ceiling
// so the eye can compare absolute volume across categories at a glance.
//
// A single overlaid 8-line chart would be spaghetti; small multiples is
// the standard fix. Each panel shows the trendline plus a "last period"
// total and a sparkbar-style series count. Winner counts are not overlaid
// here — at this scale a second series adds noise without insight.
const MONTH_ABBREV = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS = { "90d": 90, "6mo": 180 };

export default function CategoriesOverTime({ pitches }) {
  const [range, setRange] = useState("all");
  const [granularity, setGranularity] = useState("quarter");

  const filteredPitches = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (!days) return pitches;
    const cutoff = Date.now() - days * DAY_MS;
    return pitches.filter((p) => {
      const d = toDate(p.createdAt);
      return d && d.getTime() >= cutoff;
    });
  }, [pitches, range]);

  const { keys, series } = useMemo(
    () => categoriesOverTime(filteredPitches, granularity),
    [filteredPitches, granularity]
  );

  const handleRangeChange = (next) => {
    setRange(next);
    setGranularity(next === "all" ? "quarter" : "month");
  };

  // Shared y-ceiling across panels so absolute volumes are comparable.
  const maxAcrossAll = useMemo(() => {
    let max = 0;
    for (const cat of PITCH_CATEGORIES) {
      for (const point of series[cat] || []) {
        if (point.total > max) max = point.total;
      }
    }
    return Math.max(1, max);
  }, [series]);

  if (keys.length === 0) {
    return (
      <SectionCard
        eyebrow="Categories · Time series"
        title="How the mix is shifting"
        actions={<RangeToggle value={range} onChange={handleRangeChange} />}
      >
        <EmptyNote>
          {range === "all"
            ? "No applications yet — this chart unlocks once the first pitch lands and gets categorized."
            : "No categorized applications in this window. Try a longer range."}
        </EmptyNote>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      eyebrow="Categories · Time series"
      title="How the mix is shifting"
      note="One sparkline per category, all shown against the same y-axis so volumes compare directly. Number on the right is the total in the latest period."
      actions={
        <>
          <RangeToggle value={range} onChange={handleRangeChange} />
          <GranularityToggle value={granularity} onChange={setGranularity} />
        </>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {PITCH_CATEGORIES.map((cat, idx) => {
          const points = series[cat] || [];
          const totalAll = points.reduce((s, p) => s + p.total, 0);
          const last = points[points.length - 1];
          return (
            <Sparkline
              key={cat}
              category={cat}
              points={points}
              maxY={maxAcrossAll}
              totalAll={totalAll}
              latestKey={last ? displayKey(last.key, granularity) : ""}
              latestTotal={last ? last.total : 0}
              delay={idx * 80}
              granularity={granularity}
            />
          );
        })}
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: "1px dashed var(--mb-ink-15, rgba(0,0,0,0.12))",
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          fontSize: 11,
          color: "var(--mb-ink-60, #666)",
        }}
      >
        <span>
          Period range: <strong>{displayKey(keys[0], granularity)}</strong>
          {" "}→{" "}
          <strong>{displayKey(keys[keys.length - 1], granularity)}</strong>
        </span>
        <span>
          Y-axis ceiling: <strong>{maxAcrossAll}</strong>
        </span>
      </div>
    </SectionCard>
  );
}

function Sparkline({ category, points, maxY, totalAll, latestKey, latestTotal, delay, granularity }) {
  const w = 240;
  const h = 64;
  const padX = 8;
  const padTop = 6;
  const padBottom = 14;
  const innerW = w - padX * 2;
  const innerH = h - padTop - padBottom;
  const n = points.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  const xFor = (i) => padX + (n > 1 ? stepX * i : innerW / 2);
  const yFor = (v) => padTop + innerH - innerH * (v / maxY);

  const linePath = n > 0
    ? points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.total)}`)
        .join(" ")
    : "";
  const areaPath = n > 0
    ? `${linePath} L ${xFor(n - 1)} ${padTop + innerH} L ${xFor(0)} ${padTop + innerH} Z`
    : "";

  // Highlight the last point.
  const lastIdx = n - 1;
  const lastX = lastIdx >= 0 ? xFor(lastIdx) : 0;
  const lastY = lastIdx >= 0 ? yFor(points[lastIdx].total) : 0;

  return (
    <div
      style={{
        border: "1.5px solid var(--mb-ink)",
        boxShadow: "var(--shadow-hard-sm)",
        background: "var(--mb-paper)",
        padding: "8px 10px",
        animation: `sparkFadeIn 420ms ease-out ${delay}ms both`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--mb-ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
          title={category}
        >
          {category}
        </span>
        <span
          style={{
            fontFamily: "var(--font-numeral, inherit)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--mb-ink)",
          }}
        >
          {totalAll}
        </span>
      </div>

      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${category}: ${totalAll} applications across ${n} ${granularity === "month" ? "months" : "quarters"}`}
        style={{ display: "block" }}
      >
        {totalAll > 0 ? (
          <>
            <path d={areaPath} fill="var(--gnf-pink-300, #f5b8d8)" opacity="0.6" />
            <path
              d={linePath}
              fill="none"
              stroke="var(--mb-ink)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {lastIdx >= 0 && (
              <circle
                cx={lastX}
                cy={lastY}
                r={2.75}
                fill="var(--mb-ink)"
                stroke="var(--mb-paper)"
                strokeWidth="1"
              />
            )}
          </>
        ) : (
          <text
            x={w / 2}
            y={h / 2 + 3}
            textAnchor="middle"
            fontSize="10"
            fill="var(--mb-ink-60, #999)"
            fontFamily="inherit"
          >
            No applications in range
          </text>
        )}
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--mb-ink-60, #666)",
          marginTop: 2,
        }}
      >
        <span style={{ fontFamily: "var(--font-pixel, inherit)" }}>
          {latestKey}
        </span>
        <span style={{ fontFamily: "var(--font-numeral, inherit)" }}>
          {latestTotal} latest
        </span>
      </div>
      <style>{`@keyframes sparkFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function displayKey(key, granularity) {
  if (granularity === "month") {
    const match = /^(\d{4})-(\d{2})$/.exec(key);
    if (match) {
      const monthIdx = Number(match[2]) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${MONTH_ABBREV[monthIdx]} ${match[1]}`;
      }
    }
  }
  return key;
}

function GranularityToggle({ value, onChange }) {
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
    <div role="group" aria-label="Time granularity" style={{ display: "inline-flex" }}>
      <button type="button" onClick={() => onChange("quarter")} style={value === "quarter" ? active : base}>
        Quarterly
      </button>
      <button type="button" onClick={() => onChange("month")} style={value === "month" ? active : base}>
        Monthly
      </button>
    </div>
  );
}

function RangeToggle({ value, onChange }) {
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
    { key: "90d", label: "90 days" },
    { key: "6mo", label: "6 months" },
    { key: "all", label: "All time" },
  ];
  return (
    <div role="group" aria-label="Time range" style={{ display: "inline-flex" }}>
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
