// Data-loading hook for the chapter Statistics tab.
//
// Fetches (pitches, reviews, users, chapters) scoped to the caller's role:
//   • LP / chapter_director → locked to userChapter
//   • superAdmin            → chapterFilter overrides to narrow; null = all chapters
//
// Pitches load public-read at the Firestore layer, so no role gate here
// beyond the chapter scoping. Reviews are chapter-scoped by firestore.rules;
// LPs can list reviews in their own chapter, which is exactly what we need.
//
// The hook intentionally re-fetches on chapterFilter change rather than
// client-side filtering a preloaded "all" set — directors and LPs never see
// an unscoped fetch, which matches the rules layer.

import { useEffect, useMemo, useState } from "react";
import {
  collection, query, where, orderBy, getDocs
} from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { chaptersByNameMap } from "../../../helpers/awardAmount";

export function useChapterStats({ user, chapterFilter, chaptersFromPortal }) {
  const [pitches, setPitches] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [chapters, setChapters] = useState(chaptersFromPortal || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isSuperAdmin = user?.role === "superAdmin";
  const userChapter = user?.chapter || null;
  const effectiveChapter = isSuperAdmin ? chapterFilter : userChapter;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    // Non-super users with no chapter assignment have nothing to show — avoid
    // an unscoped read that would fail the rules anyway.
    if (!isSuperAdmin && !userChapter) {
      setPitches([]); setReviews([]); setUsers([]); setChapters([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const pitchQ = effectiveChapter
          ? query(collection(db, "pitches"), where("chapter", "==", effectiveChapter), orderBy("createdAt", "desc"))
          : query(collection(db, "pitches"), orderBy("createdAt", "desc"));
        const reviewQ = effectiveChapter
          ? query(collection(db, "reviews"), where("chapter", "==", effectiveChapter))
          : query(collection(db, "reviews"));
        // Users drive the "active reviewer out of N LPs" denominator in the
        // engagement panel. Fetch all once — we filter by chapter in memory
        // for the aggregation.
        const usersQ = query(collection(db, "users"));
        const chaptersQ = query(collection(db, "chapters"));

        const [pitchSnap, reviewSnap, userSnap, chapterSnap] = await Promise.all([
          getDocs(pitchQ),
          getDocs(reviewQ),
          getDocs(usersQ),
          getDocs(chaptersQ),
        ]);

        if (cancelled) return;

        setPitches(pitchSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setReviews(reviewSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setUsers(userSnap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data() })));
        setChapters(chapterSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        if (cancelled) return;
        console.error("useChapterStats: load failed", err);
        setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, isSuperAdmin, userChapter, effectiveChapter]);

  const chaptersByName = useMemo(() => chaptersByNameMap(chapters), [chapters]);

  return {
    pitches,
    reviews,
    users,
    chapters,
    chaptersByName,
    effectiveChapter,
    isSuperAdmin,
    loading,
    error,
  };
}
