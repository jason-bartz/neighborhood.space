const admin = require("firebase-admin");
admin.initializeApp({ projectId: "gnf-app-9d7e3" });
const db = admin.firestore();
(async () => {
  const snap = await db.collection("chapters").doc("upstate").get();
  console.log(JSON.stringify(snap.data(), null, 2));
  process.exit(0);
})();
