// Script to assign OG Neighbor and Year Club badges to qualifying LPs
// Run with: node scripts/assignAnniversaryBadges.js

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, getDocs, doc, updateDoc,
  writeBatch 
} from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCL7wTtcIlMmAm8JQB2p4z9wVaCUrm5w1Q",
  authDomain: "gnf-app-9d7e3.firebaseapp.com",
  projectId: "gnf-app-9d7e3",
  storageBucket: "gnf-app-9d7e3.appspot.com",
  messagingSenderId: "431730670558",
  appId: "1:431730670558:web:12c980966bfe5dfb9c7b4f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Anniversary badge definitions
const ANNIVERSARY_BADGES = {
  og_neighbor: {
    id: 'og_neighbor',
    name: '🏛️ OG Neighbor',
    description: 'LP who joined in 2023',
    category: 'general',
    checkFunction: (joinDate) => joinDate.getFullYear() === 2023
  },
  two_year_club: {
    id: 'two_year_club',
    name: '📅 2 Year Club',
    description: 'Active LP for 2 years',
    category: 'general',
    checkFunction: (joinDate) => {
      const yearsSince = (Date.now() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return yearsSince >= 2;
    }
  },
  three_year_club: {
    id: 'three_year_club',
    name: '🎂 3 Year Club',
    description: 'Active LP for 3 years',
    category: 'general',
    checkFunction: (joinDate) => {
      const yearsSince = (Date.now() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return yearsSince >= 3;
    }
  },
  four_year_club: {
    id: 'four_year_club',
    name: '🎊 4 Year Club',
    description: 'Active LP for 4 years',
    category: 'general',
    checkFunction: (joinDate) => {
      const yearsSince = (Date.now() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return yearsSince >= 4;
    }
  },
  five_year_club: {
    id: 'five_year_club',
    name: '🏅 5 Year Club',
    description: 'Active LP for 5 years',
    category: 'general',
    checkFunction: (joinDate) => {
      const yearsSince = (Date.now() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return yearsSince >= 5;
    }
  }
};

async function assignAnniversaryBadges() {
  console.log('🎂 Starting anniversary badge assignment...');
  
  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`Found ${usersSnapshot.size} users to check`);
    
    let processedCount = 0;
    let badgesAddedCount = 0;
    let errorCount = 0;
    
    // Process in batches
    const batch = writeBatch(db);
    let batchCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const currentBadges = userData.badges || [];
        const currentBadgeIds = currentBadges.map(b => b.badgeId || b.id);
        
        // Skip if no anniversary date
        if (!userData.anniversary) {
          console.log(`⏭️  Skipping user ${userDoc.id} - no anniversary date`);
          continue;
        }
        
        // Get join date
        const joinDate = userData.anniversary.toDate ? userData.anniversary.toDate() : new Date(userData.anniversary);
        console.log(`📅 User ${userData.email || userDoc.id} joined on ${joinDate.toLocaleDateString()}`);
        
        // Check which badges they should have
        const newBadges = [];
        
        for (const [badgeId, badge] of Object.entries(ANNIVERSARY_BADGES)) {
          if (!currentBadgeIds.includes(badgeId) && badge.checkFunction(joinDate)) {
            newBadges.push({
              badgeId: badge.id,
              earnedDate: new Date(),
              category: badge.category,
              name: badge.name,
              description: badge.description
            });
            console.log(`  ✅ Qualifying for: ${badge.name}`);
            badgesAddedCount++;
          }
        }
        
        // Update if new badges to add
        if (newBadges.length > 0) {
          batch.update(doc(db, 'users', userDoc.id), {
            badges: [...currentBadges, ...newBadges]
          });
          
          batchCount++;
          console.log(`  🎊 Adding ${newBadges.length} new badge(s) to ${userData.email || userDoc.id}`);
        } else {
          console.log(`  ℹ️  No new anniversary badges for ${userData.email || userDoc.id}`);
        }
        
        // Commit batch every 500 operations
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
        
        processedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing user ${userDoc.id}:`, error);
        errorCount++;
      }
    }
    
    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} updates`);
    }
    
    console.log(`
✨ Anniversary badge assignment complete!
- Users processed: ${processedCount}
- New badges added: ${badgesAddedCount}
- Errors: ${errorCount}
    `);
    
  } catch (error) {
    console.error('Fatal error during badge assignment:', error);
    process.exit(1);
  }
}

// Run immediately
console.log(`
This script will check all users and assign:
- 🏛️ OG Neighbor badge (for 2023 joiners)
- 📅 Year Club badges (2-5 years)

Starting in 3 seconds...
`);

setTimeout(() => {
  assignAnniversaryBadges().then(() => {
    console.log('Process completed successfully!');
    process.exit(0);
  });
}, 3000);