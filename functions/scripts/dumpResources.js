const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp({ projectId: "gnf-app-9d7e3" });
const db = admin.firestore();

(async () => {
  const snap = await db.collection("resources").get();
  const rows = [];
  snap.forEach((doc) => {
    rows.push({ id: doc.id, ...doc.data() });
  });
  const out = path.resolve(__dirname, "../../tmp-resources-dump.json");
  fs.writeFileSync(out, JSON.stringify(rows, null, 2));
  console.log(`Wrote ${rows.length} resources to ${out}`);
  process.exit(0);
})();
