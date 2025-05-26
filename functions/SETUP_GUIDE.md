# Firebase Functions Setup Guide

## Overview
When a pitch is submitted through the application, two things happen automatically:
1. A notification is sent to the appropriate Slack channel (Denver or WNY)
2. The pitch data is saved to a Google Sheet

## Security Setup

### Step 1: Configure Slack Webhooks
Instead of hardcoding webhook URLs, store them securely in Firebase config:

```bash
# From the functions directory
firebase functions:config:set \
  slack.wny_webhook="YOUR_WNY_WEBHOOK_URL" \
  slack.denver_webhook="YOUR_DENVER_WEBHOOK_URL"
```

### Step 2: Configure Google Sheets Integration
Set up the Google Sheets configuration:

```bash
firebase functions:config:set \
  googlesheets.spreadsheet_id="1D7t661RQ3J0vC8N0g3gQfEcxxmEMa8Bq0KJcjvYceuw" \
  googlesheets.sheet_name="Pitches" \
  googlesheets.allowed_columns="*"
```

### Step 3: Grant Google Sheets Access
1. Find your Firebase service account email:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Copy the service account email (looks like: your-project@appspot.gserviceaccount.com)

2. Share your Google Sheet:
   - Open your Google Sheet
   - Click "Share" button
   - Add the service account email as an Editor
   - Click "Send"

### Step 4: Deploy Functions
```bash
firebase deploy --only functions
```

## Google Sheet Structure
Your Google Sheet should have these columns in order:
1. Timestamp
2. Chapter
3. Founder Name
4. Business Name
5. Email
6. Phone
7. Website
8. Bio
9. Value Proposition
10. Problem
11. Solution
12. Business Model
13. Has Paying Customers
14. Grant Use Plan
15. Heard About
16. Video URL
17. Pitch ID

## Testing
1. Submit a test pitch through the application
2. Check your Slack channel for the notification
3. Check your Google Sheet for the new row

## Troubleshooting
- If Slack notifications aren't working: Check Firebase Functions logs
- If Google Sheets isn't updating: Ensure the service account has edit access
- Run `firebase functions:config:get` to verify configuration is set correctly