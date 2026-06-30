const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { google } = require("googleapis");
const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { generatePitchSummary, generateAboutSection, generatePitchCategory } = require("./aiSummary");
const { handleGuestMessage } = require("./guestMessageBot");
const {
  rebuildLpRosterSnapshot,
  rosterRelevantUserChange,
  findChapterSlugByName,
  listAllChapterSlugs,
} = require("./chapterRosterSnapshot");
const { recommend: recommendResourcesHelper } = require("./recommendResources");
const { zipToChapter } = require("./zipToChapter");
const { trackReviewSubmissionServer } = require("./statsTracking");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
// v2 functions can't use functions.config(); secrets flow through Secret Manager.
// v1 handlers fall back to functions.config() via the helpers below.
const SLACK_BOT_TOKEN = defineSecret("SLACK_BOT_TOKEN");
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

admin.initializeApp();

exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});

// Fallback chapter config used only when a /chapters/<slug> doc doesn't yet exist
// for a given chapter name. The portal's chapters management UI is the source of
// truth at runtime — these maps keep the four legacy chapters wired even if
// Firestore hasn't been seeded. Adding a new chapter via the UI writes slack
// channels / email / page slug into Firestore, which these functions then read.
const FALLBACK_CHAPTER_CHANNELS = {
  "Western New York": "C04V14N4W83",
  "Denver": "C04ULN7FPB9",
  "Central New York": "C0AUSSA9DGW",
  "Capital Region": "C0B096U4KK2",
};
const FALLBACK_LP_CHAPTER_CHANNELS = {
  "Western New York": "C04K9G2L29L",
  "Denver": "C04K9G4PVML",
  "Central New York": "C0AUUTAB2BC",
  "Capital Region": "C0AV7QJS1TK",
};
const FALLBACK_LP_CHAPTER_EMAILS = {
  "Western New York": "wny@goodneighbor.fund",
  "Denver": "denver@goodneighbor.fund",
  "Central New York": "cny@goodneighbor.fund",
  "Capital Region": "capitalregion@goodneighbor.fund",
};
const FALLBACK_CHAPTER_PAGE_SLUGS = {
  "Western New York": "wny",
  "Denver": "denver",
  "Central New York": "upstate",
  "Capital Region": "capital-region",
};

// Queries the /chapters collection for a chapter doc by display name. Returns
// the doc data or null. One Firestore read per event handler invocation —
// cheap and consistent.
async function loadChapterConfig(chapterName) {
  if (!chapterName) return null;
  try {
    const snap = await admin.firestore()
      .collection("chapters")
      .where("name", "==", chapterName)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    return doc ? { id: doc.id, ...doc.data() } : null;
  } catch (e) {
    console.error(`loadChapterConfig failed for "${chapterName}":`, e);
    return null;
  }
}

// Resolve the Slack channel for pitch notifications from a chapter name.
async function getChapterPitchSlackChannel(chapterName) {
  const cfg = await loadChapterConfig(chapterName);
  return (cfg && cfg.slackChannel) || FALLBACK_CHAPTER_CHANNELS[chapterName] || null;
}
async function getChapterLpSlackChannel(chapterName) {
  const cfg = await loadChapterConfig(chapterName);
  return (cfg && cfg.lpSlackChannel) || FALLBACK_LP_CHAPTER_CHANNELS[chapterName] || null;
}
async function getChapterEmailAlias(chapterName) {
  const cfg = await loadChapterConfig(chapterName);
  return (cfg && cfg.emailAlias) || FALLBACK_LP_CHAPTER_EMAILS[chapterName] || null;
}
async function getChapterPageSlug(chapterName) {
  const cfg = await loadChapterConfig(chapterName);
  return (cfg && (cfg.pageSlug || cfg.slug)) || FALLBACK_CHAPTER_PAGE_SLUGS[chapterName] || null;
}

