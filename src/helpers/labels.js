// labels.js — humanized display labels for all enum values that reach the UI.
//
// Raw Firestore values like "chapter_director" or "superAdmin" are hostile to
// scanning. Every admin-facing label in the portal should come through one of
// these helpers so wording stays consistent and easy to change in one place.

const roleDisplay = {
  superAdmin: 'Super Admin',
  chapter_director: 'Chapter Director',
  lp: 'LP',
  founder: 'Founder',
  unauthorized: 'Unauthorized',
};

export function roleLabel(role) {
  if (!role) return '—';
  return roleDisplay[role] || role;
}

// Pill tone for a role — used when rendering roles as status pills.
const roleTone = {
  superAdmin: 'purple',
  chapter_director: 'pink',
  lp: 'blue',
  founder: 'green',
  unauthorized: 'yellow',
};

export function roleTonePill(role) {
  return roleTone[role] || 'default';
}

// Rating labels shown in LP review summaries.
const ratingDisplay = {
  Favorite: 'Favorite',
  Consideration: 'Consideration',
  Pass: 'Pass',
  Ineligible: 'Ineligible',
  'No Rating': 'No Rating',
};

export function ratingLabel(rating) {
  if (!rating) return '—';
  return ratingDisplay[rating] || rating;
}

const ratingTone = {
  Favorite: 'pink',
  Consideration: 'blue',
  Pass: 'default',
  Ineligible: 'yellow',
  'No Rating': 'default',
};

export function ratingTonePill(rating) {
  return ratingTone[rating] || 'default';
}

// Pitch status (not the LP rating — the top-line pipeline status).
const pitchStatusDisplay = {
  needs_review: 'Needs Review',
  under_review: 'Under Review',
  winner: 'Grant Winner',
  ineligible: 'Ineligible',
  passed: 'Passed',
  archived: 'Archived',
};

export function pitchStatusLabel(status) {
  if (!status) return '—';
  return pitchStatusDisplay[status] || status;
}

const pitchStatusTone = {
  needs_review: 'pink',
  under_review: 'blue',
  winner: 'green',
  ineligible: 'error',
  passed: 'default',
  archived: 'default',
};

export function pitchStatusTonePill(status) {
  return pitchStatusTone[status] || 'default';
}

// Truthy-or-"—" renderer for empty cells in tables.
export function dashIfEmpty(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' && value.trim() === '') return '—';
  if (Array.isArray(value) && value.length === 0) return '—';
  return value;
}
