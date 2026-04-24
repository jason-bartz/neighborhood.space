import React from "react";

/*
 * BadgeIcon — Custom SVG pictograms for the LP Trophy Case.
 * Matches DockIcon / ResourceIcon flat, chunky Win95-style aesthetic with
 * the Millennium Bug palette. Each glyph renders inside a 24x24 viewBox.
 *
 * Two glyph maps:
 *   GLYPHS — keyed by badge id (one per BADGES entry in badgeDefinitions.js)
 *   CATEGORY_GLYPHS — keyed by BADGE_CATEGORIES value (9 total)
 *
 * Usage:
 *   <BadgeIcon id="first_review" size={32} />
 *   <BadgeIcon category="milestones" size={20} />
 *   <BadgeIcon locked size={32} />
 */

const STROKE = "#141419";
const WHITE = "#ffffff";

const FILLS = {
  magenta: "#e93a7d",
  magentaDeep: "#c21d61",
  grape: "#6b4fbb",
  grapeDeep: "#4a3592",
  aqua: "#2bb3c4",
  aquaDeep: "#1a8995",
  tangerine: "#f28c3b",
  tangerineDeep: "#c46b22",
  butter: "#f0c94b",
  butterDeep: "#c9a02f",
  paper: "#faf4e3",
  bronze: "#cd7f32",
  bronzeDeep: "#8c5520",
  silver: "#c8c8d4",
  silverDeep: "#8a8aa0",
  gold: "#f5cf3d",
  goldDeep: "#b89020",
  rose: "#e94560",
  green: "#5ba87d",
  greenDeep: "#3a7053",
  pink: "#ffd6ec",
};

// Reusable trophy cup primitive — used by several elite/champion badges.
const TrophyCup = ({ fill = FILLS.butter, deep = FILLS.butterDeep }) => (
  <g>
    <path d="M 5 4 L 19 4 L 18 13 Q 18 16 12 16 Q 6 16 6 13 Z" fill={fill} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
    <path d="M 5 6 Q 2 6 2 9 Q 2 11 5 11" fill="none" stroke={STROKE} strokeWidth="1.5" />
    <path d="M 19 6 Q 22 6 22 9 Q 22 11 19 11" fill="none" stroke={STROKE} strokeWidth="1.5" />
    <rect x="10" y="16" width="4" height="3" fill={deep} stroke={STROKE} strokeWidth="1.25" />
    <rect x="7" y="19" width="10" height="2" fill={deep} stroke={STROKE} strokeWidth="1.25" />
  </g>
);

// Reusable medal primitive — bronze/silver/gold/diamond variants.
const Medal = ({ fill, deep }) => (
  <g>
    <polygon points="8,2 9,7 6,9 5,4" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
    <polygon points="16,2 15,7 18,9 19,4" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
    <circle cx="12" cy="15" r="6.5" fill={fill} stroke={STROKE} strokeWidth="1.5" />
    <circle cx="12" cy="15" r="3.5" fill={deep} stroke={STROKE} strokeWidth="1" />
  </g>
);

// Locked / hidden badge glyph — neutral gray padlock.
const LOCKED = (
  <g>
    <rect x="5" y="11" width="14" height="10" fill={FILLS.silver} stroke={STROKE} strokeWidth="1.5" />
    <path d="M 8 11 L 8 7 Q 8 3 12 3 Q 16 3 16 7 L 16 11" fill="none" stroke={STROKE} strokeWidth="1.75" />
    <circle cx="12" cy="15" r="1.5" fill={STROKE} />
    <rect x="11.25" y="15.5" width="1.5" height="3" fill={STROKE} />
  </g>
);

