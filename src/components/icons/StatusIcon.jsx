import React from "react";

/*
 * StatusIcon — Flat, chunky Win95-style pictograms for status / action icons.
 * Shares the same aesthetic language as BadgeIcon / DockIcon / ReviewRatingIcon
 * (2px ink stroke, mitered joins, pastel palette). Renders inside a 24x24
 * viewBox.
 *
 * Usage:
 *   <StatusIcon type="check" size={14} title="Shown" />
 *   <StatusIcon type="cross" size={14} title="Hidden" />
 *   <StatusIcon type="trash" size={14} />
 */

const STROKE = "#141419";

const FILLS = {
  green: "#5ba87d",
  greenDeep: "#3f7a58",
  rose: "#d48fc7",
  roseDeep: "#a85fa0",
  trash: "#e94560",
  trashDeep: "#b82840",
  gold: "#f5cf3d",
  goldDeep: "#b89020",
};

const GLYPHS = {
  check: (
    <g>
      <polygon
        points="4,13 10,19 21,6 18,3 10,13 7,10"
        fill={FILLS.green}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
    </g>
  ),
  cross: (
    <g>
      <polygon
        points="6,3 12,9 18,3 21,6 15,12 21,18 18,21 12,15 6,21 3,18 9,12 3,6"
        fill={FILLS.rose}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
    </g>
  ),
  trash: (
    <g>
      <rect x="9" y="2" width="6" height="2" fill={FILLS.trashDeep} stroke={STROKE} strokeWidth="1.5" />
      <rect x="3" y="4" width="18" height="3" fill={FILLS.trashDeep} stroke={STROKE} strokeWidth="1.5" />
      <rect x="5" y="7" width="14" height="14" fill={FILLS.trash} stroke={STROKE} strokeWidth="1.5" />
      <line x1="9" y1="10" x2="9" y2="18" stroke={STROKE} strokeWidth="1.5" />
      <line x1="12" y1="10" x2="12" y2="18" stroke={STROKE} strokeWidth="1.5" />
      <line x1="15" y1="10" x2="15" y2="18" stroke={STROKE} strokeWidth="1.5" />
    </g>
  ),
  // Trophy cup — grant winner. Mirrors the TrophyCup primitive in
  // BadgeIcon (used by review_champion / elite category) so the inline
  // pill icon and the badge wall stay visually consistent.
  trophy: (
    <g>
      <path d="M 5 4 L 19 4 L 18 13 Q 18 16 12 16 Q 6 16 6 13 Z" fill={FILLS.gold} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M 5 6 Q 2 6 2 9 Q 2 11 5 11" fill="none" stroke={STROKE} strokeWidth="1.5" />
      <path d="M 19 6 Q 22 6 22 9 Q 22 11 19 11" fill="none" stroke={STROKE} strokeWidth="1.5" />
      <rect x="10" y="16" width="4" height="3" fill={FILLS.goldDeep} stroke={STROKE} strokeWidth="1.25" />
      <rect x="7" y="19" width="10" height="2" fill={FILLS.goldDeep} stroke={STROKE} strokeWidth="1.25" />
    </g>
  ),
};

export default function StatusIcon({ type, size = 14, title = "", className = "" }) {
  const glyph = GLYPHS[type];
  if (!glyph) return null;
  const hasTitle = Boolean(title);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role={hasTitle ? "img" : "presentation"}
      aria-label={hasTitle ? title : undefined}
      aria-hidden={hasTitle ? undefined : true}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      {hasTitle && <title>{title}</title>}
      {glyph}
    </svg>
  );
}
