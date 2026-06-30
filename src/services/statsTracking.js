// Stats Tracking Service for LP Gamification
import { doc, updateDoc, increment, getDoc, setDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebaseConfig";
import { getNewBadges, BADGES } from "../data/badgeDefinitions";

// Server-side callable: bumps the LP's stats and runs the badge cascade with
// admin privileges. Replaces the previous in-process update path, which the
// /users self-update Firestore rule blocks for LPs (the allowlist excludes
// `stats` and `badges` so an LP can't grant themselves badges via devtools).
const trackReviewCallable = httpsCallable(functions, "trackReview");

// Initialize user stats if they don't exist
export const initializeUserStats = async (userId) => {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    const userData = userDoc.data();
    if (!userData.stats) {
      const initialStats = {
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
        perfectQuarters: 0,
        communityBusinessReviews: 0,
        detailedReviews: 0,
        transportationBusinessReviews: 0,
        lateNightReviews: 0,
        passWithDetailedComments: 0,
        quarterCompletionRate: 0,
        perfectQuarterCompletion: 0
      };
      
      await updateDoc(userRef, { 
        stats: initialStats,
        badges: userData.badges || []
      });
      
      return initialStats;
    }
    return userData.stats;
  }
  return null;
};

// Get current quarter string
export const getCurrentQuarter = () => {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return `Q${quarter} ${now.getFullYear()}`;
};

// Get time of day category
const getTimeOfDay = (date) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
};

// Get day of week
const getDayOfWeek = (date) => {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[date.getDay()];
};

// Track review submission. Thin wrapper around the trackReview Cloud Function
// — see functions/statsTracking.js for the actual stat math and badge cascade.
// The client writes the /reviews doc first (allowed by rules); this call then
// asks the server to bump the LP's stats and badges with admin privileges.
//
// previousReview (optional) lets the server detect rating changes and edit
// count; pass the review currently in state before this submission (null on
// first submit). The userId / reviewData / pitchData args are kept for source
// compatibility but the server re-reads the canonical review + pitch from
// Firestore so it can't be lied to from the client.
export const trackReviewSubmission = async (userId, reviewData, _pitchData, isEdit = false, previousReview = null) => {
  const reviewId = `${userId}_${reviewData.pitchId}`;
  const result = await trackReviewCallable({
    reviewId,
    isEdit,
    previousReview: previousReview ? {
      overallLpRating: previousReview.overallLpRating || null,
    } : null,
  });
  return result.data || { newBadges: [], stats: null };
};

// Track rating change
export const trackRatingChange = async (userId) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    'stats.changedRatings': increment(1)
  });
};

// Reverse the per-LP stat bumps that updateWinnerPredictions applied when a
// pitch's winner flag is toggled back off. Decrements `correctPredictions`,
// `winnersIdentified`, and (for Favorite voters) `favoriteWinners`, then
// recomputes `accuracyRate` from the fresh counters. Floors counters at 0 so
// an out-of-order replay can never drive them negative.
//
// Scope note: `perfectQuartersEarned` is intentionally NOT rolled back here —
// it's an award-for-lifetime flag keyed by quarter, and reversing it would
// require scanning that quarter's other winners. Left as-is; the next
// updateWinnerPredictions call will re-evaluate correctly.
export const reverseWinnerPredictions = async (pitchId) => {
  const reviewsQuery = query(
    collection(db, "reviews"),
    where("pitchId", "==", pitchId)
  );
  const reviewsSnapshot = await getDocs(reviewsQuery);

  for (const reviewDoc of reviewsSnapshot.docs) {
    const review = reviewDoc.data();
    if (review.overallLpRating !== 'Favorite' && review.overallLpRating !== 'Consideration') continue;

    const userId = review.reviewerId;
    if (!userId) continue;

    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) continue;

    const currentStats = userDoc.data().stats || {};
    const nextCorrect = Math.max(0, (currentStats.correctPredictions || 0) - 1);
    const nextWinnersIdentified = Math.max(0, (currentStats.winnersIdentified || 0) - 1);
    const totalPredictions = currentStats.totalPredictions || 0;
    const updates = {
      'stats.correctPredictions': nextCorrect,
      'stats.winnersIdentified': nextWinnersIdentified,
      'stats.accuracyRate': totalPredictions > 0 ? Math.round((nextCorrect / totalPredictions) * 100) : 0
    };
    if (review.overallLpRating === 'Favorite') {
      updates['stats.favoriteWinners'] = Math.max(0, (currentStats.favoriteWinners || 0) - 1);
    }
    await updateDoc(userRef, updates);
  }
};

