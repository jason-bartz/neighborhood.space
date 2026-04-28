import React, { useEffect, useMemo, useRef, useState } from "react";
import SectionCard from "./SectionCard";
import { applicationsOverTime, toDate } from "../statsAggregations";

// Line chart: total applications + winners per period. Inline SVG — no chart
// library, no Canvas. Lines draw in on mount via stroke-dashoffset animation.
//
// Granularity toggle lets directors flip between quarter (default) and month.
// Month labels render as "APR 2023" rather than the "2023-04" sort key.
const MONTH_ABBREV = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS = { "90d": 90, "6mo": 180 };

export default function ApplicationsOverTime({ pitches }) {
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

  const series = useMemo(
    () => applicationsOverTime(filteredPitches, granularity),
    [filteredPitches, granularity]
  );

  // Switching to a shorter window auto-picks monthly so we don't render 1–2
  // sparse quarterly columns; switching back to all-time restores quarterly.
  const handleRangeChange = (next) => {
    setRange(next);
    setGranularity(next === "all" ? "quarter" : "month");
  };

  // Measure the wrapping container so the chart can fill the card width even
  // when only 3–4 buckets are in view (90d / 6mo). With many points it still
  // grows past the container and the parent's overflow-x:auto kicks in.
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") return undefined;
    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (typeof w === "number") setContainerWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (series.length === 0) {
    return (
      <SectionCard
        eyebrow="Applications · Time series"
        title="Applications over time"
        actions={<RangeToggle value={range} onChange={handleRangeChange} />}
      >
        <EmptyNote>
          {range === "all"
            ? "No applications yet — this chart unlocks once the first pitch lands."
            : "No applications in this window. Try a longer range."}
        </EmptyNote>
      </SectionCard>
    );
  }

  const maxTotal = Math.max(1, ...series.map((s) => s.total));
  const pointCount = series.length;
  // Floor at the container width so short ranges fill the card; expand past it
  // when there are enough points that 72px per bucket would be wider.
  const chartWidth = Math.max(containerWidth || 520, pointCount * 72);
  const chartHeight = 240;
  const padLeft = 44;
  const padRight = 16;
  const padTop = 22;
  const padBottom = 46;
  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;
  const stepX = pointCount > 1 ? innerW / (pointCount - 1) : 0;

  const tickCount = 4;
  const niceMax = niceCeil(maxTotal, tickCount);
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round((niceMax / tickCount) * i)
  );

  const xFor = (i) => padLeft + (pointCount > 1 ? stepX * i : innerW / 2);
  const yFor = (v) => padTop + innerH - innerH * (v / niceMax);

  const totalPath = buildPath(series.map((p, i) => [xFor(i), yFor(p.total)]));
  const winnersPath = buildPath(series.map((p, i) => [xFor(i), yFor(p.winners)]));

  return (
    <SectionCard
      eyebrow="Applications · Time series"
      title="Applications over time"
      note="Top line is total pitches received; bottom line is winners out of that pool."
      actions={
        <>
          <RangeToggle value={range} onChange={handleRangeChange} />
          <GranularityToggle value={granularity} onChange={setGranularity} />
        </>
      }
    >
      <div ref={containerRef} style={{ overflowX: "auto" }}>
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={`Applications per ${granularity}`}
          style={{ display: "block" }}
        >
          {yTicks.map((t, i) => {
            const y = yFor(t);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  x2={chartWidth - padRight}
                  y1={y}
                  y2={y}
                  stroke="var(--mb-ink-15, rgba(0,0,0,0.12))"
                  strokeDasharray={i === 0 ? "none" : "2 3"}
                />
                <text
                  x={padLeft - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--mb-ink-60, #555)"
                  fontFamily="var(--font-numeral, inherit)"
                >
                  {t}
                </text>
              </g>
            );
          })}

          <AnimatedLine d={totalPath} color="var(--gnf-pink-400, #e98cc4)" strokeWidth={3} />
          <AnimatedLine
            d={winnersPath}
            color="var(--mb-ink)"
            strokeWidth={2.25}
            strokeDasharray="5 4"
            delay={200}
          />

          {series.map((row, i) => {
            const cx = xFor(i);
            return (
              <g key={row.key}>
                <title>{`${displayKey(row.key, granularity)} — ${row.total} applications, ${row.winners} winners`}</title>
                <DataPoint cx={cx} cy={yFor(row.total)} fill="var(--gnf-pink-400, #e98cc4)" />
                <DataPoint cx={cx} cy={yFor(row.winners)} fill="var(--mb-ink)" delay={220} />
                <text
                  x={cx}
                  y={yFor(row.total) - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--mb-ink)"
                  fontFamily="var(--font-numeral, inherit)"
                >
                  {row.total}
                </text>
                <text
                  x={cx}
                  y={chartHeight - padBottom + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--mb-ink)"
                  fontFamily="var(--font-pixel, inherit)"
                  style={{ letterSpacing: "0.04em" }}
                >
                  {displayKey(row.key, granularity)}
                </text>
              </g>
            );
          })}

          <g transform={`translate(${padLeft}, ${chartHeight - 10})`}>
            <line x1="0" x2="24" y1="0" y2="0" stroke="var(--gnf-pink-400, #e98cc4)" strokeWidth="3" />
            <text x="30" y="4" fontSize="10" fill="var(--mb-ink)">Applications</text>
            <line x1="120" x2="144" y1="0" y2="0" stroke="var(--mb-ink)" strokeWidth="2.25" strokeDasharray="5 4" />
            <text x="150" y="4" fontSize="10" fill="var(--mb-ink)">Winners</text>
          </g>
        </svg>
      </div>
    </SectionCard>
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

function buildPath(points) {
  if (points.length === 0) return "";
  return points
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ");
}

// Draws a line that animates in via stroke-dashoffset. Uses getTotalLength()
// on first render so the animation length matches the actual path geometry,
// not a precomputed estimate.
function AnimatedLine({ d, color, strokeWidth, strokeDasharray, delay = 0 }) {
  const ref = useRef(null);
  const [length, setLength] = useState(0);
  const [entered, setEntered] = useState(false);
  const prefersReduced = useRef(
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (ref.current) {
      try {
        setLength(ref.current.getTotalLength());
      } catch {
        setLength(0);
      }
    }
  }, [d]);

  useEffect(() => {
    if (prefersReduced.current) {
      setEntered(true);
      return undefined;
    }
    const t = window.setTimeout(() => setEntered(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);

  const animStyle = prefersReduced.current || !length
    ? { strokeDasharray }
    : {
        strokeDasharray: strokeDasharray || `${length} ${length}`,
        strokeDashoffset: entered ? 0 : length,
        transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)",
      };

  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={animStyle}
    />
  );
}

function DataPoint({ cx, cy, fill, delay = 0 }) {
  const [entered, setEntered] = useState(false);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (prefersReduced) { setEntered(true); return undefined; }
    const t = window.setTimeout(() => setEntered(true), 500 + delay);
    return () => window.clearTimeout(t);
  }, [delay, prefersReduced]);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={entered ? 4 : 0}
      fill={fill}
      stroke="var(--mb-paper)"
      strokeWidth="1.5"
      style={{ transition: prefersReduced ? "none" : "r 320ms ease-out" }}
    />
  );
}

function niceCeil(value, tickCount) {
  if (value <= tickCount) return tickCount;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / pow;
  let nice;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  const step = (nice * pow) / tickCount;
  return Math.ceil(value / step) * step;
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