const GLYPHS = {
  // ─── Review Milestones ────────────────────────────────────────────────
  // Angel — first review
  first_review: (
    <g>
      <ellipse cx="12" cy="5" rx="3.5" ry="1" fill="none" stroke={FILLS.butter} strokeWidth="1.25" />
      <circle cx="12" cy="9" r="2.5" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.25" />
      <path d="M 8 13 Q 8 19 12 19 Q 16 19 16 13 L 12 13 Z" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M 4 10 Q 2 12 4 15 Q 6 14 8 13" fill={WHITE} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <path d="M 20 10 Q 22 12 20 15 Q 18 14 16 13" fill={WHITE} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
    </g>
  ),
  // Cluster of houses — neighborhood rookie
  welcome_neighborhood: (
    <g>
      <polygon points="2,12 6,8 10,12 10,21 2,21" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="8,10 12,5 16,10 16,21 8,21" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="14,12 18,8 22,12 22,21 14,21" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <rect x="11" y="14" width="2" height="7" fill={STROKE} />
    </g>
  ),
  // Magnifying glass — neighborhood watch
  block_captain: (
    <g>
      <circle cx="10" cy="10" r="6" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="10" cy="10" r="3.5" fill={WHITE} stroke={STROKE} strokeWidth="1" />
      <line x1="14.5" y1="14.5" x2="20" y2="20" stroke={STROKE} strokeWidth="3" strokeLinecap="square" />
      <line x1="15" y1="15" x2="20" y2="20" stroke={FILLS.tangerine} strokeWidth="1.5" strokeLinecap="square" />
    </g>
  ),
  // Single big star — review pro
  super_reviewer: (
    <g>
      <polygon points="12,3 14.4,9.5 21,10 16,14.5 17.5,21 12,17.5 6.5,21 8,14.5 3,10 9.6,9.5"
        fill={FILLS.butter} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <polygon points="12,7 13.5,11 17,11.3 14.5,13.5 12,12 9.5,13.5 7,11.3 10.5,11"
        fill={FILLS.tangerine} />
    </g>
  ),
  // Trophy cup — review champion
  review_champion: <TrophyCup fill={FILLS.tangerine} deep={FILLS.tangerineDeep} />,
  // CD/disc — platinum status (kept Y2K theme)
  going_platinum: (
    <g>
      <circle cx="12" cy="12" r="9.5" fill={FILLS.silver} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke={STROKE} strokeWidth="0.5" />
      <circle cx="12" cy="12" r="4" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1" />
      <circle cx="12" cy="12" r="1.5" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <path d="M 12 3 Q 18 7 19 12" fill="none" stroke={WHITE} strokeWidth="1" />
    </g>
  ),
  // Crown — review legend
  review_legend: (
    <g>
      <path d="M 3 9 L 5 18 L 19 18 L 21 9 L 17 12 L 12 6 L 7 12 Z"
        fill={FILLS.butter} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <rect x="5" y="18" width="14" height="3" fill={FILLS.butterDeep} stroke={STROKE} strokeWidth="1.25" />
      <circle cx="12" cy="11" r="1.5" fill={FILLS.magenta} stroke={STROKE} strokeWidth="0.75" />
      <circle cx="6" cy="13" r="1" fill={FILLS.aqua} stroke={STROKE} strokeWidth="0.5" />
      <circle cx="18" cy="13" r="1" fill={FILLS.aqua} stroke={STROKE} strokeWidth="0.5" />
    </g>
  ),
  // Lightning bolt — grand master
  god_mode: (
    <g>
      <polygon points="13,2 4,13 10,13 8,22 19,10 13,10 16,2"
        fill={FILLS.butter} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <polygon points="13,4 7,12 11,12 9,18 16,11 12,11 14,4" fill={FILLS.tangerine} />
    </g>
  ),

  // ─── Engagement ───────────────────────────────────────────────────────
  // Small thought cloud — first comment
  away_message: (
    <g>
      <ellipse cx="12" cy="11" rx="9" ry="6" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="7" cy="18" r="1.5" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1" />
      <circle cx="4" cy="20.5" r="0.75" fill={FILLS.aqua} stroke={STROKE} strokeWidth="0.75" />
      <circle cx="12" cy="11" r="1" fill={WHITE} />
    </g>
  ),
  // Speech bubble with dots — commentator
  aim_buddy: (
    <g>
      <rect x="3" y="4" width="18" height="13" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" />
      <polygon points="7,17 5,21 11,17" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <circle cx="8" cy="10.5" r="1.25" fill={WHITE} />
      <circle cx="12" cy="10.5" r="1.25" fill={WHITE} />
      <circle cx="16" cy="10.5" r="1.25" fill={WHITE} />
    </g>
  ),
  // Notepad with pencil — wordsmith
  feedback_guru: (
    <g>
      <rect x="3" y="3" width="14" height="18" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.5" />
      <line x1="6" y1="7" x2="14" y2="7" stroke={STROKE} strokeWidth="1.25" />
      <line x1="6" y1="10" x2="14" y2="10" stroke={STROKE} strokeWidth="1.25" />
      <line x1="6" y1="13" x2="12" y2="13" stroke={STROKE} strokeWidth="1.25" />
      <rect x="3" y="3" width="14" height="2" fill={FILLS.magenta} />
      <polygon points="14,18 22,10 20,8 12,16" fill={FILLS.butter} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="12,16 14,18 11,19" fill={STROKE} />
    </g>
  ),
  // Pen writing on paper — comment champion
  comment_champion: (
    <g>
      <rect x="2" y="6" width="14" height="14" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.5" />
      <line x1="4.5" y1="10" x2="13" y2="10" stroke={STROKE} strokeWidth="1" />
      <line x1="4.5" y1="13" x2="13" y2="13" stroke={STROKE} strokeWidth="1" />
      <line x1="4.5" y1="16" x2="11" y2="16" stroke={STROKE} strokeWidth="1" />
      <polygon points="14,15 21,8 23,10 16,17" fill={FILLS.grape} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="14,15 16,17 13,18" fill={STROKE} />
      <polygon points="20,7 22,9 23,8 21,6" fill={FILLS.butter} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
    </g>
  ),
  // Open book — detailed writer
  t9_master: (
    <g>
      <path d="M 2 6 Q 7 4 12 6 L 12 20 Q 7 18 2 20 Z" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M 22 6 Q 17 4 12 6 L 12 20 Q 17 18 22 20 Z" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <line x1="4.5" y1="9" x2="10" y2="9.5" stroke={STROKE} strokeWidth="0.75" />
      <line x1="4.5" y1="12" x2="10" y2="12.5" stroke={STROKE} strokeWidth="0.75" />
      <line x1="4.5" y1="15" x2="9" y2="15.5" stroke={STROKE} strokeWidth="0.75" />
      <line x1="14" y1="9.5" x2="19.5" y2="9" stroke={STROKE} strokeWidth="0.75" />
      <line x1="14" y1="12.5" x2="19.5" y2="12" stroke={STROKE} strokeWidth="0.75" />
      <line x1="15" y1="15.5" x2="19.5" y2="15" stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),
  // Megaphone — master communicator
  grade_a_yapper: (
    <g>
      <polygon points="3,9 14,5 14,19 3,15" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <rect x="14" y="7" width="3" height="10" fill={FILLS.magentaDeep} stroke={STROKE} strokeWidth="1.5" />
      <rect x="3" y="9" width="2" height="6" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="1" />
      <line x1="18" y1="8" x2="21" y2="6" stroke={STROKE} strokeWidth="1.5" />
      <line x1="18" y1="12" x2="22" y2="12" stroke={STROKE} strokeWidth="1.5" />
      <line x1="18" y1="16" x2="21" y2="18" stroke={STROKE} strokeWidth="1.5" />
    </g>
  ),

  // ─── Accuracy & Success ───────────────────────────────────────────────
  // Eye — angel eye
  eye_for_talent: (
    <g>
      <path d="M 2 12 Q 12 4 22 12 Q 12 20 2 12 Z" fill={WHITE} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <circle cx="12" cy="12" r="4.5" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.25" />
      <circle cx="12" cy="12" r="2" fill={STROKE} />
      <circle cx="13" cy="11" r="0.75" fill={WHITE} />
    </g>
  ),
  // Magnifier with checkmark — talent scout
  talent_scout: (
    <g>
      <circle cx="10" cy="10" r="6" fill={FILLS.green} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="10" cy="10" r="3.5" fill={WHITE} stroke={STROKE} strokeWidth="1" />
      <path d="M 8 10 L 9.5 11.5 L 12 8.5" fill="none" stroke={FILLS.greenDeep} strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter" />
      <line x1="14.5" y1="14.5" x2="20" y2="20" stroke={STROKE} strokeWidth="3" strokeLinecap="square" />
    </g>
  ),
  // Crystal ball — oracle
  winner_whisperer: (
    <g>
      <polygon points="6,18 18,18 20,21 4,21" fill={FILLS.grapeDeep} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <circle cx="12" cy="12" r="7.5" fill={FILLS.grape} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="9.5" cy="9.5" r="2.5" fill={WHITE} opacity="0.6" />
      <circle cx="11" cy="11" r="1" fill={WHITE} />
      <circle cx="14" cy="13" r="0.5" fill={FILLS.butter} />
    </g>
  ),
  // Tarot card — fortune teller
  miss_cleo: (
    <g>
      <rect x="5" y="3" width="14" height="18" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.5" />
      <rect x="5" y="3" width="14" height="3" fill={FILLS.grape} />
      <polygon points="12,9 13,12.5 16.5,12.5 13.7,14.5 14.7,18 12,16 9.3,18 10.3,14.5 7.5,12.5 11,12.5"
        fill={FILLS.butter} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
      <circle cx="8" cy="19" r="0.75" fill={FILLS.magenta} />
      <circle cx="16" cy="19" r="0.75" fill={FILLS.magenta} />
    </g>
  ),
  // Gold heart with sparkle — midas touch
  perfect_quarter: (
    <g>
      <path d="M 12 20 L 3.5 11.5 Q 2 9 3.5 6.5 Q 6 3.5 8.5 5 Q 11 6.5 12 9 Q 13 6.5 15.5 5 Q 18 3.5 20.5 6.5 Q 22 9 20.5 11.5 Z"
        fill={FILLS.gold} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M 7 8 L 8 9 L 9 8 L 8 7 Z" fill={WHITE} />
      <circle cx="17" cy="9" r="0.75" fill={WHITE} />
    </g>
  ),

  // ─── Consistency & Timing ─────────────────────────────────────────────
  // Sun rising over horizon — early bird
  early_bird: (
    <g>
      <line x1="2" y1="20" x2="22" y2="20" stroke={STROKE} strokeWidth="1.5" />
      <path d="M 5 20 Q 5 12 12 12 Q 19 12 19 20 Z" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <line x1="12" y1="6" x2="12" y2="9" stroke={FILLS.butter} strokeWidth="1.5" />
      <line x1="5" y1="9" x2="7" y2="11" stroke={FILLS.butter} strokeWidth="1.5" />
      <line x1="19" y1="9" x2="17" y2="11" stroke={FILLS.butter} strokeWidth="1.5" />
      <line x1="2.5" y1="14" x2="4.5" y2="14" stroke={FILLS.butter} strokeWidth="1.5" />
      <line x1="19.5" y1="14" x2="21.5" y2="14" stroke={FILLS.butter} strokeWidth="1.5" />
    </g>
  ),
  // Owl — night owl
  night_owl: (
    <g>
      <ellipse cx="12" cy="13" rx="7" ry="8" fill={FILLS.grape} stroke={STROKE} strokeWidth="1.5" />
      <polygon points="6,5 8,9 6,9" fill={FILLS.grape} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="18,5 16,9 18,9" fill={FILLS.grape} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <circle cx="9" cy="11" r="2.5" fill={WHITE} stroke={STROKE} strokeWidth="1" />
      <circle cx="15" cy="11" r="2.5" fill={WHITE} stroke={STROKE} strokeWidth="1" />
      <circle cx="9" cy="11" r="1" fill={STROKE} />
      <circle cx="15" cy="11" r="1" fill={STROKE} />
      <polygon points="11,14 12,15.5 13,14" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.75" strokeLinejoin="miter" />
    </g>
  ),
  // CRT computer — weekend warrior
  lan_party_regular: (
    <g>
      <rect x="3" y="4" width="18" height="13" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.5" />
      <rect x="5" y="6" width="14" height="9" fill={FILLS.paper} stroke={STROKE} strokeWidth="1" />
      <line x1="6.5" y1="8.5" x2="10" y2="8.5" stroke={FILLS.magenta} strokeWidth="0.75" />
      <line x1="6.5" y1="10.5" x2="13" y2="10.5" stroke={STROKE} strokeWidth="0.5" />
      <line x1="6.5" y1="12" x2="11" y2="12" stroke={STROKE} strokeWidth="0.5" />
      <rect x="9" y="17" width="6" height="2" fill={FILLS.aquaDeep} stroke={STROKE} strokeWidth="1.25" />
      <rect x="6" y="19" width="12" height="2" fill={FILLS.aquaDeep} stroke={STROKE} strokeWidth="1.25" />
    </g>
  ),
  // Calendar with 4 quadrants — four seasons
  quarterly_regular: (
    <g>
      <rect x="3" y="5" width="18" height="16" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.5" />
      <rect x="3" y="5" width="18" height="4" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" />
      <rect x="6" y="3" width="2" height="4" fill={STROKE} />
      <rect x="16" y="3" width="2" height="4" fill={STROKE} />
      <line x1="12" y1="9" x2="12" y2="21" stroke={STROKE} strokeWidth="1" />
      <line x1="3" y1="15" x2="21" y2="15" stroke={STROKE} strokeWidth="1" />
      <circle cx="7.5" cy="12" r="1.25" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.5" />
      <circle cx="16.5" cy="12" r="1.25" fill={FILLS.aqua} stroke={STROKE} strokeWidth="0.5" />
      <circle cx="7.5" cy="18" r="1.25" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="0.5" />
      <circle cx="16.5" cy="18" r="1.25" fill={FILLS.grape} stroke={STROKE} strokeWidth="0.5" />
    </g>
  ),
  // Lightning bolt small — speed reviewer
  dsl_speed: (
    <g>
      <circle cx="12" cy="12" r="9.5" fill={FILLS.butter} stroke={STROKE} strokeWidth="1.5" />
      <polygon points="13,4 6,13 11,13 10,20 18,11 13,11 15,4"
        fill={FILLS.tangerine} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
    </g>
  ),
  // Flame — hot streak
  top_8_material: (
    <g>
      <path d="M 12 3 Q 8 8 9 12 Q 6 11 6 14 Q 6 20 12 21 Q 18 20 18 14 Q 18 11 15 12 Q 17 7 12 3 Z"
        fill={FILLS.tangerine} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M 12 9 Q 10 13 11 16 Q 9 16 9 18 Q 10 20 12 20 Q 14 20 15 18 Q 15 16 13 16 Q 14 12 12 9 Z"
        fill={FILLS.butter} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
    </g>
  ),

  // ─── Rating Patterns ──────────────────────────────────────────────────
  // Star with 8 — favorite eight
  myspace_top_8: (
    <g>
      <polygon points="12,2 14.5,9 22,9 16,13.5 18,21 12,17 6,21 8,13.5 2,9 9.5,9"
        fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <text x="12" y="15" textAnchor="middle" fill={WHITE} stroke={STROKE} strokeWidth="0.5"
        fontFamily="monospace" fontSize="8" fontWeight="bold">8</text>
    </g>
  ),
  // Lightbulb — v considerate
  consideration_expert: (
    <g>
      <path d="M 7 9 Q 7 3 12 3 Q 17 3 17 9 Q 17 12 14 14 L 14 17 L 10 17 L 10 14 Q 7 12 7 9 Z"
        fill={FILLS.butter} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <rect x="10" y="17" width="4" height="2" fill={FILLS.butterDeep} stroke={STROKE} strokeWidth="1" />
      <rect x="10.5" y="19" width="3" height="1.5" fill={FILLS.silverDeep} stroke={STROKE} strokeWidth="1" />
      <line x1="12" y1="21" x2="12" y2="22" stroke={STROKE} strokeWidth="0.75" />
      <line x1="9" y1="6" x2="11" y2="9" stroke={WHITE} strokeWidth="1" />
    </g>
  ),
  // Single tear — tough love
  tough_love: (
    <g>
      <circle cx="12" cy="11" r="8.5" fill={FILLS.butter} stroke={STROKE} strokeWidth="1.5" />
      <path d="M 6 9 Q 7.5 7 9 9" fill="none" stroke={STROKE} strokeWidth="1.25" />
      <path d="M 15 9 Q 16.5 7 18 9" fill="none" stroke={STROKE} strokeWidth="1.25" />
      <path d="M 9 14 Q 12 17 15 14" fill="none" stroke={STROKE} strokeWidth="1.5" strokeLinecap="square" />
      <path d="M 17 12 Q 19 16 18 18 Q 17 19 16 18 Q 15 16 17 12 Z"
        fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
    </g>
  ),
  // Die — pivot master
  wild_card: (
    <g>
      <polygon points="4,8 12,4 20,8 20,18 12,22 4,18" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <polygon points="4,8 12,12 12,22 4,18" fill={FILLS.magentaDeep} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <polygon points="4,8 12,4 20,8 12,12" fill={FILLS.rose} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <circle cx="8" cy="8" r="0.9" fill={WHITE} />
      <circle cx="12" cy="6" r="0.9" fill={WHITE} />
      <circle cx="16" cy="8" r="0.9" fill={WHITE} />
      <circle cx="7" cy="14" r="0.9" fill={WHITE} />
      <circle cx="9" cy="17" r="0.9" fill={WHITE} />
      <circle cx="16" cy="14" r="0.9" fill={WHITE} />
      <circle cx="17.5" cy="17" r="0.9" fill={WHITE} />
    </g>
  ),
  // Red X — strict judge
  back_to_next_bus: (
    <g>
      <circle cx="12" cy="12" r="9.5" fill={FILLS.rose} stroke={STROKE} strokeWidth="1.5" />
      <line x1="7" y1="7" x2="17" y2="17" stroke={WHITE} strokeWidth="3" strokeLinecap="square" />
      <line x1="17" y1="7" x2="7" y2="17" stroke={WHITE} strokeWidth="3" strokeLinecap="square" />
      <line x1="7" y1="7" x2="17" y2="17" stroke={STROKE} strokeWidth="1" strokeLinecap="square" />
      <line x1="17" y1="7" x2="7" y2="17" stroke={STROKE} strokeWidth="1" strokeLinecap="square" />
    </g>
  ),
  // Scales of justice — hard grader
  weakest_link: (
    <g>
      <rect x="11" y="4" width="2" height="16" fill={FILLS.grapeDeep} stroke={STROKE} strokeWidth="1.25" />
      <rect x="7" y="19" width="10" height="2" fill={FILLS.grapeDeep} stroke={STROKE} strokeWidth="1.25" />
      <line x1="5" y1="6.5" x2="19" y2="6.5" stroke={STROKE} strokeWidth="1.5" />
      <polygon points="2,10 8,10 5,15" fill={FILLS.grape} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="16,10 22,10 19,15" fill={FILLS.grape} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
    </g>
  ),
  // Rose — generous heart
  accept_this_rose: (
    <g>
      <line x1="12" y1="12" x2="12" y2="22" stroke={FILLS.greenDeep} strokeWidth="2" />
      <polygon points="13,16 16,15 17,18 13,18" fill={FILLS.green} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
      <polygon points="11,18 8,17 7,20 11,20" fill={FILLS.green} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
      <circle cx="12" cy="9" r="6" fill={FILLS.rose} stroke={STROKE} strokeWidth="1.5" />
      <path d="M 12 5 Q 9 7 12 9 Q 15 7 12 5 Z" fill={FILLS.magentaDeep} stroke={STROKE} strokeWidth="0.75" strokeLinejoin="miter" />
      <path d="M 8 9 Q 9 12 12 11 Q 15 12 16 9 Q 14 13 12 13 Q 10 13 8 9 Z" fill={FILLS.magentaDeep} stroke={STROKE} strokeWidth="0.75" strokeLinejoin="miter" />
    </g>
  ),
  // Bigger lightbulb cluster — open minded
  you_me_everyone: (
    <g>
      <path d="M 6 11 Q 6 6 10 6 Q 14 6 14 11 Q 14 13 12 14 L 12 16 L 8 16 L 8 14 Q 6 13 6 11 Z"
        fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <rect x="8" y="16" width="4" height="1.5" fill={FILLS.aquaDeep} stroke={STROKE} strokeWidth="0.75" />
      <path d="M 13 12 Q 13 8 16 8 Q 19 8 19 12 Q 19 14 17.5 14.75 L 17.5 16 L 14.5 16 L 14.5 14.75 Q 13 14 13 12 Z"
        fill={FILLS.butter} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <rect x="14.5" y="16" width="3" height="1.25" fill={FILLS.butterDeep} stroke={STROKE} strokeWidth="0.75" />
      <line x1="10" y1="20" x2="14" y2="20" stroke={STROKE} strokeWidth="1.5" />
    </g>
  ),

  // ─── Community & Leadership ───────────────────────────────────────────
  // Ribbon medal — chapter MVP
  neighborhood_watch: (
    <g>
      <polygon points="6,2 9,2 11,8 8,8" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
      <polygon points="15,2 18,2 16,8 13,8" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
      <circle cx="12" cy="14" r="6.5" fill={FILLS.gold} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="12" cy="14" r="3.5" fill={FILLS.goldDeep} stroke={STROKE} strokeWidth="1" />
      <text x="12" y="16" textAnchor="middle" fill={WHITE} stroke={STROKE} strokeWidth="0.4"
        fontFamily="monospace" fontSize="5" fontWeight="bold">MVP</text>
    </g>
  ),
  // Classical building with columns — founding member
  og_neighbor: (
    <g>
      <polygon points="2,9 22,9 12,3" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <rect x="3" y="9" width="18" height="2" fill={FILLS.tangerineDeep} stroke={STROKE} strokeWidth="1.25" />
      <rect x="4" y="11" width="2.5" height="8" fill={FILLS.paper} stroke={STROKE} strokeWidth="1" />
      <rect x="8" y="11" width="2.5" height="8" fill={FILLS.paper} stroke={STROKE} strokeWidth="1" />
      <rect x="13.5" y="11" width="2.5" height="8" fill={FILLS.paper} stroke={STROKE} strokeWidth="1" />
      <rect x="17.5" y="11" width="2.5" height="8" fill={FILLS.paper} stroke={STROKE} strokeWidth="1" />
      <rect x="2" y="19" width="20" height="2" fill={FILLS.tangerineDeep} stroke={STROKE} strokeWidth="1.25" />
    </g>
  ),
  // Calendar with "2"
  two_year_club: (
    <g>
      <rect x="3" y="5" width="18" height="16" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.5" />
      <rect x="3" y="5" width="18" height="4" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.5" />
      <rect x="6" y="3" width="2" height="4" fill={STROKE} />
      <rect x="16" y="3" width="2" height="4" fill={STROKE} />
      <text x="12" y="19" textAnchor="middle" fill={STROKE}
        fontFamily="monospace" fontSize="11" fontWeight="bold">2</text>
    </g>
  ),
  // Birthday cake — 3 year club
  three_year_club: (
    <g>
      <rect x="4" y="11" width="16" height="9" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" />
      <rect x="4" y="14" width="16" height="2" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <rect x="9" y="6" width="2" height="5" fill={FILLS.paper} stroke={STROKE} strokeWidth="1" />
      <rect x="13" y="6" width="2" height="5" fill={FILLS.paper} stroke={STROKE} strokeWidth="1" />
      <path d="M 10 6 Q 9 4 10 3 Q 11 4 10 6" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
      <path d="M 14 6 Q 13 4 14 3 Q 15 4 14 6" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
      <rect x="3" y="20" width="18" height="1.5" fill={STROKE} />
    </g>
  ),
  // Confetti popper — 4 year club
  four_year_club: (
    <g>
      <polygon points="3,21 9,15 15,21" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <rect x="14" y="13" width="2" height="2" fill={FILLS.magenta} stroke={STROKE} strokeWidth="0.75" />
      <rect x="11" y="9" width="2" height="2" fill={FILLS.aqua} stroke={STROKE} strokeWidth="0.75" />
      <rect x="17" y="6" width="2" height="2" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.75" />
      <rect x="20" y="11" width="2" height="2" fill={FILLS.grape} stroke={STROKE} strokeWidth="0.75" />
      <rect x="8" y="4" width="2" height="2" fill={FILLS.green} stroke={STROKE} strokeWidth="0.75" />
      <circle cx="14" cy="6" r="0.75" fill={FILLS.magenta} />
      <circle cx="22" cy="8" r="0.75" fill={FILLS.aqua} />
      <circle cx="6" cy="9" r="0.75" fill={FILLS.butter} />
    </g>
  ),
  // 5-pointed star wreath — 5 year club
  five_year_club: (
    <g>
      <ellipse cx="12" cy="14" rx="9" ry="7.5" fill="none" stroke={FILLS.green} strokeWidth="2.25" />
      <ellipse cx="12" cy="14" rx="9" ry="7.5" fill="none" stroke={FILLS.greenDeep} strokeWidth="0.75" />
      <polygon points="12,7 14,12 19,12 15,15 16.5,20 12,17 7.5,20 9,15 5,12 10,12"
        fill={FILLS.gold} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <text x="12" y="15.5" textAnchor="middle" fill={STROKE}
        fontFamily="monospace" fontSize="5" fontWeight="bold">5YR</text>
    </g>
  ),
  // Crown with king-piece silhouette — kingmaker
  mentor: (
    <g>
      <path d="M 4 10 L 6 19 L 18 19 L 20 10 L 16 13 L 12 7 L 8 13 Z"
        fill={FILLS.gold} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <rect x="6" y="19" width="12" height="2" fill={FILLS.goldDeep} stroke={STROKE} strokeWidth="1.25" />
      <circle cx="12" cy="5" r="1.5" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1" />
      <circle cx="12" cy="12" r="1.25" fill={FILLS.rose} stroke={STROKE} strokeWidth="0.75" />
      <circle cx="6.5" cy="14" r="0.9" fill={FILLS.aqua} stroke={STROKE} strokeWidth="0.5" />
      <circle cx="17.5" cy="14" r="0.9" fill={FILLS.aqua} stroke={STROKE} strokeWidth="0.5" />
    </g>
  ),
  // Graduation cap — perfect attendance
  good_neighbor: (
    <g>
      <polygon points="2,10 12,5 22,10 12,15" fill={FILLS.grapeDeep} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M 6 12 L 6 17 Q 12 20 18 17 L 18 12" fill={FILLS.grape} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <line x1="21" y1="10" x2="21" y2="16" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="21" cy="17" r="1.5" fill={FILLS.butter} stroke={STROKE} strokeWidth="1" />
    </g>
  ),
  // House with mayoral flag — neighborhood mayor
  neighborhood_mayor: (
    <g>
      <polygon points="3,12 12,4 21,12 21,21 3,21" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <rect x="9" y="14" width="6" height="7" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.25" />
      <rect x="11" y="16" width="2" height="2" fill={STROKE} />
      <line x1="17" y1="2" x2="17" y2="10" stroke={STROKE} strokeWidth="1.5" />
      <polygon points="17,2 22,3 17,4" fill={FILLS.butter} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
    </g>
  ),

  // ─── Elite Tiers ──────────────────────────────────────────────────────
  bronze_lp: <Medal fill={FILLS.bronze} deep={FILLS.bronzeDeep} />,
  silver_lp: <Medal fill={FILLS.silver} deep={FILLS.silverDeep} />,
  gold_lp: <Medal fill={FILLS.gold} deep={FILLS.goldDeep} />,
  // Diamond — elite tier
  diamond_lp: (
    <g>
      <polygon points="12,3 20,9 12,21 4,9" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <polygon points="4,9 20,9 12,21" fill={FILLS.aquaDeep} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="4,9 8,3 12,9 16,3 20,9" fill={WHITE} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <line x1="8" y1="3" x2="12" y2="21" stroke={STROKE} strokeWidth="0.75" />
      <line x1="16" y1="3" x2="12" y2="21" stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),

  // ─── Streaks ──────────────────────────────────────────────────────────
  // Sparkle star — perfect year
  always_online: (
    <g>
      <polygon points="12,2 13.5,9 21,10 14,12.5 16,21 12,17 8,21 10,12.5 3,10 10.5,9"
        fill={FILLS.gold} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <circle cx="5" cy="5" r="1" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.5" />
      <circle cx="19" cy="6" r="0.75" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.5" />
      <circle cx="20" cy="18" r="0.75" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.5" />
      <circle cx="4" cy="19" r="0.75" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.5" />
    </g>
  ),

  // ─── Easter Eggs ──────────────────────────────────────────────────────
  // Bullseye target — precision writer
  pc_load_letter: (
    <g>
      <circle cx="12" cy="12" r="9.5" fill={WHITE} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" fill={FILLS.rose} stroke={STROKE} strokeWidth="1" />
      <circle cx="12" cy="12" r="4.5" fill={WHITE} stroke={STROKE} strokeWidth="1" />
      <circle cx="12" cy="12" r="2" fill={FILLS.rose} stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),
  // Pencil — perfectionist
  directors_cut: (
    <g>
      <polygon points="3,21 6,18 19,5 22,8 9,21 6,21" fill={FILLS.butter} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <polygon points="17,7 19,5 22,8 20,10" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="3,21 6,18 9,21 6,21" fill={STROKE} />
      <line x1="6" y1="18" x2="20" y2="10" stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),
  // Envelope with heart — first responder
  youve_got_mail: (
    <g>
      <rect x="2" y="6" width="20" height="14" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.5" />
      <polygon points="2,6 22,6 12,14" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <line x1="2" y1="20" x2="10" y2="13" stroke={STROKE} strokeWidth="1" />
      <line x1="22" y1="20" x2="14" y2="13" stroke={STROKE} strokeWidth="1" />
      <path d="M 12 19 L 7 14 Q 6 12 7 11 Q 8 10 9.5 11 Q 11 12 12 13 Q 13 12 14.5 11 Q 16 10 17 11 Q 18 12 17 14 Z"
        fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
    </g>
  ),
  // 100 in a circle — completionist
  completionist: (
    <g>
      <circle cx="12" cy="12" r="9.5" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="1.5" />
      <text x="12" y="15.5" textAnchor="middle" fill={WHITE} stroke={STROKE} strokeWidth="0.5"
        fontFamily="monospace" fontSize="9" fontWeight="bold">100</text>
    </g>
  ),
  // Globe — background checker
  geocities_architect: (
    <g>
      <circle cx="12" cy="12" r="9.5" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="4" ry="9.5" fill="none" stroke={STROKE} strokeWidth="1" />
      <line x1="2.5" y1="12" x2="21.5" y2="12" stroke={STROKE} strokeWidth="1" />
      <ellipse cx="12" cy="7" rx="6.5" ry="2" fill="none" stroke={STROKE} strokeWidth="0.75" />
      <ellipse cx="12" cy="17" rx="6.5" ry="2" fill="none" stroke={STROKE} strokeWidth="0.75" />
      <path d="M 6 9 Q 8 10 10 9 L 9 12 L 11 14" fill={FILLS.green} stroke={STROKE} strokeWidth="0.75" strokeLinejoin="miter" />
      <path d="M 14 8 Q 17 10 18 13 L 16 15" fill={FILLS.green} stroke={STROKE} strokeWidth="0.75" strokeLinejoin="miter" />
    </g>
  ),
  // Crescent moon — late night shift
  napster_ninja: (
    <g>
      <path d="M 19 14 Q 18 22 10 22 Q 2 22 2 14 Q 2 6 10 6 Q 7 10 7 14 Q 7 18 11 18 Q 16 18 19 14 Z"
        fill={FILLS.grape} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <polygon points="17,3 17.5,5 19.5,5.5 17.5,6 17,8 16.5,6 14.5,5.5 16.5,5"
        fill={FILLS.butter} stroke={STROKE} strokeWidth="0.75" strokeLinejoin="miter" />
      <circle cx="13" cy="3" r="0.75" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.5" />
    </g>
  ),
  // Party popper / streamer — block party planner
  block_party_planner: (
    <g>
      <polygon points="2,21 7,7 16,16" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <circle cx="6" cy="9" r="1" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.5" />
      <circle cx="9" cy="13" r="1" fill={FILLS.aqua} stroke={STROKE} strokeWidth="0.5" />
      <circle cx="13" cy="13" r="1" fill={FILLS.green} stroke={STROKE} strokeWidth="0.5" />
      <rect x="17" y="4" width="2" height="2" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="0.5" />
      <rect x="20" y="9" width="2" height="2" fill={FILLS.grape} stroke={STROKE} strokeWidth="0.5" />
      <rect x="20" y="14" width="2" height="2" fill={FILLS.magenta} stroke={STROKE} strokeWidth="0.5" />
      <line x1="18" y1="3" x2="20" y2="2" stroke={STROKE} strokeWidth="0.75" />
      <line x1="22" y1="6" x2="23" y2="4" stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),
  // Car (side view) — road warrior
  kazaa_kid: (
    <g>
      <path d="M 3 16 L 5 11 L 8 9 L 17 9 L 20 11 L 21 16 Z"
        fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <rect x="3" y="14" width="18" height="3" fill={FILLS.magentaDeep} stroke={STROKE} strokeWidth="1.25" />
      <polygon points="8,10 12,10 12,13 5,13" fill={FILLS.aqua} stroke={STROKE} strokeWidth="0.75" strokeLinejoin="miter" />
      <polygon points="13,10 17,10 19,13 13,13" fill={FILLS.aqua} stroke={STROKE} strokeWidth="0.75" strokeLinejoin="miter" />
      <circle cx="7" cy="17.5" r="2.25" fill={STROKE} />
      <circle cx="7" cy="17.5" r="0.75" fill={WHITE} />
      <circle cx="17" cy="17.5" r="2.25" fill={STROKE} />
      <circle cx="17" cy="17.5" r="0.75" fill={WHITE} />
    </g>
  ),
  // Analog clock at 4:20 — perfect timing
  limewire_legend: (
    <g>
      <circle cx="12" cy="12" r="9.5" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7.5" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <circle cx="12" cy="3" r="0.75" fill={STROKE} />
      <circle cx="21" cy="12" r="0.75" fill={STROKE} />
      <circle cx="12" cy="21" r="0.75" fill={STROKE} />
      <circle cx="3" cy="12" r="0.75" fill={STROKE} />
      {/* hour hand pointing to 4 */}
      <line x1="12" y1="12" x2="16" y2="15" stroke={STROKE} strokeWidth="2" strokeLinecap="square" />
      {/* minute hand pointing to 4 (which is 20 minutes) */}
      <line x1="12" y1="12" x2="15" y2="18" stroke={FILLS.magenta} strokeWidth="1.5" strokeLinecap="square" />
      <circle cx="12" cy="12" r="1" fill={STROKE} />
    </g>
  ),
  // Key — keyword champion
  aol_keyword_neighbor: (
    <g>
      <circle cx="7" cy="12" r="4.5" fill={FILLS.gold} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="7" cy="12" r="1.5" fill={STROKE} />
      <rect x="11" y="10.5" width="11" height="3" fill={FILLS.gold} stroke={STROKE} strokeWidth="1.25" />
      <rect x="17" y="13.5" width="2" height="3" fill={FILLS.gold} stroke={STROKE} strokeWidth="1.25" />
      <rect x="20" y="13.5" width="2" height="2.5" fill={FILLS.gold} stroke={STROKE} strokeWidth="1.25" />
    </g>
  ),
  // 100 banner — century club
  winamp_whipper: (
    <g>
      <path d="M 3 6 L 21 6 L 21 16 L 17 16 L 12 20 L 7 16 L 3 16 Z"
        fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <text x="12" y="14" textAnchor="middle" fill={WHITE} stroke={STROKE} strokeWidth="0.5"
        fontFamily="monospace" fontSize="8" fontWeight="bold">100</text>
    </g>
  ),
  // Target with arrow — perfect predictor
  friendster_founder: (
    <g>
      <circle cx="11" cy="13" r="8.5" fill={WHITE} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="11" cy="13" r="6" fill={FILLS.aqua} stroke={STROKE} strokeWidth="0.75" />
      <circle cx="11" cy="13" r="3.5" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <circle cx="11" cy="13" r="1.5" fill={FILLS.rose} stroke={STROKE} strokeWidth="0.5" />
      <line x1="11" y1="13" x2="22" y2="2" stroke={STROKE} strokeWidth="2" strokeLinecap="square" />
      <polygon points="22,2 19,4 19,7" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="0.75" strokeLinejoin="miter" />
      <polygon points="11,13 14,11 14,14" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="0.5" strokeLinejoin="miter" />
    </g>
  ),
  // Mortarboard with question — scholar
  ask_jeeves_answer: (
    <g>
      <polygon points="2,9 12,5 22,9 12,13" fill={FILLS.grapeDeep} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M 6 11 L 6 16 Q 12 18.5 18 16 L 18 11" fill={FILLS.grape} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <text x="12" y="15.5" textAnchor="middle" fill={FILLS.butter}
        fontFamily="monospace" fontSize="6" fontWeight="bold">?</text>
      <line x1="21" y1="9" x2="21" y2="15" stroke={STROKE} strokeWidth="1.25" />
      <circle cx="21" cy="16.5" r="1.25" fill={FILLS.butter} stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),
  // Santa hat — holiday spirit
  merry_xmas: (
    <g>
      <path d="M 4 17 Q 8 6 18 5 Q 20 12 20 17 Z"
        fill={FILLS.rose} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <circle cx="18" cy="6" r="1.75" fill={WHITE} stroke={STROKE} strokeWidth="1" />
      <ellipse cx="12" cy="18" rx="9" ry="2.5" fill={WHITE} stroke={STROKE} strokeWidth="1.5" />
    </g>
  ),
  // Sparkle cluster — serendipitous
  serendipitous: (
    <g>
      <polygon points="12,3 13.5,9 19,10 13.5,11 12,17 10.5,11 5,10 10.5,9"
        fill={FILLS.butter} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="6,15 6.75,17.5 9,18 6.75,18.5 6,21 5.25,18.5 3,18 5.25,17.5"
        fill={FILLS.aqua} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
      <polygon points="18,14 18.6,16 20.5,16.5 18.6,17 18,19 17.4,17 15.5,16.5 17.4,16"
        fill={FILLS.magenta} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
    </g>
  ),
  // Person figure with hand-on-hip — parental wisdom
  cool_mom: (
    <g>
      <circle cx="12" cy="6" r="3" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.25" />
      <path d="M 7 21 Q 7 12 12 12 Q 17 12 17 21 Z" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M 7 14 Q 4 18 6 21" fill="none" stroke={STROKE} strokeWidth="1.5" />
      <path d="M 17 14 Q 19 16 18 18 L 16 17" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <circle cx="11" cy="6" r="0.5" fill={STROKE} />
      <circle cx="13" cy="6" r="0.5" fill={STROKE} />
    </g>
  ),
};