const SITE_BASE_URL = "https://www.goodneighbor.fund";
const JASON_EMAIL_FROM = "Jason at Good Neighbor Fund <hello@goodneighbor.fund>";
const TEAM_EMAIL_FROM = "Good Neighbor Fund <hello@goodneighbor.fund>";
const DEFAULT_REPLY_TO = "hello@goodneighbor.fund";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendPitchConfirmationEmail(pitchData) {
  const apiKey = getResendKey();
  if (!apiKey) {
    console.error("Resend API key not configured. Set RESEND_API_KEY secret (v2) or resend.api_key config (v1).");
    return;
  }

  const recipient = (pitchData.email || "").trim();
  if (!recipient) {
    console.log("Pitch has no email; skipping confirmation email.");
    return;
  }

  const founderFirstName = (pitchData.founderName || "").trim().split(/\s+/)[0] || "there";
  const businessName = (pitchData.businessName || "").trim();
  const chapter = pitchData.chapter || "";
  const chapterSlug = await getChapterPageSlug(chapter);
  const chapterUrl = chapterSlug ? `${SITE_BASE_URL}/${chapterSlug}` : SITE_BASE_URL;
  const chapterEmail = await getChapterEmailAlias(chapter);

  const thanksLineText = businessName
    ? `Thank you for submitting your pitch application for ${businessName} to Good Neighbor Fund. We're grateful you took the time to share your work with us.`
    : `Thank you for submitting your pitch application to Good Neighbor Fund. We're grateful you took the time to share your work with us.`;

  const thanksLineHtml = businessName
    ? `Thank you for submitting your pitch application for <strong>${escapeHtml(businessName)}</strong> to <strong>Good Neighbor Fund</strong>. We're grateful you took the time to share your work with us.`
    : `Thank you for submitting your pitch application to <strong>Good Neighbor Fund</strong>. We're grateful you took the time to share your work with us.`;

  const chapterLinkLineText = chapterEmail
    ? `If you'd like an update on your application, you can visit your home chapter's page at ${chapterUrl} or email your chapter team directly at ${chapterEmail}.`
    : `If you'd like an update on your application, you can visit your home chapter's page at ${chapterUrl}.`;
  const chapterLinkLineHtml = chapterEmail
    ? `If you'd like an update on your application, you can visit your home chapter's page at <a href="${chapterUrl}" style="color:#1a5fb4;">${escapeHtml(chapterUrl)}</a> or email your chapter team directly at <a href="mailto:${chapterEmail}" style="color:#1a5fb4;">${chapterEmail}</a>.`
    : `If you'd like an update on your application, you can visit your home chapter's page at <a href="${chapterUrl}" style="color:#1a5fb4;">${escapeHtml(chapterUrl)}</a>.`;

  const subject = "Thanks for applying to Good Neighbor Fund";

  const text = [
    `Hi ${founderFirstName},`,
    "",
    thanksLineText,
    "",
    "Most chapters review pitch applications following the close of each quarter, so you can generally expect to hear back from your chapter team after quarter-end.",
    "",
    "If you're not selected this quarter, please don't be discouraged. We strongly invite you to apply again. We've had many past applicants who weren't selected one quarter go on to be selected for a grant in a following quarter.",
    "",
    chapterLinkLineText,
    "",
    "Thanks again for applying, and for being part of the Good Neighbor Fund community.",
    "",
    "Best,",
    "Jason",
    "Co-founder, Good Neighbor Fund",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;color:#222;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;border-radius:6px;padding:32px;">
            <tr>
              <td style="font-size:15px;line-height:1.55;color:#222;">
                <p style="margin:0 0 16px 0;">Hi ${escapeHtml(founderFirstName)},</p>

                <p style="margin:0 0 16px 0;">${thanksLineHtml}</p>

                <p style="margin:0 0 16px 0;">Most chapters review pitch applications following the close of each quarter, so you can generally expect to hear back from your chapter team after quarter-end.</p>

                <p style="margin:0 0 16px 0;">If you're not selected this quarter, please don't be discouraged. We strongly invite you to apply again. We've had many past applicants who weren't selected one quarter go on to be selected for a grant in a following quarter.</p>

                <p style="margin:0 0 16px 0;">${chapterLinkLineHtml}</p>

                <p style="margin:0 0 24px 0;">Thanks again for applying, and for being part of the Good Neighbor Fund community.</p>

                <p style="margin:0 0 4px 0;">Best,</p>
                <p style="margin:0;"><strong>Jason</strong><br/>Co-founder, Good Neighbor Fund</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const body = {
    from: JASON_EMAIL_FROM,
    to: [recipient],
    reply_to: chapterEmail || DEFAULT_REPLY_TO,
    subject,
    html,
    text,
  };
  if (chapterEmail) {
    body.cc = [chapterEmail];
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Resend API error: ${response.status} ${JSON.stringify(result)}`);
  }

  console.log(`Pitch confirmation email sent to ${recipient}${chapterEmail ? ` (cc: ${chapterEmail})` : ""} (Resend id: ${result.id || "unknown"})`);
}

// v2 handlers must declare SLACK_BOT_TOKEN in their `secrets: [...]` array.
// v1 handlers pick the value up from functions.config().slack.bot_token.
const getBotToken = () => {
  const fromSecret = SLACK_BOT_TOKEN.value();
  if (fromSecret) return fromSecret;
  try {
    const token = (functions.config().slack || {}).bot_token;
    if (token) return token;
  } catch (_) { /* functions.config() not available in v2 runtimes */ }
  console.error("Slack bot token not configured. Set SLACK_BOT_TOKEN secret (v2) or slack.bot_token config (v1).");
  return null;
};

// v2 handlers must declare RESEND_API_KEY in their `secrets: [...]` array.
// v1 handlers pick the value up from functions.config().resend.api_key.
const getResendKey = () => {
  const fromSecret = RESEND_API_KEY.value();
  if (fromSecret) return fromSecret;
  try {
    const key = (functions.config().resend || {}).api_key;
    if (key) return key;
  } catch (_) { /* v2 runtime — functions.config() unavailable */ }
  return null;
};

async function savePitchToGoogleSheets(pitchData, pitchId) {
  const spreadsheetId = "1D7t661RQ3J0vC8N0g3gQfEcxxmEMa8Bq0KJcjvYceuw";
  const sheetName = "Pitch Applications";

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const timestamp = new Date().toLocaleString();
  const selfIdentification = Array.isArray(pitchData.selfIdentification)
    ? pitchData.selfIdentification.join(", ")
    : (pitchData.selfIdentification || "");
  const row = [
    timestamp,
    pitchData.chapter || "",
    pitchData.founderName || "",
    pitchData.businessName || "",
    pitchData.email || "",
    pitchData.phone || "",
    pitchData.website || "",
    pitchData.bio || "",
    pitchData.valueProp || "",
    pitchData.problem || "",
    pitchData.solution || "",
    pitchData.businessModel || "",
    pitchData.hasPayingCustomers || "",
    pitchData.grantUsePlan || "",
    pitchData.heardAbout || "",
    pitchData.pitchVideoUrl || pitchData.pitchVideoFile || "",
    pitchId,
    pitchData.zipCode || "",
    selfIdentification,
    pitchData.consentToShare ? "Yes" : "No",
    pitchData.consentToMeetup ? "Yes" : "No",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:U`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  console.log("Successfully saved pitch to Google Sheets");
}

exports.respondToGuestMessage = onDocumentCreated(
  {
    document: "guestMessages/{msgId}",
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
    secrets: [ANTHROPIC_API_KEY],
  },
  async (event) => {
    try {
      await handleGuestMessage(event, ANTHROPIC_API_KEY.value());
    } catch (err) {
      console.error("respondToGuestMessage failed:", err);
    }
    return null;
  },
);

exports.sendPitchToSlack = onDocumentCreated(
  {
    document: "pitches/{pitchId}",
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
    secrets: [ANTHROPIC_API_KEY, SLACK_BOT_TOKEN, RESEND_API_KEY],
  },
  async (event) => {
  try {
    const pitchId = event.params.pitchId;
    const pitchData = event.data.data();

    console.log(`Processing new pitch submission: ${pitchId}`);

    if (!pitchData.chapter) {
      console.error(`Missing chapter field in pitch document: ${pitchId}`);
      return null;
    }

    const channelId = await getChapterPitchSlackChannel(pitchData.chapter);
    if (!channelId) {
      console.error(`No pitch Slack channel configured for chapter: ${pitchData.chapter}`);
      console.log(`Set 'slackChannel' on /chapters/<slug> (doc where name == "${pitchData.chapter}").`);
      return null;
    }

    const botToken = getBotToken();
    if (!botToken) return null;

    let formattedTimestamp = "No timestamp";
    if (pitchData.createdAt && pitchData.createdAt.toDate) {
      formattedTimestamp = pitchData.createdAt.toDate().toLocaleString();
    } else if (pitchData.createdAt) {
      formattedTimestamp = new Date(pitchData.createdAt).toLocaleString();
    }

    let aiSummary = "";
    try {
      aiSummary = await generatePitchSummary(pitchData, ANTHROPIC_API_KEY.value());
      if (aiSummary) {
        await event.data.ref.update({ aiSummary });
        pitchData.aiSummary = aiSummary;
      }
    } catch (summaryError) {
      console.error("Failed to generate AI summary for pitch:", summaryError);
    }

    try {
      const category = await generatePitchCategory(pitchData, ANTHROPIC_API_KEY.value());
      if (category) {
        await event.data.ref.update({ category });
        pitchData.category = category;
      }
    } catch (categoryError) {
      console.error("Failed to generate AI category for pitch:", categoryError);
    }

    const message = {
      channel: channelId,
      text: `New Pitch Submission - ${pitchData.chapter}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `New Pitch Submission - ${pitchData.chapter}`,
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Timestamp:*\n${formattedTimestamp}` },
            { type: "mrkdwn", text: `*Business Name:*\n${pitchData.businessName || "Not provided"}` },
          ],
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Founder Name:*\n${pitchData.founderName || "Not provided"}` },
            { type: "mrkdwn", text: `*Chapter:*\n${pitchData.chapter}` },
          ],
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Zip Code:*\n${pitchData.zipCode || "Not provided"}` },
            { type: "mrkdwn", text: `*Referrer:*\n${pitchData.heardAbout || "Not provided"}` },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              `*AI Summary:*\n${aiSummary || "_(AI summary unavailable — review the application directly in the LP portal.)_"}` +
              (pitchData.category ? `\n\n*Category:* ${pitchData.category}` : ""),
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Terms & Privacy Agreed:*\n${pitchData.consentToShare ? "Yes" : "No"}` },
            { type: "mrkdwn", text: `*In-Person Meetup Agreed:*\n${pitchData.consentToMeetup ? "Yes" : "No"}` },
          ],
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Review Application",
                emoji: true,
              },
              url: `https://www.goodneighbor.fund/pitch/${pitchId}`,
              style: "primary",
            },
          ],
        },
        { type: "divider" },
      ],
    };

    console.log(`Posting to Slack channel ${channelId} for ${pitchData.chapter}`);

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${botToken}`,
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error(`Slack API error: ${result.error}`, result);
      throw new Error(`Slack API error: ${result.error}`);
    }

    console.log(`Notification successfully sent to Slack for pitch in ${pitchData.chapter} chapter`);

    try {
      await savePitchToGoogleSheets(pitchData, pitchId);
      console.log("Pitch also saved to Google Sheets");
    } catch (sheetsError) {
      console.error("Failed to save to Google Sheets:", sheetsError);
    }

    try {
      await sendPitchConfirmationEmail(pitchData);
    } catch (emailError) {
      console.error("Failed to send pitch confirmation email:", emailError);
    }

    return null;
  } catch (error) {
    console.error("Error sending Slack notification:", error);
    return null;
  }
  }
);

async function saveLPApplicationToGoogleSheets(lpData, lpId) {
  const spreadsheetId = "1D7t661RQ3J0vC8N0g3gQfEcxxmEMa8Bq0KJcjvYceuw";
  const sheetName = "LP Applications";

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const timestamp = new Date().toLocaleString();
  const row = [
    timestamp,
    lpData.chapter || "",
    lpData.name || "",
    lpData.email || "",
    lpData.phone || "",
    lpData.linkedinUrl || "",
    lpData.hasPriorExperience || "",
    lpData.experienceDetails || "",
    lpData.whyJoin || "",
    lpData.meetupCommitment || "",
    lpData.donationCommitment || "",
    lpId,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:L`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  console.log("Successfully saved LP application to Google Sheets");
}

