// One-off backfill: AI-classify every pitch in `pitches` into one of the eight
// PITCH_CATEGORIES and write the result to a `category` field. Idempotent:
// pitches that already have a non-empty `category` are skipped.
//
// Run locally with ADC + an Anthropic key:
//   gcloud auth application-default login   (once, if needed)
//   ANTHROPIC_API_KEY=sk-ant-... GOOGLE_CLOUD_PROJECT=gnf-app-9d7e3 \
//     node functions/scripts/backfillPitchCategory.js

const admin = require("firebase-admin");
const { generatePitchCategory } = require("../aiSummary");

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY env var is required.");
  process.exit(1);
}

admin.initializeApp({ projectId: "gnf-app-9d7e3" });
const db = admin.firestore();

(async () => {
  const snap = await db.collection("pitches").get();
  console.log(`Scanning ${snap.size} pitches...`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const counts = {};

  for (const doc of snap.docs) {
    const pitch = doc.data();
    if (pitch.category && String(pitch.category).trim() !== "") {
      skipped += 1;
      continue;
    }
    try {
      const category = await generatePitchCategory(pitch, apiKey);
      if (category) {
        await doc.ref.update({ category });
        processed += 1;
        counts[category] = (counts[category] || 0) + 1;
        if (processed % 10 === 0) {
          console.log(`  processed ${processed}/${snap.size}...`);
        }
      } else {
        skipped += 1;
      }
    } catch (err) {
      console.error(`  ${doc.id}: ${err.message}`);
      failed += 1;
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log("\n=== Done ===");
  console.log(`scanned:   ${snap.size}`);
  console.log(`processed: ${processed}`);
  console.log(`skipped:   ${skipped}`);
  console.log(`failed:    ${failed}`);
  console.log("\nCategory distribution (this run):");
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, n]) => console.log(`  ${n.toString().padStart(4)}  ${cat}`));

  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
