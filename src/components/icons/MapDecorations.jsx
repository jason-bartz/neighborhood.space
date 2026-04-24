import React from "react";

/*
 * Inline SVG decorations for the Neighborhood Navigator map — replace
 * the emoji-based trees and vehicles with flat geometric shapes that
 * match the Win95 palette used by ResourceIcon.
 *
 * All components expect to be nested inside a parent <svg>.
 */

const STROKE = "#2d2d2d";

export function Tree({ x, y, variant = "round", size = 36 }) {
  const s = size / 36;
  const trunkW = 6 * s;
  const trunkH = 10 * s;
  const canopyR = 14 * s;

  if (variant === "pine") {
    const tw = 18 * s;
    const th = 24 * s;
    const cx = x;
    const top = y - th - trunkH / 2;
    return (
      <g pointerEvents="none">
        <rect
          x={cx - trunkW / 2}
          y={y - trunkH / 2}
          width={trunkW}
          height={trunkH}
          fill="#8b5a3c"
          stroke={STROKE}
          strokeWidth="1.25"
        />
        <polygon
          points={`${cx},${top} ${cx - tw / 2},${top + th * 0.4} ${cx - tw / 3},${top + th * 0.4} ${cx - tw / 2},${top + th * 0.72} ${cx - tw / 3},${top + th * 0.72} ${cx - tw / 2},${top + th} ${cx + tw / 2},${top + th} ${cx + tw / 3},${top + th * 0.72} ${cx + tw / 2},${top + th * 0.72} ${cx + tw / 3},${top + th * 0.4} ${cx + tw / 2},${top + th * 0.4}`}
          fill="#6ea65a"
          stroke={STROKE}
          strokeWidth="1.25"
          strokeLinejoin="miter"
        />
      </g>
    );
  }

  // Round / deciduous
  return (
    <g pointerEvents="none">
      <rect
        x={x - trunkW / 2}
        y={y - trunkH / 2}
        width={trunkW}
        height={trunkH}
        fill="#8b5a3c"
        stroke={STROKE}
        strokeWidth="1.25"
      />
      <circle
        cx={x}
        cy={y - trunkH / 2 - canopyR * 0.55}
        r={canopyR}
        fill="#8fb979"
        stroke={STROKE}
        strokeWidth="1.25"
      />
      <circle
        cx={x - canopyR * 0.35}
        cy={y - trunkH / 2 - canopyR * 0.35}
        r={canopyR * 0.25}
        fill="#bcd79f"
        opacity="0.85"
      />
    </g>
  );
}

/*
 * Vehicle — chunky geometric car/bus/police shape. Kept simple so 7 of
 * them can animate at once without choking rendering.
 */
export function Vehicle({ x, y, variant = "car", direction = "left" }) {
  const palette = {
    car:    { body: "#e93a7d", accent: "#fde0ec" }, // magenta
    coupe:  { body: "#2bb3c4", accent: "#d5f1f4" }, // aqua
    taxi:   { body: "#f0c94b", accent: "#fbf1cc" }, // butter
    police: { body: "#141419", accent: "#ffffff" }, // ink
    bus:    { body: "#f28c3b", accent: "#fde7d0" }, // tangerine
  };
  const p = palette[variant] || palette.car;
  const isBus = variant === "bus";
  const w = isBus ? 44 : 32;
  const h = isBus ? 18 : 14;
  // Rotate if moving vertically so the car "faces" its direction of travel.
  const rotate = direction === "down" || direction === "up" ? 90 : 0;

  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotate})`} pointerEvents="none">
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        fill={p.body}
        stroke={STROKE}
        strokeWidth="1.25"
      />
      {isBus ? (
        <>
          <rect x={-w / 2 + 3} y={-h / 2 + 3} width={8} height={5} fill={p.accent} stroke={STROKE} strokeWidth="0.75" />
          <rect x={-w / 2 + 13} y={-h / 2 + 3} width={8} height={5} fill={p.accent} stroke={STROKE} strokeWidth="0.75" />
          <rect x={-w / 2 + 23} y={-h / 2 + 3} width={8} height={5} fill={p.accent} stroke={STROKE} strokeWidth="0.75" />
          <rect x={-w / 2 + 33} y={-h / 2 + 3} width={6} height={5} fill={p.accent} stroke={STROKE} strokeWidth="0.75" />
        </>
      ) : (
        <>
          <rect x={-w / 2 + 4} y={-h / 2 + 2} width={w - 8} height={4} fill={p.accent} stroke={STROKE} strokeWidth="0.75" />
          {variant === "police" && (
            <rect x={-3} y={-h / 2 - 3} width={6} height={2.5} fill="#c0392b" stroke={STROKE} strokeWidth="0.75" />
          )}
        </>
      )}
      {/* Wheels */}
      <circle cx={-w / 2 + 5} cy={h / 2} r="2.5" fill={STROKE} />
      <circle cx={w / 2 - 5} cy={h / 2} r="2.5" fill={STROKE} />
      {isBus && <circle cx={0} cy={h / 2} r="2.5" fill={STROKE} />}
    </g>
  );
}
