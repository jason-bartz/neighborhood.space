// CSV helpers for the Resources admin tab — template download + bulk
// import. Field naming matches what /resources docs already use; the
// LP portal stores both the canonical "Resource"/"Type"/"Business
// Stage" keys and (historically) lowercase aliases. We write only the
// canonical keys.
import Papa from "papaparse";

// Length & validation rules surfaced to the user in the template
// header AND used in parseResourceCsv to flag rows. Keep these
// numbers in sync with the inline form hints in LimitedPartnerPortal.
export const FIELD_LIMITS = {
  Resource: { min: 2, max: 80, required: true, hint: "2-80 chars. Org or program name." },
  Type: { min: 2, max: 60, required: true, hint: "One of the allowed types (see template)." },
  "Business Stage": { min: 2, max: 20, required: true, hint: "Ideation | Early | Growth | Established | All" },
  Chapter: { min: 2, max: 60, required: false, hint: "Auto-filled for chapter directors. Required for super admins." },
  "Focus Area": { min: 0, max: 80, required: false, hint: "Short phrase, e.g. \"Health/Medtech, Tech Startups\"." },
  "Counties Served": { min: 0, max: 120, required: false, hint: "Comma-separated counties or \"All 8 counties\"." },
  URL: { min: 0, max: 200, required: false, hint: "Full URL with https://." },
  "Average Check Size": { min: 0, max: 40, required: false, hint: "Free-form, e.g. \"$50K-$250K\" or \"NA\"." },
  "Relocation Required?": { min: 0, max: 4, required: false, hint: "\"Yes\" or \"No\". Defaults to \"No\"." },
  "Expanded Details": {
    min: 0,
    max: 800,
    required: false,
    hint: "1-3 sentences describing what the founder gets. ~200-500 chars hits the sweet spot. Avoid marketing language.",
  },
};

export const ALLOWED_TYPES = [
  "Funding", "Incubator/Accelerator", "Mentorship", "Community", "Government",
  "Legal", "Education", "Venture Capital", "Angel Group", "Private Investment Office",
  "Corporate Venture", "Venture Studio", "Coworking", "Nonprofit", "Private Equity",
  "Investment Platform",
];

export const ALLOWED_STAGES = ["Ideation", "Early", "Growth", "Established", "All"];

const CSV_COLUMNS = [
  "Resource",
  "Type",
  "Business Stage",
  "Chapter",
  "Focus Area",
  "Counties Served",
  "URL",
  "Average Check Size",
  "Relocation Required?",
  "Expanded Details",
];

// Two example rows with realistic shapes so a director can copy-paste
// and edit. Chapter is left for the caller to fill (so we can pin it
// to the director's own chapter when downloading).
function exampleRows(chapter) {
  return [
    {
      Resource: "43North Accelerator",
      Type: "Incubator/Accelerator",
      "Business Stage": "Early",
      Chapter: chapter || "Western New York",
      "Focus Area": "High-growth startups",
      "Counties Served": "Global",
      URL: "https://43north.org",
      "Average Check Size": "$1M",
      "Relocation Required?": "Yes",
      "Expanded Details": "Annual competition awarding $1M each to 5 startups. Companies relocate to Buffalo for 12 months and receive a year of free workspace, mentorship, and access to a network of investors. Best fit for traction-stage tech founders comfortable moving operations.",
    },
    {
      Resource: "Buffalo Urban League — Start Up Together",
      Type: "Mentorship",
      "Business Stage": "Ideation",
      Chapter: chapter || "Western New York",
      "Focus Area": "Minority-led small business",
      "Counties Served": "Erie",
      URL: "https://www.buffalourbanleague.org",
      "Average Check Size": "NA",
      "Relocation Required?": "No",
      "Expanded Details": "Free 8-week cohort for first-time entrepreneurs from underrepresented backgrounds. Covers business planning, legal structure, and intro to local capital sources. Pairs each founder with a working business mentor for the duration.",
    },
  ];
}

