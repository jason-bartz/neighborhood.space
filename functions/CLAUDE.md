# CLAUDE.md — Cloud Functions

Guidance specific to the Firebase Cloud Functions in this directory. For repo-wide guidance see [../CLAUDE.md](../CLAUDE.md). For deployment setup see [SETUP_GUIDE.md](SETUP_GUIDE.md).

## Runtime

- **Node 20** (declared in [package.json](package.json) `engines`). Don't rely on APIs newer than that.
- **CommonJS** — `require` / `module.exports`. No `import` syntax, no ESM.
- **Indentation:** 2 spaces. **Naming:** camelCase.

## Commands

```bash
npm run start-emulator    # Functions + Firestore emulator (uses ../emulator-data)
npm run shell             # Interactive functions shell
npm run serve             # Emulator, functions only
npm run deploy            # Deploy all functions
npm run logs              # Tail production logs
```

Running the emulator imports `../emulator-data` on start and exports on exit — local Firestore state persists between runs.

## What's in here

| File | Purpose |
|---|---|
| [index.js](index.js) | All function exports (Slack, Stripe, invites, AI, backfill) |
| [aiSummary.js](aiSummary.js) | Anthropic client + `generateFounderAbout()` helper |
| [google-sheets-export.js](google-sheets-export.js) | Google Sheets API writer for the pitch archive |
| [setup-firebase-config.sh](setup-firebase-config.sh) | Scripted `firebase functions:config:set` calls |

Exports (see [index.js](index.js)):

- `sendPitchToSlack` — Firestore `onCreate(pitches/{id})` → Slack webhook (channel picked by `chapter` field)
- `sendLPApplicationToSlack` — Firestore `onCreate(lpApplications/{id})` → Slack
- `generateAboutFromApplication` — `onCall` Anthropic summary for an LP application
- `backfillPitchSummaries` — `onCall` admin batch job
- `inviteUser` — `onCall` invite-link generator
- `sendSignInLink` — `onCall` magic-link auth email via Resend
- `stripeLPWebhook` — HTTPS webhook for Stripe events
- `helloWorld` — HTTPS health check

## Secrets / config

Functions read runtime config from `functions.config()` (the classic API). Do **not** read `process.env` for secrets — keep the source of truth in Firebase config. The namespaces in use:

| Key | Used by |
|---|---|
| `slack.bot_token`, `slack.wny_webhook`, `slack.denver_webhook` | `sendPitchToSlack`, `sendLPApplicationToSlack` |
| `resend.api_key` | `sendSignInLink` |
| `stripe.*` | `stripeLPWebhook` |
| `googlesheets.spreadsheet_id`, `googlesheets.sheet_name`, `googlesheets.allowed_columns` | Sheets export |
| Anthropic API key | `aiSummary.js` — see [SETUP_GUIDE.md](SETUP_GUIDE.md) |

Set with `firebase functions:config:set namespace.key="value"`. Verify with `firebase functions:config:get`.

## Conventions

- **Error handling:** `try / catch` at the function boundary; log with `console.error` and include the doc ID / request context. Re-throw for `onCall` so the client sees a `functions/*` error code.
- **Async:** `async` / `await`. Don't mix in raw `.then()` chains.
- **Validation:** validate inputs at the top of every `onCall`; reject with `HttpsError('invalid-argument', ...)` rather than generic throws.
- **Side effects ordering:** for Firestore triggers that fan out to multiple services (Slack + Sheets), isolate each call in its own `try / catch` so one failure doesn't swallow the rest.
- **File length:** split when approaching ~400 lines. `index.js` is already the natural split point — put substantive logic in a sibling module (`aiSummary.js`, `google-sheets-export.js`) and re-export.

## Adding a new function

1. Write the handler in [index.js](index.js), or a sibling module if it's substantial.
2. Export it from [index.js](index.js) with `exports.<name> = ...`.
3. If it reads secrets, add the namespace to [SETUP_GUIDE.md](SETUP_GUIDE.md) and [setup-firebase-config.sh](setup-firebase-config.sh).
4. If it writes to a new collection, add the Firestore rule in [../firestore.rules](../firestore.rules) in the same commit.
5. Run the emulator to smoke test before deploy.

## Deployment gotchas

- Deploy requires **Storage Object Viewer** on the compute service account. If deploys fail with permission errors, check IAM in the Google Cloud console — not the Firebase console.
- `firebase deploy --only functions` redeploys everything in the codebase. To redeploy one: `firebase deploy --only functions:sendPitchToSlack`.
- After changing `functions.config()`, you must redeploy for new values to take effect.
