#!/bin/bash

# Setup script for Firebase Functions configuration
# This secures your webhooks and configures Google Sheets integration

echo "Setting up Firebase Functions configuration..."
echo "============================================"
echo ""
echo "IMPORTANT: Run this script from the functions directory"
echo ""

# Slack Webhooks
echo "Step 1: Configuring Slack Webhooks"
echo "-----------------------------------"
echo "You'll need your Slack webhook URLs for each chapter."
echo ""
read -p "Enter Western New York Slack webhook URL: " WNY_WEBHOOK
read -p "Enter Denver Slack webhook URL: " DENVER_WEBHOOK

# Google Sheets
echo ""
echo "Step 2: Configuring Google Sheets Integration"
echo "---------------------------------------------"
echo "Spreadsheet ID from your URL: 1D7t661RQ3J0vC8N0g3gQfEcxxmEMa8Bq0KJcjvYceuw"
echo ""
read -p "Enter the sheet name (tab name in Google Sheets): " SHEET_NAME

# Set Firebase configuration
echo ""
echo "Setting Firebase configuration..."

firebase functions:config:set \
  slack.wny_webhook="$WNY_WEBHOOK" \
  slack.denver_webhook="$DENVER_WEBHOOK" \
  googlesheets.spreadsheet_id="1D7t661RQ3J0vC8N0g3gQfEcxxmEMa8Bq0KJcjvYceuw" \
  googlesheets.sheet_name="$SHEET_NAME" \
  googlesheets.allowed_columns="*"

echo ""
echo "Configuration set! To verify, run:"
echo "firebase functions:config:get"
echo ""
echo "To deploy these changes, run:"
echo "firebase deploy --only functions"
echo ""
echo "Note: You may need to grant permissions for Google Sheets access:"
echo "1. Go to Google Cloud Console"
echo "2. Find your service account email"
echo "3. Share your Google Sheet with that email as an editor"