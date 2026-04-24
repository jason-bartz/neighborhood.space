import React from "react";

/*
 * DockIcon — custom SVG pictograms for the desktop dock.
 * Matches ResourceIcon's flat, chunky Win95-style aesthetic with the
 * Millennium Bug palette. Each glyph renders inside a 24x24 viewBox.
 *
 * Five apps: website (browser/map), submit (pitch form), buddyMessenger
 * (chat bubble), founderMap (pin + map), lpPortal (briefcase + chart).
 */

const STROKE = "#141419";
const WHITE = "#ffffff";

const FILLS = {
  magenta: "#e93a7d",
  magentaDeep: "#c21d61",
  grape: "#6b4fbb",
  aqua: "#2bb3c4",
  tangerine: "#f28c3b",
  butter: "#f0c94b",
  paper: "#faf4e3",
};

const GLYPHS = {
  // Neighborhood Navigator — browser window with pinned map
  website: (
    <g>
      <rect x="2" y="3" width="20" height="18" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.5" />
      <rect x="2" y="3" width="20" height="4" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="4.5" cy="5" r="0.75" fill={WHITE} />
      <circle cx="6.75" cy="5" r="0.75" fill={WHITE} />
      <circle cx="9" cy="5" r="0.75" fill={WHITE} />
      <path d="M 5 11 L 10 9 L 15 12 L 20 10 L 20 18 L 5 18 Z" fill={FILLS.butter} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <circle cx="13" cy="13" r="1.5" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1" />
    </g>
  ),

  // Submit Pitch — document with pencil / checkmark
  submit: (
    <g>
      <rect x="4" y="2" width="14" height="20" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.5" />
      <rect x="6" y="4" width="10" height="2" fill={FILLS.magenta} />
      <line x1="6" y1="9" x2="16" y2="9" stroke={STROKE} strokeWidth="1.25" />
      <line x1="6" y1="12" x2="14" y2="12" stroke={STROKE} strokeWidth="1.25" />
      <line x1="6" y1="15" x2="12" y2="15" stroke={STROKE} strokeWidth="1.25" />
      <path d="M 8 18 L 10 20 L 14 16" fill="none" stroke={FILLS.magenta} strokeWidth="2.25" strokeLinecap="square" strokeLinejoin="miter" />
      <polygon points="16,2 20,2 20,6" fill={FILLS.butter} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
    </g>
  ),

  // Buddy Messenger — speech bubble with dots
  buddyMessenger: (
    <g>
      <rect x="3" y="4" width="18" height="13" fill={FILLS.grape} stroke={STROKE} strokeWidth="1.5" />
      <polygon points="7,17 5,21 11,17" fill={FILLS.grape} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <circle cx="8" cy="10.5" r="1.25" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.75" />
      <circle cx="12" cy="10.5" r="1.25" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.75" />
      <circle cx="16" cy="10.5" r="1.25" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),

  // Awardee Map — map with pin
  founderMap: (
    <g>
      <rect x="2" y="5" width="20" height="15" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="1.5" />
      {/* Folded map creases */}
      <line x1="9" y1="5" x2="9" y2="20" stroke={STROKE} strokeWidth="1" strokeDasharray="2,2" />
      <line x1="15" y1="5" x2="15" y2="20" stroke={STROKE} strokeWidth="1" strokeDasharray="2,2" />
      {/* Location pin */}
      <path d="M 12 8 C 14.5 8 15.5 10 15.5 11.5 C 15.5 13.5 12 17 12 17 C 12 17 8.5 13.5 8.5 11.5 C 8.5 10 9.5 8 12 8 Z" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <circle cx="12" cy="11.5" r="1.25" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),

  // LP Portal — briefcase with rising bar chart (investor portfolio)
  lpPortal: (
    <g>
      {/* Handle */}
      <path d="M 9 8 L 9 6 Q 9 4 12 4 Q 15 4 15 6 L 15 8" fill="none" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      {/* Body */}
      <rect x="3" y="8" width="18" height="13" fill={FILLS.grape} stroke={STROKE} strokeWidth="1.5" />
      {/* Top band / latch strip */}
      <rect x="3" y="8" width="18" height="2.5" fill={FILLS.magentaDeep} stroke={STROKE} strokeWidth="1" />
      <rect x="11" y="7.5" width="2" height="1.75" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.5" />
      {/* Bar chart */}
      <rect x="6" y="16" width="3" height="3" fill={FILLS.butter} stroke={STROKE} strokeWidth="1" />
      <rect x="10.5" y="14" width="3" height="5" fill={FILLS.butter} stroke={STROKE} strokeWidth="1" />
      <rect x="15" y="12" width="3" height="7" fill={FILLS.butter} stroke={STROKE} strokeWidth="1" />
    </g>
  ),

  // Resources — open book with info "i"
  resources: (
    <g>
      {/* Left page */}
      <path d="M 3 5 L 12 6 L 12 21 L 3 20 Z" fill={FILLS.butter} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      {/* Right page */}
      <path d="M 21 5 L 12 6 L 12 21 L 21 20 Z" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      {/* Spine */}
      <line x1="12" y1="6" x2="12" y2="21" stroke={STROKE} strokeWidth="1" />
      {/* Info mark on right page */}
      <circle cx="16.5" cy="11" r="0.9" fill={FILLS.magenta} />
      <rect x="16" y="13" width="1" height="4" fill={FILLS.magenta} />
      {/* Lines on left page */}
      <line x1="5" y1="10" x2="10" y2="10.5" stroke={STROKE} strokeWidth="0.75" />
      <line x1="5" y1="13" x2="10" y2="13.5" stroke={STROKE} strokeWidth="0.75" />
      <line x1="5" y1="16" x2="9" y2="16.5" stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),

  // Instagram — camera with lens
  instagram: (
    <g>
      <rect x="3" y="3" width="18" height="18" rx="4" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4.5" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill={FILLS.magentaDeep} stroke={STROKE} strokeWidth="0.75" />
      <circle cx="17" cy="7" r="1" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),

  // LinkedIn — blue square with "in" mark
  linkedin: (
    <g>
      <rect x="3" y="3" width="18" height="18" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.5" />
      {/* "i" dot + stem */}
      <rect x="6" y="7.25" width="2.5" height="2.5" fill={WHITE} stroke={STROKE} strokeWidth="0.5" />
      <rect x="6" y="10.5" width="2.5" height="7" fill={WHITE} stroke={STROKE} strokeWidth="0.5" />
      {/* "n" */}
      <rect x="10.5" y="10.5" width="2.5" height="7" fill={WHITE} stroke={STROKE} strokeWidth="0.5" />
      <path d="M 13 10.5 Q 15 10.5 15 13 L 15 17.5 L 17.5 17.5 L 17.5 12.5 Q 17.5 10.5 15.25 10.5 Z" fill={WHITE} stroke={STROKE} strokeWidth="0.5" strokeLinejoin="miter" />
    </g>
  ),
};

export default function DockIcon({ type, size = 32, className, style }) {
  const glyph = GLYPHS[type];
  if (!glyph) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  );
}
