const fetch = require("node-fetch");

// Slack webhook URLs from index.js
const WEBHOOKS = {
  "Western New York": "https://hooks.slack.com/services/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",
  "Denver": "https://hooks.slack.com/services/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"
};

async function testWebhook(chapter) {
  try {
    const webhookUrl = WEBHOOKS[chapter];
    console.log(`Testing webhook for ${chapter}...`);
    
    const testMessage = {
      text: `*Test Message from GNF App - ${chapter}*`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `Test Notification - ${chapter}`,
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "This is a test message to verify webhook functionality."
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Timestamp:* ${new Date().toLocaleString()}`
          }
        }
      ]
    };

    console.log("Sending message to Slack...");
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify(testMessage),
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`HTTP error! status: ${response.status}, response: ${responseText}`);
      return false;
    }
    
    const responseText = await response.text();
    console.log(`Response from Slack: ${responseText}`);
    console.log(`Successfully sent test message to ${chapter} channel`);
    return true;
  } catch (error) {
    console.error(`Error testing webhook for ${chapter}:`, error);
    return false;
  }
}

async function main() {
  let allSucceeded = true;
  
  for (const chapter of Object.keys(WEBHOOKS)) {
    const success = await testWebhook(chapter);
    if (!success) {
      allSucceeded = false;
      console.error(`Failed to send test message to ${chapter} channel.`);
    }
  }
  
  if (allSucceeded) {
    console.log("All webhooks are functioning correctly!");
  } else {
    console.error("One or more webhooks failed. Please check the webhook URLs and Slack app configuration.");
  }
}

main().catch(err => {
  console.error("Unhandled error in main:", err);
  process.exit(1);
});