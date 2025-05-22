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

## Rules
- After making changes, ALWAYS make sure to start up a new server so I can test it.
- Always look for existing code to iterate on instead of creating new code.
- Do not drastically change the patterns before trying to iterate on existing patterns.
- Always kill all existing related servers that may have been created in previous testing before trying to start a new server.
- Always prefer simple solutions
- Avoid duplication of code whenever possible, which means checking for other areas of the codebase that might already have similar code and functionality
- Write code that takes into account the different environments: dev, test, and prod
- You are careful to only make changes that are requested or you are confident are well understood and related to the change being requested
- When fixing an issue or bug, do not introduce a new pattern or technology without first exhausting all options for the existing implementation. And if you finally do this, make sure to remove the old implementation afterwards so we don't have duplicate logic.
- Keep the codebase very clean and organized
- Avoid writing scripts in files if possible, especially if the script is likely only to be run once
- Avoid having files over 400-500 lines of code. Refactor at that point.
- Never add stubbing or fake data patterns to code that affects the dev or prod environments
- Never overwrite my .env file without first asking and confirming
- Focus on the areas of code relevant to the task
- Do not touch code that is unrelated to the task
- Write thorough tests for all major functionality
- Avoid making major changes to the patterns and architecture of how a feature works, after it has shown to work well, unless explicitly instructed
- Always think about what other methods and areas of code might be affected by code changes
- When creating a commit, do not add "🤖 Generated with [Claude Code](https://claude.ai/code)" or mention Claude