async function sendLPApplicationConfirmationEmail(lpData) {
  const apiKey = getResendKey();
  if (!apiKey) {
    console.error("Resend API key not configured. Set RESEND_API_KEY secret (v2) or resend.api_key config (v1).");
    return;
  }

  const recipient = (lpData.email || "").trim();
  if (!recipient) {
    console.log("LP application has no email; skipping confirmation email.");
    return;
  }

  const firstName = (lpData.name || "").trim().split(/\s+/)[0] || "there";
  const chapter = lpData.chapter || "";
  const chapterSlug = await getChapterPageSlug(chapter);
  const chapterUrl = chapterSlug ? `${SITE_BASE_URL}/${chapterSlug}` : SITE_BASE_URL;
  const chapterEmail = await getChapterEmailAlias(chapter);

  const subject = "Thanks for your Good Neighbor Fund LP application";

  const textLines = [
    `Hi ${firstName},`,
    "",
    `Thank you for applying to become a Limited Partner with Good Neighbor Fund${chapter ? ` ${chapter}` : ""}. We're grateful you're interested in supporting early-stage founders in your community.`,
    "",
    "A Chapter Director will be in touch soon to answer any questions and share next steps. Each chapter has a limited number of LP seats, and we aim for a thoughtful balance of backgrounds. If your chapter is currently full, we'll keep your application on the waitlist and reach out as space opens up.",
    "",
    `You can learn more about your chapter anytime at ${chapterUrl}.`,
    "",
    "Thanks again, and welcome to the community.",
    "",
    "Best,",
    "Jason",
    "Co-founder, Good Neighbor Fund",
  ];
  const text = textLines.join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;color:#222;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;border-radius:6px;padding:32px;">
            <tr>
              <td style="font-size:15px;line-height:1.55;color:#222;">
                <p style="margin:0 0 16px 0;">Hi ${escapeHtml(firstName)},</p>

                <p style="margin:0 0 16px 0;">Thank you for applying to become a Limited Partner with <strong>Good Neighbor Fund${chapter ? ` ${escapeHtml(chapter)}` : ""}</strong>. We're grateful you're interested in supporting early-stage founders in your community.</p>

                <p style="margin:0 0 16px 0;">A Chapter Director will be in touch soon to answer any questions and share next steps. Each chapter has a limited number of LP seats, and we aim for a thoughtful balance of backgrounds. If your chapter is currently full, we'll keep your application on the waitlist and reach out as space opens up.</p>

                <p style="margin:0 0 16px 0;">You can learn more about your chapter anytime here: <a href="${chapterUrl}" style="color:#1a5fb4;">${escapeHtml(chapterUrl)}</a></p>

                <p style="margin:0 0 24px 0;">Thanks again, and welcome to the community.</p>

                <p style="margin:0 0 4px 0;">Best,</p>
                <p style="margin:0;"><strong>Jason</strong><br/>Co-founder, Good Neighbor Fund</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const body = {
    from: JASON_EMAIL_FROM,
    to: [recipient],
    reply_to: chapterEmail || DEFAULT_REPLY_TO,
    subject,
    html,
    text,
  };
  if (chapterEmail) {
    body.cc = [chapterEmail];
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Resend API error: ${response.status} ${JSON.stringify(result)}`);
  }

  console.log(`LP confirmation email sent to ${recipient}${chapterEmail ? ` (cc: ${chapterEmail})` : ""} (Resend id: ${result.id || "unknown"})`);
}

exports.sendLPApplicationToSlack = onDocumentCreated(
  {
    document: "lpApplications/{lpId}",
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
    secrets: [SLACK_BOT_TOKEN, RESEND_API_KEY],
  },
  async (event) => {
  try {
    const lpId = event.params.lpId;
    const lpData = event.data.data();

    console.log(`Processing new LP application: ${lpId}`);

    if (!lpData.chapter) {
      console.error(`Missing chapter field in LP application document: ${lpId}`);
      return null;
    }

    const channelId = await getChapterLpSlackChannel(lpData.chapter);
    if (!channelId) {
      console.error(`No LP Slack channel configured for chapter: ${lpData.chapter}`);
      console.log(`Set 'lpSlackChannel' on /chapters/<slug> (doc where name == "${lpData.chapter}").`);
      return null;
    }

    const botToken = getBotToken();
    if (!botToken) return null;

    let formattedTimestamp = "No timestamp";
    if (lpData.createdAt && lpData.createdAt.toDate) {
      formattedTimestamp = lpData.createdAt.toDate().toLocaleString();
    } else if (lpData.createdAt) {
      formattedTimestamp = new Date(lpData.createdAt).toLocaleString();
    }

    const priorExperienceLine = lpData.hasPriorExperience === "Yes"
      ? (lpData.experienceDetails
          ? `Yes — ${lpData.experienceDetails}`
          : "Yes")
      : (lpData.hasPriorExperience || "Not provided");

    const message = {
      channel: channelId,
      text: `New LP Application - ${lpData.chapter}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `New LP Application - ${lpData.chapter}`,
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Timestamp:*\n${formattedTimestamp}` },
            { type: "mrkdwn", text: `*Chapter:*\n${lpData.chapter}` },
          ],
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Name:*\n${lpData.name || "Not provided"}` },
            { type: "mrkdwn", text: `*Email:*\n${lpData.email || "Not provided"}` },
          ],
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Phone:*\n${lpData.phone || "Not provided"}` },
            { type: "mrkdwn", text: `*LinkedIn:*\n${lpData.linkedinUrl || "Not provided"}` },
          ],
        },
        { type: "section", text: { type: "mrkdwn", text: `*Prior Experience:*\n${priorExperienceLine}` } },
        { type: "section", text: { type: "mrkdwn", text: `*Why They Want to Join:*\n${lpData.whyJoin || "Not provided"}` } },
        { type: "divider" },
      ],
    };

    console.log(`Posting to Slack channel ${channelId} for LP ${lpData.chapter}`);

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${botToken}`,
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error(`Slack API error: ${result.error}`, result);
      throw new Error(`Slack API error: ${result.error}`);
    }

    console.log(`LP notification successfully sent to Slack for ${lpData.chapter} chapter`);

    try {
      await saveLPApplicationToGoogleSheets(lpData, lpId);
    } catch (sheetsError) {
      console.error("Failed to save LP application to Google Sheets:", sheetsError);
    }

    try {
      await sendLPApplicationConfirmationEmail(lpData);
    } catch (emailError) {
      console.error("Failed to send LP confirmation email:", emailError);
    }

    return null;
  } catch (error) {
    console.error("Error sending LP Slack notification:", error);
    return null;
  }
});

async function requireRole(auth, allowedRoles) {
  if (!auth || !auth.uid) {
    throw new HttpsError("unauthenticated", "Sign-in required.");
  }
  const userDoc = await admin.firestore().collection("users").doc(auth.uid).get();
  const role = userDoc.exists ? userDoc.data().role : null;
  if (!role || !allowedRoles.includes(role)) {
    throw new HttpsError("permission-denied", "Insufficient role.");
  }
  return { uid: auth.uid, role };
}

// New chapter interest form (/start-a-chapter). On submission, email
// hello@goodneighbor.fund with the form contents plus a confirmation email
// to the applicant.
async function sendChapterApplicationEmails(appData, appId) {
  const apiKey = getResendKey();
  if (!apiKey) {
    console.error("Resend API key not configured. Skipping chapter application emails.");
    return;
  }

  const fields = [
    ["Name", appData.name],
    ["Email", appData.email],
    ["Phone", appData.phone],
    ["LinkedIn / Website", appData.linkedinOrWebsite],
    ["City / Region", appData.city],
    ["Why this city would benefit", appData.whyBenefit],
    ["Connected to local orgs", appData.hasLocalOrgs],
    ["Local orgs details", appData.localOrgsDetails],
    ["Willing to be Chapter Director", appData.willingChapterDirector],
    ["Has 2-3 supporters", appData.hasSupporters],
    ["Anything else", appData.anythingElse],
  ];
  const filledFields = fields.filter(([, value]) => value && String(value).trim());

  let timestampStr = new Date().toLocaleString();
  if (appData.createdAt && appData.createdAt.toDate) {
    timestampStr = appData.createdAt.toDate().toLocaleString();
  }

  const subject = `New Chapter Interest – ${appData.city || "Unknown city"} (${appData.name || "no name"})`;

  const adminTextLines = [
    `New chapter interest submission`,
    ``,
    `Submitted: ${timestampStr}`,
    `Doc ID: ${appId}`,
    ``,
    ...filledFields.map(([label, value]) => `${label}: ${value}`),
  ];
  const adminText = adminTextLines.join("\n");

  const adminRows = filledFields.map(([label, value]) => `
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#555;width:200px;vertical-align:top;">${escapeHtml(label)}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#222;white-space:pre-wrap;">${escapeHtml(value)}</td>
              </tr>`).join("");

  const adminHtml = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;color:#222;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;border-radius:6px;padding:0;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #e5e5e5;">
                <p style="margin:0;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#888;">New Chapter Interest</p>
                <h2 style="margin:6px 0 0 0;font-size:22px;color:#222;">${escapeHtml(appData.city || "Unknown city")}</h2>
                <p style="margin:6px 0 0 0;font-size:13px;color:#666;">Submitted ${escapeHtml(timestampStr)} · Doc ID ${escapeHtml(appId)}</p>
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.5;">
                  ${adminRows}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const adminBody = {
    from: TEAM_EMAIL_FROM,
    to: ["hello@goodneighbor.fund"],
    reply_to: appData.email ? [appData.email] : [DEFAULT_REPLY_TO],
    subject,
    html: adminHtml,
    text: adminText,
  };

  try {
    const adminResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(adminBody),
    });
    const adminResult = await adminResponse.json();
    if (!adminResponse.ok) {
      console.error(`Resend admin email error: ${adminResponse.status}`, adminResult);
    } else {
      console.log(`Chapter interest admin email sent (Resend id: ${adminResult.id || "unknown"})`);
    }
  } catch (err) {
    console.error("Failed to send chapter interest admin email:", err);
  }

  const recipient = (appData.email || "").trim();
  if (!recipient) {
    console.log("Chapter application has no email; skipping confirmation email.");
    return;
  }

  const firstName = (appData.name || "").trim().split(/\s+/)[0] || "there";
  const confirmSubject = "Thanks for your interest in starting a Good Neighbor Fund chapter";
  const confirmTextLines = [
    `Hi ${firstName},`,
    "",
    `Thank you for your interest in bringing Good Neighbor Fund to ${appData.city || "your city"}. We're grateful you're stepping up to support early-stage founders in your community.`,
    "",
    "We'll be reaching out shortly to answer your questions and walk you through next steps. New chapters typically launch once a Chapter Director and a few founding supporters are in place.",
    "",
    "In the meantime, the Chapter Handbook on our site walks through how new chapters get up and running.",
    "",
    "Thanks again for raising your hand, and welcome to the community.",
    "",
    "Best,",
    "Jason",
    "Co-founder, Good Neighbor Fund",
  ];
  const confirmHtml = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;color:#222;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;border-radius:6px;padding:32px;">
            <tr>
              <td style="font-size:15px;line-height:1.55;color:#222;">
                <p style="margin:0 0 16px 0;">Hi ${escapeHtml(firstName)},</p>
                <p style="margin:0 0 16px 0;">Thank you for your interest in bringing <strong>Good Neighbor Fund</strong> to ${escapeHtml(appData.city || "your city")}. We're grateful you're stepping up to support early-stage founders in your community.</p>
                <p style="margin:0 0 16px 0;">We'll be reaching out shortly to answer your questions and walk you through next steps. New chapters typically launch once a Chapter Director and a few founding supporters are in place.</p>
                <p style="margin:0 0 16px 0;">In the meantime, the Chapter Handbook on our site walks through how new chapters get up and running.</p>
                <p style="margin:0 0 24px 0;">Thanks again for raising your hand, and welcome to the community.</p>
                <p style="margin:0 0 4px 0;">Best,</p>
                <p style="margin:0;"><strong>Jason</strong><br/>Co-founder, Good Neighbor Fund</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const confirmBody = {
    from: JASON_EMAIL_FROM,
    to: [recipient],
    reply_to: DEFAULT_REPLY_TO,
    subject: confirmSubject,
    html: confirmHtml,
    text: confirmTextLines.join("\n"),
  };

  try {
    const confirmResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(confirmBody),
    });
    const confirmResult = await confirmResponse.json();
    if (!confirmResponse.ok) {
      console.error(`Resend confirmation email error: ${confirmResponse.status}`, confirmResult);
    } else {
      console.log(`Chapter interest confirmation email sent to ${recipient} (Resend id: ${confirmResult.id || "unknown"})`);
    }
  } catch (err) {
    console.error("Failed to send chapter interest confirmation email:", err);
  }
}

