// Server-side profanity filter — backstop for the client filter in
// src/data/profanityList.js. Anything that bypasses the client (e.g. someone
// using dev tools to write directly to Firestore) gets caught here and the
// doc is deleted before it pollutes the chat.
//
// IMPORTANT: keep this list in sync with src/data/profanityList.js.

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

function containsProfanity(text) {
  return PROFANITY_REGEX.test(text || "");
}

module.exports = { containsProfanity };
