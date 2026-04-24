import React from "react";

/*
 * ResourceIcon — Flat, chunky Win95-style pictograms for resource types.
 * Each glyph uses 2-color fills on a 24x24 grid with a dark outline,
 * matching the bevel palette in src/win95-tokens.css.
 *
 * Usage: <ResourceIcon type="Funding" size={32} />
 *        or inline in SVG: <ResourceIcon type="Funding" inline x y size={40} />
 */

const STROKE = "#2d2d2d";
const WHITE = "#ffffff";

// Accent fills pulled from win95-tokens palette so icons feel on-theme.
const FILLS = {
  pink: "#ffd6ec",
  pinkDark: "#d48fc7",
  blue: "#d0eaff",
  blueDark: "#7aa7d9",
  yellow: "#ffe6b3",
  yellowDark: "#d4b96a",
  green: "#b3e6cc",
  greenDark: "#5ba87d",
  purple: "#e8c8ff",
  purpleDark: "#9d6dbc",
};

// Each glyph renders inside a 24x24 viewBox.
const GLYPHS = {
  "Funding": (
    // Classical bank: pedimented roof, three columns, $ medallion.
    <g>
      <rect x="3" y="9" width="18" height="10" fill={FILLS.green} stroke={STROKE} strokeWidth="1.5" />
      <polygon points="2,9 22,9 12,3" fill={FILLS.greenDark} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <rect x="5.5" y="11" width="1.5" height="6" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <rect x="11.25" y="11" width="1.5" height="6" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <rect x="17" y="11" width="1.5" height="6" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <rect x="2" y="19" width="20" height="2" fill={FILLS.greenDark} stroke={STROKE} strokeWidth="1.5" />
    </g>
  ),
  "Incubator/Accelerator": (
    // Factory with stepped roof + smokestack.
    <g>
      <rect x="13" y="11" width="8" height="9" fill={FILLS.yellow} stroke={STROKE} strokeWidth="1.5" />
      <polygon points="3,20 3,14 7,11 7,14 11,11 11,14 13,13 13,20" fill={FILLS.yellowDark} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <rect x="16" y="4" width="3" height="7" fill={FILLS.yellowDark} stroke={STROKE} strokeWidth="1.5" />
      <rect x="15.5" y="3" width="4" height="1.5" fill={STROKE} />
      <rect x="15" y="14" width="2" height="2" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <rect x="18" y="14" width="2" height="2" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <rect x="15" y="17" width="2" height="3" fill={FILLS.yellowDark} stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),
  "Mentorship": (
    // Speech bubble with dots + small pennant.
    <g>
      <rect x="3" y="4" width="18" height="13" fill={FILLS.blue} stroke={STROKE} strokeWidth="1.5" />
      <polygon points="8,17 6,21 11,17" fill={FILLS.blue} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <circle cx="8" cy="10.5" r="1.25" fill={STROKE} />
      <circle cx="12" cy="10.5" r="1.25" fill={STROKE} />
      <circle cx="16" cy="10.5" r="1.25" fill={STROKE} />
    </g>
  ),
  "Legal": (
    // Scales of justice.
    <g>
      <rect x="11" y="4" width="2" height="16" fill={FILLS.purpleDark} stroke={STROKE} strokeWidth="1.25" />
      <rect x="7" y="19" width="10" height="2" fill={FILLS.purpleDark} stroke={STROKE} strokeWidth="1.25" />
      <line x1="5" y1="6.5" x2="19" y2="6.5" stroke={STROKE} strokeWidth="1.5" />
      <polygon points="2,10 8,10 5,15" fill={FILLS.purple} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="16,10 22,10 19,15" fill={FILLS.purple} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
    </g>
  ),
  "Education": (
    // Graduation cap.
    <g>
      <polygon points="2,10 12,5 22,10 12,15" fill={FILLS.blueDark} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M 6 12 L 6 17 Q 12 20 18 17 L 18 12" fill={FILLS.blue} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <line x1="21" y1="10" x2="21" y2="16" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="21" cy="17" r="1.5" fill={FILLS.yellow} stroke={STROKE} strokeWidth="1" />
    </g>
  ),
  "Community": (
    // Three small houses clustered.
    <g>
      <polygon points="2,11 6,7 10,11 10,20 2,20" fill={FILLS.pink} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="8,9 12,4 16,9 16,20 8,20" fill={FILLS.pinkDark} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="14,11 18,7 22,11 22,20 14,20" fill={FILLS.pink} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <rect x="11" y="13" width="2" height="7" fill={STROKE} />
      <rect x="4.5" y="14" width="1.5" height="1.5" fill={WHITE} stroke={STROKE} strokeWidth="0.5" />
      <rect x="17.5" y="14" width="1.5" height="1.5" fill={WHITE} stroke={STROKE} strokeWidth="0.5" />
    </g>
  ),
  "Government": (
    // Domed capitol building.
    <g>
      <path d="M 5 11 Q 12 4 19 11" fill={FILLS.purple} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <line x1="12" y1="4" x2="12" y2="2" stroke={STROKE} strokeWidth="1.25" />
      <circle cx="12" cy="2" r="1" fill={FILLS.purpleDark} stroke={STROKE} strokeWidth="0.75" />
      <rect x="3" y="11" width="18" height="2" fill={FILLS.purpleDark} stroke={STROKE} strokeWidth="1.25" />
      <rect x="4" y="13" width="2.5" height="6" fill={WHITE} stroke={STROKE} strokeWidth="1" />
      <rect x="7.75" y="13" width="2.5" height="6" fill={WHITE} stroke={STROKE} strokeWidth="1" />
      <rect x="11.5" y="13" width="2.5" height="6" fill={WHITE} stroke={STROKE} strokeWidth="1" />
      <rect x="15.25" y="13" width="2.5" height="6" fill={WHITE} stroke={STROKE} strokeWidth="1" />
      <rect x="2" y="19" width="20" height="2" fill={FILLS.purpleDark} stroke={STROKE} strokeWidth="1.25" />
    </g>
  ),
  "Venture Capital": (
    // Upward arrow with coin stack (growth).
    <g>
      <rect x="3" y="14" width="4" height="7" fill={FILLS.green} stroke={STROKE} strokeWidth="1.25" />
      <rect x="9" y="10" width="4" height="11" fill={FILLS.green} stroke={STROKE} strokeWidth="1.25" />
      <rect x="15" y="6" width="4" height="15" fill={FILLS.greenDark} stroke={STROKE} strokeWidth="1.25" />
      <polygon points="13,5 22,5 22,2 17.5,2 17.5,3 13,3" fill={STROKE} />
      <polygon points="17.5,2 22,2 22,5" fill={STROKE} />
    </g>
  ),
  "Angel Group": (
    // 5-point star with halo ring.
    <g>
      <ellipse cx="12" cy="6" rx="7" ry="1.75" fill="none" stroke={FILLS.yellowDark} strokeWidth="1.5" />
      <polygon
        points="12,9 13.9,14.2 19.5,14.5 15,18 16.6,23.2 12,20.2 7.4,23.2 9,18 4.5,14.5 10.1,14.2"
        fill={FILLS.yellow}
        stroke={STROKE}
        strokeWidth="1.25"
        strokeLinejoin="miter"
      />
    </g>
  ),
  "Coworking": (
    // Multi-window office tile.
    <g>
      <rect x="3" y="4" width="18" height="17" fill={FILLS.blue} stroke={STROKE} strokeWidth="1.5" />
      <rect x="5" y="6" width="4" height="4" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <rect x="10" y="6" width="4" height="4" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <rect x="15" y="6" width="4" height="4" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <rect x="5" y="11" width="4" height="4" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <rect x="10" y="11" width="4" height="4" fill={FILLS.blueDark} stroke={STROKE} strokeWidth="0.75" />
      <rect x="15" y="11" width="4" height="4" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <rect x="10" y="16" width="4" height="5" fill={FILLS.blueDark} stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),
  "Nonprofit": (
    // Heart.
    <g>
      <path
        d="M 12 20 L 3.5 11.5 Q 2 9 3.5 6.5 Q 6 3.5 8.5 5 Q 11 6.5 12 9 Q 13 6.5 15.5 5 Q 18 3.5 20.5 6.5 Q 22 9 20.5 11.5 Z"
        fill={FILLS.pinkDark}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
      <rect x="11" y="8" width="2" height="6" fill={WHITE} />
      <rect x="9" y="10" width="6" height="2" fill={WHITE} />
    </g>
  ),
  "Corporate Venture": (
    // Tall skyscraper with satellite block.
    <g>
      <rect x="8" y="3" width="8" height="18" fill={FILLS.blueDark} stroke={STROKE} strokeWidth="1.5" />
      <rect x="16" y="9" width="5" height="12" fill={FILLS.blue} stroke={STROKE} strokeWidth="1.5" />
      <rect x="3" y="13" width="5" height="8" fill={FILLS.blue} stroke={STROKE} strokeWidth="1.5" />
      <rect x="9.5" y="5" width="1.5" height="1.5" fill={WHITE} />
      <rect x="13" y="5" width="1.5" height="1.5" fill={WHITE} />
      <rect x="9.5" y="8" width="1.5" height="1.5" fill={WHITE} />
      <rect x="13" y="8" width="1.5" height="1.5" fill={WHITE} />
      <rect x="9.5" y="11" width="1.5" height="1.5" fill={WHITE} />
      <rect x="13" y="11" width="1.5" height="1.5" fill={WHITE} />
      <rect x="9.5" y="14" width="1.5" height="1.5" fill={WHITE} />
      <rect x="13" y="14" width="1.5" height="1.5" fill={WHITE} />
      <rect x="17.25" y="11" width="1.5" height="1.5" fill={WHITE} />
      <rect x="17.25" y="14" width="1.5" height="1.5" fill={WHITE} />
      <rect x="4.5" y="15" width="1.5" height="1.5" fill={WHITE} />
      <rect x="4.5" y="18" width="1.5" height="1.5" fill={WHITE} />
    </g>
  ),
  "Private Equity": (
    // Stacked bills / cash block.
    <g>
      <rect x="3" y="6" width="18" height="12" fill={FILLS.green} stroke={STROKE} strokeWidth="1.5" />
      <rect x="5" y="8" width="14" height="8" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <circle cx="12" cy="12" r="2.5" fill={FILLS.greenDark} stroke={STROKE} strokeWidth="1" />
      <path d="M 12 10 L 12 14 M 11 11 L 13 11 M 11 13 L 13 13" stroke={STROKE} strokeWidth="1" fill="none" />
      <rect x="6" y="4" width="12" height="1.5" fill={FILLS.greenDark} stroke={STROKE} strokeWidth="0.5" />
      <rect x="6" y="18.5" width="12" height="1.5" fill={FILLS.greenDark} stroke={STROKE} strokeWidth="0.5" />
    </g>
  ),
  "Private Investment Office": (
    // Diamond / gem.
    <g>
      <polygon points="12,3 20,9 12,21 4,9" fill={FILLS.purple} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <polygon points="4,9 20,9 12,21" fill={FILLS.purpleDark} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="4,9 8,3 12,9 16,3 20,9" fill={WHITE} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <line x1="8" y1="3" x2="12" y2="21" stroke={STROKE} strokeWidth="0.75" />
      <line x1="16" y1="3" x2="12" y2="21" stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),
  "Investment Platform": (
    // Briefcase with clasp.
    <g>
      <rect x="3" y="8" width="18" height="12" fill={FILLS.greenDark} stroke={STROKE} strokeWidth="1.5" />
      <rect x="9" y="4" width="6" height="4" fill={FILLS.green} stroke={STROKE} strokeWidth="1.5" />
      <rect x="3" y="12" width="18" height="2" fill={STROKE} />
      <rect x="11" y="11" width="2" height="4" fill={FILLS.yellow} stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),
  "Venture Studio": (
    // Construction crane silhouette.
    <g>
      <rect x="10" y="3" width="2" height="17" fill={FILLS.yellowDark} stroke={STROKE} strokeWidth="1.25" />
      <rect x="6" y="3" width="15" height="2" fill={FILLS.yellowDark} stroke={STROKE} strokeWidth="1.25" />
      <line x1="18" y1="5" x2="18" y2="10" stroke={STROKE} strokeWidth="1.25" />
      <rect x="16.5" y="10" width="3" height="2.5" fill={FILLS.yellow} stroke={STROKE} strokeWidth="1" />
      <polygon points="4,20 18,20 18,17 11,17" fill={FILLS.yellow} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <rect x="11" y="7" width="4" height="3" fill={FILLS.yellow} stroke={STROKE} strokeWidth="1" />
    </g>
  ),
};

