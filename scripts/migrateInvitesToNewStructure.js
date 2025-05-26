// Migration script to move invite-based user documents to the invites collection
// Run this from the project root: node scripts/migrateInvitesToNewStructure.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCvRb9P3NEiHMEwPsa7YH7XxHOLAqJQgLw",
  authDomain: "gnf-app-9d7e3.firebaseapp.com",
  projectId: "gnf-app-9d7e3",
  storageBucket: "gnf-app-9d7e3.appspot.com",
  messagingSenderId: "470998603569",
  appId: "1:470998603569:web:3c4c88a5d951f49b7cc7f8",
  measurementId: "G-P1N4RC9VJK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateInvites() {
  console.log('Starting migration of invite-based user documents...');
  
  try {
    // Get all user documents
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const docSnap of snapshot.docs) {
      const userData = docSnap.data();
      const docId = docSnap.id;
      
      // Check if this is an invite-based document (has isInvited flag and no uid)
      if (userData.isInvited && !userData.uid && !userData.hasCompletedSignup) {
        console.log(`Migrating invite for ${userData.email} (${docId})...`);
        
        // Create new invite document
        const inviteRef = doc(db, 'invites', docId);
        await setDoc(inviteRef, {
          email: userData.email,
          name: userData.name,
          role: userData.role,
          chapter: userData.chapter,
          anniversary: userData.anniversary,
          inviteCode: docId,
          createdAt: userData.createdAt,
          createdBy: userData.createdBy,
          isActive: true,
          usedBy: null,
          usedAt: null
        });
        
        // Delete the old user document
        await deleteDoc(doc(db, 'users', docId));
        
        console.log(`✓ Migrated ${userData.email}`);
        migratedCount++;
      } else {
        console.log(`Skipping ${docId} - not an unused invite`);
        skippedCount++;
      }
    }
    
    console.log(`\nMigration complete!`);
    console.log(`Migrated: ${migratedCount} invites`);
    console.log(`Skipped: ${skippedCount} documents`);
    
  } catch (error) {
    console.error('Migration error:', error);
  }
  
  process.exit(0);
}

// Run the migration
migrateInvites();