const CATEGORY_GLYPHS = {
  // Bar chart — milestones
  milestones: (
    <g>
      <rect x="3" y="14" width="4" height="7" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.25" />
      <rect x="9" y="10" width="4" height="11" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.25" />
      <rect x="15" y="6" width="4" height="15" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="1.25" />
      <rect x="2" y="21" width="20" height="1.5" fill={STROKE} />
    </g>
  ),
  // Speech bubble — engagement
  engagement: (
    <g>
      <rect x="3" y="4" width="18" height="13" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" />
      <polygon points="7,17 5,21 11,17" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
      <circle cx="8" cy="10.5" r="1.25" fill={WHITE} />
      <circle cx="12" cy="10.5" r="1.25" fill={WHITE} />
      <circle cx="16" cy="10.5" r="1.25" fill={WHITE} />
    </g>
  ),
  // Bullseye — accuracy
  accuracy: (
    <g>
      <circle cx="12" cy="12" r="9.5" fill={WHITE} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" fill={FILLS.rose} stroke={STROKE} strokeWidth="1" />
      <circle cx="12" cy="12" r="4.5" fill={WHITE} stroke={STROKE} strokeWidth="1" />
      <circle cx="12" cy="12" r="2" fill={FILLS.rose} stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),
  // Clock — timing
  timing: (
    <g>
      <circle cx="12" cy="12" r="9.5" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7.5" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <line x1="12" y1="12" x2="12" y2="6.5" stroke={STROKE} strokeWidth="2" strokeLinecap="square" />
      <line x1="12" y1="12" x2="16" y2="12" stroke={FILLS.magenta} strokeWidth="1.5" strokeLinecap="square" />
      <circle cx="12" cy="12" r="1" fill={STROKE} />
    </g>
  ),
  // Star — patterns
  patterns: (
    <g>
      <polygon points="12,3 14.4,9.5 21,10 16,14.5 17.5,21 12,17.5 6.5,21 8,14.5 3,10 9.6,9.5"
        fill={FILLS.butter} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="miter" />
    </g>
  ),
  // Houses cluster — general
  general: (
    <g>
      <polygon points="2,12 6,8 10,12 10,21 2,21" fill={FILLS.aqua} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="8,10 12,5 16,10 16,21 8,21" fill={FILLS.magenta} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <polygon points="14,12 18,8 22,12 22,21 14,21" fill={FILLS.tangerine} stroke={STROKE} strokeWidth="1.25" strokeLinejoin="miter" />
      <rect x="11" y="14" width="2" height="7" fill={STROKE} />
    </g>
  ),
  // Trophy — elite
  elite: <TrophyCup fill={FILLS.gold} deep={FILLS.goldDeep} />,
  // Up arrow chart — streak
  streak: (
    <g>
      <polyline points="3,18 8,13 12,15 20,5" fill="none" stroke={FILLS.green} strokeWidth="2.5" strokeLinejoin="miter" strokeLinecap="square" />
      <polyline points="3,18 8,13 12,15 20,5" fill="none" stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" strokeLinecap="square" />
      <polygon points="20,5 16,5 20,9" fill={FILLS.green} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
      <line x1="2" y1="21" x2="22" y2="21" stroke={STROKE} strokeWidth="1.25" />
      <line x1="2" y1="21" x2="2" y2="3" stroke={STROKE} strokeWidth="1.25" />
    </g>
  ),
  // Joystick / controller — easter eggs
  easter_egg: (
    <g>
      <rect x="2" y="10" width="20" height="9" rx="2" fill={FILLS.grape} stroke={STROKE} strokeWidth="1.5" />
      <rect x="6" y="13" width="2" height="3" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <rect x="5" y="14" width="4" height="1" fill={WHITE} stroke={STROKE} strokeWidth="0.75" />
      <circle cx="16" cy="13.5" r="1" fill={FILLS.magenta} stroke={STROKE} strokeWidth="0.75" />
      <circle cx="18.5" cy="15.5" r="1" fill={FILLS.aqua} stroke={STROKE} strokeWidth="0.75" />
    </g>
  ),
};

export default function BadgeIcon({
  id,
  category,
  locked = false,
  size = 32,
  className,
  style,
}) {
  let glyph;
  if (locked) {
    glyph = LOCKED;
  } else if (category) {
    glyph = CATEGORY_GLYPHS[category];
  } else if (id) {
    glyph = GLYPHS[id];
  }

  if (!glyph) {
    // Generic fallback — paper scroll with star (if a badge id is added without an icon).
    glyph = (
      <g>
        <rect x="4" y="3" width="16" height="18" fill={FILLS.paper} stroke={STROKE} strokeWidth="1.5" />
        <polygon points="12,7 13.4,11 17.5,11 14.2,13.5 15.5,17.5 12,15.2 8.5,17.5 9.8,13.5 6.5,11 10.6,11"
          fill={FILLS.butter} stroke={STROKE} strokeWidth="1" strokeLinejoin="miter" />
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
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  );
}
