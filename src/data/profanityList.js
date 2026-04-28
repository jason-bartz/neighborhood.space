// Word-boundary profanity filter for the public guest chat.
// Two buckets:
//   EXACT_WORDS — matched only as standalone words (\bword\b). Use this for
//     short roots that have legitimate compounds (ass → assistant, tit → title).
//   STEM_WORDS — matched as the word plus any trailing word chars (\bword\w*).
//     Use this for roots whose extensions are also profane (fuck → fucking).
// Word boundaries (\b) prevent the classic Scunthorpe problem — "cunt" inside
// "Scunthorpe" has no word boundary before the 'c' so it won't match.
//
// IMPORTANT: keep this list in sync with functions/profanity.js. The server
// re-runs the same check and auto-deletes anything that bypasses the client.

const EXACT_WORDS = [
  "ass", "asses",
  "asshole", "assholes",
  "butt", "butts",
  "poop", "pooped", "pooping",
  "crap", "crappy",
  "fart", "farts", "farted", "farting",
  "tit", "tits",
  "boob", "boobs", "boobies",
  "dick", "dicks",
  "piss", "pissed", "pissing",
  "fag", "fags",
];

const STEM_WORDS = [
  "fuck", "shit", "bitch", "bastard", "cunt", "twat", "slut", "whore",
  "pussy", "cock", "dipshit", "dumbass", "bullshit", "motherfuck",
  "jerkoff", "porn", "masturbat", "wank", "blowjob", "handjob",
  // slurs
  "nigger", "nigga", "faggot", "dyke", "tranny", "kike", "spic",
  "chink", "gook", "retard",
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PROFANITY_REGEX = new RegExp(
  "(?:\\b(?:" + EXACT_WORDS.map(escape).join("|") + ")\\b)" +
  "|" +
  "(?:\\b(?:" + STEM_WORDS.map(escape).join("|") + ")\\w*)",
  "i",
);

export function containsProfanity(text) {
  return PROFANITY_REGEX.test(text || "");
}
