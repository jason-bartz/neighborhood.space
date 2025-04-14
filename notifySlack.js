// notifySlack.js
import axios from "axios";

// Define webhook URLs for each chapter
const SLACK_WEBHOOK_URLS = {
  "Western New York": "https://hooks.slack.com/services/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", // WNY webhook
  "Denver": "https://hooks.slack.com/services/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", // Denver webhook
  "default": "https://hooks.slack.com/services/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" // Default webhook (same as WNY for now)
};

export const notifySlack = async (pitchData) => {
  // Determine which webhook URL to use based on the chapter
  const webhookUrl = pitchData.chapter && SLACK_WEBHOOK_URLS[pitchData.chapter] 
    ? SLACK_WEBHOOK_URLS[pitchData.chapter] 
    : SLACK_WEBHOOK_URLS.default;
  
  // Format the message with an emoji indicator for the chapter
  const chapterEmoji = pitchData.chapter === "Denver" ? "🏔️" : "🍎";
  
  // Helper function to truncate text with ellipsis if it's too long
  const truncate = (text, length = 150) => {
    if (!text) return "Not provided";
    return text.length > length ? `${text.substring(0, length)}...` : text;
  };
  
  const message = {
    blocks: [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": `📥 New Pitch Submission - ${pitchData.chapter} ${chapterEmoji}`,
          "emoji": true
        }
      },
      {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": `*Founder:*\n${pitchData.founderName}`
          },
          {
            "type": "mrkdwn",
            "text": `*Business:*\n${pitchData.businessName}`
          }
        ]
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*About the Founder:*\n${truncate(pitchData.bio)}`
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*Value Proposition:*\n${truncate(pitchData.valueProp)}`
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*Problem Being Solved:*\n${truncate(pitchData.problem)}`
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*Solution:*\n${truncate(pitchData.solution)}`
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*Business Model:*\n${truncate(pitchData.businessModel)}`
        }
      },
      {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": `*Paying Customers:*\n${pitchData.hasPayingCustomers || "Not specified"}`
          },
          {
            "type": "mrkdwn",
            "text": `*Heard About GNF:*\n${pitchData.heardAbout || "Not specified"}`
          }
        ]
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*Plan for $1,000 Grant:*\n${truncate(pitchData.grantUsePlan)}`
        }
      },
      {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": `*Email:*\n${pitchData.email}`
          },
          {
            "type": "mrkdwn",
            "text": `*Website:*\n${pitchData.website || "Not provided"}`
          }
        ]
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": pitchData.pitchVideoUrl ? 
            `*Pitch Video:* ${pitchData.pitchVideoUrl}` : 
            (pitchData.pitchVideoFile ? 
              "*Pitch Video:* Uploaded (see admin portal)" : 
              "*Pitch Video:* Not provided")
        }
      },
      {
        "type": "context",
        "elements": [
          {
            "type": "mrkdwn",
            "text": "View complete details in the admin portal"
          }
        ]
      },
      {
        "type": "divider"
      }
    ]
  };

  try {
    await axios.post(webhookUrl, message, {
      headers: { "Content-Type": "application/json" }
    });
    console.log(`✅ Slack notification sent to ${pitchData.chapter} channel`);
  } catch (error) {
    console.error("🚨 Failed to send Slack notification:", error);
    
    // Fallback to simpler message if the rich message fails
    try {
      const simpleMessage = {
        text: `📥 New GNF Pitch Submitted! ${chapterEmoji}\n\n*Founder:* ${pitchData.founderName}\n*Business:* ${pitchData.businessName}\n*Chapter:* ${pitchData.chapter}\n*Email:* ${pitchData.email}`
      };
      
      await axios.post(webhookUrl, simpleMessage, {
        headers: { "Content-Type": "application/json" }
      });
      console.log(`✅ Fallback simple notification sent to ${pitchData.chapter} channel`);
    } catch (fallbackError) {
      console.error("🚨 Failed to send even simple Slack notification:", fallbackError);
    }
  }
};