// Update winner predictions after winners are announced
export const updateWinnerPredictions = async (pitchId, pitchData) => {
  console.log('Updating winner predictions for pitch:', pitchId);
  
  // Get all reviews for this pitch
  const reviewsQuery = query(
    collection(db, "reviews"),
    where("pitchId", "==", pitchId)
  );
  
  const reviewsSnapshot = await getDocs(reviewsQuery);
  console.log(`Found ${reviewsSnapshot.size} reviews for pitch ${pitchId}`);
  
  for (const reviewDoc of reviewsSnapshot.docs) {
    const review = reviewDoc.data();
    const userId = review.reviewerId;
    
    console.log(`Checking review by ${userId}: ${review.overallLpRating}`);
    
    if (review.overallLpRating === 'Favorite' || review.overallLpRating === 'Consideration') {
      const userRef = doc(db, "users", userId);

      const userDoc = await getDoc(userRef);
      const currentStats = userDoc.data()?.stats || {};

      // totalPredictions is already incremented at review-submit time in trackReviewSubmission.
      // Only bump correct counters here.
      const updates = {
        'stats.correctPredictions': increment(1),
        'stats.winnersIdentified': increment(1)
      };

      if (review.overallLpRating === 'Favorite') {
        updates['stats.favoriteWinners'] = increment(1);
      }

      const newCorrectPredictions = (currentStats.correctPredictions || 0) + 1;
      const totalPredictions = currentStats.totalPredictions || 0;
      if (totalPredictions > 0) {
        updates['stats.accuracyRate'] = Math.round((newCorrectPredictions / totalPredictions) * 100);
      }

      await updateDoc(userRef, updates);

      // Bump perfectQuarters if this user's quarter predictions are all-correct — backs Midas Touch
      if (review.quarter) {
        try { await checkPerfectQuarter(userId, review.quarter); }
        catch (e) { console.warn("updateWinnerPredictions: checkPerfectQuarter failed:", e); }
      }

      // Cascade badge awards (3 passes for Elite-tier unlock when crossing thresholds)
      for (let pass = 0; pass < 3; pass++) {
        const snap = await getDoc(userRef);
        const data = snap.data();
        const currentBadges = data.badges || [];
        const newBadges = getNewBadges(currentBadges, data.stats, data);
        if (newBadges.length === 0) break;
        await updateDoc(userRef, {
          badges: [...currentBadges, ...newBadges]
        });
      }
    }
  }
};

// Calculate chapter rankings for the quarter
export const calculateChapterRankings = async (chapter) => {
  const quarter = getCurrentQuarter();
  
  // Get all users in chapter
  const usersQuery = query(
    collection(db, "users"),
    where("chapter", "==", chapter),
    where("role", "in", ["lp", "chapter_director", "superAdmin"])
  );
  
  const usersSnapshot = await getDocs(usersQuery);
  const userStats = [];
  
  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    const quarterlyReviews = userData.stats?.quarterlyReviews?.[quarter] || 0;
    userStats.push({
      userId: doc.id,
      reviews: quarterlyReviews
    });
  });
  
  // Sort by review count
  userStats.sort((a, b) => b.reviews - a.reviews);
  
  // Update rankings
  for (let i = 0; i < userStats.length; i++) {
    const userRef = doc(db, "users", userStats[i].userId);
    const updates = {};
    
    if (i === 0 && userStats[i].reviews > 0) {
      updates['stats.isChapterLeaderThisQuarter'] = true;
    } else {
      updates['stats.isChapterLeaderThisQuarter'] = false;
    }
    
    if (i < 3 && userStats[i].reviews > 0) {
      updates['stats.quarterlyTop3'] = increment(1);
    }
    
    await updateDoc(userRef, updates);
  }
};

