const Anthropic = require("@anthropic-ai/sdk").default;

const SUMMARY_MODEL = "claude-haiku-4-5";
const ABOUT_MODEL = "claude-haiku-4-5";

function makeClient(apiKey) {
  if (!apiKey) {
    throw new Error("Anthropic API key not provided to aiSummary helper.");
  }
  return new Anthropic({ apiKey });
}

function formatPitchForPrompt(pitch) {
  const fields = [
    ["Business name", pitch.businessName],
    ["Founder", pitch.founderName],
    ["About the founder", pitch.bio],
    ["Value proposition", pitch.valueProp],
    ["Problem", pitch.problem],
    ["Solution", pitch.solution],
    ["Business model", pitch.businessModel],
    ["Has paying customers", pitch.hasPayingCustomers ? "Yes" : "No"],
    ["Plan for grant funds", pitch.grantUsePlan],
  ];
  return fields
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n\n");
}

function extractText(message) {
  if (!message || !Array.isArray(message.content)) return "";
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

async function generatePitchSummary(pitch, apiKey) {
  const application = formatPitchForPrompt(pitch);
  if (!application) return "";

  const client = makeClient(apiKey);
  const message = await client.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 400,
    system:
      "You write concise, neutral, factual summaries of small business grant applications for Limited Partner reviewers at the Good Neighbor Fund. Two to three plain sentences. Lead with what the business does. Then briefly note the customer or community served and how grant funds would be used. No marketing fluff, no hype words like 'innovative' or 'cutting-edge', no opinions on the application's merit, no preamble like 'This business...'. Refer to the business by name when natural.",
    messages: [
      {
        role: "user",
        content: `Summarize this grant application in 2-3 sentences:\n\n${application}`,
      },
    ],
  });

  return extractText(message);
}

async function generateAboutSection(pitch, apiKey) {
  const application = formatPitchForPrompt(pitch);
  if (!application) return "";

  const client = makeClient(apiKey);
  const message = await client.messages.create({
    model: ABOUT_MODEL,
    max_tokens: 300,
    system:
      [
        "You write short, third-person 'About' blurbs for small businesses featured on the Good Neighbor Fund's public chapter pages.",
        "Hard constraints:",
        "- Exactly 2 to 3 sentences. Not more.",
        "- Plain prose. No headers, no bullet points, no slogans, no quotation marks around the business name.",
        "- No em dashes (—). No en dashes (–) used as punctuation. Use a comma, a period, or a sentence break instead.",
        "- No hype words: 'innovative', 'revolutionary', 'cutting-edge', 'groundbreaking', 'leverages', 'empowers', 'seamless', 'best-in-class'. Cut anything that reads like marketing copy.",
        "- No LLM tells: don't say things like 'brings both X and Y background', 'shaped by', 'real visibility', 'streamlines', 'reimagines', 'at the intersection of', or stack two abstract nouns together for no reason.",
        "- Refer to the business by name. Do not introduce the founder unless the founder's specific background is unusually relevant to the work.",
        "Lead with what the business actually does, in concrete terms. If there's room, add who it serves or one specific detail that distinguishes it. Output the paragraph only, no preamble.",
      ].join("\n"),
    messages: [
      {
        role: "user",
        content: `Write the About paragraph for this business based on the founder's grant application:\n\n${application}`,
      },
    ],
  });

  return extractText(message);
}

module.exports = {
  generatePitchSummary,
  generateAboutSection,
};
