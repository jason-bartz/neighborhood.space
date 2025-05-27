// Badge Definitions for LP Gamification System

export const BADGE_CATEGORIES = {
  MILESTONES: 'milestones',
  ENGAGEMENT: 'engagement',
  ACCURACY: 'accuracy',
  TIMING: 'timing',
  PATTERNS: 'patterns',
  GENERAL: 'general',
  ELITE: 'elite',
  STREAK: 'streak',
  EASTER_EGG: 'easter_egg'
};

export const BADGES = {
  // 📊 Review Milestones
  first_review: {
    id: 'first_review',
    category: BADGE_CATEGORIES.MILESTONES,
    name: '👼 First Review',
    description: 'Complete your first pitch review',
    checkFunction: (stats) => stats?.totalReviews >= 1,
    progress: (stats) => Math.min(stats?.totalReviews || 0, 1)
  },
  welcome_neighborhood: {
    id: 'welcome_neighborhood',
    category: BADGE_CATEGORIES.MILESTONES,
    name: '🏘️ New Kid on the Block',
    description: 'Review 10 applications',
    checkFunction: (stats) => stats?.totalReviews >= 10,
    progress: (stats) => Math.min((stats?.totalReviews || 0) / 10, 1)
  },
  block_captain: {
    id: 'block_captain',
    category: BADGE_CATEGORIES.MILESTONES,
    name: '🔍 Neighborhood Watch',
    description: 'Review 25 applications',
    checkFunction: (stats) => stats?.totalReviews >= 25,
    progress: (stats) => Math.min((stats?.totalReviews || 0) / 25, 1)
  },
  super_reviewer: {
    id: 'super_reviewer',
    category: BADGE_CATEGORIES.MILESTONES,
    name: '⭐ Power User',
    description: 'Review 50 applications',
    checkFunction: (stats) => stats?.totalReviews >= 50,
    progress: (stats) => Math.min((stats?.totalReviews || 0) / 50, 1)
  },
  review_champion: {
    id: 'review_champion',
    category: BADGE_CATEGORIES.MILESTONES,
    name: '🏆 Elite Yelper',
    description: 'Review 75 applications',
    checkFunction: (stats) => stats?.totalReviews >= 75,
    progress: (stats) => Math.min((stats?.totalReviews || 0) / 75, 1)
  },
  going_platinum: {
    id: 'going_platinum',
    category: BADGE_CATEGORIES.MILESTONES,
    name: '💿 Platinum Status',
    description: 'Review 100 applications',
    checkFunction: (stats) => stats?.totalReviews >= 100,
    progress: (stats) => Math.min((stats?.totalReviews || 0) / 100, 1)
  },
  review_legend: {
    id: 'review_legend',
    category: BADGE_CATEGORIES.MILESTONES,
    name: '👑 Review Legend',
    description: 'Review 200 applications',
    checkFunction: (stats) => stats?.totalReviews >= 200,
    progress: (stats) => Math.min((stats?.totalReviews || 0) / 200, 1)
  },

  // 💬 Engagement Achievements
  away_message: {
    id: 'away_message',
    category: BADGE_CATEGORIES.ENGAGEMENT,
    name: '💭 Away Message',
    description: 'Leave your first comment',
    checkFunction: (stats) => stats?.totalComments >= 1,
    progress: (stats) => Math.min(stats?.totalComments || 0, 1)
  },
  aim_buddy: {
    id: 'aim_buddy',
    category: BADGE_CATEGORIES.ENGAGEMENT,
    name: '💬 AIM Buddy',
    description: 'Add comments to 10 reviews',
    checkFunction: (stats) => stats?.totalComments >= 10,
    progress: (stats) => Math.min((stats?.totalComments || 0) / 10, 1)
  },
  feedback_guru: {
    id: 'feedback_guru',
    category: BADGE_CATEGORIES.ENGAGEMENT,
    name: '📝 LiveJournal Addict',
    description: 'Add comments to 25 reviews',
    checkFunction: (stats) => stats?.totalComments >= 25,
    progress: (stats) => Math.min((stats?.totalComments || 0) / 25, 1)
  },
  comment_champion: {
    id: 'comment_champion',
    category: BADGE_CATEGORIES.ENGAGEMENT,
    name: '🧑‍💻 Keyboard Warrior',
    description: 'Add comments to 50 reviews',
    checkFunction: (stats) => stats?.totalComments >= 50,
    progress: (stats) => Math.min((stats?.totalComments || 0) / 50, 1)
  },
  t9_master: {
    id: 't9_master',
    category: BADGE_CATEGORIES.ENGAGEMENT,
    name: '📱 T9 Master',
    description: 'Write 5 comments over 100 characters',
    checkFunction: (stats) => stats?.longComments >= 5,
    progress: (stats) => Math.min((stats?.longComments || 0) / 5, 1)
  },

  // 🎯 Accuracy & Success
  eye_for_talent: {
    id: 'eye_for_talent',
    category: BADGE_CATEGORIES.ACCURACY,
    name: '👁️ Angel Eye',
    description: 'Correctly identify your first winner',
    checkFunction: (stats) => stats?.correctPredictions >= 1,
    progress: (stats) => Math.min(stats?.correctPredictions || 0, 1)
  },
  talent_scout: {
    id: 'talent_scout',
    category: BADGE_CATEGORIES.ACCURACY,
    name: '🔎 Talent Scout',
    description: 'Correctly identify 5 winners',
    checkFunction: (stats) => stats?.correctPredictions >= 5,
    progress: (stats) => Math.min((stats?.correctPredictions || 0) / 5, 1)
  },
  winner_whisperer: {
    id: 'winner_whisperer',
    category: BADGE_CATEGORIES.ACCURACY,
    name: '🔮 Oracle',
    description: 'Correctly identify 20 winners',
    checkFunction: (stats) => stats?.correctPredictions >= 20,
    progress: (stats) => Math.min((stats?.correctPredictions || 0) / 20, 1)
  },
  miss_cleo: {
    id: 'miss_cleo',
    category: BADGE_CATEGORIES.ACCURACY,
    name: '🃏 Miss Cleo',
    description: 'Achieve 80%+ accuracy score',
    checkFunction: (stats) => {
      const accuracy = stats?.totalPredictions > 0 
        ? (stats?.correctPredictions / stats?.totalPredictions) * 100 
        : 0;
      return accuracy >= 80 && stats?.totalPredictions >= 5;
    },
    progress: (stats) => {
      const accuracy = stats?.totalPredictions > 0 
        ? (stats?.correctPredictions / stats?.totalPredictions) * 100 
        : 0;
      return Math.min(accuracy / 80, 1);
    }
  },
  perfect_quarter: {
    id: 'perfect_quarter',
    category: BADGE_CATEGORIES.ACCURACY,
    name: '💛 Midas Touch',
    description: 'Correctly predict all winners in a quarter',
    checkFunction: (stats) => stats?.perfectQuarters >= 1,
    progress: (stats) => Math.min(stats?.perfectQuarters || 0, 1)
  },

  // ⏰ Consistency & Timing
  early_bird: {
    id: 'early_bird',
    category: BADGE_CATEGORIES.TIMING,
    name: '🏄‍♀️ First!',
    description: 'Review applications within 48 hours of release',
    checkFunction: (stats) => stats?.earlyReviews >= 1,
    progress: (stats) => Math.min(stats?.earlyReviews || 0, 1)
  },
  night_owl: {
    id: 'night_owl',
    category: BADGE_CATEGORIES.TIMING,
    name: '🦉 3AM Grinder',
    description: 'Submit reviews after 10 PM (5 times)',
    checkFunction: (stats) => stats?.nightReviews >= 5,
    progress: (stats) => Math.min((stats?.nightReviews || 0) / 5, 1)
  },
  lan_party_regular: {
    id: 'lan_party_regular',
    category: BADGE_CATEGORIES.TIMING,
    name: '💻 Weekend Warrior',
    description: 'Review applications on weekends (10 times)',
    checkFunction: (stats) => stats?.weekendReviews >= 10,
    progress: (stats) => Math.min((stats?.weekendReviews || 0) / 10, 1)
  },
  quarterly_regular: {
    id: 'quarterly_regular',
    category: BADGE_CATEGORIES.TIMING,
    name: '📅 Four Seasons',
    description: 'Review in all 4 quarters of a year',
    checkFunction: (stats) => {
      const currentYear = new Date().getFullYear();
      const quartersReviewed = Object.keys(stats?.quarterlyReviews || {})
        .filter(q => q.includes(currentYear))
        .length;
      return quartersReviewed >= 4;
    },
    progress: (stats) => {
      const currentYear = new Date().getFullYear();
      const quartersReviewed = Object.keys(stats?.quarterlyReviews || {})
        .filter(q => q.includes(currentYear))
        .length;
      return Math.min(quartersReviewed / 4, 1);
    }
  },
  dsl_speed: {
    id: 'dsl_speed',
    category: BADGE_CATEGORIES.TIMING,
    name: '⚡ Cable Modem',
    description: 'Complete 5 reviews in one day',
    checkFunction: (stats) => stats?.maxReviewsInDay >= 5,
    progress: (stats) => Math.min((stats?.maxReviewsInDay || 0) / 5, 1)
  },
  top_8_material: {
    id: 'top_8_material',
    category: BADGE_CATEGORIES.TIMING,
    name: '🔥 Hot Streak',
    description: 'Review every week for a month',
    checkFunction: (stats) => stats?.longestWeeklyStreak >= 4,
    progress: (stats) => Math.min((stats?.longestWeeklyStreak || 0) / 4, 1)
  },

  // 🌟 Rating Patterns
  myspace_top_8: {
    id: 'myspace_top_8',
    category: BADGE_CATEGORIES.PATTERNS,
    name: '⭐ MySpace Top 8',
    description: 'Give 8 "Favorite" ratings',
    checkFunction: (stats) => (stats?.ratingDistribution?.Favorite || 0) >= 8,
    progress: (stats) => Math.min((stats?.ratingDistribution?.Favorite || 0) / 8, 1)
  },
  consideration_expert: {
    id: 'consideration_expert',
    category: BADGE_CATEGORIES.PATTERNS,
    name: '💡 V Considerate',
    description: 'Give 15 "Consideration" ratings',
    checkFunction: (stats) => (stats?.ratingDistribution?.Consideration || 0) >= 15,
    progress: (stats) => Math.min((stats?.ratingDistribution?.Consideration || 0) / 15, 1)
  },
  tough_love: {
    id: 'tough_love',
    category: BADGE_CATEGORIES.PATTERNS,
    name: '😢 Tough Love',
    description: 'Give 10 "Pass" ratings with comments over 50 characters',
    checkFunction: (stats) => stats?.passWithDetailedComments >= 10,
    progress: (stats) => Math.min((stats?.passWithDetailedComments || 0) / 10, 1)
  },
  wild_card: {
    id: 'wild_card',
    category: BADGE_CATEGORIES.PATTERNS,
    name: '🎲 Pivot Master',
    description: 'Change your rating on a re-review (3 times)',
    checkFunction: (stats) => stats?.changedRatings >= 3,
    progress: (stats) => Math.min((stats?.changedRatings || 0) / 3, 1)
  },

  // 🏘️ Community & Leadership
  neighborhood_watch: {
    id: 'neighborhood_watch',
    category: BADGE_CATEGORIES.GENERAL,
    name: '🏅 Chapter MVP',
    description: 'Most reviews in your chapter this quarter',
    checkFunction: (stats, userData) => userData?.isChapterLeaderThisQuarter,
    progress: () => 0 // Binary achievement
  },
  og_neighbor: {
    id: 'og_neighbor',
    category: BADGE_CATEGORIES.GENERAL,
    name: '🏛️ OG Neighbor',
    description: 'LP who joined in 2023',
    checkFunction: (stats, userData) => {
      if (!userData?.anniversary) return false;
      const joinDate = userData.anniversary.toDate ? userData.anniversary.toDate() : new Date(userData.anniversary);
      return joinDate.getFullYear() === 2023;
    },
    progress: () => 1 // Always complete if earned
  },
  two_year_club: {
    id: 'two_year_club',
    category: BADGE_CATEGORIES.GENERAL,
    name: '📅 2 Year Club',
    description: 'Active LP for 2 years',
    checkFunction: (stats, userData) => {
      if (!userData?.anniversary) return false;
      const joinDate = userData.anniversary.toDate ? userData.anniversary.toDate() : new Date(userData.anniversary);
      const yearsSince = (Date.now() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return yearsSince >= 2;
    },
    progress: () => 1
  },
  three_year_club: {
    id: 'three_year_club',
    category: BADGE_CATEGORIES.GENERAL,
    name: '🎂 3 Year Club',
    description: 'Active LP for 3 years',
    checkFunction: (stats, userData) => {
      if (!userData?.anniversary) return false;
      const joinDate = userData.anniversary.toDate ? userData.anniversary.toDate() : new Date(userData.anniversary);
      const yearsSince = (Date.now() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return yearsSince >= 3;
    },
    progress: () => 1
  },
  four_year_club: {
    id: 'four_year_club',
    category: BADGE_CATEGORIES.GENERAL,
    name: '🎊 4 Year Club',
    description: 'Active LP for 4 years',
    checkFunction: (stats, userData) => {
      if (!userData?.anniversary) return false;
      const joinDate = userData.anniversary.toDate ? userData.anniversary.toDate() : new Date(userData.anniversary);
      const yearsSince = (Date.now() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return yearsSince >= 4;
    },
    progress: () => 1
  },
  five_year_club: {
    id: 'five_year_club',
    category: BADGE_CATEGORIES.GENERAL,
    name: '🏅 5 Year Club',
    description: 'Active LP for 5 years',
    checkFunction: (stats, userData) => {
      if (!userData?.anniversary) return false;
      const joinDate = userData.anniversary.toDate ? userData.anniversary.toDate() : new Date(userData.anniversary);
      const yearsSince = (Date.now() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return yearsSince >= 5;
    },
    progress: () => 1
  },
  mentor: {
    id: 'mentor',
    category: BADGE_CATEGORIES.GENERAL,
    name: '👑 Kingmaker',
    description: 'Your favorites have 75%+ success rate (minimum 8 favorites)',
    checkFunction: (stats) => {
      const favoriteSuccessRate = stats?.favoriteWinners > 0 && stats?.totalFavorites > 0
        ? (stats?.favoriteWinners / stats?.totalFavorites) * 100
        : 0;
      return favoriteSuccessRate >= 75 && stats?.totalFavorites >= 8;
    },
    progress: (stats) => {
      const favoriteSuccessRate = stats?.favoriteWinners > 0 && stats?.totalFavorites > 0
        ? (stats?.favoriteWinners / stats?.totalFavorites) * 100
        : 0;
      return Math.min(favoriteSuccessRate / 75, 1);
    }
  },
  good_neighbor: {
    id: 'good_neighbor',
    category: BADGE_CATEGORIES.GENERAL,
    name: '🎓 Perfect Attendance',
    description: '100% review completion rate for a quarter',
    checkFunction: (stats) => stats?.perfectQuarterCompletion >= 1,
    progress: (stats) => Math.min(stats?.perfectQuarterCompletion || 0, 1)
  },
  neighborhood_mayor: {
    id: 'neighborhood_mayor',
    category: BADGE_CATEGORIES.GENERAL,
    name: '🏠 Neighborhood Mayor',
    description: 'Top 3 reviewers in chapter for 2 quarters',
    checkFunction: (stats) => stats?.quarterlyTop3 >= 2,
    progress: (stats) => Math.min((stats?.quarterlyTop3 || 0) / 2, 1)
  },

  // 🏆 Elite Tiers
  bronze_lp: {
    id: 'bronze_lp',
    category: BADGE_CATEGORIES.ELITE,
    name: '🥉 Bronze LP',
    description: 'Unlock 10 achievements',
    checkFunction: (stats, userData) => (userData?.badges?.length || 0) >= 10,
    progress: (stats, userData) => Math.min((userData?.badges?.length || 0) / 10, 1)
  },
  silver_lp: {
    id: 'silver_lp',
    category: BADGE_CATEGORIES.ELITE,
    name: '🥈 Power User',
    description: 'Unlock 20 achievements',
    checkFunction: (stats, userData) => (userData?.badges?.length || 0) >= 20,
    progress: (stats, userData) => Math.min((userData?.badges?.length || 0) / 20, 1)
  },
  gold_lp: {
    id: 'gold_lp',
    category: BADGE_CATEGORIES.ELITE,
    name: '🥇 Gold LP',
    description: 'Unlock 30 achievements',
    checkFunction: (stats, userData) => (userData?.badges?.length || 0) >= 30,
    progress: (stats, userData) => Math.min((userData?.badges?.length || 0) / 30, 1)
  },
  diamond_lp: {
    id: 'diamond_lp',
    category: BADGE_CATEGORIES.ELITE,
    name: '💎 Diamond LP',
    description: 'Unlock 50 achievements',
    checkFunction: (stats, userData) => (userData?.badges?.length || 0) >= 50,
    progress: (stats, userData) => Math.min((userData?.badges?.length || 0) / 50, 1)
  },

  // 📈 Streak Achievements
  always_online: {
    id: 'always_online',
    category: BADGE_CATEGORIES.STREAK,
    name: '📊 Always Online',
    description: 'Never miss a review cycle for 1 year',
    checkFunction: (stats) => stats?.yearLongStreak >= 1,
    progress: (stats) => Math.min(stats?.yearLongStreak || 0, 1)
  },

  // 🎮 Easter Egg Achievements
  pc_load_letter: {
    id: 'pc_load_letter',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '🖨️ PC Load Letter',
    description: 'Submit exactly 50 word comments 5 times',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.exactly50WordComments >= 5,
    progress: (stats) => Math.min((stats?.exactly50WordComments || 0) / 5, 1)
  },
  directors_cut: {
    id: 'directors_cut',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '🎬 Save As... Final_FINAL_v2',
    description: 'Edit a review 3+ times for perfection',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.maxReviewEdits >= 3,
    progress: (stats) => Math.min((stats?.maxReviewEdits || 0) / 3, 1)
  },
  youve_got_mail: {
    id: 'youve_got_mail',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '💌 You\'ve Got Mail',
    description: 'First to review when new batch drops',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.firstToReview >= 1,
    progress: (stats) => Math.min(stats?.firstToReview || 0, 1)
  },
  completionist: {
    id: 'completionist',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '💯 100% Run',
    description: 'Review every single application in your chapter',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.quarterCompletionRate >= 100,
    progress: (stats) => Math.min((stats?.quarterCompletionRate || 0) / 100, 1)
  },
  geocities_architect: {
    id: 'geocities_architect',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '🏗️ Webmaster',
    description: 'Review 10 businesses with websites',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.businessesWithWebsites >= 10,
    progress: (stats) => Math.min((stats?.businessesWithWebsites || 0) / 10, 1)
  },
  napster_ninja: {
    id: 'napster_ninja',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '🎵 Winamp Warrior',
    description: 'Submit 5 reviews between 2-4 AM (peak coding hours)',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.lateNightReviews >= 5,
    progress: (stats) => Math.min((stats?.lateNightReviews || 0) / 5, 1)
  },
  block_party_planner: {
    id: 'block_party_planner',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '🎉 Block Party Planner',
    description: 'Review 5 event or community-focused businesses',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.communityBusinessReviews >= 5,
    progress: (stats) => Math.min((stats?.communityBusinessReviews || 0) / 5, 1)
  },
  kazaa_kid: {
    id: 'kazaa_kid',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '💿 You Wouldn\'t Download a Car',
    description: 'Review 5 businesses in the automotive or transportation industry',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.transportationBusinessReviews >= 5,
    progress: (stats) => Math.min((stats?.transportationBusinessReviews || 0) / 5, 1)
  },
  limewire_legend: {
    id: 'limewire_legend',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '🍁 420 Blaze It',
    description: 'Submit a review at exactly 4:20',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.fourTwentyReview >= 1,
    progress: (stats) => Math.min(stats?.fourTwentyReview || 0, 1)
  },
  aol_keyword_neighbor: {
    id: 'aol_keyword_neighbor',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '🔑 Keyword Champion',
    description: 'Use the word "neighbor" in 10 comments',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.neighborWordCount >= 10,
    progress: (stats) => Math.min((stats?.neighborWordCount || 0) / 10, 1)
  },
  winamp_whipper: {
    id: 'winamp_whipper',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '🦙 It Really Whips',
    description: 'Really whips the llama\'s butt (100+ reviews)',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.totalReviews >= 100,
    progress: (stats) => Math.min((stats?.totalReviews || 0) / 100, 1)
  },
  friendster_founder: {
    id: 'friendster_founder',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '👥 Nostradamus',
    description: 'Have all your favorites become winners',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.favoriteWinners >= 5 && stats?.favoriteWinners === stats?.favoritesPicked,
    progress: (stats) => {
      if (stats?.favoritesPicked === 0) return 0;
      return Math.min((stats?.favoriteWinners || 0) / (stats?.favoritesPicked || 1), 1);
    }
  },
  ask_jeeves_answer: {
    id: 'ask_jeeves_answer',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '🎩 Google Before Google',
    description: 'Submit 10 detailed reviews (300+ characters)',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.detailedReviews >= 10,
    progress: (stats) => Math.min((stats?.detailedReviews || 0) / 10, 1)
  },

  // New Milestones
  god_mode: {
    id: 'god_mode',
    category: BADGE_CATEGORIES.MILESTONES,
    name: '⚡️ GodMode.exe',
    description: 'Review 500 applications',
    checkFunction: (stats) => stats?.totalReviews >= 500,
    progress: (stats) => Math.min((stats?.totalReviews || 0) / 500, 1)
  },

  // New Rating Patterns
  back_to_next_bus: {
    id: 'back_to_next_bus',
    category: BADGE_CATEGORIES.PATTERNS,
    name: '❌ Back to the NEXT bus',
    description: 'Give 20 "Ineligible" ratings',
    checkFunction: (stats) => (stats?.ratingDistribution?.Ineligible || 0) >= 20,
    progress: (stats) => Math.min((stats?.ratingDistribution?.Ineligible || 0) / 20, 1)
  },
  weakest_link: {
    id: 'weakest_link',
    category: BADGE_CATEGORIES.PATTERNS,
    name: '⛓️‍💥 You Are the Weakest Link',
    description: 'Give 50 "Ineligible" ratings',
    checkFunction: (stats) => (stats?.ratingDistribution?.Ineligible || 0) >= 50,
    progress: (stats) => Math.min((stats?.ratingDistribution?.Ineligible || 0) / 50, 1)
  },
  accept_this_rose: {
    id: 'accept_this_rose',
    category: BADGE_CATEGORIES.PATTERNS,
    name: '🌹 Will You Accept this Rose?',
    description: 'Give 25 "Favorite" ratings',
    checkFunction: (stats) => (stats?.ratingDistribution?.Favorite || 0) >= 25,
    progress: (stats) => Math.min((stats?.ratingDistribution?.Favorite || 0) / 25, 1)
  },
  you_me_everyone: {
    id: 'you_me_everyone',
    category: BADGE_CATEGORIES.PATTERNS,
    name: '😘 You Me and Everyone We Know',
    description: 'Give 30 "Consideration" ratings',
    checkFunction: (stats) => (stats?.ratingDistribution?.Consideration || 0) >= 30,
    progress: (stats) => Math.min((stats?.ratingDistribution?.Consideration || 0) / 30, 1)
  },

  // New Engagement Achievement
  grade_a_yapper: {
    id: 'grade_a_yapper',
    category: BADGE_CATEGORIES.ENGAGEMENT,
    name: '🗣️ Grade A Yapper',
    description: 'Add comments to 100 reviews',
    checkFunction: (stats) => stats?.totalComments >= 100,
    progress: (stats) => Math.min((stats?.totalComments || 0) / 100, 1)
  },

  // New Easter Egg Achievements
  merry_xmas: {
    id: 'merry_xmas',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '🎅 Merry X-Mas You Filthy Animal',
    description: 'Review an application on Christmas Day',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.christmasReview >= 1,
    progress: (stats) => Math.min(stats?.christmasReview || 0, 1)
  },
  serendipitous: {
    id: 'serendipitous',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '✨ Serendipitous',
    description: 'Review an application on your anniversary date',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.anniversaryReview >= 1,
    progress: (stats) => Math.min(stats?.anniversaryReview || 0, 1)
  },
  cool_mom: {
    id: 'cool_mom',
    category: BADGE_CATEGORIES.EASTER_EGG,
    name: '💁‍♀️ I\'m not a regular mom, I\'m a cool mom',
    description: 'Include the phrase "as a mom" in a comment',
    hiddenDescription: '???',
    hidden: true,
    checkFunction: (stats) => stats?.asAMomComment >= 1,
    progress: (stats) => Math.min(stats?.asAMomComment || 0, 1)
  }
};

// Helper functions for badge checking
export const checkBadgeEligibility = (badgeId, stats, userData) => {
  const badge = BADGES[badgeId];
  if (!badge) return false;
  return badge.checkFunction(stats, userData);
};

export const getBadgeProgress = (badgeId, stats, userData) => {
  const badge = BADGES[badgeId];
  if (!badge) return 0;
  return badge.progress(stats, userData);
};

export const getNewBadges = (previousBadges, stats, userData) => {
  const previousBadgeIds = previousBadges.map(b => b.badgeId);
  const newBadges = [];
  
  Object.values(BADGES).forEach(badge => {
    if (!previousBadgeIds.includes(badge.id) && checkBadgeEligibility(badge.id, stats, userData)) {
      newBadges.push({
        badgeId: badge.id,
        earnedDate: new Date(),
        category: badge.category,
        name: badge.name,
        description: badge.description
      });
    }
  });
  
  return newBadges;
};

export const getBadgesByCategory = (category) => {
  return Object.values(BADGES).filter(badge => badge.category === category);
};

export const getAllBadges = () => {
  return Object.values(BADGES);
};