exports.sendChapterApplicationEmail = onDocumentCreated(
  {
    document: "chapterApplications/{appId}",
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
    secrets: [RESEND_API_KEY],
  },
  async (event) => {
    try {
      const appId = event.params.appId;
      const appData = event.data.data();
      console.log(`Processing new chapter application: ${appId}`);
      await sendChapterApplicationEmails(appData, appId);
      return null;
    } catch (error) {
      console.error("Error processing chapter application:", error);
      return null;
    }
  }
);

exports.generateAboutFromApplication = onCall(
  {
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
    secrets: [ANTHROPIC_API_KEY],
  },
  async (request) => {
  await requireRole(request.auth, ["chapter_director", "superAdmin"]);

  const pitchId = request.data && request.data.pitchId;
  if (!pitchId || typeof pitchId !== "string") {
    throw new HttpsError("invalid-argument", "pitchId is required.");
  }

  const pitchRef = admin.firestore().collection("pitches").doc(pitchId);
  const snap = await pitchRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", `Pitch ${pitchId} not found.`);
  }

  try {
    const aboutText = await generateAboutSection(snap.data(), ANTHROPIC_API_KEY.value());
    return { about: aboutText };
  } catch (error) {
    console.error("generateAboutFromApplication failed:", error);
    throw new HttpsError("internal", "Failed to generate about text.");
  }
  }
);

// Public-facing concierge endpoint for the resource navigator. Reads the
// resources collection server-side (rather than trusting client input) and
// asks Haiku to rank the best matches for a founder's stage + need. No auth
// required — the resource directory is already public-readable.
exports.recommendResources = onCall(
  {
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
    secrets: [ANTHROPIC_API_KEY],
    cors: true,
  },
  async (request) => {
    const data = request.data || {};
    const stage = typeof data.stage === "string" ? data.stage : null;
    const chips = Array.isArray(data.chips)
      ? data.chips.filter((c) => typeof c === "string").slice(0, 8)
      : [];
    const identities = Array.isArray(data.identities)
      ? data.identities.filter((c) => typeof c === "string").slice(0, 8)
      : [];
    const needText = typeof data.needText === "string" ? data.needText.slice(0, 600) : "";

    // Chapter can be provided directly (chapter pages) or resolved from a
    // zip code (the AI Concierge entry on /). Server-side resolution keeps
    // the mapping authoritative and prevents clients from spoofing.
    const explicitChapter = typeof data.chapter === "string" ? data.chapter : null;
    const zip = typeof data.zip === "string" ? data.zip : null;
    const chapter = explicitChapter || zipToChapter(zip);

    if (!chapter && !stage && chips.length === 0 && !needText && identities.length === 0) {
      throw new HttpsError("invalid-argument", "Provide at least one of: chapter, zip, stage, chips, identities, needText.");
    }

    let resources = [];
    try {
      const snap = await admin.firestore().collection("resources").get();
      resources = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          Resource: d.Resource || d.resource || "",
          Type: d.Type || d.type || "",
          "Focus Area": d.FocusArea || d["Focus Area"] || d.focusArea || "",
          "Business Stage": d.Stage || d["Business Stage"] || d.businessStage || "",
          "Counties Served": d.CountiesServed || d["Counties Served"] || d.countiesServed || "",
          Chapter: d.Chapter || d.chapter || "",
          URL: d.Website || d.URL || d.url || "",
          "Expanded Details": d.About || d["Expanded Details"] || d.expandedDetails || "",
          "Average Check Size": d.AverageCheckSize || d["Average Check Size"] || d.averageCheckSize || "",
        };
      });
    } catch (error) {
      console.error("recommendResources failed to load corpus:", error);
      throw new HttpsError("internal", "Could not load resources.");
    }

    try {
      const result = await recommendResourcesHelper({
        resources,
        chapter,
        stage,
        chips,
        identities,
        needText,
        apiKey: ANTHROPIC_API_KEY.value(),
      });
      // Echo resolvedChapter so the client can display "Looks like X"
      // when the user only entered a zip.
      return { ...result, resolvedChapter: chapter };
    } catch (error) {
      console.error("recommendResources helper threw:", error);
      throw new HttpsError("internal", "Recommendation failed.");
    }
  }
);

// Settings used for both invite and ongoing magic-link sign-in. The URL must
// be on the auth domain (www.goodneighbor.fund) and handleCodeInApp must be
// true — Firebase requires both for email-link sign-in to complete in the app
// rather than on the hosted Firebase page.
const SIGN_IN_ACTION_SETTINGS = {
  url: `${SITE_BASE_URL}/portal`,
  handleCodeInApp: true,
};

