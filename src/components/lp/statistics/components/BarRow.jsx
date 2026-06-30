import React, { useEffect, useState } from "react";

// Horizontal bar row for a single category in a breakdown table.
//
// The grid columns are fixed-width so every row lines up: bars start at the
// same X, end at the same X, and the numeric label column is right-aligned
// with a consistent min-width. This is the "normalized bar" look the
// stats tab needs — no row-to-row drift as category labels vary in length.
//
// On mount the primary and secondary fills animate from 0% to their target
// width (unless the user prefers reduced motion). The outer container is
// non-animated so layout stays stable; only fill widths change.
export default function BarRow({
  label,
  value,
  maxValue,
  secondaryValue,
  valueLabel,
  secondaryLabel,
  tone = "pink",
  delay = 0,
}) {
  const clampedMax = Math.max(1, maxValue || 0);
  const primaryTarget = Math.max(0, Math.min(100, (value / clampedMax) * 100));
  const secondaryTarget =
    secondaryValue != null
      ? Math.max(0, Math.min(100, (secondaryValue / clampedMax) * 100))
      : null;

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [entered, setEntered] = useState(prefersReduced);
  useEffect(() => {
    if (prefersReduced) return undefined;
    const id = window.setTimeout(() => setEntered(true), delay);
    return () => window.clearTimeout(id);
  }, [delay, prefersReduced]);

  const primaryColor =
    tone === "pink"
      ? "var(--gnf-pink-300, #f5b8d8)"
      : tone === "aqua"
      ? "var(--gnf-aqua-300, #a8d8d8)"
      : tone === "butter"
      ? "var(--gnf-butter-300, #f5e0a8)"
      : "var(--gnf-pink-300, #f5b8d8)";
  const secondaryColor = "var(--mb-ink)";

  return (
    <div
      className="stats-bar-row"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(140px, 200px) minmax(120px, 1fr) max-content",
        gap: 12,
        alignItems: "center",
        padding: "6px 0",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "var(--mb-ink)",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: "relative",
          height: 18,
          background: "var(--mb-chalk)",
          border: "1.5px solid var(--mb-ink)",
          minWidth: 0,
        }}
        role="img"
        aria-label={`${label}: ${valueLabel || value}${
          secondaryLabel ? ` (${secondaryLabel})` : ""
        }`}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: `${entered ? primaryTarget : 0}%`,
            background: primaryColor,
            borderRight:
              primaryTarget < 100 && entered
                ? "1.5px solid var(--mb-ink)"
                : "none",
            transition: prefersReduced
              ? "none"
              : "width 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
        {secondaryTarget != null && secondaryTarget > 0 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: `${entered ? secondaryTarget : 0}%`,
              background: secondaryColor,
              opacity: 0.85,
              transition: prefersReduced
                ? "none"
                : "width 700ms cubic-bezier(0.22, 1, 0.36, 1) 80ms",
            }}
            aria-hidden="true"
          />
        )}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--mb-ink)",
          fontFamily: "var(--font-numeral, inherit)",
          textAlign: "right",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
          lineHeight: 1.25,
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>{valueLabel || value}</span>
        {secondaryLabel && (
          <span style={{ whiteSpace: "nowrap", color: "var(--mb-ink-60, #666)" }}>
            {secondaryLabel}
          </span>
        )}
      </div>
    </div>
  );
}
