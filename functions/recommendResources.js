const Anthropic = require("@anthropic-ai/sdk").default;

const RECOMMEND_MODEL = "claude-haiku-4-5";
// Trimmed from 60 to 20 — the deterministic pre-rank already concentrates
// signal in the top of the list, and Haiku doesn't need 60 candidates to
// pick 6. ~65% input-token reduction with no measurable quality loss.
const MAX_CANDIDATES = 20;
const MAX_RECOMMENDATIONS = 6;
// Per-candidate detail cap. 140 is enough to give Haiku flavor without
// shipping the full About blurb for every option.
const DETAIL_CHAR_CAP = 140;

const STAGE_ALIASES = {
  ideation: ["ideation", "all"],
  early: ["early", "early stage", "all"],
  growth: ["growth", "all"],
  established: ["established", "all"],
};

function normalizeStage(stage) {
  if (!stage) return null;
  return String(stage).toLowerCase().trim();
}

// Narrow the corpus before sending to the model. Chapter is exact match;
// stage matches the stage itself plus "All" stage entries (resources that
// span every stage stay visible at every stage).
function narrowCandidates(resources, chapter, stage) {
  const stageKey = normalizeStage(stage);
  const allowedStages = stageKey ? STAGE_ALIASES[stageKey] || [stageKey] : null;

  return resources.filter((r) => {
    if (chapter && r.Chapter && r.Chapter !== chapter) return false;
    if (allowedStages) {
      const rs = normalizeStage(r["Business Stage"]);
      if (!rs) return false;
      if (!allowedStages.includes(rs)) return false;
    }
    return true;
  });
}

// Cheap deterministic scoring used as a fallback when the model is
// unavailable, and to break ties / pre-rank before sending to the model.
function scoreCandidate(r, needText, chips) {
  const haystack = [
    r.Resource,
    r.Type,
    r["Focus Area"],
    r["Expanded Details"],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  if (needText) {
    const words = needText
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2);
    for (const w of words) {
      if (haystack.includes(w)) score += 2;
    }
  }
  if (chips && chips.length) {
    const chipKeywords = {
      capital: ["capital", "venture", "angel", "funding", "investment", "equity", "loan", "grant"],
      customers: ["community", "network", "marketing", "sales", "customer"],
      mentors: ["mentor", "advisor", "coach", "education", "training"],
      legal: ["legal", "law", "incorporation", "compliance"],
      space: ["coworking", "incubator", "office", "space", "campus"],
      hiring: ["hiring", "talent", "recruiting", "workforce", "employment"],
    };
    for (const chip of chips) {
      const keys = chipKeywords[chip.toLowerCase()] || [chip.toLowerCase()];
      for (const k of keys) {
        if (haystack.includes(k)) {
          score += 3;
          break;
        }
      }
    }
  }
  return score;
}