// Calculate founding member status
export const checkFoundingMember = async (userId) => {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    const userData = userDoc.data();
    const anniversary = userData.anniversary;
    const chapter = userData.chapter;
    
    // Get chapter founding date (you'll need to define these)
    const chapterFoundingDates = {
      'Western New York': new Date('2023-10-01'),
      'Denver': new Date('2024-01-01'),
      'Central New York': new Date('2026-05-26'),
      'Capital Region': new Date('2026-05-26'),
    };
    
    const foundingDate = chapterFoundingDates[chapter];
    if (foundingDate && anniversary) {
      const userJoinDate = anniversary.toDate ? anniversary.toDate() : new Date(anniversary);
      const monthsDiff = (userJoinDate - foundingDate) / (1000 * 60 * 60 * 24 * 30);
      
      // Consider founding member if joined within 3 months of chapter launch
      const isFoundingMember = monthsDiff <= 3;
      
      await updateDoc(userRef, {
        'stats.isFoundingMember': isFoundingMember
      });
    }
  }
};

// Track first to review in a batch
export const checkFirstToReview = async (userId, pitchId) => {
  // Get all reviews for this pitch
  const reviewsQuery = query(
    collection(db, "reviews"),
    where("pitchId", "==", pitchId),
    orderBy("submittedAt", "asc")
  );
  
  const reviewsSnapshot = await getDocs(reviewsQuery);
  
  if (!reviewsSnapshot.empty && reviewsSnapshot.docs[0].data().reviewerId === userId) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      'stats.firstToReview': increment(1)
    });
  }
};

// Calculate quarterly completion rate
export const calculateQuarterlyCompletion = async (userId) => {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return;
  
  const userData = userDoc.data();
  const userChapter = userData.chapter;
  const currentQuarter = getCurrentQuarter();
  
  // Get all pitches for this quarter in user's chapter
  const pitchesQuery = query(
    collection(db, "pitches"),
    where("chapter", "==", userChapter),
    where("quarter", "==", currentQuarter)
  );
  
  const pitchesSnapshot = await getDocs(pitchesQuery);
  const totalPitches = pitchesSnapshot.size;
  
  // Get user's reviews for this quarter
  const reviewsQuery = query(
    collection(db, "reviews"),
    where("reviewerId", "==", userId),
    where("quarter", "==", currentQuarter)
  );
  
  const reviewsSnapshot = await getDocs(reviewsQuery);
  const completedReviews = reviewsSnapshot.size;
  
  const completionRate = totalPitches > 0 ? Math.round((completedReviews / totalPitches) * 100) : 0;
  
  const updates = {
    'stats.quarterCompletionRate': completionRate
  };
  
  // Check for perfect quarter completion
  if (completionRate === 100 && totalPitches > 0) {
    updates['stats.perfectQuarterCompletion'] = increment(1);
  }
  
  await updateDoc(userRef, updates);
  
  return { completionRate, totalPitches, completedReviews };
};

// Check and update perfect quarters for winner predictions — idempotent per quarter
export const checkPerfectQuarter = async (userId, quarter) => {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) return;

  // Skip if already credited for this quarter
  const stats = userDoc.data().stats || {};
  if (stats.perfectQuartersEarned && stats.perfectQuartersEarned[quarter]) return;

  // Get all user's predictions for this quarter
  const reviewsQuery = query(
    collection(db, "reviews"),
    where("reviewerId", "==", userId),
    where("quarter", "==", quarter),
    where("overallLpRating", "in", ["Favorite", "Consideration"])
  );

  const reviewsSnapshot = await getDocs(reviewsQuery);
  if (reviewsSnapshot.empty) return;

  let allCorrect = true;
  let totalPredictions = 0;

  for (const reviewDoc of reviewsSnapshot.docs) {
    const review = reviewDoc.data();
    const pitchRef = doc(db, "pitches", review.pitchId);
    const pitchDoc = await getDoc(pitchRef);

    if (pitchDoc.exists()) {
      totalPredictions++;
      if (!pitchDoc.data().isWinner) {
        allCorrect = false;
        break;
      }
    }
  }

  if (allCorrect && totalPredictions > 0) {
    await updateDoc(userRef, {
      'stats.perfectQuarters': increment(1),
      [`stats.perfectQuartersEarned.${quarter}`]: true
    });
  }
};

