import React from "react";

/*
 * ReviewRatingIcon — Custom SVG pictograms for LP review ratings.
 * Matches BadgeIcon / DockIcon flat, chunky Win95-style aesthetic with the
 * Millennium Bug palette. Each glyph renders inside a 24x24 viewBox.
 *
 * Usage:
 *   <ReviewRatingIcon rating="Favorite" size={14} />
 */

const STROKE = "#141419";
const WHITE = "#ffffff";

const FILLS = {
  butter: "#f0c94b",
  butterDeep: "#c9a02f",
  tangerine: "#f28c3b",
  aqua: "#2bb3c4",
  aquaDeep: "#1a8995",
  grape: "#6b4fbb",
  grapeDeep: "#4a3592",
  rose: "#e94560",
  roseDeep: "#b82840",
  silver: "#c8c8d4",
  paper: "#faf4e3",
};

const GLYPHS = {
  Favorite: (
    <g>
      <polygon
        points="12,3 14.4,9.5 21,10 16,14.5 17.5,21 12,17.5 6.5,21 8,14.5 3,10 9.6,9.5"
        fill={FILLS.butter}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
      <polygon
        points="12,7 13.5,11 17,11.3 14.5,13.5 12,12 9.5,13.5 7,11.3 10.5,11"
        fill={FILLS.tangerine}
      />
    </g>
  ),
  Consideration: (
    <g>
      <path
        d="M 7 10 Q 7 4 12 4 Q 17 4 17 10 Q 17 13 14.5 14.5 L 14.5 16 L 9.5 16 L 9.5 14.5 Q 7 13 7 10 Z"
        fill={FILLS.aqua}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
      <path
        d="M 10 8 Q 10 6 12 6"
        fill="none"
        stroke={WHITE}
        strokeWidth="1.25"
        strokeLinecap="square"
      />
      <rect x="9.5" y="16.5" width="5" height="2" fill={FILLS.aquaDeep} stroke={STROKE} strokeWidth="1.25" />
      <rect x="10" y="18.5" width="4" height="2" fill={FILLS.aquaDeep} stroke={STROKE} strokeWidth="1.25" />
      <line x1="11" y1="20.5" x2="13" y2="20.5" stroke={STROKE} strokeWidth="1.25" />
    </g>
  ),
  Pass: (
    <g>
      <polygon
        points="3,8 11,8 11,5 19,12 11,19 11,16 3,16"
        fill={FILLS.grape}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
      <polygon
        points="5,10 9.5,10 9.5,8 15,12 9.5,16 9.5,14 5,14"
        fill={FILLS.grapeDeep}
      />
    </g>
  ),
  Ineligible: (
    <g>
      <circle cx="12" cy="12" r="9" fill={FILLS.rose} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" fill={FILLS.paper} stroke={STROKE} strokeWidth="1" />
      <rect
        x="5.5"
        y="10.5"
        width="13"
        height="3"
        fill={FILLS.rose}
        stroke={STROKE}
        strokeWidth="1.5"
        transform="rotate(-45 12 12)"
      />
    </g>
  ),
  "No Rating": (
    <g>
      <circle cx="12" cy="12" r="9" fill={FILLS.silver} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="9" cy="11" r="1.25" fill={STROKE} />
      <circle cx="15" cy="11" r="1.25" fill={STROKE} />
      <path d="M 8.5 16 Q 12 14 15.5 16" fill="none" stroke={STROKE} strokeWidth="1.5" strokeLinecap="square" />
    </g>
  ),
};

export default function ReviewRatingIcon({ rating, size = 16, className = "" }) {
  const glyph = GLYPHS[rating];
  if (!glyph) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {glyph}
    </svg>
  );
}