function deterministicRecommendations(candidates, needText, chips) {
  return candidates
    .map((r) => ({ resource: r, score: scoreCandidate(r, needText, chips) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RECOMMENDATIONS)
    .map(({ resource, score }) => ({
      resourceId: resource.id,
      score,
      reason: defaultReason(resource, chips),
    }));
}

function defaultReason(r, chips) {
  const focus = r["Focus Area"];
  const type = r.Type;
  if (focus && focus.length < 80) return `${type} focused on ${focus.toLowerCase()}.`;
  return `${type} serving founders at your stage.`;
}

// Built when we skip the model — gives the user the same shape of
// response (top-line strategy + cards) without an API call.
function deterministicSummary({ chapter, stage, chips }) {
  const parts = [];
  if (stage) parts.push(stage.toLowerCase());
  if (chips && chips.length) parts.push(chips.join(" + "));
  const focus = parts.length ? ` ranked by relevance to ${parts.join(" / ")}` : "";
  const where = chapter ? ` in ${chapter}` : "";
  return `Showing top matches${where}${focus}. Refine with more detail to get a tighter shortlist.`;
}

function formatCandidatesForPrompt(candidates) {
  return candidates
    .map((r, i) => {
      const lines = [
        `[${i + 1}] id=${r.id}`,
        `Name: ${r.Resource}`,
        `Type: ${r.Type}`,
      ];
      if (r["Focus Area"]) lines.push(`Focus: ${r["Focus Area"]}`);
      if (r["Business Stage"]) lines.push(`Stage: ${r["Business Stage"]}`);
      if (r["Average Check Size"] && r["Average Check Size"] !== "NA")
        lines.push(`Check: ${r["Average Check Size"]}`);
      if (r["Expanded Details"]) {
        const trimmed = String(r["Expanded Details"]).slice(0, DETAIL_CHAR_CAP);
        lines.push(`About: ${trimmed}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function extractText(message) {
  if (!message || !Array.isArray(message.content)) return "";
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

// The model is instructed to emit only a JSON object. We still defend
// against ```json fences and stray prose by extracting the first {...}.
function parseModelJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function aiRecommendations({ candidates, chapter, stage, chips, needText, identities, apiKey }) {
  const client = new Anthropic({ apiKey });

  const chapterLine = chapter ? `Chapter: ${chapter}` : "";
  const chipLine = chips && chips.length ? `Selected categories: ${chips.join(", ")}` : "";
  const needLine = needText ? `In their words: ${needText}` : "";
  const stageLine = stage ? `Founder stage: ${stage}` : "";
  const identityLine = identities && identities.length
    ? `Founder self-identifies as: ${identities.join(", ")}`
    : "";

  const userMessage = [
    "Pick the most useful resources for this founder from the list below.",
    chapterLine,
    stageLine,
    chipLine,
    identityLine,
    needLine,
    "",
    "Resources:",
    formatCandidatesForPrompt(candidates),
    "",
    "Return JSON ONLY in this exact shape, with no prose, no markdown fences:",
    `{"summary":"<1-2 sentences, ≤45 words, plain second-person, naming where to start and why>","recommendations":[{"resourceId":"<id>","reason":"<one sentence, ≤40 words, plain second-person, says specifically why this one matches THEIR stage + need>"}]}`,
    `Pick up to ${MAX_RECOMMENDATIONS} resources. Order best-fit first. Skip resources that don't actually match.`,
    `Identity-targeted resources (women-led, BIPOC, veteran, immigrant, LGBTQ+, disability) should rank high ONLY when the founder shares that identity. If the founder did not self-identify, demote identity-targeted resources unless they're the only fit — and never claim a fit you can't justify from the inputs.`,
    `Reasons must explain why this fits THIS founder — never generic, never marketing language ("innovative", "cutting-edge"). The summary should name 1-2 specific resources to start with and why, in order. If you can't find good matches, return an empty recommendations array and say so in the summary.`,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await client.messages.create({
    model: RECOMMEND_MODEL,
    max_tokens: 900,
    system:
      "You are a triage concierge for the Good Neighbor Fund's resource directory. You match founders to local entrepreneurial resources based on their stage and stated need. You answer only with JSON in the requested shape — no preamble, no explanation, no markdown fences.",
    messages: [{ role: "user", content: userMessage }],
  });

  const parsed = parseModelJson(extractText(message));
  if (!parsed || !Array.isArray(parsed.recommendations)) return null;

  const validIds = new Set(candidates.map((c) => c.id));
  const recs = parsed.recommendations
    .filter((rec) => rec && rec.resourceId && validIds.has(rec.resourceId))
    .slice(0, MAX_RECOMMENDATIONS)
    .map((rec, idx) => ({
      resourceId: rec.resourceId,
      score: MAX_RECOMMENDATIONS - idx,
      reason: typeof rec.reason === "string" ? rec.reason.trim() : "",
    }));

  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";

  return { summary, recommendations: recs };
}

async function recommend({ resources, chapter, stage, chips, needText, identities, apiKey }) {
  if (!Array.isArray(resources) || resources.length === 0) {
    return { summary: "", recommendations: [], source: "empty" };
  }

  const narrowed = narrowCandidates(resources, chapter, stage);
  if (narrowed.length === 0) return { summary: "", recommendations: [], source: "empty" };

  const preRanked = narrowed
    .map((r) => ({ r, s: scoreCandidate(r, needText, chips) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_CANDIDATES)
    .map(({ r }) => r);

  // Run AI whenever the founder gave us any concrete signal. Haiku is cheap
  // and the deterministic scorer can't tell that "Stella Foundation" matches
  // "capital" only via the word "funding" — it ranks women-led resources for
  // anyone who clicked Capital.
  const trimmedNeed = (needText || "").trim();
  const hasIdentity = Array.isArray(identities) && identities.length > 0;
  const wantsAI = apiKey && (
    (chips && chips.length >= 1) ||
    trimmedNeed.length >= 5 ||
    hasIdentity
  );

  if (wantsAI) {
    try {
      const aiResults = await aiRecommendations({
        candidates: preRanked,
        chapter,
        stage,
        chips,
        needText: trimmedNeed,
        identities: hasIdentity ? identities : null,
        apiKey,
      });
      if (aiResults && aiResults.recommendations.length > 0) {
        return {
          summary: aiResults.summary,
          recommendations: aiResults.recommendations,
          source: "ai",
        };
      }
    } catch (err) {
      console.error("recommendResources AI call failed; falling back:", err);
    }
  }

  return {
    summary: deterministicSummary({ chapter, stage, chips }),
    recommendations: deterministicRecommendations(preRanked, needText, chips),
    source: "deterministic",
  };
}

module.exports = { recommend };