// Renders a Resend email body for a one-click magic sign-in link. Used by both
// the invite flow (mode === "invite") and the standalone sign-in flow (mode
// === "signin"). Two modes share one transport so the brand styling stays
// consistent and we only have one place to update the template.
async function sendMagicLinkEmail({ recipient, recipientName, chapter, role, signInLink, mode = "signin" }) {
  const apiKey = getResendKey();
  if (!apiKey) {
    throw new Error("Resend API key not configured. Set RESEND_API_KEY secret (v2) or resend.api_key config (v1).");
  }

  const firstName = (recipientName || "").trim().split(/\s+/)[0] || "there";
  const chapterEmail = chapter ? await getChapterEmailAlias(chapter) : null;
  const roleLabel =
    role === "superAdmin" ? "Super Admin" :
    role === "chapter_director" ? "Chapter Director" :
    "Limited Partner";
  const portalUrl = `${SITE_BASE_URL}/portal`;
  const isInvite = mode === "invite";

  const subject = isInvite
    ? `Welcome to NeighborhoodOS — your sign-in link`
    : `Your NeighborhoodOS sign-in link`;

  const introHtml = isInvite
    ? `<p style="margin:0 0 16px 0;">You've been added to the <strong>Good Neighbor Fund${chapter ? ` ${escapeHtml(chapter)}` : ""}</strong> chapter as a <strong>${escapeHtml(roleLabel)}</strong>.</p>
       <p style="margin:0 0 24px 0;">No password needed — just click the button below to sign in. The same magic-link works every time you sign in from now on.</p>`
    : `<p style="margin:0 0 24px 0;">Click the button below to sign in to NeighborhoodOS. No password required.</p>`;

  const introText = isInvite
    ? [
        `You've been added to the Good Neighbor Fund${chapter ? ` ${chapter}` : ""} chapter as a ${roleLabel}.`,
        "",
        "No password needed — just click the link below to sign in. The same magic-link approach works every time you sign in from now on.",
      ].join("\n")
    : "Click the link below to sign in to NeighborhoodOS. No password required.";

  const text = [
    `Hi ${firstName},`,
    "",
    introText,
    "",
    signInLink,
    "",
    `This link will sign you in at ${portalUrl} and expires in about 6 hours.`,
    "",
    "If you didn't request this, you can ignore this email — your account stays safe.",
    "",
    isInvite ? "Welcome to the neighborhood!" : "Thanks,",
    "",
    "— Good Neighbor Fund",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;color:#222;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;border-radius:6px;padding:32px;">
            <tr>
              <td style="font-size:15px;line-height:1.55;color:#222;">
                <p style="margin:0 0 16px 0;">Hi ${escapeHtml(firstName)},</p>

                ${introHtml}

                <p style="margin:0 0 24px 0;text-align:center;">
                  <a href="${signInLink}" style="display:inline-block;background:#d48fc7;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:4px;font-weight:bold;font-size:15px;">Sign in to NeighborhoodOS</a>
                </p>

                <p style="margin:0 0 16px 0;font-size:13px;color:#555;">Or paste this link into your browser:<br/><a href="${signInLink}" style="color:#1a5fb4;word-break:break-all;">${escapeHtml(signInLink)}</a></p>

                <p style="margin:0 0 16px 0;font-size:13px;color:#777;">This link expires in about 6 hours. If it does, head back to <a href="${portalUrl}" style="color:#1a5fb4;">${escapeHtml(portalUrl)}</a> and request a new one.</p>

                <p style="margin:0 0 16px 0;font-size:13px;color:#777;">If you didn't request this, you can ignore this email — your account stays safe.</p>

                <p style="margin:0 0 4px 0;">${isInvite ? "Welcome to the neighborhood," : "Thanks,"}</p>
                <p style="margin:0;"><strong>Good Neighbor Fund</strong></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const body = {
    from: TEAM_EMAIL_FROM,
    to: [recipient],
    reply_to: DEFAULT_REPLY_TO,
    subject,
    html,
    text,
  };
  // Only cc the chapter alias on first-time invites — quietly emailed sign-in
  // links don't need to ping the whole chapter inbox every time someone logs in.
  if (isInvite && chapterEmail) body.cc = [chapterEmail];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Resend API error: ${response.status} ${JSON.stringify(result)}`);
  }
  console.log(`Magic-link email (${mode}) sent to ${recipient}${body.cc ? ` (cc: ${body.cc.join(", ")})` : ""} (Resend id: ${result.id || "unknown"})`);
}

// One-click LP / chapter director / super admin invite. Replaces the legacy
// "create user in Firebase Console, paste UID into form" flow.
//
// Server-side enforces the same role+chapter scoping the UI used to enforce:
//   - chapter_director can only invite into their own chapter, never superAdmin
//   - superAdmin can invite anyone, anywhere
// Idempotent w.r.t. Firebase Auth: if an Auth user already exists for the
// email we reuse the UID. Firestore profile creation still errors if a doc
// is already there, so we don't silently clobber an existing member.
exports.inviteUser = onCall(
  {
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
    secrets: [RESEND_API_KEY],
  },
  async (request) => {
    const { uid: callerUid, role: callerRole } = await requireRole(
      request.auth,
      ["chapter_director", "superAdmin"]
    );

    const data = request.data || {};
    const email = String(data.email || "").trim().toLowerCase();
    const name = String(data.name || "").trim();
    const role = data.role;
    const chapter = String(data.chapter || "").trim();
    const anniversary = data.anniversary;
    // chapterRole: only honored when role === 'superAdmin'. Lets a superAdmin
    // opt into appearing on a chapter's public page in a secondary role.
    const rawChapterRole = String(data.chapterRole || "").trim();
    const VALID_CHAPTER_ROLES = ["lp", "chapter_director"];
    const chapterRole = role === "superAdmin" && VALID_CHAPTER_ROLES.includes(rawChapterRole)
      ? rawChapterRole
      : null;

    if (!email || !email.includes("@")) {
      throw new HttpsError("invalid-argument", "Valid email is required.");
    }
    if (!name) {
      throw new HttpsError("invalid-argument", "Name is required.");
    }
    if (!chapter) {
      throw new HttpsError("invalid-argument", "Chapter is required.");
    }
    const VALID_ROLES = ["lp", "chapter_director", "superAdmin"];
    if (!VALID_ROLES.includes(role)) {
      throw new HttpsError("invalid-argument", "Invalid role.");
    }

    if (role === "superAdmin" && callerRole !== "superAdmin") {
      throw new HttpsError("permission-denied", "Only Super Admins can create Super Admin accounts.");
    }
    if (callerRole === "chapter_director") {
      const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
      const callerChapter = callerDoc.exists ? callerDoc.data().chapter : null;
      if (!callerChapter || callerChapter !== chapter) {
        throw new HttpsError(
          "permission-denied",
          `Chapter directors can only invite users to ${callerChapter || "their own chapter"}.`
        );
      }
    }

    let authUser;
    let alreadyHadAuth = false;
    try {
      authUser = await admin.auth().getUserByEmail(email);
      alreadyHadAuth = true;
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        try {
          authUser = await admin.auth().createUser({
            email,
            emailVerified: false,
            displayName: name,
            disabled: false,
          });
        } catch (createErr) {
          console.error("createUser failed:", createErr);
          throw new HttpsError("internal", `Failed to create auth user: ${createErr.message}`);
        }
      } else {
        console.error("getUserByEmail failed:", err);
        throw new HttpsError("internal", `Auth lookup failed: ${err.message}`);
      }
    }

    const uid = authUser.uid;
    const userDocRef = admin.firestore().collection("users").doc(uid);
    const existing = await userDocRef.get();
    if (existing.exists) {
      throw new HttpsError("already-exists", `A profile already exists for ${email}.`);
    }

    let anniversaryDate = new Date();
    if (anniversary && typeof anniversary === "string") {
      const parsed = new Date(anniversary);
      if (!isNaN(parsed.getTime())) anniversaryDate = parsed;
    }

    // Founding Member auto-award: any LP joining within 1 year of their chapter's
    // founding date earns the og_neighbor badge at creation. Looks up the chapter
    // by display name (matches the user doc's `chapter` field). Falls back to
    // Jan 1 of foundedYear when foundedDate isn't set on the chapter doc.
    const startingBadges = [];
    if (role === "lp") {
      try {
        const chapterSnap = await admin.firestore()
          .collection("chapters")
          .where("name", "==", chapter)
          .limit(1)
          .get();
        if (!chapterSnap.empty) {
          const chapterData = chapterSnap.docs[0].data();
          let foundingDate = null;
          if (chapterData.foundedDate) {
            foundingDate = chapterData.foundedDate.toDate
              ? chapterData.foundedDate.toDate()
              : new Date(chapterData.foundedDate);
          } else if (typeof chapterData.foundedYear === "number") {
            foundingDate = new Date(Date.UTC(chapterData.foundedYear, 0, 1));
          }
          if (foundingDate && !isNaN(foundingDate.getTime())) {
            const daysDiff = (anniversaryDate.getTime() - foundingDate.getTime()) / (24 * 60 * 60 * 1000);
            if (daysDiff >= 0 && daysDiff <= 365) {
              startingBadges.push({
                badgeId: "og_neighbor",
                earnedDate: admin.firestore.Timestamp.now(),
                category: "general",
                name: "🏛️ Founding Member",
                description: "LP who joined within their chapter's first year",
              });
            }
          }
        }
      } catch (err) {
        // Don't block invite on badge lookup failure — log and move on.
        console.error("founding-member badge lookup failed:", err);
      }
    }

    const userDoc = {
      uid,
      reviewerId: uid,
      email,
      name,
      role,
      chapter,
      anniversary: admin.firestore.Timestamp.fromDate(anniversaryDate),
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: callerUid,
      hasCompletedSignup: false,
      stats: {
        totalReviews: 0,
        quarterReviews: 0,
        favoritesPicked: 0,
        considerationsPicked: 0,
        passedPicked: 0,
        ineligiblePicked: 0,
        reviewsByQuarter: {},
        reviewsByHour: {},
        longestStreak: 0,
        currentStreak: 0,
        lastReviewDate: null,
        averageReviewLength: 0,
        totalComments: 0,
        winnersIdentified: 0,
        accuracyRate: 0,
      },
      badges: startingBadges,
    };
    if (chapterRole) {
      userDoc.chapterRole = chapterRole;
    }
    await userDocRef.set(userDoc);

    let signInLink;
    try {
      signInLink = await admin.auth().generateSignInWithEmailLink(email, SIGN_IN_ACTION_SETTINGS);
    } catch (err) {
      console.error("generateSignInWithEmailLink failed:", err);
      throw new HttpsError("internal", `Failed to generate sign-in link: ${err.message}`);
    }

    try {
      await sendMagicLinkEmail({
        recipient: email,
        recipientName: name,
        chapter,
        role,
        signInLink,
        mode: "invite",
      });
    } catch (err) {
      console.error("sendMagicLinkEmail (invite) failed:", err);
      // Profile + auth account exist; surface the failure so admin can resend.
      return {
        uid,
        email,
        alreadyHadAuth,
        emailSent: false,
        emailError: err.message,
      };
    }

    return {
      uid,
      email,
      alreadyHadAuth,
      emailSent: true,
    };
  }
);

// Public callable used by the sign-in form: anyone who knows an email can
// request a sign-in link, but we only generate + send one if the email is on
// our /users allowlist. Unknown emails get a generic success response so the
// form doesn't double as a "is this address registered" oracle.
exports.sendSignInLink = onCall(
  {
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
    secrets: [RESEND_API_KEY],
  },
  async (request) => {
    const data = request.data || {};
    const email = String(data.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      throw new HttpsError("invalid-argument", "Valid email is required.");
    }

    // Allowlist check: must already exist in /users (was invited by an admin).
    // We deliberately swallow the "no match" branch into the same generic
    // response below so we don't leak which addresses are registered.
    const snap = await admin.firestore()
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snap.empty) {
      console.log(`sendSignInLink: no user record for ${email} — returning generic success.`);
      return { ok: true, sent: false };
    }

    const userData = snap.docs[0].data();

    let signInLink;
    try {
      signInLink = await admin.auth().generateSignInWithEmailLink(email, SIGN_IN_ACTION_SETTINGS);
    } catch (err) {
      console.error("generateSignInWithEmailLink failed:", err);
      throw new HttpsError("internal", `Failed to generate sign-in link: ${err.message}`);
    }

    try {
      await sendMagicLinkEmail({
        recipient: email,
        recipientName: userData.name || "",
        chapter: userData.chapter || "",
        role: userData.role || "lp",
        signInLink,
        mode: "signin",
      });
    } catch (err) {
      console.error("sendMagicLinkEmail (signin) failed:", err);
      throw new HttpsError("internal", `Failed to send sign-in link: ${err.message}`);
    }

    return { ok: true, sent: true };
  }
);

exports.backfillPitchSummaries = onCall(
  {
    timeoutSeconds: 540,
    memory: "512MiB",
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
    secrets: [ANTHROPIC_API_KEY],
  },
  async (request) => {
    await requireRole(request.auth, ["superAdmin"]);

    const chapter = request.data && typeof request.data.chapter === "string" ? request.data.chapter : null;
    const limit = request.data && Number.isInteger(request.data.limit) ? Math.min(request.data.limit, 200) : 50;

    let query = admin.firestore().collection("pitches");
    if (chapter) query = query.where("chapter", "==", chapter);
    const snap = await query.limit(500).get();

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const doc of snap.docs) {
      if (processed >= limit) break;
      const pitchData = doc.data();
      if (pitchData.aiSummary && String(pitchData.aiSummary).trim() !== "") {
        skipped += 1;
        continue;
      }
      try {
        const summary = await generatePitchSummary(pitchData, ANTHROPIC_API_KEY.value());
        if (summary) {
          await doc.ref.update({ aiSummary: summary });
          processed += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        console.error(`Backfill failed for pitch ${doc.id}:`, error);
        failed += 1;
      }
      // Light pacing to keep API request rate gentle.
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return {
      scanned: snap.size,
      processed,
      skipped,
      failed,
      chapter: chapter || "all",
    };
  }
);

exports.backfillPitchCategory = onCall(
  {
    timeoutSeconds: 540,
    memory: "512MiB",
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
    secrets: [ANTHROPIC_API_KEY],
  },
  async (request) => {
    await requireRole(request.auth, ["superAdmin"]);

    const chapter = request.data && typeof request.data.chapter === "string" ? request.data.chapter : null;
    const limit = request.data && Number.isInteger(request.data.limit) ? Math.min(request.data.limit, 300) : 100;

    let query = admin.firestore().collection("pitches");
    if (chapter) query = query.where("chapter", "==", chapter);
    const snap = await query.limit(500).get();

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const doc of snap.docs) {
      if (processed >= limit) break;
      const pitchData = doc.data();
      if (pitchData.category && String(pitchData.category).trim() !== "") {
        skipped += 1;
        continue;
      }
      try {
        const category = await generatePitchCategory(pitchData, ANTHROPIC_API_KEY.value());
        if (category) {
          await doc.ref.update({ category });
          processed += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        console.error(`Category backfill failed for pitch ${doc.id}:`, error);
        failed += 1;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return {
      scanned: snap.size,
      processed,
      skipped,
      failed,
      chapter: chapter || "all",
    };
  }
);

// ---------------------------------------------------------------------------
// Stripe → Slack: LP membership finance notifications
// ---------------------------------------------------------------------------
// All LP-related payment events land in one Slack channel (#finance-committee).
// Chapter attribution flows through metadata attached to payment links, which
// Stripe propagates to the Checkout Session, Subscription, Invoice line items,
// and Price. We never hit Stripe for lookups unless the event is missing the
// customer-facing fields we need (e.g. subscription.deleted lacks email).

const FINANCE_SLACK_CHANNEL = "C0520EMTA5P";

function getStripeClient() {
  const cfg = functions.config().stripe || {};
  if (!cfg.secret_key) {
    console.error("Stripe secret key not configured. Set stripe.secret_key in Firebase config.");
    return null;
  }
  return require("stripe")(cfg.secret_key, { apiVersion: "2024-06-20" });
}

function formatMoney(amountInCents, currency) {
  if (typeof amountInCents !== "number") return "—";
  const amount = amountInCents / 100;
  const code = (currency || "usd").toUpperCase();
  return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(amount);
}

function prettyBillingPeriod(productType, value) {
  if (productType === "lp_membership") {
    if (value === "semi_annual") return "Semi-Annual ($250 every 6 months)";
    if (value === "annual") return "Annual ($500 / year)";
  }
  if (productType === "gnf_club") {
    if (value === "monthly") return "Monthly ($25 / month)";
  }
  if (productType === "gnf_chapter_fee") {
    if (value === "monthly") return "Monthly ($15 / month)";
  }
  if (productType === "donation") {
    if (value === "one_time") return "One-Time";
  }
  return value || "—";
}

const TRACKED_PRODUCT_TYPES = new Set(["lp_membership", "gnf_club", "gnf_chapter_fee", "donation"]);

// Stripe payment-link metadata still carries legacy chapter names. Normalize
// here so the Slack message reflects the current chapter name everywhere.
const CHAPTER_NAME_REMAP = {
  "Upstate New York": "Central New York",
};

// Walk an event's object graph to find metadata from the payment link.
// Different event types surface the same metadata in different places.
function extractTrackedMetadata(obj) {
  const candidates = [
    obj.metadata,
    obj.subscription_details && obj.subscription_details.metadata,
    obj.lines && obj.lines.data && obj.lines.data[0] && obj.lines.data[0].metadata,
  ];
  for (const md of candidates) {
    if (md && TRACKED_PRODUCT_TYPES.has(md.product_type)) {
      if (md.chapter && CHAPTER_NAME_REMAP[md.chapter]) {
        return { ...md, chapter: CHAPTER_NAME_REMAP[md.chapter] };
      }
      return md;
    }
  }
  return null;
}

function productLabel(metadata) {
  if (metadata.product_type === "gnf_club") return "GNF Club Membership";
  if (metadata.product_type === "gnf_chapter_fee") return "GNF Chapter Fee";
  if (metadata.product_type === "donation") return "Donation";
  const chapter = metadata.chapter || "";
  return `${chapter ? chapter + " " : ""}LP Membership`;
}

function headerFor(eventType, metadata) {
  const isClub = metadata.product_type === "gnf_club";
  const suffix = isClub ? "" : ` – ${metadata.chapter || "Unknown Chapter"}`;
  const noun = (
    isClub ? "GNF Club Membership"
    : metadata.product_type === "gnf_chapter_fee" ? "GNF Chapter Fee"
    : metadata.product_type === "donation" ? "Donation"
    : "LP Membership"
  );
  if (eventType === "checkout.session.completed") {
    return metadata.product_type === "donation" ? `New Donation${suffix}` : `New ${noun}${suffix}`;
  }
  if (eventType === "invoice.paid") return `${noun} Renewal${suffix}`;
  if (eventType === "invoice.payment_failed") return `⚠️ ${noun} Payment Failed${suffix}`;
  if (eventType === "customer.subscription.deleted") return `${noun} Canceled${suffix}`;
  return `${noun}${suffix}`;
}

async function resolveCustomer(obj, stripe) {
  // Common shapes: customer_details (Checkout Session), customer_name/email (Invoice),
  // or just a customer ID (Subscription). Fall back to an API lookup when needed.
  if (obj.customer_details) {
    return { name: obj.customer_details.name, email: obj.customer_details.email };
  }
  if (obj.customer_name || obj.customer_email) {
    return { name: obj.customer_name, email: obj.customer_email };
  }
  if (obj.customer && typeof obj.customer === "string" && stripe) {
    try {
      const customer = await stripe.customers.retrieve(obj.customer);
      return { name: customer.name || customer.email, email: customer.email };
    } catch (e) {
      console.error("Failed to retrieve customer from Stripe:", e.message);
    }
  }
  return { name: null, email: null };
}

function buildFinanceSlackMessage({ headerText, productType, chapter, customerName, customerEmail, productName, amount, billingPeriod, invoiceUrl }) {
  const topRowLeft = productType === "gnf_club"
    ? { type: "mrkdwn", text: `*Scope:*\nNational` }
    : { type: "mrkdwn", text: `*Chapter:*\n${chapter || "—"}` };

  const blocks = [
    { type: "header", text: { type: "plain_text", text: headerText, emoji: true } },
    {
      type: "section",
      fields: [
        topRowLeft,
        { type: "mrkdwn", text: `*Amount:*\n${amount}` },
      ],
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Customer:*\n${customerName || "—"}` },
        { type: "mrkdwn", text: `*Email:*\n${customerEmail || "—"}` },
      ],
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Product:*\n${productName}` },
        { type: "mrkdwn", text: `*Billing:*\n${prettyBillingPeriod(productType, billingPeriod)}` },
      ],
    },
  ];
  if (invoiceUrl) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `<${invoiceUrl}|View invoice ↗>` } });
  }
  blocks.push({ type: "divider" });

  return {
    channel: FINANCE_SLACK_CHANNEL,
    text: headerText,
    blocks,
  };
}

async function postToFinanceChannel(message) {
  const botToken = getBotToken();
  if (!botToken) return;

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify(message),
  });
  const result = await response.json();
  if (!result.ok) {
    // Never throw — Stripe would retry the webhook and spam the channel.
    console.error("Slack API error posting LP finance message:", result.error, result);
    return;
  }
  console.log(`LP finance notification posted to Slack (${message.text})`);
}

exports.stripeLPWebhook = functions.https.onRequest(async (req, res) => {
  const cfg = functions.config().stripe || {};
  const webhookSecret = cfg.webhook_secret;
  if (!webhookSecret) {
    console.error("Stripe webhook secret not configured. Set stripe.webhook_secret in Firebase config.");
    res.status(500).send("webhook secret not configured");
    return;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    res.status(500).send("stripe not configured");
    return;
  }

  // Verify signature using the raw request body.
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook signature failed: ${err.message}`);
    return;
  }

  // Idempotency: short-circuit on duplicate event deliveries.
  const eventRef = admin.firestore().collection("stripeWebhookEvents").doc(event.id);
  const existing = await eventRef.get();
  if (existing.exists) {
    console.log(`Duplicate Stripe webhook event skipped: ${event.id}`);
    res.status(200).send("duplicate");
    return;
  }
  await eventRef.set({ type: event.type, createdAt: admin.firestore.FieldValue.serverTimestamp() });

  try {
    const obj = event.data.object;
    const metadata = extractTrackedMetadata(obj);
    if (!metadata) {
      res.status(200).send("ignored (not a tracked product)");
      return;
    }

    // Skip the first recurring invoice — checkout.session.completed already announced it.
    if (event.type === "invoice.paid" && obj.billing_reason === "subscription_create") {
      res.status(200).send("ignored (initial invoice)");
      return;
    }

    const customer = await resolveCustomer(obj, stripe);
    const productName = productLabel(metadata);
    const headerText = headerFor(event.type, metadata);

    let amount = "—";
    let invoiceUrl = null;
    if (event.type === "checkout.session.completed") {
      amount = formatMoney(obj.amount_total, obj.currency);
    } else if (event.type === "invoice.paid") {
      amount = formatMoney(obj.amount_paid, obj.currency);
      invoiceUrl = obj.hosted_invoice_url;
    } else if (event.type === "invoice.payment_failed") {
      amount = formatMoney(obj.amount_due, obj.currency);
      invoiceUrl = obj.hosted_invoice_url;
    } else if (event.type !== "customer.subscription.deleted") {
      console.log(`Stripe event ${event.type} received but not handled`);
      res.status(200).send("ignored (event type not handled)");
      return;
    }

    await postToFinanceChannel(buildFinanceSlackMessage({
      headerText,
      productType: metadata.product_type,
      chapter: metadata.chapter,
      customerName: customer.name,
      customerEmail: customer.email,
      productName,
      amount,
      billingPeriod: metadata.billing_period,
      invoiceUrl,
    }));
  } catch (err) {
    // Log and 200 — never retry.
    console.error("Failed to process Stripe LP webhook:", err);
  }

  res.status(200).send("ok");
});

