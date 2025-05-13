const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

// Import our custom Google Sheets export functionality
const sheetsExport = require('./google-sheets-export');

admin.initializeApp();

// Utility function to truncate long strings for logging
const truncate = (str, maxLength = 100) => {
  if (str && str.length > maxLength) {
    return `${str.substring(0, maxLength)}...`;
  }
  return str;
};

// Slack webhook URLs for different chapters
const WEBHOOKS = {
  "Western New York": "https://hooks.slack.com/services/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",
  "Denver": "https://hooks.slack.com/services/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"
};

// Cloud Function that triggers when a new pitch document is created in Firestore
exports.sendPitchToSlack = functions.firestore
  .document('pitches/{pitchId}')
  .onCreate(async (snapshot, context) => {
    try {
      const pitchId = context.params.pitchId;
      const pitchData = snapshot.data();
      
      console.log(`PITCH DEBUG: Full data snapshot: ${JSON.stringify(pitchData, null, 2)}`);
      console.log(`PITCH DEBUG: Function triggered for document ID ${pitchId}`);
      
      console.log(`Processing new pitch submission: ${pitchId}`);
      console.log(`Pitch data: ${JSON.stringify({
        businessName: pitchData.businessName,
        founderName: pitchData.founderName,
        chapter: pitchData.chapter,
        timestamp: pitchData.createdAt ? 'exists' : 'missing'
      })}`);
      
      // Check if the document has a chapter field
      if (!pitchData.chapter) {
        console.error(`Missing chapter field in pitch document: ${pitchId}`);
        return null;
      }
      
      // Check if we have a webhook for this chapter
      if (!WEBHOOKS[pitchData.chapter]) {
        console.error(`No webhook configured for chapter: ${pitchData.chapter}`);
        console.log(`Available chapters: ${Object.keys(WEBHOOKS).join(', ')}`);
        return null;
      }
      
      // Format timestamp if it exists
      let formattedTimestamp = "No timestamp";
      if (pitchData.createdAt && pitchData.createdAt.toDate) {
        formattedTimestamp = pitchData.createdAt.toDate().toLocaleString();
        console.log(`Formatted Firestore timestamp: ${formattedTimestamp}`);
      } else if (pitchData.createdAt) {
        formattedTimestamp = new Date(pitchData.createdAt).toLocaleString();
        console.log(`Formatted JS timestamp: ${formattedTimestamp}`);
      } else {
        console.log(`No timestamp field found in document`);
      }
      
      // Construct message for Slack
      const message = {
        text: `*New Pitch Submission - ${pitchData.chapter}*`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `New Pitch Submission - ${pitchData.chapter}`,
              emoji: true
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Timestamp:*\n${formattedTimestamp}`
              },
              {
                type: "mrkdwn",
                text: `*Business Name:*\n${pitchData.businessName || "Not provided"}`
              }
            ]
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Founder Name:*\n${pitchData.founderName || "Not provided"}`
              },
              {
                type: "mrkdwn",
                text: `*Chapter:*\n${pitchData.chapter}`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*About Me:*\n${pitchData.bio || "Not provided"}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Value Proposition:*\n${pitchData.valueProp || "Not provided"}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Problem:*\n${pitchData.problem || "Not provided"}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Solution:*\n${pitchData.solution || "Not provided"}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Use of Funds:*\n${pitchData.grantUsePlan || "Not provided"}`
            }
          },
          {
            type: "divider"
          }
        ]
      };
      
      // Determine which webhook URL to use based on chapter
      const webhookUrl = WEBHOOKS[pitchData.chapter];
      console.log(`Using webhook for chapter: ${pitchData.chapter}`);
      
      // Send the message to Slack
      console.log(`Sending notification to Slack for chapter: ${pitchData.chapter}...`);
      console.log(`Using webhook URL: ${webhookUrl.substring(0, 30)}...`);
      console.log(`Sending message payload: ${JSON.stringify(message, null, 2)}`);
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          body: JSON.stringify(message),
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Process the response
        const responseText = await response.text();
        console.log(`PITCH DEBUG: Slack API response status: ${response.status}`);
        console.log(`PITCH DEBUG: Slack API response text: ${responseText}`);
        
        if (!response.ok) {
          console.error(`Slack API error: HTTP ${response.status}`);
          console.error(`Response body: ${responseText}`);
          throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
        }
      } catch (fetchError) {
        console.error(`PITCH DEBUG: Error sending to Slack webhook:`, fetchError);
        console.error(`PITCH DEBUG: Error details:`, {
          message: fetchError.message,
          stack: fetchError.stack,
          webhookUrl: webhookUrl.substring(0, 30) + '...'
        });
        throw fetchError;
      }
      
      console.log(`Notification successfully sent to Slack for pitch in ${pitchData.chapter} chapter`);
      return null;
      
    } catch (error) {
      console.error("Error sending Slack notification:", error);
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
      return null;
    }
  });

// HTTP function that can be called manually to test Slack webhook functionality
exports.testSlackWebhook = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated (optional - you can remove this if you want to allow unauthenticated access)
    if (!context.auth) {
      throw new Error('Unauthenticated. Please sign in to use this function.');
    }
    
    // Get the chapter from the request or use a default
    const chapter = data.chapter || 'Western New York';
    console.log(`Testing webhook for chapter: ${chapter}`);
    
    // Validate the chapter
    if (!WEBHOOKS[chapter]) {
      const error = `No webhook found for chapter: ${chapter}. Available chapters: ${Object.keys(WEBHOOKS).join(', ')}`;
      console.error(error);
      return { success: false, error };
    }
    
    // Construct a test message
    const message = {
      text: `*Test Message - ${chapter}*`,
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
            text: "This is a test message sent from the GNF App Firebase Functions."
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Sent by:* ${context.auth ? context.auth.token.email || context.auth.uid : 'Anonymous'}`
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
    
    // Send the message to Slack
    console.log(`Sending test message to Slack...`);
    const webhookUrl = WEBHOOKS[chapter];
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify(message),
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Process the response
    const responseText = await response.text();
    if (!response.ok) {
      console.error(`Slack API error: HTTP ${response.status}`);
      console.error(`Response body: ${responseText}`);
      return {
        success: false,
        error: `HTTP error: ${response.status}`,
        details: responseText
      };
    }
    
    console.log(`Test notification successfully sent to Slack for ${chapter} chapter`);
    console.log(`Slack API response: ${responseText}`);
    
    return {
      success: true,
      message: `Test notification sent to ${chapter} channel`,
      response: responseText
    };
    
  } catch (error) {
    console.error("Error testing Slack webhook:", error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
});

// Export the Google Sheets functionality
exports.saveFormToSheets = sheetsExport.saveFormToSheets;