// Cleanup script to remove old invite documents
// Run this to clean up any invite documents that were created with the old structure

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

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

async function cleanupOldInvites() {
  console.log('Checking for old invite documents to clean up...');
  
  try {
    // Get all user documents
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let cleanedCount = 0;
    let keptCount = 0;
    
    for (const docSnap of snapshot.docs) {
      const userData = docSnap.data();
      const docId = docSnap.id;
      
      // Check if this is an old-style invite (8-character ID, has isInvited flag, no uid)
      if (docId.length === 8 && userData.isInvited && !userData.uid && !docId.startsWith('invite_')) {
        console.log(`Found old invite for ${userData.email} (${docId})`);
        
        // Ask for confirmation
        console.log(`This appears to be an old invite document. Delete it? (It should be recreated with 'invite_' prefix)`);
        
        // For safety, just log what would be deleted
        console.log(`Would delete: ${docId} for ${userData.email}`);
        cleanedCount++;
        
        // Uncomment this line to actually delete:
        // await deleteDoc(doc(db, 'users', docId));
      } else {
        keptCount++;
      }
    }
    
    console.log(`\nCleanup summary:`);
    console.log(`Found ${cleanedCount} old invite documents`);
    console.log(`Kept ${keptCount} valid user documents`);
    console.log(`\nTo actually delete the old invites, uncomment the deleteDoc line in the script`);
    
  } catch (error) {
    console.error('Cleanup error:', error);
  }
  
  process.exit(0);
}

// Run the cleanup
cleanupOldInvites();