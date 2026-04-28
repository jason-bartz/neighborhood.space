// One-off migration: rename the chapter "Upstate New York" → "Central New York"
// across every Firestore doc that holds the human chapter name.
//
// Run from the repo root after authenticating with Application Default Credentials:
//   gcloud auth application-default login
//   node functions/scripts/migrateChapterRename.js --dry-run
//   node functions/scripts/migrateChapterRename.js   # apply
//
// Slack channel IDs (C0AUSSA9DGW, C0AUUTAB2BC) are unchanged — Slack channel
// renames preserve IDs. The chapter doc id (`upstate`) and the static HTML
// route (`/upstate`) are intentionally untouched. The chapter doc's pageSlug
// field and emailAlias were updated by hand in the Firebase console
// (pageSlug → "central", emailAlias → "cny@goodneighbor.fund").

const admin = require("firebase-admin");

admin.initializeApp({ projectId: "gnf-app-9d7e3" });
const db = admin.firestore();

const OLD_NAME = "Upstate New York";
const NEW_NAME = "Central New York";
const DRY_RUN = process.argv.includes("--dry-run");

// Collection name → field name on the doc that holds the chapter string.
// Audited from src/ + functions/ writes (see commit message for paths).
const TARGETS = [
  { collection: "pitches",          field: "chapter" },
  { collection: "lpApplications",   field: "chapter" },
  { collection: "reviews",          field: "chapter" },
  { collection: "adminNotes",       field: "chapter" },
  { collection: "users",            field: "chapter" },
  { collection: "bulletinMessages", field: "authorChapter" },
  { collection: "resources",        field: "Chapter" },
  // Legacy: not written from current code but may hold historical docs.
  { collection: "limitedPartners",  field: "chapter" },
];

async function migrateChapterDoc() {
  const ref = db.collection("chapters").doc("upstate");
  const snap = await ref.get();
  if (!snap.exists) {
    console.log(`  /chapters/upstate not found — skipping`);
    return 0;
  }
  const current = snap.get("name");
  if (current === NEW_NAME) {
    console.log(`  /chapters/upstate.name already "${NEW_NAME}" — skipping`);
    return 0;
  }
  console.log(`  /chapters/upstate.name: "${current}" → "${NEW_NAME}"`);
  if (!DRY_RUN) {
    await ref.update({ name: NEW_NAME });
  }
  return 1;
}

async function migrateCollection({ collection, field }) {
  const snap = await db.collection(collection).where(field, "==", OLD_NAME).get();
  if (snap.empty) {
    console.log(`  ${collection}.${field}: 0 docs match`);
    return 0;
  }
  console.log(`  ${collection}.${field}: ${snap.size} doc(s) → "${NEW_NAME}"`);
  if (DRY_RUN) return snap.size;

  // Batched in chunks of 400 (Firestore batch limit is 500; leave headroom).
  let written = 0;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + 400);
    chunk.forEach((d) => batch.update(d.ref, { [field]: NEW_NAME }));
    await batch.commit();
    written += chunk.length;
  }
  return written;
}

(async () => {
  console.log(DRY_RUN ? "DRY RUN — no writes will be made" : "APPLYING migration");
  console.log(`Renaming "${OLD_NAME}" → "${NEW_NAME}"\n`);

  let total = 0;
  total += await migrateChapterDoc();
  for (const target of TARGETS) {
    try {
      total += await migrateCollection(target);
    } catch (e) {
      // Most likely cause: collection does not exist (e.g. limitedPartners
      // was never created). Log and continue rather than aborting halfway.
      console.error(`  ${target.collection}.${target.field}: ERROR ${e.message}`);
    }
  }

  console.log(`\n${DRY_RUN ? "Would update" : "Updated"} ${total} doc(s).`);
  process.exit(0);
})().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
