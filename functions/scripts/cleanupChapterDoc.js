// Replace lingering "Upstate" references in the chapter doc's text fields.
// These fields hydrate the static /upstate page via chapter-hydration.js.

const admin = require("firebase-admin");
admin.initializeApp({ projectId: "gnf-app-9d7e3" });
const db = admin.firestore();

const DRY_RUN = process.argv.includes("--dry-run");

const UPDATES = {
  tagline: "Bringing belief capital to founders across Central New York — Syracuse, Ithaca, Binghamton, Utica and beyond.",
  servingText: "Good Neighbor Fund Central NY supports entrepreneurs across Central New York — from Syracuse to Ithaca, Binghamton to Utica. Wherever you're building, we believe in your potential.",
  poweredByText: "Good Neighbor Fund is a collective giving organization. Our funding comes from Limited Partners (LPs) — local founders, operators, and community members who pool their own capital each quarter to fund the boldest new ideas in Central NY. No overhead. No bureaucracy. Just neighbors investing in neighbors.",
};

(async () => {
  const ref = db.collection("chapters").doc("upstate");
  const snap = await ref.get();
  console.log(`${DRY_RUN ? "DRY RUN" : "APPLYING"}\n`);
  for (const [field, newVal] of Object.entries(UPDATES)) {
    const current = snap.get(field);
    const same = current === newVal;
    console.log(`${field}:`);
    console.log(`  before: ${current}`);
    console.log(`  after : ${newVal}`);
    console.log(`  ${same ? "(no change)" : "→ will update"}\n`);
  }
  if (!DRY_RUN) {
    await ref.update({ ...UPDATES, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log("Updated.");
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