// =====================================================================
// Forms Library — sendFormInvite + notifyFormSubmission
// =====================================================================
//
// Server-side metadata for forms exposed in the LP portal Forms Library. Mirrors
// src/components/lp/forms-library/formsRegistry.js — duplication is intentional
// so the function isn't coupled to the client bundle, but keep the two in sync
// when adding a form. inviteIntro is a function so chapter name interpolation
// happens here, not in template strings.
const FORM_META = {
  "lp-onboarding": {
    title: "LP Onboarding",
    publicPath: "/forms/lp-onboarding",
    inviteSubject: "Welcome to Good Neighbor Fund — please complete your LP onboarding",
    inviteIntro: ({ chapter }) =>
      `Welcome to the Good Neighbor Fund${chapter ? ` ${chapter}` : ""} chapter! Before our next gathering, please take a few minutes to complete your LP onboarding. It captures the headshot and bio for your public chapter profile and gets the Volunteer Agreement and NDA on file.`,
    submissionSubject: (data) =>
      `New LP onboarding — ${data.name || data.email || "submission"} (${data.chapter})`,
    submissionRows: (data) => ([
      ["Name", data.name],
      ["Email", data.email],
      ["Chapter", data.chapter],
      ["Bio", data.bio],
      ["Committees", Array.isArray(data.committees) ? data.committees.join(", ") : ""],
      ["Mailing Address", [data.addressStreet, [data.addressCity, data.addressState].filter(Boolean).join(", "), data.addressZip].filter(Boolean).join(" · ")],
      ["Shirt Size", data.shirtSize],
      ["Volunteer Agreement", data.volunteerAgreement && data.volunteerAgreement.accepted ? `Accepted (${data.volunteerAgreement.version || "v1"})` : "Not accepted"],
      ["NDA", data.nda && data.nda.accepted ? `Accepted (${data.nda.version || "v1"})` : "Not accepted"],
    ]),
    submissionAttachmentLabel: "Headshot",
    submissionAttachmentField: "headshotUrl",
  },
  "microgrant-awardee": {
    title: "Microgrant Awardee Information",
    publicPath: "/forms/microgrant-awardee",
    inviteSubject: "Your Good Neighbor Fund grant — final details",
    inviteIntro: ({ chapter }) =>
      `Congratulations on your Good Neighbor Fund grant${chapter ? ` from the ${chapter} chapter` : ""}. Before we mail the check and put together the announcement, we need a few quick details from you.`,
    submissionSubject: (data) =>
      `Microgrant awardee details — ${data.fullName || data.email || "submission"} (${data.chapter})`,
    submissionRows: (data) => ([
      ["Name on Check", data.fullName],
      ["Email", data.email],
      ["Chapter", data.chapter],
      ["Mailing Address", [data.addressStreet, [data.addressCity, data.addressState].filter(Boolean).join(", "), data.addressZip].filter(Boolean).join(" · ")],
      ["Social Handles", data.socialHandles],
    ]),
    submissionAttachmentLabel: "Announcement Photo",
    submissionAttachmentField: "photoUrl",
    // Cross-chapter announcement channel — every microgrant awardee submission
    // pings here so the comms team has a single feed to pull from.
    slackChannel: "C0520EMTA5P",
    slackTitle: "New Microgrant Awardee Information",
  },
};

