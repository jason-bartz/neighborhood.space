// Builds and publishes the per-chapter LP roster snapshot consumed by the
// static chapter pages. The snapshot lives at:
//   chapter-rosters/{slug}/lps.json
// in the public Storage bucket; chapter-hydration.js fetches it on page load
// instead of running the (slower) Firestore SDK + multi-query path.
//
// Triggered from /users and /chapters writes — see exports in index.js.
//
// Snapshot shape (see chapter-hydration.js renderLpFromSnapshot):
//   {
//     updatedAt: "2026-04-27T12:00:00.000Z",
//     chapter:   "Denver",
//     lps: [
//       {
//         uid, name, effectiveRole,
//         professionalRole, bio, linkedinUrl,
//         photoUrl   // null when no upload exists; client falls back to
//                    // /assets/lps/<slug>.png and then to a placeholder
//       },
//       ...
//     ]
//   }

const admin = require("firebase-admin");

// Hardcoded to match firebaseConfig.js / storage.rules / the static chapter
// HTML files. CLAUDE.md: if the bucket name ever changes, all five hardcoded
// references must change together — this is the sixth.
const BUCKET = "gnf-app-9d7e3.firebasestorage.app";
const SNAPSHOT_CACHE_CONTROL = "public, max-age=300, must-revalidate";

// Fields that, when changed, mean the roster snapshot needs a rebuild. Keep
// in sync with the fields the snapshot actually emits + the membership
// predicate (chapter / role / chapterRole / active).
const ROSTER_RELEVANT_USER_FIELDS = [
  "chapter",
  "role",
  "chapterRole",
  "active",
  "name",
  "professionalRole",
  "bio",
  "linkedinUrl",
  "photoUrl",
];

function rosterRelevantUserChange(beforeData, afterData) {
  const a = beforeData || {};
  const b = afterData || {};
  for (const f of ROSTER_RELEVANT_USER_FIELDS) {
    if ((a[f] === undefined ? null : a[f]) !== (b[f] === undefined ? null : b[f])) {
      return true;
    }
  }
  return false;
}

async function findChapterSlugByName(chapterName) {
  if (!chapterName) return null;
  const snap = await admin.firestore()
    .collection("chapters")
    .where("name", "==", chapterName)
    .limit(1)
    .get();
  return snap.docs[0] ? snap.docs[0].id : null;
}

// Same effective-role + sort logic as renderLpRoster() in chapter-hydration.js
// and ChapterPage.jsx. Keep them in sync — the snapshot is meant to drop in
// for the live Firestore query, so the order must match.
function effectiveRole(u) {
  return u.role === "superAdmin" ? (u.chapterRole || u.role) : u.role;
}

function rosterSort(a, b) {
  const rank = (u) => (effectiveRole(u) === "chapter_director" ? 0 : 1);
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  return (a.name || "").localeCompare(b.name || "");
}

// Resolve the photo URL the client should render. Authoritative source is
// chapters/{slug}.lpPhotos[uid].photoUrl (set by the LP portal upload flow);
// users/{uid}.photoUrl is a fallback for cases where the chapter mirror
// failed. null means "no upload" — the client falls back to the static
// /assets/lps/<slug>.png filename convention.
function resolvePhotoUrl(user, lpPhotos) {
  const fromChapter = lpPhotos && lpPhotos[user.uid] && lpPhotos[user.uid].photoUrl;
  if (fromChapter) return fromChapter;
  if (user.photoUrl) return user.photoUrl;
  return null;
}

async function buildLpRosterSnapshot(chapterSlug) {
  const db = admin.firestore();
  const chapterRef = db.collection("chapters").doc(chapterSlug);
  const chapterSnap = await chapterRef.get();
  if (!chapterSnap.exists) {
    throw new Error(`chapter doc not found: ${chapterSlug}`);
  }
  const chapterData = chapterSnap.data() || {};
  const chapterName = chapterData.name;
  if (!chapterName) {
    throw new Error(`chapter ${chapterSlug} has no name field`);
  }

  // Mirrors renderLpRoster in chapter-hydration.js: primary roster + opted-in
  // superAdmins, deduped by uid. The adminListed query can fail for chapters
  // with no opted-in superAdmin (composite index requirement); fall back to
  // an empty list rather than failing the whole snapshot.
  const usersCol = db.collection("users");
  const primaryQ = usersCol
    .where("chapter", "==", chapterName)
    .where("role", "in", ["lp", "chapter_director"])
    .get();
  const adminListedQ = usersCol
    .where("chapter", "==", chapterName)
    .where("role", "==", "superAdmin")
    .where("chapterRole", "in", ["lp", "chapter_director"])
    .get()
    .catch(() => ({ docs: [] }));

  const [primarySnap, adminListedSnap] = await Promise.all([primaryQ, adminListedQ]);

  const byId = {};
  for (const doc of primarySnap.docs) byId[doc.id] = { uid: doc.id, ...doc.data() };
  for (const doc of adminListedSnap.docs) byId[doc.id] = { uid: doc.id, ...doc.data() };

  const lpPhotos = chapterData.lpPhotos || {};
  const lps = Object.values(byId)
    .filter((u) => u.active !== false)
    .sort(rosterSort)
    .map((u) => ({
      uid: u.uid,
      name: u.name || "",
      effectiveRole: effectiveRole(u),
      professionalRole: u.professionalRole || null,
      bio: u.bio || null,
      linkedinUrl: u.linkedinUrl || null,
      photoUrl: resolvePhotoUrl(u, lpPhotos),
    }));

  return {
    updatedAt: new Date().toISOString(),
    chapter: chapterName,
    lps,
  };
}

async function writeLpRosterSnapshot(chapterSlug, snapshot) {
  const bucket = admin.storage().bucket(BUCKET);
  const file = bucket.file(`chapter-rosters/${chapterSlug}/lps.json`);
  await file.save(JSON.stringify(snapshot), {
    contentType: "application/json",
    metadata: {
      cacheControl: SNAPSHOT_CACHE_CONTROL,
    },
    resumable: false,
  });
}

async function rebuildLpRosterSnapshot(chapterSlug) {
  const snapshot = await buildLpRosterSnapshot(chapterSlug);
  await writeLpRosterSnapshot(chapterSlug, snapshot);
  return snapshot;
}

async function listAllChapterSlugs() {
  const snap = await admin.firestore().collection("chapters").get();
  return snap.docs.map((d) => d.id);
}

module.exports = {
  rebuildLpRosterSnapshot,
  rosterRelevantUserChange,
  findChapterSlugByName,
  listAllChapterSlugs,
};
