// Shared chat-bot helpers used by the client to mirror the server.
// IMPORTANT: keep in sync with functions/chatBot.js. The client uses
// isQuestion() to decide when to show the "typing..." indicator; the server
// uses the same logic to decide whether to call Anthropic at all. If they
// drift, the indicator will lie.

const MAX_INPUT_CHARS = 500;

const QUESTION_WORDS = new Set([
  "who", "what", "when", "where", "why", "how",
  "can", "could", "would", "should", "may", "might",
  "is", "are", "am", "was", "were", "do", "does", "did",
  "will", "has", "have", "had",
]);

export function isQuestion(text) {
  const trimmed = (text || "").trim();
  if (trimmed.length === 0 || trimmed.length > MAX_INPUT_CHARS) return false;
  if (trimmed.endsWith("?")) return true;
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
  return QUESTION_WORDS.has(firstWord);
}

export const BOT_USERNAME = "gnf_mod";
