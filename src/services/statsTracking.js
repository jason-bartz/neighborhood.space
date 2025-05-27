// Stats Tracking Service for LP Gamification
import { doc, updateDoc, increment, getDoc, setDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getNewBadges, BADGES } from "../data/badgeDefinitions";

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
        passWithComments: 0,
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

// Track review submission
export const trackReviewSubmission = async (userId, reviewData, pitchData, isEdit = false) => {
  const userRef = doc(db, "users", userId);
  const now = new Date();
  const quarter = getCurrentQuarter();
  const timeOfDay = getTimeOfDay(now);
  const dayOfWeek = getDayOfWeek(now);
  const isWeekend = dayOfWeek === 'sat' || dayOfWeek === 'sun';
  const hour = now.getHours();
  
  // Get current user data
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data();
  const stats = userData.stats || await initializeUserStats(userId);
  
  // Calculate updates
  const updates = {
    [`stats.quarterlyReviews.${quarter}`]: increment(isEdit ? 0 : 1),
    [`stats.reviewsByTimeOfDay.${timeOfDay}`]: increment(isEdit ? 0 : 1),
    [`stats.reviewsByDayOfWeek.${dayOfWeek}`]: increment(isEdit ? 0 : 1),
    [`stats.ratingDistribution.${reviewData.overallLpRating}`]: increment(isEdit ? 0 : 1),
    'stats.lastReviewDate': now
  };
  
  // Track if not an edit
  if (!isEdit) {
    updates['stats.totalReviews'] = increment(1);
    
    // Check if review is within 48 hours of pitch creation
    if (pitchData.createdAt) {
      const pitchDate = pitchData.createdAt.toDate ? pitchData.createdAt.toDate() : new Date(pitchData.createdAt);
      const hoursSincePitch = (now - pitchDate) / (1000 * 60 * 60);
      if (hoursSincePitch <= 48) {
        updates['stats.earlyReviews'] = increment(1);
      }
    }
    
    // Track night reviews
    if (hour >= 22 || hour < 5) {
      updates['stats.nightReviews'] = increment(1);
    }
    
    // Track late night reviews (2-4 AM)
    if (hour >= 2 && hour < 4) {
      updates['stats.lateNightReviews'] = increment(1);
    }
    
    // Track weekend reviews
    if (isWeekend) {
      updates['stats.weekendReviews'] = increment(1);
    }
    
    // Track reviews per day
    const today = now.toDateString();
    const lastReviewDay = stats.lastReviewDay;
    if (lastReviewDay === today) {
      updates['stats.reviewsToday'] = increment(1);
      const newTotal = (stats.reviewsToday || 0) + 1;
      if (newTotal > (stats.maxReviewsInDay || 0)) {
        updates['stats.maxReviewsInDay'] = newTotal;
      }
    } else {
      updates['stats.reviewsToday'] = 1;
      updates['stats.lastReviewDay'] = today;
    }
    
    // Track prediction
    if (reviewData.overallLpRating === 'Favorite' || reviewData.overallLpRating === 'Consideration') {
      updates['stats.totalPredictions'] = increment(1);
      if (reviewData.overallLpRating === 'Favorite') {
        updates['stats.totalFavorites'] = increment(1);
      }
    }
  }
  
  // Track comments
  if (reviewData.lpComments && reviewData.lpComments.trim().length > 0) {
    const comment = reviewData.lpComments.trim();
    updates['stats.totalComments'] = increment(1);
    
    // Track long comments
    if (comment.length > 100) {
      updates['stats.longComments'] = increment(1);
    }
    
    // Track detailed reviews (300+ characters)
    if (comment.length >= 300) {
      updates['stats.detailedReviews'] = increment(1);
    }
    
    // Track exactly 50 word comments
    const wordCount = comment.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount === 50) {
      updates['stats.exactly50WordComments'] = increment(1);
    }
    
    // Track pass with comments
    if (reviewData.overallLpRating === 'Pass') {
      updates['stats.passWithComments'] = increment(1);
      
      // Track pass with detailed comments (50+ characters)
      if (comment.length >= 50) {
        updates['stats.passWithDetailedComments'] = increment(1);
      }
    }
    
    // Track "neighbor" word count
    const neighborCount = (comment.toLowerCase().match(/neighbor/g) || []).length;
    if (neighborCount > 0) {
      updates['stats.neighborWordCount'] = increment(neighborCount);
    }
    
    // Track "as a mom" phrase
    if (comment.toLowerCase().includes('as a mom')) {
      updates['stats.asAMomComment'] = increment(1);
    }
  }
  
  // Track 4:20 review
  if (hour === 16 && now.getMinutes() === 20) {
    updates['stats.fourTwentyReview'] = increment(1);
  }
  
  // Track Christmas review
  if (now.getMonth() === 11 && now.getDate() === 25) {
    updates['stats.christmasReview'] = increment(1);
  }
  
  // Track anniversary review
  if (userData.anniversary) {
    const anniversaryDate = userData.anniversary.toDate ? userData.anniversary.toDate() : new Date(userData.anniversary);
    if (now.getMonth() === anniversaryDate.getMonth() && now.getDate() === anniversaryDate.getDate()) {
      updates['stats.anniversaryReview'] = increment(1);
    }
  }
  
  // Track business with website
  if (pitchData.website && pitchData.website.trim().length > 0) {
    updates['stats.businessesWithWebsites'] = increment(1);
  }
  
  // Track community/event businesses (simple keyword check)
  const businessName = (pitchData.businessName || '').toLowerCase();
  const businessDescription = (pitchData.businessDescription || '').toLowerCase();
  const communityKeywords = ['event', 'community', 'nonprofit', 'charity', 'festival', 'gathering', 'workshop', 'class', 'social'];
  
  if (communityKeywords.some(keyword => businessName.includes(keyword) || businessDescription.includes(keyword))) {
    updates['stats.communityBusinessReviews'] = increment(1);
  }
  
  // Track transportation businesses
  const transportKeywords = ['auto', 'car', 'vehicle', 'transport', 'logistics', 'delivery', 'trucking', 'automotive', 'mechanic', 'dealership', 'ride', 'taxi', 'uber', 'lyft'];
  
  if (transportKeywords.some(keyword => businessName.includes(keyword) || businessDescription.includes(keyword))) {
    updates['stats.transportationBusinessReviews'] = increment(1);
  }
  
  // Apply updates
  await updateDoc(userRef, updates);
  
  // Check for new badges
  const updatedUserDoc = await getDoc(userRef);
  const updatedUserData = updatedUserDoc.data();
  const newBadges = getNewBadges(updatedUserData.badges || [], updatedUserData.stats, updatedUserData);
  
  if (newBadges.length > 0) {
    await updateDoc(userRef, {
      badges: [...(updatedUserData.badges || []), ...newBadges]
    });
    return { newBadges, stats: updatedUserData.stats };
  }
  
  return { newBadges: [], stats: updatedUserData.stats };
};

