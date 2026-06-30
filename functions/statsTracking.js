// Server-side review stats tracking. Invoked by the trackReview onCall after
// the client has written the review doc. Runs with admin SDK so the LP /users
// self-update allowlist (which excludes `stats` and `badges` for security)
// doesn't apply.
//
// Mirrors trackReviewSubmission in src/services/statsTracking.js — keep the
// stat keys and badge cascade in sync if either side changes.

const admin = require('firebase-admin');
const { getNewBadges } = require('./badgeDefinitions');

const FieldValue = admin.firestore.FieldValue;

function getCurrentQuarter(now = new Date()) {
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return `Q${quarter} ${now.getFullYear()}`;
}

function getTimeOfDay(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function getDayOfWeek(date) {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
}

const INITIAL_STATS = {
  totalReviews: 0,
  totalComments: 0,
  totalPredictions: 0,
  correctPredictions: 0,
  quarterlyReviews: {},
  lastReviewDate: null,
  currentStreak: 0,
  longestStreak: 0,
  longestWeeklyStreak: 0,
  reviewsByTimeOfDay: { morning: 0, afternoon: 0, evening: 0, night: 0 },
  reviewsByDayOfWeek: { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 },
  ratingDistribution: { Favorite: 0, Consideration: 0, Pass: 0, Ineligible: 0 },
  longComments: 0,
  changedRatings: 0,
  earlyReviews: 0,
  nightReviews: 0,
  weekendReviews: 0,
  maxReviewsInDay: 0,
  reviewsToday: 0,
  lastReviewDay: null,
  perfectQuarters: 0,
  perfectQuarterCompletion: 0,
  favoriteWinners: 0,
  totalFavorites: 0,
  quarterlyTop3: 0,
  isChapterLeaderThisQuarter: false,
  isFoundingMember: false,
  yearLongStreak: 0,
  exactly50WordComments: 0,
  maxReviewEdits: 0,
  firstToReview: 0,
  christmasReview: 0,
  anniversaryReview: 0,
  asAMomComment: 0,
  communityBusinessReviews: 0,
  detailedReviews: 0,
  transportationBusinessReviews: 0,
  lateNightReviews: 0,
  passWithDetailedComments: 0,
  quarterCompletionRate: 0,
};

// Read user doc (admin SDK) — returns the data plus a flag for whether stats
// existed. If stats is missing, seed the doc with INITIAL_STATS in the same
// transaction-safe way the client used to.
async function loadUserAndEnsureStats(db, userId) {
  const userRef = db.collection('users').doc(userId);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new Error(`user doc ${userId} does not exist`);
  }
  const userData = snap.data();
  if (!userData.stats) {
    await userRef.update({
      stats: INITIAL_STATS,
      badges: userData.badges || [],
    });
    return { userRef, userData: { ...userData, stats: INITIAL_STATS, badges: userData.badges || [] } };
  }
  return { userRef, userData };
}