// Legacy aliases so data that drifts between names still renders.
const ALIASES = {
  "Accelerator/Incubator": "Incubator/Accelerator",
  "Incubator": "Incubator/Accelerator",
  "Accelerator": "Incubator/Accelerator",
};

// Fallback glyph — generic beveled building tile.
const FALLBACK = (
  <g>
    <rect x="3" y="5" width="18" height="16" fill={FILLS.pink} stroke={STROKE} strokeWidth="1.5" />
    <rect x="5" y="8" width="3" height="3" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
    <rect x="10.5" y="8" width="3" height="3" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
    <rect x="16" y="8" width="3" height="3" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
    <rect x="5" y="13" width="3" height="3" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
    <rect x="10.5" y="13" width="3" height="3" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
    <rect x="16" y="13" width="3" height="3" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
    <rect x="10" y="17" width="4" height="4" fill={FILLS.pinkDark} stroke={STROKE} strokeWidth="0.75" />
  </g>
);

export function resolveGlyph(type) {
  const key = ALIASES[type] || type;
  return GLYPHS[key] || FALLBACK;
}

/*
 * Renders as a standalone <svg> by default, or as an embedded <g> when
 * `inline` is true (for nesting inside a parent SVG — used by the map).
 */
export default function ResourceIcon({
  type,
  size = 32,
  inline = false,
  x = 0,
  y = 0,
  title,
  className,
  style,
}) {
  const glyph = resolveGlyph(type);

  if (inline) {
    const scale = size / 24;
    return (
      <g
        transform={`translate(${x - size / 2}, ${y - size / 2}) scale(${scale})`}
        className={className}
        style={style}
      >
        {title ? <title>{title}</title> : null}
        {glyph}
      </g>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {glyph}
    </svg>
  );
}
