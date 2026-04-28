const Anthropic = require("@anthropic-ai/sdk").default;

const SUMMARY_MODEL = "claude-haiku-4-5";
const ABOUT_MODEL = "claude-haiku-4-5";
const CATEGORY_MODEL = "claude-haiku-4-5";

const PITCH_CATEGORIES = [
  "Food & Drink",
  "Products",
  "Wellness",
  "Arts & Media",
  "Education",
  "Services",
  "Tech",
  "Civic & Impact",
];

function makeClient(apiKey) {
  if (!apiKey) {
    throw new Error("Anthropic API key not provided to aiSummary helper.");
  }
  return new Anthropic({ apiKey });
}

function formatFields(fields) {
  return fields
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n\n");
}

function formatPitchForPrompt(pitch) {
  return formatFields([
    ["Business name", pitch.businessName],
    ["Founder", pitch.founderName],
    ["About the founder", pitch.bio],
    ["Value proposition", pitch.valueProp],
    ["Problem", pitch.problem],
    ["Solution", pitch.solution],
    ["Business model", pitch.businessModel],
    ["Has paying customers", pitch.hasPayingCustomers ? "Yes" : "No"],
    ["Plan for grant funds", pitch.grantUsePlan],
  ]);
}

function formatBusinessForAbout(pitch) {
  return formatFields([
    ["Business name", pitch.businessName],
    ["Value proposition", pitch.valueProp],
    ["Problem", pitch.problem],
    ["Solution", pitch.solution],
    ["Business model", pitch.businessModel],
  ]);
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
  const application = formatBusinessForAbout(pitch);
  if (!application) return "";

  const client = makeClient(apiKey);
  const message = await client.messages.create({
    model: ABOUT_MODEL,
    max_tokens: 200,
    system:
      [
        "You write short, third-person 'About' blurbs for small businesses featured on the Good Neighbor Fund's public chapter pages.",
        "Hard constraints:",
        "- Exactly 2 sentences. Keep it brief.",
        "- Focus only on the business: the problem it addresses and its solution. Do not mention grant funds, funding plans, or how money will be used.",
        "- Plain prose. No headers, no bullet points, no slogans, no quotation marks around the business name.",
        "- No em dashes (—). No en dashes (–) used as punctuation. Use a comma, a period, or a sentence break instead.",
        "- No hype words: 'innovative', 'revolutionary', 'cutting-edge', 'groundbreaking', 'leverages', 'empowers', 'seamless', 'best-in-class'. Cut anything that reads like marketing copy.",
        "- No LLM tells: don't say things like 'brings both X and Y background', 'shaped by', 'real visibility', 'streamlines', 'reimagines', 'at the intersection of', or stack two abstract nouns together for no reason.",
        "- Refer to the business by name. Do not introduce the founder.",
        "Lead with what the business actually does, in concrete terms. Output the paragraph only, no preamble.",
      ].join("\n"),
    messages: [
      {
        role: "user",
        content: `Write the About paragraph for this business:\n\n${application}`,
      },
    ],
  });

  return extractText(message);
}

async function generatePitchCategory(pitch, apiKey) {
  const application = formatPitchForPrompt(pitch);
  if (!application) return "";

  const client = makeClient(apiKey);
  const message = await client.messages.create({
    model: CATEGORY_MODEL,
    max_tokens: 20,
    system: [
      "You classify Good Neighbor Fund grant applications into exactly one of eight categories.",
      "Output the category name and nothing else. No preamble, no punctuation, no explanation, no quotes.",
      "Categories:",
      "- Food & Drink: restaurants, bakeries, food trucks, packaged foods, beverage brands, catering.",
      "- Products: branded physical goods (apparel, beauty, jewelry, home goods, handcrafted items, e-commerce shops).",
      "- Wellness: yoga, therapy, holistic and alternative medicine, fitness, healthcare practices, parental and grief support.",
      "- Arts & Media: visual art, music, dance, theater, film, podcasts, publishing, bookstores, creative collectives.",
      "- Education: tutoring, youth programs, coaching, consulting, mentorship, courses, vocational training.",
      "- Services: salons, cleaning, contracting, repair, pet care, event planning, photography, marketing, B2B services.",
      "- Tech: apps, SaaS, AI tools, marketplaces, hardware, fintech, edtech.",
      "- Civic & Impact: nonprofits and mission-led ventures (community organizing, advocacy, equitable housing, clean-energy missions, immigrant support).",
      "Categorize by what the business sells, not the cause behind it. A clothing brand that donates to charity is Products, not Civic & Impact. A tech-enabled cleaning service is Services, not Tech. A nonprofit dance collective is Arts & Media, not Civic & Impact.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: `Classify this grant application:\n\n${application}`,
      },
    ],
  });

  const raw = extractText(message);
  const cleaned = raw.replace(/^["'\s]+|["'.\s]+$/g, "");
  if (PITCH_CATEGORIES.includes(cleaned)) return cleaned;
  const ci = PITCH_CATEGORIES.find((c) => c.toLowerCase() === cleaned.toLowerCase());
  return ci || "";
}

module.exports = {
  generatePitchSummary,
  generateAboutSection,
  generatePitchCategory,
  PITCH_CATEGORIES,
};