// Human-readable guidance baked into the top of the CSV as comment
// rows. PapaParse's default config respects these as data, so we
// strip them on parse (anything where Resource starts with "#").
function guidanceRows() {
  return [
    {
      Resource: "# Required: Resource, Type, Business Stage. Chapter is auto-filled if you're a chapter director.",
    },
    {
      Resource: "# Allowed Types — " + ALLOWED_TYPES.join(", "),
    },
    {
      Resource: "# Allowed Business Stage — " + ALLOWED_STAGES.join(" | "),
    },
    {
      Resource: "# Expanded Details — 1-3 sentences, ~200-500 chars is the sweet spot (max 800). Avoid marketing language.",
    },
    {
      Resource: "# Delete these comment rows (lines starting with #) before uploading.",
    },
  ];
}

export function buildResourceCsvTemplate(chapter) {
  const rows = [...guidanceRows(), ...exampleRows(chapter)];
  return Papa.unparse({ fields: CSV_COLUMNS, data: rows });
}

// Parse + validate. Returns { valid: [...], errors: [...] } where
// each valid row is a sanitized, ready-to-write resource object.
// Errors carry { rowIndex, message } so the UI can surface them in
// the preview before the director commits.
export function parseResourceCsv(csvText, { forcedChapter, allowedChapters } = {}) {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const valid = [];
  const errors = [];

  if (parsed.errors && parsed.errors.length) {
    parsed.errors.forEach((e) => {
      errors.push({ rowIndex: e.row, message: `CSV parse error: ${e.message}` });
    });
  }

  parsed.data.forEach((rawRow, idx) => {
    const rowIndex = idx + 2; // header is row 1; data starts at 2 in user-facing terms
    const row = {};
    Object.entries(rawRow).forEach(([k, v]) => {
      row[k] = typeof v === "string" ? v.trim() : v;
    });

    // Strip the guidance/comment rows we shipped in the template.
    if (!row.Resource || row.Resource.startsWith("#")) return;

    const rowErrors = [];

    // Required fields
    ["Resource", "Type", "Business Stage"].forEach((key) => {
      const v = row[key] || "";
      if (!v) {
        rowErrors.push(`Missing required field: ${key}`);
      } else if (FIELD_LIMITS[key].max && v.length > FIELD_LIMITS[key].max) {
        rowErrors.push(`${key} too long (${v.length} chars, max ${FIELD_LIMITS[key].max})`);
      }
    });

    // Type / Stage value gates
    if (row.Type && !ALLOWED_TYPES.includes(row.Type)) {
      rowErrors.push(`Type "${row.Type}" not in allowed list`);
    }
    if (row["Business Stage"] && !ALLOWED_STAGES.includes(row["Business Stage"])) {
      rowErrors.push(`Business Stage "${row["Business Stage"]}" not in allowed list`);
    }

    // Chapter resolution: forcedChapter (chapter director) wins;
    // otherwise the row must specify a chapter that's in allowedChapters
    // (super admin path).
    let chapter = forcedChapter || row.Chapter || "";
    if (!chapter) {
      rowErrors.push("Missing Chapter (required for super admins)");
    } else if (allowedChapters && allowedChapters.length && !allowedChapters.includes(chapter)) {
      rowErrors.push(`Chapter "${chapter}" not in your list of chapters`);
    }

    // Soft length warnings → hard errors at the absolute caps. The
    // UI can show these so the director can fix them in-place.
    Object.entries(FIELD_LIMITS).forEach(([key, rule]) => {
      const v = row[key] || "";
      if (rule.max && v.length > rule.max) {
        rowErrors.push(`${key} exceeds max length (${v.length}/${rule.max})`);
      }
    });

    // URL sanity — accept blank, otherwise require an http(s) prefix
    if (row.URL && !/^https?:\/\//i.test(row.URL)) {
      rowErrors.push("URL must start with http:// or https://");
    }

    if (rowErrors.length) {
      errors.push({ rowIndex, name: row.Resource, messages: rowErrors });
      return;
    }

    valid.push({
      Resource: row.Resource,
      Type: row.Type,
      "Business Stage": row["Business Stage"],
      Chapter: chapter,
      "Focus Area": row["Focus Area"] || "",
      "Counties Served": row["Counties Served"] || "",
      URL: row.URL || "",
      "Average Check Size": row["Average Check Size"] || "",
      "Relocation Required?": row["Relocation Required?"] || "No",
      "Expanded Details": row["Expanded Details"] || "",
    });
  });

  return { valid, errors };
}
