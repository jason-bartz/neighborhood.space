// Server-side chat-bot helpers.
// IMPORTANT: keep in sync with src/data/chatBot.js. The client mirrors
// isQuestion() to decide when to render the "typing..." indicator.

const MAX_INPUT_CHARS = 500;

const QUESTION_WORDS = new Set([
  "who", "what", "when", "where", "why", "how",
  "can", "could", "would", "should", "may", "might",
  "is", "are", "am", "was", "were", "do", "does", "did",
  "will", "has", "have", "had",
]);

function isQuestion(text) {
  const trimmed = (text || "").trim();
  if (trimmed.length === 0 || trimmed.length > MAX_INPUT_CHARS) return false;
  if (trimmed.endsWith("?")) return true;
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
  return QUESTION_WORDS.has(firstWord);
}

const BOT_USERNAME = "gnf_mod";
const MAX_OUTPUT_TOKENS = 150;

module.exports = { isQuestion, BOT_USERNAME, MAX_INPUT_CHARS, MAX_OUTPUT_TOKENS };