// Calculate retroactive stats for existing users
export const calculateRetroactiveStats = async (userId) => {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return;
  
  const userData = userDoc.data();
  await initializeUserStats(userId);
  
  // Get all reviews by this user
  const reviewsQuery = query(
    collection(db, "reviews"),
    where("reviewerId", "==", userId)
  );
  
  const reviewsSnapshot = await getDocs(reviewsQuery);
  const stats = {
    totalReviews: 0,
    totalComments: 0,
    totalPredictions: 0,
    correctPredictions: 0,
    winnersIdentified: 0,
    favoritesPicked: 0,
    considerationsPicked: 0,
    passedPicked: 0,
    ineligiblePicked: 0,
    quarterlyReviews: {},
    reviewsByHour: {},
    reviewsByQuarter: {},
    ratingDistribution: { Favorite: 0, Consideration: 0, Pass: 0, Ineligible: 0 },
    longestStreak: 0,
    currentStreak: 0,
    lastReviewDate: null,
    averageReviewLength: 0,
    accuracyRate: 0,
    changedRatings: 0,
    firstToReview: 0,
    favoriteWinners: 0,
    detailedReviews: 0,
    passWithDetailedComments: 0,
    transportationBusinessReviews: 0,
    communityBusinessReviews: 0,
    lateNightReviews: 0,
    nightReviews: 0,
    weekendReviews: 0,
    earlyReviews: 0,
    longComments: 0,
    exactly50WordComments: 0,
    neighborWordCount: 0,
    asAMomComment: 0,
    christmasReview: 0,
    anniversaryReview: 0,
    fourTwentyReview: 0,
    businessesWithWebsites: 0
  };
  
  // Get all pitches to check for winners
  const pitchesSnapshot = await getDocs(collection(db, "pitches"));
  const winnerPitchIds = new Set();
  pitchesSnapshot.forEach(doc => {
    if (doc.data().isWinner) {
      winnerPitchIds.add(doc.id);
    }
  });
  
  let totalCommentLength = 0;
  const reviewDates = [];
  
  // Process each review
  reviewsSnapshot.forEach(doc => {
    const review = doc.data();
    stats.totalReviews++;
    
    // Calculate quarter
    const reviewDate = review.submittedAt?.toDate ? review.submittedAt.toDate() : new Date(review.submittedAt);
    reviewDates.push(reviewDate);
    
    const quarter = `Q${Math.floor(reviewDate.getMonth() / 3) + 1} ${reviewDate.getFullYear()}`;
    stats.quarterlyReviews[quarter] = (stats.quarterlyReviews[quarter] || 0) + 1;
    stats.reviewsByQuarter[quarter] = (stats.reviewsByQuarter[quarter] || 0) + 1;
    
    // Time of day stats
    const hour = reviewDate.getHours();
    stats.reviewsByHour[hour] = (stats.reviewsByHour[hour] || 0) + 1;
    
    // Rating distribution
    if (review.overallLpRating) {
      stats.ratingDistribution[review.overallLpRating]++;
      
      // Count rating types
      switch(review.overallLpRating) {
        case 'Favorite':
          stats.favoritesPicked++;
          break;
        case 'Consideration':
          stats.considerationsPicked++;
          break;
        case 'Pass':
          stats.passedPicked++;
          break;
        case 'Ineligible':
          stats.ineligiblePicked++;
          break;
      }
      
      // Check accuracy for winners
      if (review.overallLpRating === 'Favorite' || review.overallLpRating === 'Consideration') {
        stats.totalPredictions++;
        
        if (winnerPitchIds.has(review.pitchId)) {
          stats.correctPredictions++;
          stats.winnersIdentified++;
          
          if (review.overallLpRating === 'Favorite') {
            stats.favoriteWinners++;
          }
        }
      }
    }
    
    // Comments
    if (review.lpComments && review.lpComments.trim().length > 0) {
      stats.totalComments++;
      totalCommentLength += review.lpComments.trim().length;
    }
  });
  
  // Calculate averages and rates
  if (stats.totalComments > 0) {
    stats.averageReviewLength = Math.round(totalCommentLength / stats.totalComments);
  }
  
  if (stats.totalPredictions > 0) {
    stats.accuracyRate = Math.round((stats.correctPredictions / stats.totalPredictions) * 100);
  }
  
  // Update last review date
  if (reviewDates.length > 0) {
    reviewDates.sort((a, b) => b - a);
    stats.lastReviewDate = reviewDates[0];
  }
  
  // Update user stats
  await updateDoc(userRef, { stats });
  
  // Check founding member status
  await checkFoundingMember(userId);
  
  // Calculate badges
  const updatedUserDoc = await getDoc(userRef);
  const updatedUserData = updatedUserDoc.data();
  const newBadges = getNewBadges([], updatedUserData.stats, updatedUserData);
  
  if (newBadges.length > 0) {
    await updateDoc(userRef, {
      badges: newBadges
    });
  }
  
  return { stats, badges: newBadges };
};