// Builds the public form URL with chapter slug + recipient email pre-filled so
// the form opens with a chapter already selected — recipients shouldn't have to
// guess which chapter sent it to them.
function buildFormUrl(formType, { chapterSlug, email }) {
  const meta = FORM_META[formType];
  if (!meta) return null;
  const params = new URLSearchParams();
  if (chapterSlug) params.set("chapter", chapterSlug);
  if (email) params.set("email", email);
  const qs = params.toString();
  return `${SITE_BASE_URL}${meta.publicPath}${qs ? `?${qs}` : ""}`;
}

// Send a form invite link to a recipient via Resend. The chapter director (or
// superAdmin) initiates this from the Forms Library admin UI; the chapter
// alias is cc'd so the chapter team has a record.
exports.sendFormInvite = onCall(
  {
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
    secrets: [RESEND_API_KEY],
  },
  async (request) => {
    const { uid, role } = await requireRole(request.auth, ["chapter_director", "superAdmin"]);

    const data = request.data || {};
    const formType = String(data.formType || "").trim();
    const recipient = String(data.recipient || "").trim().toLowerCase();
    let chapter = String(data.chapter || "").trim();

    const meta = FORM_META[formType];
    if (!meta) {
      throw new HttpsError("invalid-argument", `Unknown form type: ${formType}`);
    }
    if (!recipient || !recipient.includes("@")) {
      throw new HttpsError("invalid-argument", "Invalid recipient email.");
    }

    // chapter_director can only send for their own chapter — read it from the
    // user doc rather than trusting the client.
    if (role === "chapter_director") {
      const userSnap = await admin.firestore().collection("users").doc(uid).get();
      const userChapter = userSnap.exists ? userSnap.data().chapter : null;
      if (!userChapter) {
        throw new HttpsError("failed-precondition", "No chapter set on your user record.");
      }
      chapter = userChapter;
    }
    if (!chapter) {
      throw new HttpsError("invalid-argument", "Chapter is required.");
    }

    const apiKey = getResendKey();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "Resend API key not configured.");
    }

    const chapterSlug = await getChapterPageSlug(chapter);
    const chapterEmail = await getChapterEmailAlias(chapter);
    const url = buildFormUrl(formType, { chapterSlug, email: recipient });

    const intro = meta.inviteIntro({ chapter });
    const subject = meta.inviteSubject;

    const text = [
      intro,
      "",
      `Open the form: ${url}`,
      "",
      "If you have questions, just reply to this email — your chapter team is on the cc.",
      "",
      "— Good Neighbor Fund",
    ].join("\n");

    const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;color:#222;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;border-radius:6px;padding:32px;">
            <tr>
              <td style="font-size:15px;line-height:1.55;color:#222;">
                <p style="margin:0 0 16px 0;">${escapeHtml(intro)}</p>
                <p style="margin:0 0 24px 0;text-align:center;">
                  <a href="${url}" style="display:inline-block;background:#d48fc7;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:4px;font-weight:bold;font-size:15px;">Open the Form</a>
                </p>
                <p style="margin:0 0 16px 0;font-size:13px;color:#555;">Or paste this link into your browser:<br/><a href="${url}" style="color:#1a5fb4;word-break:break-all;">${escapeHtml(url)}</a></p>
                <p style="margin:0 0 16px 0;font-size:13px;color:#777;">If you have questions, just reply to this email — your chapter team is on the cc.</p>
                <p style="margin:0 0 4px 0;">Thanks,</p>
                <p style="margin:0;"><strong>Good Neighbor Fund</strong></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const body = {
      from: TEAM_EMAIL_FROM,
      to: [recipient],
      reply_to: chapterEmail || DEFAULT_REPLY_TO,
      subject,
      html,
      text,
    };
    if (chapterEmail) body.cc = [chapterEmail];

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("sendFormInvite Resend error:", result);
      throw new HttpsError("internal", `Resend API error: ${response.status}`);
    }

    console.log(`Form invite sent (${formType}) to ${recipient}${body.cc ? ` (cc: ${body.cc.join(", ")})` : ""}, Resend id: ${result.id || "unknown"}`);

    return { ok: true, cc: chapterEmail || null };
  }
);

