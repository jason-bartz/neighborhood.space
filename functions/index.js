const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { google } = require("googleapis");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { generatePitchSummary, generateAboutSection } = require("./aiSummary");

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
  "Upstate New York": "C0AUSSA9DGW",
  "Capital Region": "C0B096U4KK2",
};
const FALLBACK_LP_CHAPTER_CHANNELS = {
  "Western New York": "C04K9G2L29L",
  "Denver": "C04K9G4PVML",
  "Upstate New York": "C0AUUTAB2BC",
  "Capital Region": "C0AV7QJS1TK",
};
const FALLBACK_LP_CHAPTER_EMAILS = {
  "Western New York": "wny@goodneighbor.fund",
  "Denver": "denver@goodneighbor.fund",
  "Upstate New York": "upstateny@goodneighbor.fund",
  "Capital Region": "capitalregion@goodneighbor.fund",
};
const FALLBACK_CHAPTER_PAGE_SLUGS = {
  "Western New York": "wny",
  "Denver": "denver",
  "Upstate New York": "upstate",
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
const PITCH_EMAIL_FROM = "Jason at Good Neighbor Fund <hello@goodneighbor.fund>";
const PITCH_EMAIL_REPLY_TO = "hello@goodneighbor.fund";
const LP_EMAIL_FROM = "Good Neighbor Fund <hello@goodneighbor.fund>";
const LP_EMAIL_REPLY_TO = "hello@goodneighbor.fund";

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
    from: PITCH_EMAIL_FROM,
    to: [recipient],
    reply_to: PITCH_EMAIL_REPLY_TO,
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
            text: `*AI Summary:*\n${aiSummary || "_(AI summary unavailable — review the application directly in the LP portal.)_"}`,
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
    "A chapter representative will be in touch soon to answer any questions and share next steps. Each chapter has a limited number of LP seats, and we aim for a thoughtful balance of backgrounds. If your chapter is currently full, we'll keep your application on the waitlist and reach out as space opens up.",
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

                <p style="margin:0 0 16px 0;">A chapter representative will be in touch soon to answer any questions and share next steps. Each chapter has a limited number of LP seats, and we aim for a thoughtful balance of backgrounds. If your chapter is currently full, we'll keep your application on the waitlist and reach out as space opens up.</p>

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
    from: LP_EMAIL_FROM,
    to: [recipient],
    reply_to: LP_EMAIL_REPLY_TO,
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
    from: LP_EMAIL_FROM,
    to: [recipient],
    reply_to: LP_EMAIL_REPLY_TO,
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
      badges: [],
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
  return value || "—";
}

const TRACKED_PRODUCT_TYPES = new Set(["lp_membership", "gnf_club"]);

// Walk an event's object graph to find metadata from the payment link.
// Different event types surface the same metadata in different places.
function extractTrackedMetadata(obj) {
  const candidates = [
    obj.metadata,
    obj.subscription_details && obj.subscription_details.metadata,
    obj.lines && obj.lines.data && obj.lines.data[0] && obj.lines.data[0].metadata,
  ];
  for (const md of candidates) {
    if (md && TRACKED_PRODUCT_TYPES.has(md.product_type)) return md;
  }
  return null;
}

function productLabel(metadata) {
  if (metadata.product_type === "gnf_club") return "GNF Club Membership";
  const chapter = metadata.chapter || "";
  return `${chapter ? chapter + " " : ""}LP Membership`;
}

function headerFor(eventType, metadata) {
  const isClub = metadata.product_type === "gnf_club";
  const suffix = isClub ? "" : ` – ${metadata.chapter || "Unknown Chapter"}`;
  const noun = isClub ? "GNF Club Membership" : "LP Membership";
  if (eventType === "checkout.session.completed") return `New ${noun}${suffix}`;
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
