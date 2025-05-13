# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Build: `npm run build` (no build needed for Firebase functions)
- Start Emulator: `npm run start-emulator`
- Shell: `npm run shell`
- Test Webhooks: `node test-webhook.js`
- Deploy Functions: `npm run deploy`

## Code Guidelines
- Module System: CommonJS (require/exports)
- Node Version: Node 22 (functions are deployed with Node 18)
- Error Handling: Use try/catch with error logging via console.error
- Async Pattern: Use async/await for asynchronous code
- Logging: Use console.log for information, console.error for errors
- Firebase: Follow Firebase Functions patterns with exports
- Webhooks: Secure webhook URLs - consider using environment variables
- Formatting: 2-space indentation
- Naming: camelCase for variables and functions
- Error Messages: Descriptive messages with contextual information

## Troubleshooting
- Slack webhooks should be working and correctly formatted
- Slack notifications for new pitch submissions use the Firebase Cloud Function `sendPitchToSlack`
- The function triggers on creation of new documents in the 'pitches' collection
- Both form components (StandalonePitchForm.jsx and StandalonePitchPage.jsx) correctly set the chapter field
- If notifications don't appear in the intended channel:
  1. Check the Firebase Functions logs for errors
  2. Verify the webhook URLs with `node test-webhook.js`
  3. Check if the Firestore collection is being written to correctly
  4. Ensure that the pitch documents have the correct 'chapter' field ('Western New York' or 'Denver')
  5. Check Slack integration settings for the channels

## Known Issues
- There are deployment permission issues with Cloud Functions
- Function deployment requires Storage Object Viewer permission to be granted to the compute service account
- Enhanced logging and diagnostic code are added but need successful deployment

## Testing
Run Firebase functions locally with the emulator using `npm run start-emulator`