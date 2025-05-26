// Script to reset all badges except OG Neighbor and Year Club badges
// Run with: node scripts/resetBadges.js

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, getDocs, doc, updateDoc,
  writeBatch 
} from 'firebase/firestore';
import { firebaseConfig } from '../src/firebaseConfig.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Badge IDs to preserve
const PRESERVED_BADGES = [
  'og_neighbor',
  'two_year_club',
  'three_year_club',
  'four_year_club',
  'five_year_club'
];

async function resetBadges() {
  console.log('🚀 Starting badge reset process...');
  
  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`Found ${usersSnapshot.size} users to process`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    // Process in batches to avoid overwhelming Firebase
    const batch = writeBatch(db);
    let batchCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const currentBadges = userData.badges || [];
        
        // Filter to keep only preserved badges
        const preservedBadges = currentBadges.filter(badge => 
          PRESERVED_BADGES.includes(badge.badgeId || badge.id)
        );
        
        // Check if user should have OG Neighbor badge
        if (userData.anniversary && !preservedBadges.some(b => (b.badgeId || b.id) === 'og_neighbor')) {
          const joinDate = userData.anniversary.toDate ? userData.anniversary.toDate() : new Date(userData.anniversary);
          if (joinDate.getFullYear() === 2023) {
            preservedBadges.push({
              badgeId: 'og_neighbor',
              earnedDate: new Date(),
              category: 'general',
              name: '🏛️ OG Neighbor',
              description: 'LP who joined in 2023'
            });
          }
        }
        
        // Check for year club badges
        if (userData.anniversary) {
          const joinDate = userData.anniversary.toDate ? userData.anniversary.toDate() : new Date(userData.anniversary);
          const yearsSince = (Date.now() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          
          const yearClubBadges = [
            { years: 2, id: 'two_year_club', name: '📅 2 Year Club' },
            { years: 3, id: 'three_year_club', name: '🎂 3 Year Club' },
            { years: 4, id: 'four_year_club', name: '🎊 4 Year Club' },
            { years: 5, id: 'five_year_club', name: '🏅 5 Year Club' }
          ];
          
          yearClubBadges.forEach(({ years, id, name }) => {
            if (yearsSince >= years && !preservedBadges.some(b => (b.badgeId || b.id) === id)) {
              preservedBadges.push({
                badgeId: id,
                earnedDate: new Date(),
                category: 'general',
                name: name,
                description: `Active LP for ${years} years`
              });
            }
          });
        }
        
        // Update user's badges
        batch.update(doc(db, 'users', userDoc.id), {
          badges: preservedBadges
        });
        
        batchCount++;
        
        // Commit batch every 500 operations
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
        
        processedCount++;
        
        console.log(`✅ Processed user ${userDoc.id}: ${currentBadges.length} → ${preservedBadges.length} badges`);
        
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
✨ Badge reset complete!
- Users processed: ${processedCount}
- Errors: ${errorCount}
- Preserved badges: OG Neighbor, Year Club badges
    `);
    
  } catch (error) {
    console.error('Fatal error during badge reset:', error);
    process.exit(1);
  }
}

// Add confirmation prompt
console.log(`
⚠️  WARNING: This will reset all badges except OG Neighbor and Year Club badges!
⚠️  Users will need to re-earn their badges based on existing stats.

Type 'yes' to continue or anything else to cancel:
`);

// For safety, require manual confirmation
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Continue? ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    resetBadges().then(() => {
      console.log('Process completed');
      process.exit(0);
    });
  } else {
    console.log('Cancelled');
    process.exit(0);
  }
  readline.close();
});