// Apply review-event stat increments. Mirrors the body of trackReviewSubmission
// in src/services/statsTracking.js (line 96+). When isEdit is true, only edit-
// driven counters change (changedRatings, maxReviewEdits, lastUpdate stamps);
// the headline counters stay put so re-submitting doesn't double-count.
function buildStatUpdates({ reviewData, pitchData, userData, isEdit, previousReview, now }) {
  const stats = userData.stats || INITIAL_STATS;
  const quarter = getCurrentQuarter(now);
  const timeOfDay = getTimeOfDay(now);
  const dayOfWeek = getDayOfWeek(now);
  const isWeekend = dayOfWeek === 'sat' || dayOfWeek === 'sun';
  const hour = now.getHours();

  const updates = {
    [`stats.quarterlyReviews.${quarter}`]: FieldValue.increment(isEdit ? 0 : 1),
    [`stats.reviewsByTimeOfDay.${timeOfDay}`]: FieldValue.increment(isEdit ? 0 : 1),
    [`stats.reviewsByDayOfWeek.${dayOfWeek}`]: FieldValue.increment(isEdit ? 0 : 1),
    [`stats.ratingDistribution.${reviewData.overallLpRating}`]: FieldValue.increment(isEdit ? 0 : 1),
    'stats.lastReviewDate': now,
  };

  if (!isEdit) {
    updates['stats.totalReviews'] = FieldValue.increment(1);

    if (pitchData && pitchData.createdAt) {
      const pitchDate = pitchData.createdAt.toDate
        ? pitchData.createdAt.toDate()
        : new Date(pitchData.createdAt);
      const hoursSincePitch = (now - pitchDate) / (1000 * 60 * 60);
      if (hoursSincePitch <= 48) {
        updates['stats.earlyReviews'] = FieldValue.increment(1);
      }
    }

    if (hour >= 22 || hour < 5) {
      updates['stats.nightReviews'] = FieldValue.increment(1);
    }
    if (hour >= 2 && hour < 4) {
      updates['stats.lateNightReviews'] = FieldValue.increment(1);
    }
    if (isWeekend) {
      updates['stats.weekendReviews'] = FieldValue.increment(1);
    }

    const today = now.toDateString();
    if (stats.lastReviewDay === today) {
      updates['stats.reviewsToday'] = FieldValue.increment(1);
      const newTotal = (stats.reviewsToday || 0) + 1;
      if (newTotal > (stats.maxReviewsInDay || 0)) {
        updates['stats.maxReviewsInDay'] = newTotal;
      }
    } else {
      updates['stats.reviewsToday'] = 1;
      updates['stats.lastReviewDay'] = today;
    }

    if (reviewData.overallLpRating === 'Favorite' || reviewData.overallLpRating === 'Consideration') {
      updates['stats.totalPredictions'] = FieldValue.increment(1);
      if (reviewData.overallLpRating === 'Favorite') {
        updates['stats.totalFavorites'] = FieldValue.increment(1);
      }
    }
  }

  // Comment counters — driven by the `comments` field on the review doc.
  // (The pre-server-side version of this code keyed off `lpComments`, which
  // doesn't exist on the doc — comment-related stats and badges had been
  // silently no-ops since the field was renamed.)
  if (reviewData.comments && reviewData.comments.trim().length > 0) {
    const comment = reviewData.comments.trim();
    updates['stats.totalComments'] = FieldValue.increment(1);
    if (comment.length > 100) {
      updates['stats.longComments'] = FieldValue.increment(1);
    }
    if (comment.length >= 300) {
      updates['stats.detailedReviews'] = FieldValue.increment(1);
    }
    const wordCount = comment.split(/\s+/).filter((w) => w.length > 0).length;
    if (wordCount === 50) {
      updates['stats.exactly50WordComments'] = FieldValue.increment(1);
    }
    if (reviewData.overallLpRating === 'Pass' && comment.length >= 50) {
      updates['stats.passWithDetailedComments'] = FieldValue.increment(1);
    }
    const neighborCount = (comment.toLowerCase().match(/neighbor/g) || []).length;
    if (neighborCount > 0) {
      updates['stats.neighborWordCount'] = FieldValue.increment(neighborCount);
    }
    if (comment.toLowerCase().includes('as a mom')) {
      updates['stats.asAMomComment'] = FieldValue.increment(1);
    }
  }

  if (hour === 16 && now.getMinutes() === 20) {
    updates['stats.fourTwentyReview'] = FieldValue.increment(1);
  }
  if (now.getMonth() === 11 && now.getDate() === 25) {
    updates['stats.christmasReview'] = FieldValue.increment(1);
  }
  if (userData.anniversary) {
    const anniversaryDate = userData.anniversary.toDate
      ? userData.anniversary.toDate()
      : new Date(userData.anniversary);
    if (now.getMonth() === anniversaryDate.getMonth() && now.getDate() === anniversaryDate.getDate()) {
      updates['stats.anniversaryReview'] = FieldValue.increment(1);
    }
  }

  if (pitchData) {
    if (pitchData.website && String(pitchData.website).trim().length > 0) {
      updates['stats.businessesWithWebsites'] = FieldValue.increment(1);
    }
    const businessName = String(pitchData.businessName || '').toLowerCase();
    const businessDescription = String(pitchData.businessDescription || '').toLowerCase();
    const communityKeywords = ['event', 'community', 'nonprofit', 'charity', 'festival', 'gathering', 'workshop', 'class', 'social'];
    if (communityKeywords.some((k) => businessName.includes(k) || businessDescription.includes(k))) {
      updates['stats.communityBusinessReviews'] = FieldValue.increment(1);
    }
    const transportKeywords = ['auto', 'car', 'vehicle', 'transport', 'logistics', 'delivery', 'trucking', 'automotive', 'mechanic', 'dealership', 'ride', 'taxi', 'uber', 'lyft'];
    if (transportKeywords.some((k) => businessName.includes(k) || businessDescription.includes(k))) {
      updates['stats.transportationBusinessReviews'] = FieldValue.increment(1);
    }
  }

  if (isEdit && previousReview && previousReview.overallLpRating
      && previousReview.overallLpRating !== reviewData.overallLpRating) {
    updates['stats.changedRatings'] = FieldValue.increment(1);
  }

  if (isEdit && typeof reviewData.editCount === 'number'
      && reviewData.editCount > (stats.maxReviewEdits || 0)) {
    updates['stats.maxReviewEdits'] = reviewData.editCount;
  }

  return updates;
}