// Helper: email the chapter alias with the contents of a form submission.
async function sendFormSubmissionEmail(meta, data) {
  const chapterEmail = await getChapterEmailAlias(data.chapter);
  if (!chapterEmail) {
    console.error(`No chapter email alias for ${data.chapter}; skipping form submission email`);
    return;
  }
  const apiKey = getResendKey();
  if (!apiKey) {
    console.error("Resend API key not configured; skipping form submission email");
    return;
  }

  const subject = meta.submissionSubject(data);
  const rows = meta.submissionRows(data).filter(([, value]) => value && String(value).trim() !== "");

  const submittedAtText = data.submittedAt && data.submittedAt.toDate
    ? data.submittedAt.toDate().toLocaleString()
    : new Date().toLocaleString();

  const textRows = rows.map(([label, value]) => `${label}:\n${value}`).join("\n\n");
  const attachmentUrl = data[meta.submissionAttachmentField];
  const attachmentLine = attachmentUrl
    ? `${meta.submissionAttachmentLabel}: ${attachmentUrl}`
    : "";

  const text = [
    `A new ${meta.title} submission was received for the ${data.chapter} chapter.`,
    "",
    `Submitted: ${submittedAtText}`,
    "",
    textRows,
    "",
    attachmentLine,
    "",
    "View this submission and download a PDF copy in the portal Forms Library.",
  ].filter(Boolean).join("\n");

  const htmlRows = rows
    .map(
      ([label, value]) => `
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#666;width:160px;vertical-align:top;">${escapeHtml(label)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#222;white-space:pre-wrap;">${escapeHtml(value)}</td>
            </tr>`,
    )
    .join("");

  const attachmentHtml = attachmentUrl
    ? `<p style="margin:24px 0 0;font-size:13px;color:#555;">${escapeHtml(meta.submissionAttachmentLabel)}: <a href="${attachmentUrl}" style="color:#1a5fb4;word-break:break-all;">${escapeHtml(attachmentUrl)}</a></p>`
    : "";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;color:#222;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;border-radius:6px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#888;">${escapeHtml(meta.title)} · ${escapeHtml(data.chapter)}</p>
                <h1 style="margin:0 0 18px 0;font-size:22px;color:#222;font-weight:700;">New submission received</h1>
                <p style="margin:0 0 16px 0;font-size:13px;color:#666;">Submitted ${escapeHtml(submittedAtText)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-collapse:collapse;">
                  ${htmlRows}
                </table>
                ${attachmentHtml}
                <p style="margin:24px 0 0;font-size:13px;color:#555;">View this submission and download a PDF copy in the portal Forms Library.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const recipientEmail = (data.email || "").trim();
  const body = {
    from: TEAM_EMAIL_FROM,
    to: [chapterEmail],
    reply_to: recipientEmail || DEFAULT_REPLY_TO,
    subject,
    html,
    text,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    console.error("sendFormSubmissionEmail Resend error:", result);
    return;
  }
  console.log(`Form submission email sent to ${chapterEmail} for ${data.formType} (Resend id: ${result.id || "unknown"})`);
}

// Helper: post a form submission to a Slack channel. Block layout mirrors
// sendPitchToSlack — header + key/value field pairs + (optional) image block.
async function postFormSubmissionToSlack(meta, data) {
  if (!meta.slackChannel) return;
  const botToken = getBotToken();
  if (!botToken) return;

  const fields = meta.submissionRows(data)
    .filter(([, value]) => value && String(value).trim() !== "")
    .map(([label, value]) => ({
      type: "mrkdwn",
      text: `*${label}:*\n${value}`,
    }));

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${meta.slackTitle || meta.title} — ${data.chapter || ""}`,
        emoji: true,
      },
    },
  ];
  // Slack caps a section to 10 fields; chunk to stay safely under.
  for (let i = 0; i < fields.length; i += 8) {
    blocks.push({ type: "section", fields: fields.slice(i, i + 8) });
  }

  const attachmentUrl = data[meta.submissionAttachmentField];
  if (attachmentUrl) {
    blocks.push({
      type: "image",
      image_url: attachmentUrl,
      alt_text: meta.submissionAttachmentLabel || "attachment",
      title: { type: "plain_text", text: meta.submissionAttachmentLabel || "Photo" },
    });
  }
  blocks.push({ type: "divider" });

  const message = {
    channel: meta.slackChannel,
    text: `${meta.slackTitle || meta.title} — ${data.chapter || ""}`,
    blocks,
  };

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify(message),
  });
  const result = await response.json();
  if (!result.ok) {
    console.error(`Slack API error posting form submission: ${result.error}`, result);
    return;
  }
  console.log(`Form submission posted to Slack channel ${meta.slackChannel}`);
}

// On a new submission to /formLibrarySubmissions, email the chapter alias with
// the contents of the form. Director sees the response in the portal UI too,
// but the email keeps a copy in their inbox for non-portal-using teammates.
// If the form has a slackChannel configured, also posts there (e.g. microgrant
// awardees go to a cross-chapter announcement channel).
exports.notifyFormSubmission = onDocumentCreated(
  {
    document: "formLibrarySubmissions/{submissionId}",
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
    secrets: [RESEND_API_KEY, SLACK_BOT_TOKEN],
  },
  async (event) => {
    const submissionId = event.params.submissionId;
    const data = event.data.data();
    console.log(`Processing form submission: ${submissionId} (${data.formType})`);

    const meta = FORM_META[data.formType];
    if (!meta) {
      console.error(`Unknown formType on submission ${submissionId}: ${data.formType}`);
      return null;
    }
    if (!data.chapter) {
      console.error(`Submission ${submissionId} missing chapter`);
      return null;
    }

    // Email and Slack fan out independently — a failure in one shouldn't
    // suppress the other.
    try {
      await sendFormSubmissionEmail(meta, data);
    } catch (emailErr) {
      console.error("notifyFormSubmission email failed:", emailErr);
    }

    try {
      await postFormSubmissionToSlack(meta, data);
    } catch (slackErr) {
      console.error("notifyFormSubmission Slack failed:", slackErr);
    }

    return null;
  }
);

// ───── Chapter LP roster snapshots ─────
// Two triggers + one onCall backfill keep a JSON snapshot of each chapter's
// LP roster in Storage at chapter-rosters/{slug}/lps.json. The static chapter
// pages fetch that JSON directly from the CDN, skipping the Firebase SDK
// load + 3 Firestore queries that previously gated first paint of the LP grid.
// See functions/chapterRosterSnapshot.js for the snapshot shape and
// public/assets/js/chapter-hydration.js for the consumer.

// Rebuild the snapshot for both old and new chapters when the affected user
// changed chapters; otherwise just the one. Returns silently on errors so a
// stale snapshot is preferred over a noisy retry loop — the next user write
// will refresh it.
async function rebuildSnapshotsForChapters(chapterNames) {
  const unique = Array.from(new Set(chapterNames.filter(Boolean)));
  for (const chapterName of unique) {
    try {
      const slug = await findChapterSlugByName(chapterName);
      if (!slug) {
        console.warn(`rebuildSnapshotsForChapters: no chapter doc for "${chapterName}"`);
        continue;
      }
      await rebuildLpRosterSnapshot(slug);
    } catch (err) {
      console.error(`rebuildSnapshotsForChapters failed for "${chapterName}":`, err);
    }
  }
}

exports.refreshLpRosterOnUserWrite = onDocumentWritten(
  {
    document: "users/{uid}",
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
  },
  async (event) => {
    const before = event.data && event.data.before && event.data.before.exists
      ? event.data.before.data() : null;
    const after = event.data && event.data.after && event.data.after.exists
      ? event.data.after.data() : null;

    // Skip writes that don't touch any roster-relevant field (lastLogin,
    // email, etc.) — saves a Firestore read + Storage write per noisy update.
    if (before && after && !rosterRelevantUserChange(before, after)) return null;

    const chapters = [];
    if (before && before.chapter) chapters.push(before.chapter);
    if (after && after.chapter) chapters.push(after.chapter);
    if (chapters.length === 0) return null;

    await rebuildSnapshotsForChapters(chapters);
    return null;
  },
);

exports.refreshLpRosterOnChapterWrite = onDocumentWritten(
  {
    document: "chapters/{slug}",
    serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com",
  },
  async (event) => {
    const slug = event.params.slug;
    const before = event.data && event.data.before && event.data.before.exists
      ? event.data.before.data() : null;
    const after = event.data && event.data.after && event.data.after.exists
      ? event.data.after.data() : null;

    if (!after) return null; // chapter deleted — nothing to snapshot

    // Only the lpPhotos map and (rare) name change affect the snapshot.
    // Bail on any other edit so director text-tweak saves don't pay for a
    // pointless rebuild.
    const lpPhotosChanged = JSON.stringify((before && before.lpPhotos) || {})
                          !== JSON.stringify(after.lpPhotos || {});
    const nameChanged = !before || before.name !== after.name;
    if (!lpPhotosChanged && !nameChanged) return null;

    try {
      await rebuildLpRosterSnapshot(slug);
    } catch (err) {
      console.error(`refreshLpRosterOnChapterWrite failed for ${slug}:`, err);
    }
    return null;
  },
);

// One-shot backfill — superAdmin-only. Run after first deploy to seed the
// snapshot for every chapter, and any time you suspect Storage drifted from
// Firestore (e.g. a trigger failed silently). With no slug arg, rebuilds all.
exports.rebuildLpRosterSnapshots = onCall(
  { serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    const callerSnap = await admin.firestore()
      .collection("users").doc(request.auth.uid).get();
    if (!callerSnap.exists || callerSnap.data().role !== "superAdmin") {
      throw new HttpsError("permission-denied", "SuperAdmin only.");
    }

    const requested = request.data && request.data.chapterSlug;
    const slugs = requested ? [requested] : await listAllChapterSlugs();
    const results = [];
    for (const slug of slugs) {
      try {
        const snap = await rebuildLpRosterSnapshot(slug);
        results.push({ slug, ok: true, lpCount: snap.lps.length });
      } catch (err) {
        results.push({ slug, ok: false, error: String(err && err.message || err) });
      }
    }
    return { results };
  },
);

// Server-side review stats + badge tracker. Replaces the previous client-side
// trackReviewSubmission, which the LP /users self-update rule blocked because
// `stats` and `badges` aren't in the allowlist (and shouldn't be — letting an
// LP write either field directly means they could grant themselves any badge
// or fake review counts via devtools). The client writes /reviews/{reviewId}
// as the LP, then calls this; we re-read the review with admin SDK and bump
// the user's stats + badges. Returns { newBadges, stats } so the client can
// render the badge-earned toast and refresh the Trophy Case.
exports.trackReview = onCall(
  { serviceAccount: "gnf-app-9d7e3@appspot.gserviceaccount.com" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    const uid = request.auth.uid;

    const reviewId = request.data && request.data.reviewId;
    const isEdit = !!(request.data && request.data.isEdit);
    const previousReview = (request.data && request.data.previousReview) || null;
    if (!reviewId || typeof reviewId !== "string") {
      throw new HttpsError("invalid-argument", "reviewId is required.");
    }
    // The doc id format is `${uid}_${pitchId}` — the /reviews rules already
    // gate on this; re-check here so we never bump stats for a review the
    // caller didn't actually author.
    if (!reviewId.startsWith(`${uid}_`)) {
      throw new HttpsError("permission-denied", "Review does not belong to caller.");
    }

    const db = admin.firestore();
    const reviewSnap = await db.collection("reviews").doc(reviewId).get();
    if (!reviewSnap.exists) {
      throw new HttpsError("not-found", `Review ${reviewId} not found.`);
    }
    const reviewData = reviewSnap.data();
    if (reviewData.reviewerId !== uid) {
      throw new HttpsError("permission-denied", "Review reviewerId does not match caller.");
    }

    let pitchData = null;
    if (reviewData.pitchId) {
      const pitchSnap = await db.collection("pitches").doc(reviewData.pitchId).get();
      if (pitchSnap.exists) pitchData = { id: pitchSnap.id, ...pitchSnap.data() };
    }

    try {
      const result = await trackReviewSubmissionServer({
        db,
        userId: uid,
        reviewData,
        pitchData,
        isEdit,
        previousReview,
      });
      return result;
    } catch (err) {
      console.error(`trackReview failed for ${reviewId}:`, err);
      throw new HttpsError("internal", err.message || "trackReview failed");
    }
  },
);