// Track rating change
export const trackRatingChange = async (userId) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    'stats.changedRatings': increment(1)
  });
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
      
      // First get current stats to update totalPredictions
      const userDoc = await getDoc(userRef);
      const currentStats = userDoc.data()?.stats || {};
      
      const updates = {
        'stats.correctPredictions': increment(1),
        'stats.totalPredictions': increment(1),
        'stats.winnersIdentified': increment(1)
      };
      
      if (review.overallLpRating === 'Favorite') {
        updates['stats.favoriteWinners'] = increment(1);
      }
      
      // Update accuracy rate
      const newCorrectPredictions = (currentStats.correctPredictions || 0) + 1;
      const newTotalPredictions = (currentStats.totalPredictions || 0) + 1;
      updates['stats.accuracyRate'] = Math.round((newCorrectPredictions / newTotalPredictions) * 100);
      
      console.log(`Updating stats for user ${userId}:`, updates);
      await updateDoc(userRef, updates);
      
      // Check for new badges
      const updatedUserDoc = await getDoc(userRef);
      const updatedUserData = updatedUserDoc.data();
      const currentBadges = updatedUserData.badges || [];
      const earnedBadgeIds = currentBadges.map(b => b.badgeId || b.id);
      
      const newBadges = [];
      for (const [badgeId, badge] of Object.entries(BADGES)) {
        if (!earnedBadgeIds.includes(badgeId) && badge.checkFunction(updatedUserData.stats, { badges: currentBadges })) {
          newBadges.push({
            badgeId: badge.id,
            earnedDate: new Date(),
            category: badge.category,
            name: badge.name,
            description: badge.description
          });
        }
      }
      
      if (newBadges.length > 0) {
        await updateDoc(userRef, {
          badges: [...currentBadges, ...newBadges]
        });
        console.log(`User ${userId} earned ${newBadges.length} new badges from winner prediction!`);
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
    where("role", "in", ["lp", "admin", "superAdmin"])
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
      // Add other chapters as needed
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

// Check and update perfect quarters for winner predictions
export const checkPerfectQuarter = async (userId, quarter) => {
  const userRef = doc(db, "users", userId);
  
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
  
  // Check each prediction
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
  
  // If all predictions were correct and there were predictions
  if (allCorrect && totalPredictions > 0) {
    await updateDoc(userRef, {
      'stats.perfectQuarters': increment(1)
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