// Helper-stat passes that read other Firestore docs (not the user doc we just
// touched). Each is best-effort — failures log and don't break the parent call.
async function checkFirstToReview(db, userId, pitchId) {
  const reviewsSnap = await db.collection('reviews')
    .where('pitchId', '==', pitchId)
    .orderBy('submittedAt', 'asc')
    .get();
  if (reviewsSnap.empty) return;
  if (reviewsSnap.docs[0].data().reviewerId !== userId) return;
  await db.collection('users').doc(userId).update({
    'stats.firstToReview': FieldValue.increment(1),
  });
}

async function calculateQuarterlyCompletion(db, userId) {
  const userSnap = await db.collection('users').doc(userId).get();
  if (!userSnap.exists) return;
  const userChapter = userSnap.data().chapter;
  const currentQuarter = getCurrentQuarter();

  const pitchesSnap = await db.collection('pitches')
    .where('chapter', '==', userChapter)
    .where('quarter', '==', currentQuarter)
    .get();
  const totalPitches = pitchesSnap.size;

  const reviewsSnap = await db.collection('reviews')
    .where('reviewerId', '==', userId)
    .where('quarter', '==', currentQuarter)
    .get();
  const completedReviews = reviewsSnap.size;

  const completionRate = totalPitches > 0
    ? Math.round((completedReviews / totalPitches) * 100)
    : 0;
  const updates = { 'stats.quarterCompletionRate': completionRate };
  if (completionRate === 100 && totalPitches > 0) {
    updates['stats.perfectQuarterCompletion'] = FieldValue.increment(1);
  }
  await db.collection('users').doc(userId).update(updates);
}

async function trackReviewSubmissionServer({ db, userId, reviewData, pitchData, isEdit, previousReview }) {
  const now = new Date();
  const { userRef, userData } = await loadUserAndEnsureStats(db, userId);

  const updates = buildStatUpdates({ reviewData, pitchData, userData, isEdit, previousReview, now });
  await userRef.update(updates);

  if (!isEdit) {
    try { await checkFirstToReview(db, userId, pitchData?.id || reviewData.pitchId); }
    catch (err) { console.warn('checkFirstToReview failed:', err); }
    try { await calculateQuarterlyCompletion(db, userId); }
    catch (err) { console.warn('calculateQuarterlyCompletion failed:', err); }
  }

  // Cascade badge passes — Bronze/Silver/Gold/Diamond depend on the count of
  // already-earned badges, so a fresh threshold-crossing milestone triggers
  // the next tier on the same submit. Cap at 3 passes.
  const allNewBadges = [];
  for (let pass = 0; pass < 3; pass++) {
    const snap = await userRef.get();
    const data = snap.data();
    const currentBadges = data.badges || [];
    const newBadges = getNewBadges(currentBadges, data.stats, data);
    if (newBadges.length === 0) break;
    await userRef.update({ badges: [...currentBadges, ...newBadges] });
    allNewBadges.push(...newBadges);
  }

  const finalSnap = await userRef.get();
  return { newBadges: allNewBadges, stats: finalSnap.data().stats };
}

module.exports = {
  trackReviewSubmissionServer,
  getCurrentQuarter,
};
