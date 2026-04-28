// Quick audit: distinct chapter values across collections to confirm
// no stale "Upstate" references linger after the rename.

const admin = require("firebase-admin");
admin.initializeApp({ projectId: "gnf-app-9d7e3" });
const db = admin.firestore();

const CHECKS = [
  { collection: "pitches",          field: "chapter" },
  { collection: "lpApplications",   field: "chapter" },
  { collection: "reviews",          field: "chapter" },
  { collection: "adminNotes",       field: "chapter" },
  { collection: "users",            field: "chapter" },
  { collection: "bulletinMessages", field: "authorChapter" },
  { collection: "resources",        field: "Chapter" },
];

(async () => {
  console.log("=== /chapters docs ===");
  const chSnap = await db.collection("chapters").get();
  chSnap.docs.forEach((d) => console.log(`  ${d.id} → name="${d.get("name")}"`));

  console.log("\n=== Distinct chapter values per collection ===");
  for (const { collection, field } of CHECKS) {
    try {
      const snap = await db.collection(collection).get();
      const counts = {};
      snap.docs.forEach((d) => {
        const v = d.get(field);
        const key = v === undefined ? "<missing>" : v === null ? "<null>" : String(v);
        counts[key] = (counts[key] || 0) + 1;
      });
      console.log(`  ${collection}.${field} (${snap.size} docs):`);
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([v, n]) => console.log(`    ${n.toString().padStart(4)}  ${v}`));
    } catch (e) {
      console.log(`  ${collection}.${field}: ERROR ${e.message}`);
    }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
