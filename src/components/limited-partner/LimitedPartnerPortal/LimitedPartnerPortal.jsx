// LimitedPartnerPortal.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"; 
import {
  collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc,
  orderBy, addDoc, getDoc, Timestamp
} from "firebase/firestore";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, 
  GoogleAuthProvider, signOut, sendPasswordResetEmail, updatePassword, fetchSignInMethodsForEmail
} from "firebase/auth";
import { db, auth, storage } from "../../../firebaseConfig.js";  
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Confetti from "react-confetti";
import StatsBar from "../../StatsBar";
import { BadgeNotification, TrophyCase } from "../../BadgeDisplay";
import { 
  trackReviewSubmission, 
  trackRatingChange, 
  initializeUserStats,
  calculateRetroactiveStats,
  updateWinnerPredictions
} from "../../../services/statsTracking";

// --- Constants ---
const provider = new GoogleAuthProvider();
const ratingEmojis = { Favorite: "⭐", Consideration: "💡", Pass: "❌", Ineligible: "🚫" };
const VALID_ROLES = ['lp', 'admin', 'superAdmin'];
const APP_NAME = "Neighborhood OS"; 


// --- Helper Functions for Alerts/Confirmations ---
const showAppAlert = (message) => {
  alert(message); 
};

const showAppConfirm = (message) => {
  return window.confirm(message); 
};


// --- Helper Components ---
function AuthInput({ type = "text", placeholder, value, onChange, required, minLength }) {
  const autoCompleteType = type === 'email' ? 'email' : type === 'password' ? (placeholder.toLowerCase().includes('new') ? 'new-password' : 'current-password') : 'off';
  return (
     <input type={type} placeholder={placeholder} value={value} onChange={onChange} required={required} minLength={minLength} style={{ display: 'block', width: 'calc(100% - 20px)', padding: '10px', margin: '10px auto', border: '1px solid #7d7d7d', borderRadius: '0', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit', fontSize: '1em' }} autoComplete={autoCompleteType} />
  );
}

function RetroButton({ onClick, children, style = {}, primary = false, disabled = false, type = "button", title = "" }) { // Added title prop
  const baseStyle = {
    padding: primary ? "10px 25px" : "8px 15px",
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: primary ? "#FFD6EC" : "#E0E0E0",
    color: disabled ? '#888' : "black",
    border: disabled ? '2px inset #aaa' : '2px outset #aaa',
    borderRadius: '0',
    fontSize: '1em', 
    fontWeight: 'bold',
    fontFamily: 'inherit',
    boxShadow: disabled ? 'none' : '1px 1px 1px #555',
    opacity: disabled ? 0.6 : 1,
    margin: '5px',
    display: 'inline-flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '4px' 
  };
  
  return <button type={type} onClick={onClick} style={{ ...baseStyle, ...style }} disabled={disabled} title={title}>{children}</button>; // Added title attribute
}


// --- Main Component ---
export default function LimitedPartnerPortal({ onOpenGNFWebsite, isStandalone = false }) {

// --- State Variables ---
const [user, setUser] = useState(null);
const [isLoadingAuth, setIsLoadingAuth] = useState(true);
const [authMode, setAuthMode] = useState("login"); // "login" or "signup"
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [authError, setAuthError] = useState("");
const [activeTab, setActiveTab] = useState("reviewPitches"); // Default tab
const [activeAdminTab, setActiveAdminTab] = useState("pitchesAndReviews");
const [showConfetti, setShowConfetti] = useState(false);
const [expandedPitchId, setExpandedPitchId] = useState(null);
const [lpPitches, setLpPitches] = useState([]);
const [selectedPitch, setSelectedPitch] = useState(null);
const [reviews, setReviews] = useState({}); // State for user's reviews { pitchId: reviewData }
const [reviewFormData, setReviewFormData] = useState({});
const [hidePassedReviews, setHidePassedReviews] = useState(false);
const [reviewSearchTerm, setReviewSearchTerm] = useState("");
const [reviewFilter, setReviewFilter] = useState("all");
const [reviewChapterFilter, setReviewChapterFilter] = useState(""); // State for review pitches chapter filter
const [reviewQuarterFilter, setReviewQuarterFilter] = useState(""); // New state for review pitches quarter filter
const [adminPitches, setAdminPitches] = useState([]);
const [users, setUsers] = useState([]);
const [allReviewsData, setAllReviewsData] = useState([]); // State for ALL reviews [{...reviewData}]
const [adminChapterFilter, setAdminChapterFilter] = useState("");
const [adminQuarterFilter, setAdminQuarterFilter] = useState("");
const [adminSearch, setAdminSearch] = useState("");
const [adminHidePassed, setAdminHidePassed] = useState(false); // State for admin hide passed filter
const [adminFavoriteFilterMode, setAdminFavoriteFilterMode] = useState("all");
const [aboutById, setAboutById] = useState({});
const [latById, setLatById] = useState({});
const [lngById, setLngById] = useState({});
const [websiteById, setWebsiteById] = useState({});
const [winnerChapterFilter, setWinnerChapterFilter] = useState("");
const [photosById, setPhotosById] = useState({});
const [winnerSearchTerm, setWinnerSearchTerm] = useState("");
const [pendingChanges, setPendingChanges] = useState({});

// Gamification state
const [userStats, setUserStats] = useState(null);
const [userBadges, setUserBadges] = useState([]);
const [showBadgeNotification, setShowBadgeNotification] = useState(null);
const [statsInitialized, setStatsInitialized] = useState(false);

// User creation state
const [newUserData, setNewUserData] = useState({
  uid: '',
  email: '',
  name: '',
  role: 'lp',
  chapter: '',
  anniversary: new Date().toISOString().split('T')[0]
});


// --- Refs ---
const listScrollRef = useRef(null); // Ref for the scrollable list container
const [listScrollPosition, setListScrollPosition] = useState(0); // Store scroll position

// --- Derived State (Roles) ---
const isSuperAdmin = user?.role === "superAdmin";
const isAdmin = user?.role === "admin" || isSuperAdmin;
const userChapter = user?.chapter;

// --- Helper Function: Calculate Quarter ---
const getQuarterFromDate = (dateValue) => {
    try {
        let date;
        if (typeof dateValue?.toDate === 'function') {
            date = dateValue.toDate();
        } else if (dateValue instanceof Date) {
            date = dateValue;
        } else {
            date = new Date(dateValue);
        }
        if (date instanceof Date && !isNaN(date)) {
            return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
        }
    } catch (e) { /* ignore errors */ }
    return "Invalid Quarter";
};


// --- Effects ---

// Effect 1: Authentication Listener
useEffect(() => {
  setIsLoadingAuth(true);
  console.log("LPPortal: Setting up auth listener...");
  const unsubscribe = onAuthStateChanged(auth, async (authUserData) => {
    console.log("LPPortal: Auth state changed. User:", authUserData?.uid);
    if (authUserData) {
      try {
        const userDocRef = doc(db, "users", authUserData.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.role && VALID_ROLES.includes(userData.role)) {
            console.log("LPPortal: User document found, role valid.", userData.role);
            setUser({ uid: authUserData.uid, email: authUserData.email, ...userData });
            setAuthError("");
            
            // Initialize stats and badges
            setUserStats(userData.stats || {
              totalReviews: 0,
              quarterReviews: 0,
              favoritesPicked: 0,
              considerationsPicked: 0,
              passedPicked: 0,
              ineligiblePicked: 0,
              reviewsByQuarter: {},
              reviewsByHour: {},
              longestStreak: 0,
              currentStreak: 0,
              lastReviewDate: null,
              averageReviewLength: 0,
              totalComments: 0,
              winnersIdentified: 0,
              accuracyRate: 0
            });
            const userBadgesData = userData.badges || [];
            console.log('LPPortal: Loading user badges:', userBadgesData);
            setUserBadges(userBadgesData);
            
            // If not in standalone mode and user just logged in, redirect to portal
            if (!isStandalone && !sessionStorage.getItem('lpPortalRedirected')) {
              sessionStorage.setItem('lpPortalRedirected', 'true');
              window.location.href = '/portal';
            }
            
          } else {
            console.warn("LPPortal: User document found but role invalid or missing:", userData.role);
            setUser(null);
            setAuthError("Account role invalid or missing. Please contact an administrator."); 
            await signOut(auth);
          }
        } else {
          console.log("LPPortal: User document NOT found for UID:", authUserData.uid);
          
          // Check if there's a pending profile for this email
          const pendingQuery = query(
            collection(db, "users"), 
            where("email", "==", authUserData.email.toLowerCase()),
            where("isPendingAuth", "==", true)
          );
          const pendingSnap = await getDocs(pendingQuery);
          
          if (!pendingSnap.empty) {
            // Found a pending profile - migrate it to the proper UID
            console.log("LPPortal: Found pending profile for user, migrating...");
            const pendingDoc = pendingSnap.docs[0];
            const pendingData = pendingDoc.data();
            const pendingId = pendingDoc.id;
            
            // Create the proper user document
            const properUserDocRef = doc(db, "users", authUserData.uid);
            await setDoc(properUserDocRef, {
              ...pendingData,
              uid: authUserData.uid,
              hasCompletedSignup: true,
              isPendingAuth: false,
              tempUserId: undefined
            });
            
            // Delete the temporary document
            await deleteDoc(doc(db, "users", pendingId));
            
            console.log("LPPortal: Profile migrated successfully");
            
            // The auth state listener will re-trigger and find the proper document
            return;
          }
          
          console.warn("LPPortal: User exists in Auth but not Firestore. Account setup may be incomplete.");
          setUser(null);
          setAuthError("Your account setup is incomplete. Please contact your administrator.");
          await signOut(auth);
        }
      } catch (error) {
        console.error("LPPortal: Error during auth state change processing:", error);
        setUser(null);
        setAuthError(`Error verifying account details: ${error.message}`);
        try { await signOut(auth); } catch (signOutError) { console.error("LPPortal: Error signing out after auth verification failure:", signOutError); }
      }
    } else {
      // User is logged out
      console.log("LPPortal: User is logged out. Resetting state.");
      setUser(null);
      setAuthError("");
      setLpPitches([]);
      setAdminPitches([]);
      setReviews({}); // Clear reviews on logout
      setSelectedPitch(null);
      setReviewFormData({});
      setUsers([]);
      setAllReviewsData([]);
      setActiveTab("reviewPitches"); // Reset to default tab on logout
      setActiveAdminTab("userManagement");
    }
    setIsLoadingAuth(false);
    console.log("LPPortal: Auth processing finished. isLoadingAuth:", false);
  });
  return () => {
    console.log("LPPortal: Unsubscribing auth listener.");
    unsubscribe();
  };
}, []); // Empty dependency array ensures this runs only once on mount

// Effect 2: Initialize stats if needed
useEffect(() => {
  const initStats = async () => {
    if (user && !statsInitialized) {
      if (!userStats) {
        console.log("LPPortal: Initializing user stats...");
        const stats = await initializeUserStats(user.uid);
        setUserStats(stats);
        
        // Calculate retroactive stats if this is first time
        if (stats && stats.totalReviews === 0) {
          console.log("LPPortal: Calculating retroactive stats...");
          const retroData = await calculateRetroactiveStats(user.uid);
          if (retroData) {
            setUserStats(retroData.stats);
            setUserBadges(retroData.badges);
          }
        }
      }
      setStatsInitialized(true);
    }
  };
  
  initStats();
}, [user, userStats, statsInitialized]);

// --- Data Loading Functions 
const loadLPData = useCallback(async () => {
  if (!user || !user.uid) {
    console.log("LPPortal: loadLPData skipped, no user.");
    return;
  }
  const chapterToQuery = isSuperAdmin ? null : userChapter;
  // Allow SuperAdmins to load even without a chapter, but normal LPs/Admins need one
  if (!chapterToQuery && !isSuperAdmin) {
    console.warn(`LPPortal: Skipping LP data load: No chapter assigned for non-SuperAdmin user ${user.email}`);
    setLpPitches([]);
    setReviews({});
    // Maybe show an error to the user here?
    // showAppAlert("Cannot load pitches: Your account needs a chapter assigned by an admin.");
    return;
  }

  console.log(`LPPortal: Loading LP pitches for user ${user.uid}, chapter: ${chapterToQuery || 'ALL (SuperAdmin)'}`);
  let pitchDocs = []; // Initialize outside try

  // Load Pitches
  try {
    let pitchQuery = chapterToQuery
      ? query(collection(db, "pitches"), where("chapter", "==", chapterToQuery), orderBy("createdAt", "desc"))
      : query(collection(db, "pitches"), orderBy("createdAt", "desc")); // SuperAdmin gets all

    const pitchSnap = await getDocs(pitchQuery);
    pitchDocs = pitchSnap.docs.map(d => {
      const data = d.data();
      // Ensure createdAt is handled correctly, default to null if invalid
      const createdDateValue = data.createdAt; // Could be Timestamp, Date, string, null etc.
      const quarter = getQuarterFromDate(createdDateValue); // Calculate quarter
      return {
        id: d.id,
        ...data,
        // Store the raw value; formatting happens in formatDate
        createdAt: createdDateValue,
        // Keep createdDate for backward compatibility if needed? Or rely solely on formatDate(createdAt)
        createdDate: createdDateValue,
        quarter: quarter // Add quarter property
      };
    });
    setLpPitches(pitchDocs);
    console.log(`LPPortal: Successfully fetched ${pitchDocs.length} pitches for LP view.`);
  } catch (error) {
    console.error(`LPPortal: Error loading LP pitches for ${user.email} / chapter ${chapterToQuery}:`, error.code, error.message);
    setLpPitches([]); // Clear pitches on error
    setReviews({}); // Clear reviews too if pitches fail
    showAppAlert(`Error loading pitches: ${error.message}. Please check console for details. You may need to refresh or contact support if this persists.`);
    return; // Stop processing if pitches fail
  }

  // Load Reviews for this user (only if pitches loaded successfully)
  try {
    console.log(`LPPortal: Querying reviews for user ${user.uid}...`);
    
    // First try to load reviews by document ID pattern (uid_pitchId)
    const reviewsMap = {};
    
    // Get all possible review IDs based on pitches (this ensures we find all reviews even if not stored with consistent query fields)
    const possibleReviewIds = pitchDocs.map(pitch => `${user.uid}_${pitch.id}`);
    
    // Log the possible review IDs we're looking for
    console.log(`LPPortal: Looking for ${possibleReviewIds.length} possible review documents with IDs like: ${user.uid}_[pitchId]`);
    
    // Use Promise.all to fetch multiple docs in parallel
    const reviewPromises = possibleReviewIds.map(reviewId => 
      getDoc(doc(db, "reviews", reviewId))
        .then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const pitchId = data.pitchId;
            if (pitchId) {
              reviewsMap[pitchId] = { reviewId: docSnap.id, ...data };
              console.log(`LPPortal: Found review ${docSnap.id} for pitch ${pitchId}`);
            }
          }
          return null; // Return null for non-existent docs
        })
        .catch(err => {
          console.warn(`LPPortal: Error fetching review ${reviewId}:`, err);
          return null;
        })
    );
    
    await Promise.all(reviewPromises);
    
    // Only try the backup query if we have permission; otherwise, skip it
    try {
      // As a backup, also query by reviewerId - this helps find any reviews that might not follow the ID pattern
      const reviewQuery = query(collection(db, "reviews"), where("reviewerId", "==", user.uid));
      const reviewSnap = await getDocs(reviewQuery);
      
      reviewSnap.forEach((docSnap) => {
        const reviewData = docSnap.data();
        // Use the pitchId from the review document as the key
        if (reviewData.pitchId) {
          // Only add if not already added from direct doc lookup
          if (!reviewsMap[reviewData.pitchId]) {
            reviewsMap[reviewData.pitchId] = { reviewId: docSnap.id, ...reviewData };
            console.log(`LPPortal: Found additional review ${docSnap.id} for pitch ${reviewData.pitchId} via query`);
          }
        } else {
          console.warn("LPPortal: Found review without pitchId, skipping:", docSnap.id, reviewData);
        }
      });
    } catch (queryError) {
      // If we get a permission error on the backup query, just log it but don't fail
      console.warn(`LPPortal: Backup query by reviewerId failed (continuing with direct lookups only): ${queryError.message}`);
    }
    
    // Log the results
    console.log(`LPPortal: Fetched ${Object.keys(reviewsMap).length} total reviews for user ${user.email}. Setting reviews state with:`, reviewsMap);
    setReviews(reviewsMap);
  } catch (reviewError) {
    console.error(`LPPortal: Error loading reviews for user ${user.email}:`, reviewError.code, reviewError.message);
    setReviews({}); // Clear reviews on error, but don't clear pitches
    // Don't alert again, pitch error is more critical
  }
}, [user, isSuperAdmin, userChapter]); // Dependencies for loadLPData

const loadAdminData = useCallback(async () => {
  if (!user || !isAdmin) {
    console.log("LPPortal: loadAdminData skipped, user is not an admin.");
    return; 
  }

  const chapterForAdminQuery = isSuperAdmin ? null : userChapter;
  // Admin users MUST have a chapter unless they are SuperAdmin
  if (!chapterForAdminQuery && !isSuperAdmin) {
    console.warn(`LPPortal: Skipping Admin data load: No chapter assigned for Admin user ${user.email}`);
    setAdminPitches([]); setUsers([]); setAllReviewsData([]);
    // showAppAlert("Cannot load admin panel data: Your admin account needs a chapter assigned.");
    return;
  }

  console.log(`LPPortal: Loading ADMIN data. User Chapter: ${userChapter}, IsSuper: ${isSuperAdmin}, Query Chapter: ${chapterForAdminQuery || 'ALL'}`);
  let success = true; // Flag to track if all loads succeed

  // Load Admin Pitches (Filtered by chapter for Admin, all for SuperAdmin)
  try {
    console.log("LPPortal: Querying admin pitches...");
    let adminPitchQuery = chapterForAdminQuery
      ? query(collection(db, "pitches"), where("chapter", "==", chapterForAdminQuery), orderBy("createdAt", "desc"))
      : query(collection(db, "pitches"), orderBy("createdAt", "desc")); // SuperAdmin gets all
    const adminPitchSnap = await getDocs(adminPitchQuery);
    const adminPitchDocs = adminPitchSnap.docs.map((d) => {
      const data = d.data();
      const createdDateValue = data.createdAt; // Get raw value
      const quarter = getQuarterFromDate(createdDateValue); // Calculate quarter using helper

      return {
        id: d.id,
        ...data,
        createdAt: createdDateValue, // Store raw value
        createdDate: createdDateValue, // Store raw value
        quarter: quarter
      };
    });
    setAdminPitches(adminPitchDocs);
    console.log(`LPPortal: Admin pitches loaded (${adminPitchDocs.length}).`);
  } catch (error) {
    console.error(`LPPortal: Error loading ADMIN pitches for ${user.email} / chapter ${chapterForAdminQuery}:`, error.code, error.message);
    setAdminPitches([]); success = false;
    showAppAlert(`Error loading admin pitches: ${error.message}. Check Firestore Rules/Indexes.`);
  }

  // Load Users (Fetch ALL users regardless of admin chapter - needed for review lookups etc.)
  try {
    console.log("LPPortal: Querying ALL users for admin panel...");
    let usersQuery = query(collection(db, "users"), orderBy("name", "asc")); // Fetch all, maybe order?
    const usersSnap = await getDocs(usersQuery);
    const usersList = usersSnap.docs
      .map(d => ({ id: d.id, ...d.data(), uid: d.id })); // Ensure uid is set
    setUsers(usersList);
    console.log(`LPPortal: ALL users loaded (${usersSnap.docs.length}).`);
  } catch (error) {
    console.error(`LPPortal: Error loading ALL users for admin panel:`, error.code, error.message);
    setUsers([]); success = false;
    showAppAlert(`Error loading users list: ${error.message}. Check Firestore Rules.`);
  }

  // Load All Reviews (Needed for admin summary, not filtered by chapter here, filter in UI if needed)
  try {
    console.log("LPPortal: Querying all reviews...");
    const allReviewsQuery = query(collection(db, "reviews"), orderBy("submittedAt", "desc"));
    const allReviewsSnap = await getDocs(allReviewsQuery);
    const allReviewsList = allReviewsSnap.docs.map(d => ({ reviewId: d.id, ...d.data(), submittedAt: d.data().submittedAt /* Store raw */ }));
    setAllReviewsData(allReviewsList); // Update the allReviewsData state
    console.log(`LPPortal: All reviews loaded (${allReviewsList.length}).`);
  } catch (error) {
    console.error(`LPPortal: Error loading ALL reviews summary:`, error.code, error.message);
    setAllReviewsData([]); success = false;
    showAppAlert(`Error loading reviews summary: ${error.message}. Check Firestore Rules.`);
  }

  if (success) {
    console.log(`LPPortal: Admin Data loading attempt finished successfully.`);
  } else {
    console.warn(`LPPortal: Admin Data loading attempt finished with errors.`);
  }

}, [user, isAdmin, isSuperAdmin, userChapter]); // Dependencies for loadAdminData



useEffect(() => {
  // Only load data if auth check is done AND we have a valid user object
  if (!isLoadingAuth && user && user.uid && user.role) {
    console.log("LPPortal: User authenticated and ready, triggering data load...");
    loadLPData(); // Load data relevant to LPs (pitches for their chapter, their reviews)
    if (isAdmin) {
      loadAdminData(); // Load additional data if user is admin/superAdmin
    }
  } else if (!isLoadingAuth) {
    // If auth check is done but we DON'T have a user, ensure data is cleared
    console.log("LPPortal: Auth check complete, but no user. Clearing data state.");
    setLpPitches([]);
    setAdminPitches([]);
    setReviews({});
    setSelectedPitch(null);
    setReviewFormData({});
    setUsers([]);
    setAllReviewsData([]);
  }

  // This effect runs when user or isLoadingAuth changes.
}, [user, isLoadingAuth, isAdmin, loadLPData, loadAdminData]);

useEffect(() => {
  if (selectedPitch && selectedPitch.id) {
      // Check if reviews state has keys before trying to access
      if (Object.keys(reviews).length > 0) {
          const userReview = reviews[selectedPitch.id];
          console.log('LPPortal: Populating review form for Pitch ID:', selectedPitch.id, 'Review found:', userReview);
          if (userReview) {
              // Populate form with existing review data
              setReviewFormData({
                  pitchVideoRating: userReview.pitchVideoRating || "",
                  businessModelRating: userReview.businessModelRating || "",
                  productMarketFitRating: userReview.productMarketFitRating || "",
                  overallLpRating: userReview.overallLpRating || "",
                  comments: userReview.comments || ""
              });
          } else {
              // Clear form (no review found for this pitch)
              console.log('LPPortal: No review found for this pitch, clearing form.');
              setReviewFormData({ pitchVideoRating: "", businessModelRating: "", productMarketFitRating: "", overallLpRating: "", comments: "" });
          }
      } else {
          // reviews object is empty, wait for it to load
          console.log('LPPortal: Reviews not loaded yet, clearing/waiting for form population for Pitch ID:', selectedPitch.id);
          // Clear form while waiting
          setReviewFormData({ pitchVideoRating: "", businessModelRating: "", productMarketFitRating: "", overallLpRating: "", comments: "" });
      }
  } else {
      // No pitch selected, clear the form
      setReviewFormData({ pitchVideoRating: "", businessModelRating: "", productMarketFitRating: "", overallLpRating: "", comments: "" });
  }
}, [selectedPitch, reviews]); // Run when selected pitch or the reviews map changes


// Effect 4: Restore scroll position when returning to the list
useEffect(() => {
    if (!selectedPitch && listScrollRef.current && listScrollPosition > 0) {
      console.log("LPPortal: Restoring scroll position to", listScrollPosition);
      
      const timer = setTimeout(() => {
        if (listScrollRef.current) {
          listScrollRef.current.scrollTop = listScrollPosition;
        }
        setListScrollPosition(0); // Reset after restoring
      }, 50); 
      return () => clearTimeout(timer);
    }
}, [selectedPitch, listScrollPosition]); 

// --- Helper Functions ---

const formatDate = (ts) => {
  if (!ts) return "No date";
  try {
    let date;
    
    if (typeof ts.toDate === 'function') {
      date = ts.toDate();
    
    } else if (ts instanceof Date) {
      date = ts;
    
    } else {
      console.warn("formatDate: Input was not a Firestore Timestamp or JS Date, attempting conversion:", ts);
      date = new Date(ts);
    }

    
    if (isNaN(date.getTime())) {
      console.error("formatDate resulted in an invalid date for input:", ts);
      return "Invalid Date";
    }

    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    
    console.error("Error formatting date:", error, "Input:", ts);
    return "Invalid Date";
  }
};
// ----------------------------------------------------

// --- Handlers ---

// Auth Handlers
const handleEmailLogin = async () => {
  setAuthError("");
  if (!email || !password) {
    setAuthError("Email and password are required.");
    return;
  }
  const loginEmail = email.trim().toLowerCase();
  try {
    console.log("LPPortal: Attempting email login for:", loginEmail);
    await signInWithEmailAndPassword(auth, loginEmail, password);
    console.log("LPPortal: Email login successful.");
    
    setEmail(""); 
    setPassword("");
  } catch (err) {
    console.error("LPPortal: Email Login Error:", err.code, err.message);
    if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-email'].includes(err.code)) {
      setAuthError("Invalid email or password.");
    } else {
      setAuthError(`Login failed: ${err.message}`);
    }
  }
};

// Removed handleEmailSignUp - users can no longer self-register

const handleGoogleLogin = async () => {
  try {
    setAuthError("");
    console.log("LPPortal: Attempting Google login...");
    await signInWithPopup(auth, provider);
    console.log("LPPortal: Google login popup initiated.");
    
  } catch (err) {
    console.error("LPPortal: Google Login Error:", err);
    if (err.code === 'auth/popup-closed-by-user') {
      
    } else if (err.code === 'auth/account-exists-with-different-credential') {
      setAuthError("An account already exists with this email address using a different sign-in method (e.g., email/password). Try logging in that way.");
    } else {
      setAuthError(`Google login failed: ${err.message}`);
    }
  }
};

const handleSignOut = async () => {
  try {
    console.log("LPPortal: Attempting sign out...");
    await signOut(auth);
    console.log("LPPortal: Sign out successful.");
    // Clear session storage flags
    sessionStorage.removeItem('lpPortalRedirected');
    sessionStorage.removeItem('lpPortalAuthenticated');
    // If in standalone mode, redirect to home
    if (isStandalone) {
      window.location.href = '/';
    }
    // State clearing handled by onAuthStateChanged
  } catch (error) {
    console.error("LPPortal: Sign out Error:", error);
    showAppAlert(`Sign out failed: ${error.message}`);
  }
};

// Removed handleInviteCodeSubmit - no longer using invite codes


// LP Review Handlers
const handleReviewSubmit = async (e) => { 
  e.preventDefault();
  if (!user || !selectedPitch) {
    console.error("Review submit cancelled: Missing user or selected pitch.");
    alert("Cannot submit review: User or Pitch data missing. Please select a pitch first."); 
    return;
  }

  
  const reviewId = `${user.uid}_${selectedPitch.id}`;
  

  console.log(`LPPortal: Attempting to submit/update review with ID: ${reviewId} by user ${user.uid} (Role: ${user.role}) for pitch ${selectedPitch.id}`);
  if (!reviewId || reviewId.includes('<span') || !selectedPitch.id || !user.uid) { 
    console.error("LPPortal: Invalid reviewId generated!", reviewId);
    alert("Failed submit. Critical error generating review ID.");
    return; 
  }


  const newReview = {
    reviewerId: user.uid,
    reviewerName: user.name || user.email, // Store reviewer name/email for easier display later if needed
    pitchId: selectedPitch.id,
    pitchBusinessName: selectedPitch.businessName || "Unknown Business", // Store for context
    chapter: selectedPitch.chapter || user.chapter || "Unknown", // Get chapter from pitch if possible, else from user
    ...reviewFormData, // Spread existing form data
    submittedAt: Timestamp.fromDate(new Date()), // Use Firestore Timestamp
    lastUpdatedAt: Timestamp.fromDate(new Date()) // Add last updated timestamp
  };

  try {
    const reviewDocRef = doc(db, "reviews", reviewId);
    // Use setDoc with merge:true to either create or overwrite the review
    console.log(`LPPortal: Writing review data to Firestore:`, newReview);
    await setDoc(reviewDocRef, newReview, { merge: true });

    // --- Success ---
    console.log(`LPPortal: Review ${reviewId} submitted/updated successfully.`);
    
    // Track stats and check for badges
    const isEdit = reviews[selectedPitch.id] ? true : false;
    const trackingResult = await trackReviewSubmission(user.uid, newReview, selectedPitch, isEdit);
    
    if (trackingResult.newBadges && trackingResult.newBadges.length > 0) {
      // Show badge notification
      setShowBadgeNotification(trackingResult.newBadges[0]);
      setUserBadges([...userBadges, ...trackingResult.newBadges]);
    }
    
    setUserStats(trackingResult.stats);
    
    alert("Review submitted successfully! 🥳"); // Use showAppAlert if implemented

    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000); // Confetti lasts for 3 seconds

    setReviews(currentReviews => {
        const updatedReviews = {
            ...currentReviews,
            [selectedPitch.id]: { reviewId: reviewId, ...newReview }
        };
        console.log("LPPortal: Local reviews state updated after submit:", updatedReviews);
        return updatedReviews;
    });


    // Close the detail view and reset the form
    setSelectedPitch(null); // Scroll position restoration handled by useEffect[selectedPitch]
    // Form reset is handled by the useEffect hook watching selectedPitch

  } catch (error) {
    console.error(`LPPortal: Error submitting review ${reviewId}:`, error.code, error.message);
    // Provide more specific feedback based on potential Firestore rule errors
    if (error.code === 'permission-denied' || error.message.includes('permission-denied')) {
      alert(`Failed submit: Permission Denied. Please check Firestore rules allow role '${user.role}' to write to /reviews/${reviewId}`); // Use showAppAlert
      console.error(`LPPortal: PERMISSION DENIED writing to /reviews/${reviewId} for user ${user.uid}`);
    } else {
      alert(`Failed submit. Error: ${error.message}. Please try again.`); // Use showAppAlert
    }
  }
};


const handleReviewFormChange = (e) => {
  const { name, value } = e.target;
  setReviewFormData((prev) => ({ ...prev, [name]: value }));
};

const selectPitchForReview = (pitch) => {
  // Capture scroll position before changing state
  if (listScrollRef.current) {
      setListScrollPosition(listScrollRef.current.scrollTop);
      console.log("LPPortal: Storing scroll position:", listScrollRef.current.scrollTop);
  }
  console.log("LPPortal: Selecting pitch for review:", pitch.id, pitch.businessName);
  setSelectedPitch(pitch);
  // Form data population is handled by useEffect watching selectedPitch and reviews
};

// Back to list handler - ensures scroll position logic runs
const handleBackToList = () => {
    setSelectedPitch(null);
    // Scroll restoration is handled by useEffect watching selectedPitch
};


// Admin Panel Handlers

// Generate a temporary password for new users
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Removed handleSendWelcomeEmail - users must use Forgot Password flow

const handleCreateUser = async (e) => {
  e.preventDefault();
  
  if (!isSuperAdmin) {
    showAppAlert("Only Super Admins can create new users.");
    return;
  }
  
  try {
    // Validate required fields
    if (!newUserData.uid || !newUserData.email || !newUserData.name || !newUserData.chapter) {
      showAppAlert("Please fill in all required fields including UID.");
      return;
    }
    
    // Validate UID format (should be alphanumeric, typically 28 characters)
    if (newUserData.uid.length < 20 || newUserData.uid.length > 40) {
      showAppAlert("UID seems invalid. Please check the Firebase Auth UID.");
      return;
    }
    
    const userEmail = newUserData.email.toLowerCase();
    console.log('LPPortal: Creating Firestore document for user:', userEmail, 'with UID:', newUserData.uid);
    
    // Create Firestore user profile using the provided UID as document ID
    const userDocRef = doc(db, "users", newUserData.uid);
    
    // Check if document already exists
    const existingDoc = await getDoc(userDocRef);
    if (existingDoc.exists()) {
      showAppAlert("A user document with this UID already exists!");
      return;
    }
    
    await setDoc(userDocRef, {
      uid: newUserData.uid,
      email: newUserData.email,
      name: newUserData.name,
      role: newUserData.role,
      chapter: newUserData.chapter,
      anniversary: Timestamp.fromDate(new Date(newUserData.anniversary)),
      createdAt: Timestamp.now(),
      createdBy: user.uid,
      hasCompletedSignup: true,
      // Initialize stats for gamification
      stats: {
        totalReviews: 0,
        quarterReviews: 0,
        favoritesPicked: 0,
        considerationsPicked: 0,
        passedPicked: 0,
        ineligiblePicked: 0,
        reviewsByQuarter: {},
        reviewsByHour: {},
        longestStreak: 0,
        currentStreak: 0,
        lastReviewDate: null,
        averageReviewLength: 0,
        totalComments: 0,
        winnersIdentified: 0,
        accuracyRate: 0
      },
      badges: []
    });
    
    console.log('LPPortal: User profile created in Firestore');
    
    // Show success message
    showAppAlert(`User profile created successfully!\n\n` +
      `UID: ${newUserData.uid}\n` +
      `Email: ${userEmail}\n` +
      `Name: ${newUserData.name}\n` +
      `Role: ${newUserData.role}\n` +
      `Chapter: ${newUserData.chapter}\n\n` +
      `Next step: Use the "Reset Pwd" button in the users table to send them a password reset email.`);
    
    // Reset form
    setNewUserData({
      uid: '',
      email: '',
      name: '',
      role: 'lp',
      chapter: '',
      anniversary: new Date().toISOString().split('T')[0]
    });
    
    // Reload admin data to show new user
    loadAdminData();
    
  } catch (error) {
    console.error('LPPortal: Error creating user:', error);
    showAppAlert(`Failed to create user: ${error.message}`);
  }
};

const handleDeleteUser = async (userIdToDelete, userEmailToDelete) => {
  console.log(`LPPortal: Attempting delete user: ${userIdToDelete} (${userEmailToDelete}) by admin ${user.uid}`);
  if (!userIdToDelete) {
    showAppAlert("Delete failed: Missing user ID.");
    return;
  }
  if (userIdToDelete === user.uid) {
    showAppAlert("You cannot delete your own user account.");
    return;
  }

  const userToDeleteData = users.find(u => u.id === userIdToDelete);
  if (userToDeleteData?.role === 'superAdmin' && !isSuperAdmin) {
    showAppAlert("Admins cannot delete SuperAdmin accounts.");
    return;
  }

  // Confirmation - Updated message to reflect only Firestore data deletion
  if (showAppConfirm(`Are you sure you want to delete the user profile data for ${userEmailToDelete || userIdToDelete} from the LP Portal?\n\nTHIS ACTION ONLY DELETES THE FIRESTORE DATA (role, chapter, name, etc.).\nIT DOES NOT DELETE THE AUTHENTICATION ACCOUNT in Firebase Authentication.\n\nIf you also want to prevent the user from logging in, you must disable or delete their account in the Firebase Authentication console.\n\nProceed with deleting the Firestore profile data?`)) {
    try {
      console.log(`LPPortal: Deleting user document /users/${userIdToDelete}...`);
      await deleteDoc(doc(db, "users", userIdToDelete));
      console.log(`LPPortal: User document deleted successfully.`);
      showAppAlert(`User profile data for ${userEmailToDelete || userIdToDelete} deleted from Firestore.`);
      loadAdminData(); // Refresh user list
    } catch (error) {
      console.error(`LPPortal: Error deleting user ${userIdToDelete}:`, error);
      if (error.code === 'permission-denied' || error.message.includes('permission-denied')) {
        showAppAlert(`Delete failed: Permission Denied. Check Firestore rules for deleting users.`);
        console.error(`LPPortal: PERMISSION DENIED deleting /users/${userIdToDelete} by admin ${user.email}`);
      } else {
        showAppAlert(`Delete failed: ${error.message}`);
      }
    }
  }
};

const handleUpdateUser = async (userIdToUpdate, field, value) => {
  console.log(`LPPortal: Admin ${user.uid} attempting to update user ${userIdToUpdate}: set ${field} = ${value}`);
  // --- Validation ---
  if (!userIdToUpdate || !field) {
    console.error("LPPortal: Update user failed - missing userId or field");
    return; // Should not happen
  }
  const targetUser = users.find(u => u.id === userIdToUpdate);
  if (!targetUser) {
    console.error(`LPPortal: Update user failed - user ${userIdToUpdate} not found in local state.`);
    showAppAlert("Update failed: User not found.");
    loadAdminData(); // Refresh to be safe
    return;
  }

  // Prevent non-SuperAdmins from changing their own role/chapter or elevating others to SuperAdmin
  if (!isSuperAdmin) {
    if (userIdToUpdate === user.uid && (field === 'role' || field === 'chapter')) {
      showAppAlert("You cannot change your own role or chapter. Ask a SuperAdmin.");
      loadAdminData(); // Revert optimistic UI if needed
      return;
    }
    if (field === 'role' && value === 'superAdmin') {
      showAppAlert("Only SuperAdmins can assign the SuperAdmin role.");
      loadAdminData();
      return;
    }
    // Prevent Admins from changing SuperAdmins at all?
    if (targetUser.role === 'superAdmin') {
      showAppAlert("Admins cannot modify SuperAdmin accounts.");
      loadAdminData();
      return;
    }
  }

  // Prevent assigning an invalid role
  if (field === 'role' && !VALID_ROLES.concat('unauthorized').includes(value)) { // Allow 'unauthorized' for disabling
    showAppAlert(`Invalid role selected: ${value}`);
    loadAdminData();
    return;
  }

  try {
    console.log(`LPPortal: Updating Firestore doc /users/${userIdToUpdate} with {${field}: ${value}}...`);
    await updateDoc(doc(db, "users", userIdToUpdate), {
      [field]: value
    });
    console.log(`LPPortal: User update successful.`);
    showAppAlert(`User ${targetUser.email || userIdToUpdate} updated successfully.`);
    loadAdminData(); // Refresh list with updated data
  } catch (error) {
    console.error(`LPPortal: Error updating user ${userIdToUpdate}:`, error);
    if (error.code === 'permission-denied' || error.message.includes('permission-denied')) {
      showAppAlert(`Update failed: Permission Denied. Check Firestore rules for updating user roles/chapters.`);
      console.error(`LPPortal: PERMISSION DENIED updating /users/${userIdToUpdate} by admin ${user.email}`);
    } else {
      showAppAlert(`Update failed: ${error.message}`);
    }
    loadAdminData(); // Refresh list to revert optimistic UI changes if any
  }
};

const handleAdminPasswordReset = async (emailToReset) => {
  if (!emailToReset) {
    showAppAlert("Cannot reset password: User email is missing.");
    return;
  }
  if (emailToReset === user?.email) {
    showAppAlert("You cannot reset your own password from this admin panel. Use the standard login/password reset flow if needed.");
    return;
  }

  if (showAppConfirm(`Are you sure you want to send a password reset email to ${emailToReset} via Firebase Authentication?`)) { // Updated confirmation text
    try {
      console.log(`LPPortal: Admin ${user.email} triggering password reset for ${emailToReset}`);
      await sendPasswordResetEmail(auth, emailToReset);
      console.log(`LPPortal: Password reset email sent successfully.`);
      showAppAlert(`Password reset email sent to ${emailToReset}.`);
    } catch (error) {
      console.error(`LPPortal: Error sending password reset email to ${emailToReset}:`, error);
      showAppAlert(`Failed to send password reset email: ${error.message}`);
      // Common errors: auth/user-not-found if email doesn't have an auth account
    }
  }
};

const handleAssignAnniversaryBadges = async () => {
  if (!showAppConfirm('This will check all users and assign OG Neighbor and Year Club badges to those who qualify based on their join dates. Continue?')) {
    return;
  }
  
  try {
    showAppAlert('Starting anniversary badge assignment...');
    
    // Get all users
    const usersSnapshot = await getDocs(collection(db, "users"));
    let processedCount = 0;
    let badgesAddedCount = 0;
    
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
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const currentBadges = userData.badges || [];
      const currentBadgeIds = currentBadges.map(b => b.badgeId || b.id);
      
      // Skip if no anniversary date
      if (!userData.anniversary) {
        console.log(`Skipping user ${userDoc.id} - no anniversary date`);
        continue;
      }
      
      // Get join date
      const joinDate = userData.anniversary.toDate ? userData.anniversary.toDate() : new Date(userData.anniversary);
      console.log(`User ${userData.email || userDoc.id} joined on ${joinDate.toLocaleDateString()}`);
      
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
          badgesAddedCount++;
        }
      }
      
      // Update if new badges to add
      if (newBadges.length > 0) {
        await updateDoc(doc(db, 'users', userDoc.id), {
          badges: [...currentBadges, ...newBadges]
        });
        console.log(`Added ${newBadges.length} badge(s) to ${userData.email || userDoc.id}`);
      }
      
      processedCount++;
    }
    
    showAppAlert(`Anniversary badge assignment complete!\n\nUsers processed: ${processedCount}\nNew badges added: ${badgesAddedCount}`);
    
    // Reload admin data to refresh user list
    if (isAdmin) {
      loadAdminData();
    }
    
  } catch (error) {
    console.error('Error assigning anniversary badges:', error);
    showAppAlert(`Error: ${error.message}`);
  }
};

const handleAssignWinner = async (pitchId, currentWinnerStatus) => {
  const action = currentWinnerStatus ? "Remove Winner" : "Assign Winner";
  // Find the pitch data from the currently loaded admin pitches
  const pitchToUpdate = adminPitches.find(p => p.id === pitchId);
  if (!pitchToUpdate) {
    console.error(`LPPortal: Assign Winner failed - Pitch ${pitchId} not found in adminPitches state.`);
    showAppAlert("Error: Could not find pitch data to update.");
    return;
  }

  if (showAppConfirm(`Are you sure you want to ${action.toLowerCase()} status for pitch "${pitchToUpdate.businessName || 'Unknown'}" (ID: ${pitchId})?`)) {
    try {
      console.log(`LPPortal: Updating pitch /pitches/${pitchId} - setting isWinner to ${!currentWinnerStatus}...`);
      await updateDoc(doc(db, "pitches", pitchId), {
        isWinner: !currentWinnerStatus
      });
      console.log(`LPPortal: Pitch winner status updated successfully.`);
      
      // Update accuracy stats for all LPs who reviewed this pitch
      if (!currentWinnerStatus) {
        // Marking as winner - update stats for LPs who picked Favorite or Consideration
        console.log(`LPPortal: Updating accuracy stats for pitch ${pitchId}...`);
        await updateWinnerPredictions(pitchId, pitchToUpdate);
      }
      
      showAppAlert(`Pitch "${pitchToUpdate.businessName}" marked as ${!currentWinnerStatus ? 'Winner ✅' : 'Not Winner'}.`); // Added emoji
      // Refresh both LP and Admin data as winner status affects both views
      loadLPData();
      loadAdminData();
    } catch (error) {
      console.error(`LPPortal: Assign Winner Error for pitch ${pitchId}:`, error);
      if (error.code === 'permission-denied' || error.message.includes('permission-denied')) {
        showAppAlert(`Update failed: Permission Denied. Check Firestore rules for updating pitch winner status.`);
        console.error(`LPPortal: PERMISSION DENIED updating /pitches/${pitchId} by admin ${user.email}`);
      } else {
        showAppAlert(`Update failed: ${error.message}. Check Firestore Rules.`);
      }
    }
  }
};


const handleAdminPitchExport = () => {
  const filteredPitchesToExport = adminFilteredSortedPitches; // Use the filtered AND sorted list
  console.log(`LPPortal: Exporting ${filteredPitchesToExport.length} filtered admin pitches.`);
  if (filteredPitchesToExport.length === 0) {
    showAppAlert("No pitches match the current filters to export.");
    return;
  }

  const rows = filteredPitchesToExport.map((p) => {
    const groupedReviews = getGroupedReviewsForAdmin(p.id); // Get review summary
    return {
      "Pitch ID": p.id,
      "Business Name": p.businessName || "",
      "Founder Name": p.founderName || "",
      "Email": p.email || "",
      "Chapter": p.chapter || "",
      "Quarter": p.quarter || "",
      // Use robust formatDate for the raw createdAt value
      "Submitted Date": formatDate(p.createdAt || p.createdDate),
      "Is Winner": p.isWinner ? "Yes" : "No",
      "Value Proposition": p.valueProp || "",
      "Problem": p.problem || "",
      "Solution": p.solution || "",
      "Business Model": p.businessModel || "",
      "Paying Customers": p.hasPayingCustomers ? "Yes" : "No",
      "Grant Use Plan": p.grantUsePlan || "",
      "Zip Code": p.zipCode || "",
      "Self Identification": p.selfIdentification?.join(", ") || "",
      "Website": p.website || "",
      "Heard About": p.heardAbout || "",
      "Pitch Video URL": p.pitchVideoUrl || "",
      "Pitch Video File": p.pitchVideoFile || "", // Added
      "Total Reviews": groupedReviews.count || 0,
      "Favorite Count": groupedReviews.byRating?.["Favorite"]?.count || 0,
      "Consideration Count": groupedReviews.byRating?.["Consideration"]?.count || 0,
      "Pass Count": groupedReviews.byRating?.["Pass"]?.count || 0,
      "Ineligible Count": groupedReviews.byRating?.["Ineligible"]?.count || 0,
      // Add more fields as needed
    };
  });

  try {
    const csv = Papa.unparse(rows, { header: true });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    // Generate filename based on filters (using new dropdown state)
    const timestamp = new Date().toISOString().slice(0, 10); // Matisse-MM-DD
    const chapterPart = adminChapterFilter || 'allChapters';
    const quarterPart = adminQuarterFilter || 'allQuarters';
    const favFilterPart = adminFavoriteFilterMode === 'favsOnly' ? '_favsOnly' : (adminFavoriteFilterMode === 'favsAndCons' ? '_favsAndCons' : ''); // Updated logic
    const filename = `neighborhoodOS_pitches_${chapterPart}_${quarterPart}${favFilterPart}_${timestamp}.csv`;

    saveAs(blob, filename);
    console.log(`LPPortal: CSV export successful: ${filename}`);
  } catch (error) {
    console.error("LPPortal: CSV Export Error:", error);
    showAppAlert(`CSV export failed: ${error.message}`);
  }
};


// --- Memos for derived data ---

// Memoized list of LP pitches filtered by current UI settings
const lpFilteredPitches = useMemo(() => {
  if (!Array.isArray(lpPitches)) return [];

  return lpPitches.filter((p) => {
    // Ensure pitch has an ID
    if (!p.id) return false;

    // Access review using pitch ID. Make sure reviews object is populated correctly.
    const review = reviews[p.id]; // Access review data for this pitch

    // Filter by Search Term (Business Name or Founder Name)
    const searchTermLower = reviewSearchTerm.toLowerCase();
    const matchesSearch = !searchTermLower || p.businessName?.toLowerCase().includes(searchTermLower) || p.founderName?.toLowerCase().includes(searchTermLower);
    if (!matchesSearch) return false;

    // Filter by Chapter
    const matchesChapter = !reviewChapterFilter || p.chapter === reviewChapterFilter;
    if (!matchesChapter) return false;

    // Filter by Quarter (added)
    const matchesQuarter = !reviewQuarterFilter || p.quarter === reviewQuarterFilter;
    if (!matchesQuarter) return false;

    // Filter by Review Status Dropdown
    if (reviewFilter === "reviewed" && !review) return false; // Show only reviewed, but this one isn't
    if (reviewFilter === "notReviewed" && review) return false; // Show only not reviewed, but this one is
    if (reviewFilter === "favorites" && (!review || review.overallLpRating !== "Favorite")) return false; // Show only favorites

    // Filter by "Hide Passed/Ineligible" Toggle
    if (hidePassedReviews && review && ["Pass", "Ineligible"].includes(review.overallLpRating)) {
      return false; // Hide if toggle is on and review is Pass/Ineligible
    }

    // If it passed all filters, include it
    return true;
  });
}, [lpPitches, reviews, reviewSearchTerm, reviewFilter, reviewChapterFilter, reviewQuarterFilter, hidePassedReviews]); // Added reviewQuarterFilter dependency


// Memoized function to group reviews for a specific pitch in the admin view
const getGroupedReviewsForAdmin = useCallback((pitchId) => {
  // Ensure dependencies (allReviewsData, users) are available
  if (!Array.isArray(allReviewsData) || !Array.isArray(users)) {
    // console.warn("getGroupedReviewsForAdmin: Called before allReviewsData or users loaded.");
    return { count: 0, byRating: {}, details: [], comments: [] }; // Return empty structure, added comments array
  }

  const relevantReviews = allReviewsData.filter(r => r.pitchId === pitchId);
  const count = relevantReviews.length;
  if (count === 0) return { count: 0, byRating: {}, details: [], comments: [] };

  const allComments = []; // Collect comments

  const groupedByRating = relevantReviews.reduce((acc, review) => {
    const rating = review.overallLpRating || 'No Rating';
    if (!acc[rating]) {
      acc[rating] = { count: 0, reviewers: [] };
    }
    acc[rating].count++;

    // Find reviewer's name using the 'users' state
    const reviewerInfo = users.find(u => u.uid === review.reviewerId || u.id === review.reviewerId);
    const reviewerDisplay = reviewerInfo ? (reviewerInfo.name || reviewerInfo.email) : (review.reviewerName || `ID: ${review.reviewerId?.substring(0,6)}...` || 'Unknown Reviewer');
    acc[rating].reviewers.push(reviewerDisplay);

    // Collect comment if it exists
    if (review.comments && review.comments.trim() !== "") {
        allComments.push(review.comments.trim());
    }

    return acc;
  }, {});

  // Prepare detailed list for potential expansion later (remains unchanged)
  const detailedReviews = relevantReviews.map(review => {
    const reviewerInfo = users.find(u => u.uid === review.reviewerId || u.id === review.reviewerId);
    const reviewerDisplay = reviewerInfo ? (reviewerInfo.name || reviewerInfo.email) : (review.reviewerName || `ID: ${review.reviewerId?.substring(0,6)}...` || 'Unknown Reviewer');
    return {
      ...review,
      reviewerDisplay: reviewerDisplay,
      // Use robust formatDate for the raw submittedAt value
      submittedDate: formatDate(review.submittedAt),
    };
  }).sort((a,b) => {
    // Need robust comparison in case dates are invalid
    const timeA = a.submittedAt?.toDate ? a.submittedAt.toDate().getTime() : (a.submittedAt instanceof Date ? a.submittedAt.getTime() : 0);
    const timeB = b.submittedAt?.toDate ? b.submittedAt.toDate().getTime() : (b.submittedAt instanceof Date ? b.submittedAt.getTime() : 0);
    return (timeB || 0) - (timeA || 0); // Sort newest first
  });

  return {
    count: count,
    byRating: groupedByRating,
    details: detailedReviews,
    comments: allComments // Add collected comments
  };
}, [allReviewsData, users]); // Depend on the full reviews list and the users list

// Memoized list of Admin pitches filtered AND sorted by current UI settings
const adminFilteredSortedPitches = useMemo(() => {
  if (!Array.isArray(adminPitches)) return [];

  let filtered = adminPitches.filter((p) => {
    const groupedReviews = getGroupedReviewsForAdmin(p.id); // Get review summary once

    // Filter by Quarter
    const matchesQuarter = !adminQuarterFilter || p.quarter === adminQuarterFilter;
    if (!matchesQuarter) return false;

    // Filter by Chapter (only if SuperAdmin is filtering)
    const matchesChapter = !isSuperAdmin || !adminChapterFilter || p.chapter === adminChapterFilter;
    if (!matchesChapter) return false;

    // Filter by Admin Search Term (Business, Founder, Email)
    const adminSearchLower = adminSearch.toLowerCase();
    const matchesAdminSearch = !adminSearchLower ||
                               p.businessName?.toLowerCase().includes(adminSearchLower) ||
                               p.founderName?.toLowerCase().includes(adminSearchLower) ||
                               p.email?.toLowerCase().includes(adminSearchLower);
    if (!matchesAdminSearch) return false;

    // Filter by "Hide Passed" Toggle
    // Hide if there are reviews, and ALL reviews are 'Pass' or 'Ineligible'
    const allReviewsArePassOrIneligible = groupedReviews.count > 0 &&
                                          Object.keys(groupedReviews.byRating).every(r => r === 'Pass' || r === 'Ineligible');
    if (adminHidePassed && allReviewsArePassOrIneligible) {
      return false;
    }

    // Filter by Favorites / Considerations (using dropdown state)
    const favoriteCount = groupedReviews.byRating?.["Favorite"]?.count || 0;
    const considerationCount = groupedReviews.byRating?.["Consideration"]?.count || 0;

    if (adminFavoriteFilterMode === 'favsOnly' && favoriteCount === 0) {
      return false; // Hide if filtering by favorites and it has none
    }
    if (adminFavoriteFilterMode === 'favsAndCons' && favoriteCount === 0 && considerationCount === 0) {
      return false; // Hide if filtering by favs+cons and it has neither
    }

    // Passed all admin filters
    return true;
  });

  // --- Sorting Logic ---
  // Only sort by favorites if one of the favorite filters is active
  if (adminFavoriteFilterMode === 'favsOnly' || adminFavoriteFilterMode === 'favsAndCons') {
    filtered.sort((a, b) => {
      const favCountA = getGroupedReviewsForAdmin(a.id).byRating?.["Favorite"]?.count || 0;
      const favCountB = getGroupedReviewsForAdmin(b.id).byRating?.["Favorite"]?.count || 0;
      // Sort descending by favorite count
      if (favCountB !== favCountA) {
        return favCountB - favCountA;
      }
      // Secondary sort: by submission date descending
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
      return (timeB || 0) - (timeA || 0);
    });
  }
  // Otherwise, the default sort (by createdAt descending from query) is maintained.

  return filtered;

}, [
    adminPitches,
    adminQuarterFilter,
    adminChapterFilter,
    adminSearch,
    isSuperAdmin,
    adminHidePassed,
    adminFavoriteFilterMode, // Updated dependency
    getGroupedReviewsForAdmin
]);


// Memoized sorted lists for display
const sortedUsers = useMemo(() => {
  if (!Array.isArray(users)) return [];
  // Sort primarily by name, fallback to email if name is missing
  return [...users].sort((a, b) => {
    const nameA = a.name || a.email || '';
    const nameB = b.name || b.email || '';
    return nameA.localeCompare(nameB);
  });
}, [users]);


// --- Render Logic ---

if (isLoadingAuth) {
  // Simple loading indicator while checking auth status
  return <div style={{ padding: '50px', textAlign: 'center', fontFamily: '"MS Sans Serif", "Pixel Arial", sans-serif', fontSize: '1.2em', color: '#444' }}>Verifying access...</div>;
}


// --- Login Screen ---
if (!user) {
  return (
    <div style={{ width: "100%", height: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <div style={{ width: "100%", maxWidth: "450px", padding: "15px 25px", textAlign: "center", background: '#f5f5f5', fontFamily: '"MS Sans Serif", "Pixel Arial", sans-serif' }}>
        <h2 style={{ borderBottom: '2px solid #888', paddingBottom: '8px', marginBottom: '15px', color: '#222', fontSize: '1.5em' }}>LP Portal</h2>

      {/* Auth Error Display */}
      {authError && (
        <div style={{ color: "#8B0000", background: '#FFEBEE', border: '1px solid #FFCDD2', padding: '10px 15px', marginBottom: "20px", marginTop: '10px', fontSize: '0.9em', textAlign: 'left', borderRadius: '3px' }}>
          <strong style={{marginRight: '5px'}}>Error:</strong>{authError}
        </div>
      )}

      {/* Email Login Form Area */}
      <div style={{ paddingTop: '5px' }}>
        <div style={{ marginBottom: "12px", color: '#333', fontWeight: 'bold' }}>
          Login with Email:
        </div>
        <>
            <AuthInput type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <AuthInput type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <RetroButton 
              onClick={handleEmailLogin} 
              primary 
              style={{ margin: "15px auto 5px auto", display: 'block', width: "calc(100% - 20px)"}}
            >
              Sign In
            </RetroButton>
            <button 
              onClick={() => {
                if (email) {
                  import("firebase/auth").then(({ sendPasswordResetEmail }) => {
                    sendPasswordResetEmail(auth, email)
                      .then(() => showAppAlert("Password reset email sent! Check your inbox."))
                      .catch(err => showAppAlert(`Error: ${err.message}`));
                  });
                } else {
                  showAppAlert("Please enter your email address first.");
                }
              }} 
              style={{background:'none', border:'none', color:'#0000EE', textDecoration:'underline', cursor:'pointer', fontSize:'0.9em', marginTop:'10px'}}
            >
              Forgot Password?
            </button>
        </>
      </div>

        {/* Google Login Separator & Button */}
        <div style={{ margin: "20px 0 15px 0", paddingTop: '15px', borderTop: '1px solid #888' }}>
          <div style={{ marginBottom: "12px", color: '#333', fontWeight: 'bold' }}>Login with Google:</div>
          <button onClick={handleGoogleLogin} title="Login with Google" style={{ background: "transparent", border: "none", cursor: "pointer", padding: "0", display: 'inline-block' }}>
            {/* Ensure this path is correct relative to your public folder */}
            <img src="/assets/Google.webp" alt="Google logo" style={{ height: "50px", width: "auto", verticalAlign: 'middle' }} />
          </button>
        </div>

        {/* Footer Link (Optional) */}
        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #888', fontSize: '0.85em', color: '#444', lineHeight: '1.3' }}>
          <p style={{ margin: '0 0 10px 0' }}>
            This tool is for internal GNF Limited Partner use and requires an Admin invite. 
          </p>
          <p style={{ margin: '0' }}>
            Interested in becoming a Limited Partner? <br />
            <a href="https://airtable.com/app38xfYxu9HY6yT3/pagy7R4p6BCdXBpzF/form" target="_blank" rel="noopener noreferrer" style={{ color: "#0000EE", textDecoration: 'underline', fontWeight: 'bold' }} >
              Apply Here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Removed invite code screen - no longer needed

// --- Logged-In View ---
return (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: '"MS Sans Serif", "Pixel Arial", sans-serif', background: '#f0f0f0' }}>

    {showConfetti && (
      <Confetti
        width={window.innerWidth}
        height={window.innerHeight}
        numberOfPieces={300}
        recycle={false}
      />
    )}
    
    {/* Badge Notification */}
    {showBadgeNotification && (
      <BadgeNotification 
        badge={showBadgeNotification}
        onClose={() => setShowBadgeNotification(null)}
      />
    )}

    {/* Header Bar */}
    <div style={{ borderBottom: '2px outset #ccc', padding: '5px 15px', background: '#eee', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{(user?.chapter || "Neighborhood OS") + ": LP Portal"}</div>
        <div style={{ fontSize: '0.9em', color: '#333' }}> Welcome, {user?.name || user?.email}! ({user?.role}) </div>
      </div>
      <RetroButton onClick={handleSignOut} style={{ padding: "4px 10px", fontSize: "13px", background: "#f5f5f5", border: "1px outset #ccc", height: "28px", alignSelf: 'center' }}>
        Logout
      </RetroButton>
    </div>
    
    {/* Stats Bar */}
    {userStats && (
      <StatsBar 
        user={user}
        stats={userStats}
        badges={userBadges}
      />
    )}

    {/* Main Content Area with Sidebar */}
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Sidebar Navigation */}
      <div style={{
        width: '200px',
        background: '#e8e8e8',
        borderRight: '2px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        <div style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>Navigation</div>
        </div>
        
        {/* Review Pitches */}
        <button
          onClick={() => setActiveTab('reviewPitches')}
          style={{
            padding: '12px 15px',
            border: 'none',
            background: activeTab === 'reviewPitches' ? '#FFD6EC' : 'transparent',
            borderLeft: activeTab === 'reviewPitches' ? '4px solid #FF6B6B' : '4px solid transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '14px',
            fontWeight: activeTab === 'reviewPitches' ? 'bold' : 'normal',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
          📋 Review Pitches
        </button>
        
        {/* Badges */}
        <button
          onClick={() => setActiveTab('badges')}
          style={{
            padding: '12px 15px',
            border: 'none',
            background: activeTab === 'badges' ? '#FFD6EC' : 'transparent',
            borderLeft: activeTab === 'badges' ? '4px solid #FF6B6B' : '4px solid transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '14px',
            fontWeight: activeTab === 'badges' ? 'bold' : 'normal',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
          🏆 Badges ({userBadges.length} Unlocked)
        </button>
        
        {/* Admin Panel (Conditional) */}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('adminPanel')}
            style={{
              padding: '12px 15px',
              border: 'none',
              background: activeTab === 'adminPanel' ? '#FFD6EC' : 'transparent',
              borderLeft: activeTab === 'adminPanel' ? '4px solid #FF6B6B' : '4px solid transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '14px',
              fontWeight: activeTab === 'adminPanel' ? 'bold' : 'normal',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
            👥 Admin Panel
          </button>
        )}
        
        {/* Spacer */}
        <div style={{ flex: 1 }} />
        
        {/* Chapter Info */}
        <div style={{
          padding: '15px',
          borderTop: '1px solid #ccc',
          fontSize: '12px',
          color: '#666'
        }}>
          <div style={{ marginBottom: '5px' }}>
            <strong>Chapter:</strong><br />
            {user?.chapter || 'Unknown'}
          </div>
          <div>
            <strong>Member Since:</strong><br />
            {user?.anniversary ? new Date(user.anniversary.seconds * 1000).toLocaleDateString() : 'Unknown'}
          </div>
        </div>
      </div>

      {/* Main Content Area (Scrollable) */}
      <div ref={listScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '15px', background: '#f9f9f9' }}>

      {/* --- Review Pitches Tab Content --- */}
      {activeTab === 'reviewPitches' && (
        <>
          {/* --- Pitch List View --- */}
          {!selectedPitch ? (
            <>
              {/* Filters and Controls - Added Quarter Filter */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center", flexWrap: "wrap", /* Allow wrap */ background: "#e0e0e0", padding: "8px", borderRadius: "0", border: "1px solid #aaa", fontSize: '13px' /* Reduced font for bar */ }}>
                <input
                  type="text"
                  placeholder="Search name/business"
                  value={reviewSearchTerm}
                  onChange={(e) => setReviewSearchTerm(e.target.value)}
                  style={{ padding: "5px 8px", fontSize: "inherit", flexGrow: 1, minWidth: "140px", height: "26px", border: "1px inset #aaa", borderRadius: "0px", boxSizing: "border-box", fontFamily: 'inherit' }}
                />
                {/* Chapter Filter */}
                <select
                  value={reviewChapterFilter}
                  onChange={(e) => setReviewChapterFilter(e.target.value)}
                  style={{ padding: "0 6px", fontSize: "inherit", height: "28px", border: "1px solid #aaa", borderRight: "2px outset #aaa", borderBottom: "2px outset #aaa", borderRadius: "0px", backgroundColor: "#fff", boxSizing: "border-box", cursor: 'pointer', fontFamily: 'inherit', appearance: 'none', maxWidth: '150px' }}
                  title="Filter by Chapter"
                >
                  <option value="">All Chapters</option> {/* Changed Text */}
                  {/* Dynamically get unique chapters from loaded LP pitches */}
                  {[...new Set(lpPitches.map((p) => p.chapter).filter(Boolean))].sort().map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
                 {/* Quarter Filter Added */}
                 <select
                    value={reviewQuarterFilter}
                    onChange={(e) => setReviewQuarterFilter(e.target.value)}
                    style={{ padding: "0 6px", fontSize: "inherit", height: "28px", border: "1px solid #aaa", borderRight: "2px outset #aaa", borderBottom: "2px outset #aaa", borderRadius: "0px", backgroundColor: "#fff", boxSizing: "border-box", cursor: 'pointer', fontFamily: 'inherit', appearance: 'none', maxWidth: '120px' }}
                    title="Filter by Quarter"
                 >
                     <option value="">All Quarters</option>
                     {[...new Set(lpPitches.map((p) => p.quarter).filter(q => q && q !== "Invalid Quarter"))]
                        .sort((a, b) => {
                            const [aQ, aY] = a.split(' '); const [bQ, bY] = b.split(' ');
                            if (bY !== aY) return parseInt(bY) - parseInt(aY);
                            return parseInt(bQ.substring(1)) - parseInt(aQ.substring(1));
                        })
                        .map((q) => (<option key={q} value={q}>{q}</option>))}
                 </select>
                <select
                  value={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.value)}
                  style={{ padding: "0 6px", fontSize: "inherit", height: "28px", border: "1px solid #aaa", borderRight: "2px outset #aaa", borderBottom: "2px outset #aaa", borderRadius: "0px", backgroundColor: "#fff", boxSizing: "border-box", cursor: 'pointer', fontFamily: 'inherit', appearance: 'none', maxWidth: '130px' }}
                  title="Filter by Review Status"
                >
                  <option value="all">All Pitches</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="notReviewed">Not Reviewed</option>
                  <option value="favorites">⭐ Favorites Only</option> {/* Added Emoji */}
                </select>
                {/* Hide Passed Button - Changed to Emoji */}
                <RetroButton
                  onClick={() => setHidePassedReviews(!hidePassedReviews)}
                  title={hidePassedReviews ? "Show Passed/Ineligible Reviews" : "Hide Passed/Ineligible Reviews"}
                  style={{
                    background: "#eee",
                    padding: "0 8px", // Adjusted padding
                    height: "28px",
                    width: "32px", // Fixed width for emoji
                    fontSize: "16px", // Emoji size
                    lineHeight: "1", // Adjust line height for emoji centering
                    overflow: 'hidden', // Hide text if it overflows (shouldn't)
                    whiteSpace: "nowrap",
                    // Centering handled by base RetroButton style now
                  }}
                >
                  {hidePassedReviews ? '👁️‍🗨️' : '👁️'}
                </RetroButton>
              </div>

              {/* --- DEBUG LOG --- */}
              {/* { console.log(`LPPortal: Rendering pitch list. Reviews state:`, reviews); } */}

              {/* Pitch List or 'No Pitches' Message */}
              {lpFilteredPitches.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#666", background: '#fff', border: '1px solid #ccc', borderRadius:'3px' }}>
                  {lpPitches.length === 0 ? "Loading pitches or no pitches submitted for your chapter(s) yet." : "No pitches match your current search/filter criteria."}
                </div>
              ) : (
                <div>
                  {lpFilteredPitches.map((p) => {
                    if (!p || !p.id) return null; // Safety check for valid pitch data
                    const review = reviews[p.id]; // Get the specific user's review
                    const isReviewed = !!review;
                    const rating = review?.overallLpRating;
                    const isPassedOrIneligible = rating === "Pass" || rating === "Ineligible";
                    const isFavorite = rating === "Favorite";

                    // --- USE ROBUST FORMATTING FOR DATE ---
                    const formattedDate = formatDate(p.createdAt || p.createdDate);

                    return (
                      <div
                        key={p.id}
                        onClick={() => selectPitchForReview(p)}
                        style={{
                          background: isReviewed ? (isPassedOrIneligible ? "#fff" : (isFavorite ? '#fff3e0' : '#e8f5e9') ) : "#fff", // Color based on review status
                          padding: "12px 15px",
                          marginBottom: "12px",
                          border: `1px solid ${isReviewed ? (isPassedOrIneligible ? "#ddd" : (isFavorite ? '#ffe0b2' : '#a5d6a7')) : '#ccc'}`,
                          borderLeft: `5px solid ${isReviewed ? (isPassedOrIneligible ? "#aaa" : (isFavorite ? '#ffb74d' : '#81c784')) : '#ccc'}`, // Left border indicator
                          borderRadius: "3px",
                          cursor: "pointer",
                          transition: 'background-color 0.2s ease, border-color 0.2s ease',
                          opacity: 1, // Opacity handled by filter logic now
                          boxShadow: '1px 1px 3px rgba(0,0,0,0.1)'
                        }}
                        title={`Click to view details & ${isReviewed ? 'edit' : 'submit'} review. Status: ${review ? (ratingEmojis[rating] || '') + ' ' + rating : 'Not Reviewed'}`}
                      >
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px'}}>
                          {/* Left side: Business/Founder Info */}
                          <div style={{ flexGrow: 1 }}>
                            <span style={{fontWeight: 'bold', fontSize: '1.1em'}}>{p.businessName || "No Business Name"}</span>
                            <span style={{fontWeight: 'normal', color: '#555', marginLeft: '5px'}}>-- {p.founderName || "No Founder Name"}</span>
                            {p.isWinner && <span style={{ marginLeft: '10px', color: 'green', fontWeight: 'bold', fontSize: '0.9em', background: '#d4edda', padding: '1px 5px', borderRadius: '3px', border: '1px solid #c3e6cb', display: 'inline-flex', alignItems: 'center', gap: '4px' }}> ✅ Grant Winner</span>} {/* Added Emoji */}
                          </div>
                          {/* Right side: Review Status Badge */}
                          {review && (
                            <div style={{
                              fontSize: "13px",
                              fontWeight: 'bold',
                              color: isPassedOrIneligible ? '#757575' : (isFavorite ? '#e65100' : '#1b5e20'),
                              border: '1px solid',
                              borderColor: isPassedOrIneligible ? '#e0e0e0' : (isFavorite ? '#ffe0b2' : '#c8e6c9'),
                              background: isPassedOrIneligible ? '#f5f5f5' : (isFavorite ? '#fff3e0' : '#e8f5e9'),
                              padding: '3px 8px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              display: 'inline-flex', // Align emoji and text
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {/* Ensure ratingEmojis are prepended */}
                              {ratingEmojis[rating] || ''} {rating}
                            </div>
                          )}
                          {!review && (
                            <div style={{ fontSize: "13px", fontWeight: 'bold', color: '#0d47a1', border: '1px solid #bbdefb', background: '#e3f2fd', padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                               ✏️ Needs Review {/* Added Emoji */}
                            </div>
                          )}
                        </div>
                        {/* Value Prop Snippet */}
                        <div style={{fontSize: '0.9em', color: '#444', margin: '6px 0', maxHeight: '3.6em', overflow: 'hidden', fontStyle:'italic'}}>
                          {p.valueProp ? `"${p.valueProp.substring(0,150)}${p.valueProp.length > 150 ? '...' : ''}"` : "No value proposition provided."}
                        </div>
                        {/* Meta Info */}
                        <div style={{fontSize: "12px", marginTop: "8px", color: "#666" }}>
                          {/* Use the formatted date here */}
                          Submitted: {formattedDate} | Chapter: {p.chapter || 'N/A'} | Quarter: {p.quarter || 'N/A'} {/* Added Quarter */}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          /* --- Pitch Detail and Review Form View --- */
          ) : (
            <div style={{ display: "flex", flexDirection: 'column', gap: "20px", /* Removed fixed height */ }}>
              {/* Back Button */}
              {/* Changed onClick to use handleBackToList */}
              <RetroButton onClick={handleBackToList} style={{ marginBottom: '0px', alignSelf: 'flex-start' }}> ← Back to List</RetroButton> {/* Added Emoji */}

              {/* Layout for Details & Form (Flex wrap) */}
              <div style={{ display: "flex", gap: "20px", flexDirection: 'row', flexWrap: 'wrap' }}>

                {/* Pitch Details Column */}
                <div style={{ flex: '1 1 400px', /* Allow shrinking, basis 400px */ minWidth: '300px', background: '#fff', padding: '15px 20px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.1)', maxHeight: 'calc(100vh - 250px)', overflowY:'auto' }}>
                  <h3 style={{marginTop: 0, borderBottom: '1px solid #eee', paddingBottom:'10px'}}>{selectedPitch.businessName || "N/A"}</h3>
                  {selectedPitch.isWinner && <p style={{ color: 'green', fontWeight: 'bold', background: '#d4edda', padding: '5px 10px', borderRadius: '3px', border: '1px solid #c3e6cb', display:'inline-block', alignItems:'center', gap:'4px' }}> ✅ Grant Winner</p>} {/* Added Emoji */}

                  <p><strong>Founder:</strong> {selectedPitch.founderName || "N/A"}</p>
                  <p><strong>Email:</strong> {selectedPitch.email ? <a href={`mailto:${selectedPitch.email}`}>{selectedPitch.email}</a> : "N/A"}</p>
                  <p><strong>Website:</strong> {selectedPitch.website ? <a href={selectedPitch.website.startsWith('http') ? selectedPitch.website : `//${selectedPitch.website}`} target="_blank" rel="noopener noreferrer">{selectedPitch.website}</a> : "N/A"}</p>
                  <p><strong>Video:</strong> {selectedPitch.pitchVideoUrl ? <a href={selectedPitch.pitchVideoUrl} target="_blank" rel="noopener noreferrer" style={{color: 'blue', textDecoration:'underline'}}>🎬 Watch Pitch Video</a> : "Not provided"}</p> {/* Added Emoji */}

                  <hr style={{margin: '15px 0', borderTop: '1px solid #eee', borderBottom: 'none'}} />

                  <p><strong>Value Prop:</strong> {selectedPitch.valueProp || "N/A"}</p>
                  <p><strong>Problem:</strong> {selectedPitch.problem || "N/A"}</p>
                  <p><strong>Solution:</strong> {selectedPitch.solution || "N/A"}</p>
                  <p><strong>Business Model:</strong> {selectedPitch.businessModel || "N/A"}</p>
                  <p><strong>Paying Customers:</strong> {selectedPitch.hasPayingCustomers ? 'Yes' : 'No'}</p>
                  <p><strong>Grant Use:</strong> {selectedPitch.grantUsePlan || "N/A"}</p>

                  <hr style={{margin: '15px 0', borderTop: '1px solid #eee', borderBottom: 'none'}} />

                  <p><strong>Zip Code:</strong> {selectedPitch.zipCode || "N/A"}</p>
                  <p><strong>Self Identification Tags:</strong> {selectedPitch.selfIdentification?.join(", ") || "N/A"}</p>
                  {/* Add other fields if needed */}
                  {/* <p><strong>Heard About:</strong> {selectedPitch.heardAbout || "N/A"}</p> */}
                </div>

                {/* Review Form Column */}
                <div style={{ flex: '1 1 350px', minWidth: '300px', background: '#fff', padding: '15px 20px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.1)', maxHeight: 'calc(100vh - 250px)', overflowY:'auto' }}>
                  {/* Use user's review state `reviews` to check if editing */}
                  <h4 style={{marginTop: 0, borderBottom: '1px solid #eee', paddingBottom:'10px'}}>{reviews[selectedPitch.id] ? '✏️ Edit Your Review' : '✍️ Submit Your Review'}</h4> {/* Added Emojis */}
                  {/* Ensure form populates correctly using reviewFormData */}
                  <form onSubmit={handleReviewSubmit}>
                    {/* Rating Selects */}
                    <div style={{marginBottom: '15px'}}>
                      <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}> Pitch Video Clarity & Persuasiveness</label>
                      <select name="pitchVideoRating" value={reviewFormData.pitchVideoRating || ""} onChange={handleReviewFormChange} required style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '0px', fontFamily:'inherit', background:'#fff', fontSize:'1em'}}>
                        <option value="" disabled>-- Rate Video --</option>
                        <option value="Strong">Strong</option>
                        <option value="Average">Average</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>
                    <div style={{marginBottom: '15px'}}>
                      <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}> Business Model Viability</label>
                      <select name="businessModelRating" value={reviewFormData.businessModelRating || ""} onChange={handleReviewFormChange} required style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '0px', fontFamily:'inherit', background:'#fff', fontSize:'1em'}}>
                        <option value="" disabled>-- Rate Model --</option>
                        <option value="Strong">Strong</option>
                        <option value="Average">Average</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>
                    <div style={{marginBottom: '15px'}}>
                      <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}> Product Market Fit Evidence</label>
                      <select name="productMarketFitRating" value={reviewFormData.productMarketFitRating || ""} onChange={handleReviewFormChange} required style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '0px', fontFamily:'inherit', background:'#fff', fontSize:'1em'}}>
                        <option value="" disabled>-- Rate Fit --</option>
                        <option value="Strong">Strong</option>
                        <option value="Average">Average</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>
                    <div style={{marginBottom: '15px'}}>
                      <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}> Overall LP Recommendation</label>
                      <select name="overallLpRating" value={reviewFormData.overallLpRating || ""} onChange={handleReviewFormChange} required style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '0px', fontFamily:'inherit', background:'#fff', fontSize:'1em'}}>
                        <option value="" disabled>-- Select Overall Rating --</option>
                        {/* Added Emojis to options */}
                        <option value="Favorite"> ⭐ Favorite (Strongly Recommend)</option>
                        <option value="Consideration"> 💡 Consideration (Potential)</option>
                        <option value="Pass"> ❌ Pass (Not a Fit/Concerns)</option>
                        <option value="Ineligible"> 🚫 Ineligible (Doesn't meet criteria)</option>
                      </select>
                    </div>
                    {/* Comments Textarea */}
                    <div style={{marginBottom: '20px'}}>
                      <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}> Private Comments (Optional, for GNF team)</label>
                      <textarea
                        name="comments"
                        rows="5"
                        style={{ width: "calc(100% - 18px)", padding: '8px', border: '1px solid #ccc', borderRadius: '0px', fontFamily:'inherit', fontSize:'1em' }}
                        value={reviewFormData.comments || ""}
                        onChange={handleReviewFormChange}
                        placeholder="Your internal notes, strengths, weaknesses, questions..."
                      />
                    </div>
                    {/* Submit Button */}
                    <RetroButton type="submit" primary style={{ minWidth: '150px' }}>
                      {/* Check user's review state `reviews` */}
                      {reviews[selectedPitch.id] ? '💾 Update Review' : '✨ Submit Review'} {/* Added Emojis */}
                    </RetroButton>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* --- Admin Panel Tab Content --- */}
      {activeTab === 'adminPanel' && isAdmin && (
        <div style={{ background: '#fff', border: '1px solid #ccc', padding: '15px 20px', borderRadius: '4px' }}>
          {/* Admin Sub-Tabs Navigation - Reduced font, unabbreviated "Super Admin Tools" */}
          <div style={{ display: 'flex', borderBottom: '1px solid #aaa', marginBottom: '20px', marginTop: '-5px', fontSize: '0.9em' /* Reduced font */ }}>
            <button
              onClick={() => setActiveAdminTab('pitchesAndReviews')}
              style={{ padding: '7px 12px', border: 'none', borderBottom: activeAdminTab === 'pitchesAndReviews' ? '3px solid #FFD6EC' : '3px solid transparent', background: 'transparent', cursor: 'pointer', fontWeight: activeAdminTab === 'pitchesAndReviews' ? 'bold' : 'normal', fontSize:'inherit', fontFamily:'inherit'}}
            >
              Pitches / Reviews
            </button>
            <button
              onClick={() => setActiveAdminTab('grantWinners')}
              style={{
                padding: '7px 12px',
                border: 'none',
                borderBottom: activeAdminTab === 'grantWinners' ? '3px solid #FFD6EC' : '3px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: activeAdminTab === 'grantWinners' ? 'bold' : 'normal',
                fontSize: 'inherit',
                fontFamily: 'inherit'
              }}
            >
              Grant Winners
            </button>
            <button
              onClick={() => setActiveAdminTab('userManagement')}
              style={{ padding: '7px 12px', border: 'none', borderBottom: activeAdminTab === 'userManagement' ? '3px solid #FFD6EC' : '3px solid transparent', background: 'transparent', cursor: 'pointer', fontWeight: activeAdminTab === 'userManagement' ? 'bold' : 'normal', fontSize:'inherit', fontFamily:'inherit'}}
            >
              Users
            </button>
            <button
              onClick={() => setActiveAdminTab('createUser')}
              style={{ padding: '7px 12px', border: 'none', borderBottom: activeAdminTab === 'createUser' ? '3px solid #FFD6EC' : '3px solid transparent', background: 'transparent', cursor: 'pointer', fontWeight: activeAdminTab === 'createUser' ? 'bold' : 'normal', fontSize:'inherit', fontFamily:'inherit'}}
            >
              Create User
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setActiveAdminTab('superAdminTools')}
                style={{ padding: '7px 12px', border: 'none', borderBottom: activeAdminTab === 'superAdminTools' ? '3px solid #FFD6EC' : '3px solid transparent', background: 'transparent', cursor: 'pointer', fontWeight: activeAdminTab === 'superAdminTools' ? 'bold' : 'normal', fontSize:'inherit', fontFamily:'inherit'}}
              >
                Super Admin Tools {/* Changed back */}
              </button>
            )}
          </div>

          {/* Admin: Pitches & Reviews Sub-Tab Content */}
          {activeAdminTab === 'pitchesAndReviews' && (
            <>
              <h4> Admin: Pitches + LP Reviews Summary</h4>
              {/* Filters for Admin Pitches - Styles adjusted, Fav filter changed to dropdown */}
              <div style={{ display: "flex", flexWrap: 'wrap', gap: "8px", marginBottom: "20px", padding: '12px', border: '1px solid #eee', background: '#f8f8f8', borderRadius: '4px', alignItems: 'center', fontSize: '0.85em' /* Reduced font size */ }}>
                {isSuperAdmin && (
                  <select value={adminChapterFilter} onChange={(e) => setAdminChapterFilter(e.target.value)} style={{ padding: '6px', height: '30px', border:'1px solid #ccc', fontFamily:'inherit', background:'#fff', fontSize:'inherit', marginRight: '4px' }}>
                    <option value="">All Chapters</option>
                    {[...new Set(adminPitches.map((p) => p.chapter).filter(Boolean))].sort().map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                )}
                <select value={adminQuarterFilter} onChange={(e) => setAdminQuarterFilter(e.target.value)} style={{ padding: '6px', height: '30px', border:'1px solid #ccc', fontFamily:'inherit', background:'#fff', fontSize:'inherit', marginRight: '4px' }}>
                  <option value="">All Quarters</option>
                  {[...new Set(adminPitches.map((p) => p.quarter).filter(Boolean))]
                    .sort((a, b) => {
                      const [aQ, aY] = a.split(' '); const [bQ, bY] = b.split(' ');
                      if (bY !== aY) return parseInt(bY) - parseInt(aY);
                      return parseInt(bQ.substring(1)) - parseInt(aQ.substring(1));
                    })
                    .map((q) => (<option key={q} value={q}>{q}</option>))}
                </select>
                {/* Favorite Filter Dropdown */}
                <select value={adminFavoriteFilterMode} onChange={(e) => setAdminFavoriteFilterMode(e.target.value)} style={{ padding: '6px', height: '30px', border:'1px solid #ccc', fontFamily:'inherit', background:'#fff', fontSize:'inherit', marginRight: '4px' }}>
                    <option value="all">All Ratings</option>
                    <option value="favsOnly">⭐ Favorites Only</option>
                    <option value="favsAndCons">⭐/💡 Favs & Considerations</option>
                </select>
                <input
                  type="text"
                  placeholder="Search name, business, email..."
                  value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)}
                  style={{ flexGrow: 1, minWidth: '180px', padding: '6px', height: '16px', /* Adjusted */ border: '1px solid #ccc', fontFamily:'inherit', fontSize:'inherit', marginRight: '4px' }}
                />
                {/* Hide Pass Button */}
                <RetroButton
                    onClick={() => setAdminHidePassed(!adminHidePassed)}
                    title={adminHidePassed ? "Show pitches with only Pass/Ineligible reviews" : "Hide pitches with only Pass/Ineligible reviews"}
                    style={{ height: '30px', fontSize: 'inherit', background: adminHidePassed ? '#ccc' : '#eee', padding: '0 10px', marginRight: '4px' }}
                >
                    {adminHidePassed ? 'Show All Pass' : 'Hide ❌/🚫'}
                </RetroButton>
                {/* Export Button */}
                <RetroButton onClick={handleAdminPitchExport} style={{height:'30px', fontSize: 'inherit', padding:'0 12px'}}> 💾 Export CSV</RetroButton> {/* Added Emoji */}
              </div>

              {/* Admin Pitches List - Uses adminFilteredSortedPitches */}
              {adminFilteredSortedPitches.length === 0 && <p style={{ color: '#666', textAlign:'center', padding:'20px' }}>No pitches match the current filters.</p>}
              {adminFilteredSortedPitches.map((p) => {
                const groupedReviews = getGroupedReviewsForAdmin(p.id); // Get the summary
                const formattedAdminDate = formatDate(p.createdAt || p.createdDate);
                return (
                  <div key={p.id} style={{ padding: "15px", border: "1px solid #ccc", marginBottom: "15px", borderRadius: "6px", background: p.isWinner ? "#d7fddc" : "#fff", boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    {/* Top Section: Info & Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      {/* Pitch Info */}
                      <div style={{ flexGrow: 1 }}>
                        <strong style={{ fontSize: '1.1em' }}>{p.businessName || "N/A"}</strong> by {p.founderName || "N/A"} <br />
                        <em style={{ color: '#555', display:'block', margin:'3px 0' }}>{p.valueProp?.substring(0, 120)}{p.valueProp?.length > 120 ? '...' : ''}</em>
                        <span style={{ fontSize: '0.9em', color: '#777' }}>
                          Chapter: {p.chapter || "N/A"} | Quarter: {p.quarter || "N/A"} | Submitted: {formattedAdminDate}
                        </span>
                        {p.isWinner && <span style={{ marginLeft: '10px', color: 'green', fontWeight: 'bold', background: '#c3e6cb', padding: '1px 5px', borderRadius: '3px', display:'inline-flex', alignItems:'center', gap:'4px' }}> ✅ Grant Winner</span>} {/* Added Emoji */}
                      </div>
                      {/* Action Buttons - Reduced font, improved centering */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        <RetroButton onClick={() => handleAssignWinner(p.id, p.isWinner)} style={{ background: p.isWinner ? '#ffcdd2' : '#c8e6c9', color: p.isWinner ? '#b71c1c' : '#1b5e20', border: p.isWinner ? '1px solid #ef9a9a' : '1px solid #a5d6a7', padding: '5px 10px', height: '30px', fontSize: '0.9em' }}>
                          {p.isWinner ? '🏆 Remove Winner' : '🏆 Assign Winner'} {/* Added Emoji */}
                        </RetroButton>
                        <RetroButton onClick={() => setExpandedPitchId(expandedPitchId === p.id ? null : p.id)} style={{padding: '5px 10px', height: '30px', fontSize: '0.9em' }}>
                          {expandedPitchId === p.id ? '🔼 Hide Details' : '🔽 View Details'} {/* Added Emojis */}
                        </RetroButton>
                      </div>
                    </div>
                    {/* Review Summary Section */}
                    {groupedReviews.count > 0 && (
                      <div style={{ marginTop: "12px", paddingTop: '12px', borderTop: '1px dashed #eee', fontSize: "13px", color: '#444' }}>
                        <strong>LP Reviews ({groupedReviews.count}):</strong>
                        {/* Sort ratings: Favorite > Consideration > Pass > Ineligible > No Rating */}
                        {Object.entries(groupedReviews.byRating)
                          .sort(([ratingA], [ratingB]) => {
                            const order = { "Favorite": 1, "Consideration": 2, "Pass": 3, "Ineligible": 4, "No Rating": 5 };
                            return (order[ratingA] || 99) - (order[ratingB] || 99);
                          })
                          .map(([rating, data]) => (
                            <span key={rating} style={{ marginLeft: '10px', border: '1px solid #eee', padding: '2px 6px', borderRadius: '3px', background: '#f9f9f9', display: 'inline-flex', alignItems:'center', gap:'4px', marginBottom: '3px', cursor:'help' }} title={`Reviewers: ${data.reviewers.join(', ')}`}>
                              {/* Ensure ratingEmojis are prepended */}
                              {ratingEmojis[rating] || ''} {rating}: <strong>{data.count}</strong>
                            </span>
                          ))}
                      </div>
                    )}
                    {groupedReviews.count === 0 && (
                      <div style={{ marginTop: "12px", paddingTop: '12px', borderTop: '1px dashed #eee', fontSize: "13px", color: '#888' }}>
                        No LP reviews submitted yet.
                      </div>
                    )}
                    {/* Expanded Details Section (Conditional) */}
                    {expandedPitchId === p.id && (
                      <div style={{ marginTop: "15px", paddingTop: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '20px', flexWrap:'wrap' }}>
                        {/* Pitch Details */}
                        <div style={{ flex: '1 1 50%', minWidth: '300px', fontSize: "13px", lineHeight: '1.7', background: '#fdfdfd', padding: '15px', borderRadius: '4px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight:'400px', overflowY:'auto', border:'1px solid #f0f0f0' }}>
                            <strong>Full Pitch Details:</strong><br />
                            ----------------<br />
                            Name: {p.founderName || "N/A"}<br />
                            Email: {p.email || "N/A"}<br />
                            Zip Code: {p.zipCode || "N/A"}<br />
                            Website: {p.website || "N/A"}<br />
                            Video URL: {p.pitchVideoUrl || "N/A"}<br />
                            Video File: {p.pitchVideoFile || "N/A"} {/* Added */} <br />
                            Heard About: {p.heardAbout || "N/A"}<br />
                            Paying Customers: {p.hasPayingCustomers ? 'Yes':'No'}<br />
                            Self ID Tags: {p.selfIdentification?.join(", ") || "N/A"}<br />
                            ----------------<br />
                            Value Proposition: {p.valueProp || "N/A"}<br />
                            Problem: {p.problem || "N/A"}<br />
                            Solution: {p.solution || "N/A"}<br />
                            Business Model: {p.businessModel || "N/A"}<br />
                            Use of Grant Funds: {p.grantUsePlan || "N/A"}<br />
                            Founder Bio: {p.bio || "N/A"} {/* Added */} <br />
                        </div>
                        {/* Aggregated Comments Added */}
                        <div style={{ flex: '1 1 40%', minWidth: '250px', fontSize: "13px", lineHeight: '1.6', background: '#fff8e1', padding: '15px', borderRadius: '4px', maxHeight:'400px', overflowY:'auto', border:'1px solid #eee' }}>
                            <strong>Aggregated LP Comments ({groupedReviews.comments.length}):</strong><br />
                            {groupedReviews.comments.length > 0 ? (
                                groupedReviews.comments.map((comment, index) => (
                                    <div key={index} style={{ borderBottom: '1px dashed #ccc', padding: '8px 0', marginTop: '8px' }}>
                                        "{comment}"
                                    </div>
                                ))
                            ) : (
                                <p style={{ fontStyle: 'italic', color: '#666', marginTop: '10px' }}>No comments provided in reviews.</p>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
          
          {activeAdminTab === 'grantWinners' && (() => {
            const winnerPitches = adminFilteredSortedPitches.filter(p => p.isWinner);

            const handleFieldChange = (pitchId, field, value) => {
              if (field === "about") {
                setAboutById(prev => ({ ...prev, [pitchId]: value }));
              } else if (field === "website") {
                setWebsiteById(prev => ({ ...prev, [pitchId]: value }));
              } else if (field === "latitude") {
                setLatById(prev => ({ ...prev, [pitchId]: value }));
              } else if (field === "longitude") {
                setLngById(prev => ({ ...prev, [pitchId]: value }));
              } else if (field === "pitch-photo") {
                setPhotosById(prev => ({ ...prev, [pitchId]: value }));
              }
            
              setPendingChanges(prev => ({
                ...prev,
                [pitchId]: {
                  ...(prev[pitchId] || {}),
                  [field]: value
                }
              }));
            };

            const handlePhotoUpload = async (pitchId, file) => {
              if (!file) {
                console.log("No file selected");
                return;
              }
              
              console.log("Starting upload for:", {
                pitchId,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
              });
              
              showAppAlert('Uploading photo...');
              
              try {
                // Create a storage reference
                const storageRef = ref(storage, `pitch-photos/${pitchId}_${file.name}`);
                console.log("Storage reference created:", `pitch-photos/${pitchId}_${file.name}`);
                
                // Upload the file
                console.log("Starting upload...");
                const uploadTask = await uploadBytes(storageRef, file);
                console.log("Upload complete:", uploadTask);
                
                // Get the download URL
                console.log("Getting download URL...");
                const photoURL = await getDownloadURL(storageRef);
                console.log("Download URL received:", photoURL);
                
                // Update local state
                setPhotosById(prev => ({ ...prev, [pitchId]: photoURL }));
                setPendingChanges(prev => ({
                  ...prev,
                  [pitchId]: {
                    ...(prev[pitchId] || {}),
                    photoURL: photoURL
                  }
                }));
                
                showAppAlert('Photo uploaded successfully! Click "Save All Changes" to save.');
                
              } catch (error) {
                console.error("Detailed upload error:", {
                  message: error.message,
                  code: error.code,
                  fullError: error
                });
                
                // More specific error messages
                let errorMessage = 'Failed to upload photo: ';
                if (error.code === 'storage/unauthorized') {
                  errorMessage += 'You do not have permission to upload files.';
                } else if (error.code === 'storage/canceled') {
                  errorMessage += 'Upload was canceled.';
                } else if (error.code === 'storage/unknown') {
                  errorMessage += 'An unknown error occurred.';
                } else {
                  errorMessage += error.message;
                }
                
                showAppAlert(errorMessage);
              }
            };

            const handleSaveAllChanges = async (pitchId) => {
              const changes = pendingChanges[pitchId] || {};
              if (Object.keys(changes).length === 0) {
                showAppAlert('No changes to save.');
                return;
              }

              try {
                // Update all changes at once
                await updateDoc(doc(db, "pitches", pitchId), changes);
                
                // Clear pending changes for this pitch
                setPendingChanges(prev => {
                  const newPending = { ...prev };
                  delete newPending[pitchId];
                  return newPending;
                });
                
                showAppAlert('All changes saved successfully!');
                loadAdminData();
              } catch (err) {
                console.error('Save error:', err);
                showAppAlert(`Failed to save changes: ${err.message}`);
              }
            };

            const filteredWinners = winnerPitches
              .filter(p => !winnerChapterFilter || p.chapter === winnerChapterFilter)
              .filter(p => !winnerSearchTerm || 
                p.businessName?.toLowerCase().includes(winnerSearchTerm.toLowerCase()) ||
                p.founderName?.toLowerCase().includes(winnerSearchTerm.toLowerCase())
              );

            return (
              <div>
                <h4> Grant Winners Editor</h4>
                <p style={{ fontSize: '0.9em', color: '#555', marginBottom: '20px' }}>
                  Use this panel to edit public-facing info for grant winners. Updates here power the Founder Map and Neighborhood Navigator.
                </p>

                {/* Filters */}
                <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div>
                    <label><strong>Filter by Chapter: </strong></label>
                    <select
                      value={winnerChapterFilter}
                      onChange={(e) => setWinnerChapterFilter(e.target.value)}
                      style={{ padding: '6px', fontFamily: 'inherit' }}
                    >
                      <option value="">All Chapters</option>
                      {[...new Set(winnerPitches.map(p => p.chapter).filter(Boolean))].sort().map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label><strong>Search: </strong></label>
                    <input
                      type="text"
                      placeholder="Search business or founder..."
                      value={winnerSearchTerm}
                      onChange={(e) => setWinnerSearchTerm(e.target.value)}
                      style={{ padding: '6px', width: '250px', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>

                {filteredWinners.length === 0 && (
                  <p style={{ fontStyle: 'italic', color: '#888' }}>No winners found matching your criteria.</p>
                )}

                {filteredWinners.map((p) => (
                  <div key={p.id} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px', background: '#f9f9f9' }}>
                    <h5 style={{ marginTop: 0 }}>{p.businessName} <span style={{ color: '#666', fontWeight: 'normal' }}>by {p.founderName}</span></h5>
                    <p style={{ fontSize: '0.85em', color: '#555', margin: '5px 0' }}>
                      Chapter: {p.chapter} | Quarter: {p.quarter} | Zip Code: {p.zipCode}
                    </p>

                    {/* Website */}
                    <div style={{ margin: '10px 0' }}>
                      <label><strong>Website:</strong></label><br />
                      <input
                        type="text"
                        value={websiteById[p.id] ?? p.website ?? ""}
                        onChange={(e) => handleFieldChange(p.id, "website", e.target.value)}
                        placeholder="https://..."
                        style={{ width: '100%', padding: '6px', fontFamily: 'inherit' }}
                      />
                    </div>

                    {/* About Section */}
                    <div style={{ margin: '10px 0' }}>
                      <label><strong>About Section:</strong></label><br />
                      <textarea
                        rows={4}
                        value={aboutById[p.id] ?? p.about ?? ""}
                        onChange={(e) => handleFieldChange(p.id, "about", e.target.value)}
                        style={{ width: '100%', padding: '6px', fontFamily: 'inherit', fontSize: '0.95em' }}
                        placeholder="Write a short public description about this founder or business..."
                      />
                    </div>

                    {/* Coordinates */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label><strong>Latitude:</strong></label><br />
                        <input
                          type="number"
                          step="any"
                          value={latById[p.id] ?? p.latitude ?? ""}
                          onChange={(e) => handleFieldChange(p.id, "latitude", e.target.value)}
                          style={{ width: '100%', padding: '6px', fontFamily: 'inherit' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label><strong>Longitude:</strong></label><br />
                        <input
                          type="number"
                          step="any"
                          value={lngById[p.id] ?? p.longitude ?? ""}
                          onChange={(e) => handleFieldChange(p.id, "longitude", e.target.value)}
                          style={{ width: '100%', padding: '6px', fontFamily: 'inherit' }}
                        />
                      </div>
                    </div>

                    {/* Pitch Photo (Text Input instead of upload) */}
                    <div style={{ margin: '10px 0' }}>
                      <label><strong>Update Photo (URL):</strong></label><br />
                      <input
                        type="text"
                        value={photosById[p.id] ?? p["pitch-photo"] ?? ""}
                        onChange={(e) => handleFieldChange(p.id, "pitch-photo", e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        style={{ width: '100%', padding: '6px', fontFamily: 'inherit' }}
                      />
                    </div>

                    {/* Single Save Button */}
                    <RetroButton 
                      onClick={() => handleSaveAllChanges(p.id)}
                      style={{ 
                        marginTop: '15px',
                        padding: '6px 12px',
                        fontSize: '0.9em',
                        background: pendingChanges[p.id] ? '#d4edda' : '#e0e0e0',
                        border: pendingChanges[p.id] ? '1px solid #c3e6cb' : '1px solid #aaa'
                      }}
                      disabled={!pendingChanges[p.id]}
                    >
                      💾 Save All Changes
                    </RetroButton> {/* Added Emoji */}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Admin: User Management Sub-Tab Content */}
          {activeAdminTab === 'userManagement' && (
            <>
              <h4> User Management</h4>

              {/* Create New User Section REMOVED */}
               <p style={{fontSize: '0.9em', color: '#444', background:'#f0f0f0', border:'1px dashed #ccc', padding:'10px', borderRadius:'4px', marginBottom:'20px'}}>
                 Super Admins can create new users via the "Create User" tab. Use the table below to manage roles, chapters, reset passwords, or delete portal profile data for existing users.
               </p>


              {/* Registered User Accounts List */}
              <h5>Registered User Accounts</h5>
              {(!Array.isArray(sortedUsers) || sortedUsers.length === 0) ? (
                <p style={{ color: '#666', textAlign:'center', padding:'15px', background:'#f5f5f5', border:'1px dashed #ddd' }}>No registered user accounts found matching your view.</p>
              ) : (
                <div style={{ overflowX: 'auto', border:'1px solid #ccc' }}>
                  <table style={{ width: "100%", minWidth:'800px', fontSize: "14px", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left", background: '#f2f2f2' }}>
                        <th style={{ padding: "10px 8px" }}>Name</th>
                        <th style={{ padding: "10px 8px" }}>Email</th>
                        <th style={{ padding: "10px 8px" }}>Role</th>
                        <th style={{ padding: "10px 8px" }}>Chapter</th>
                        <th style={{ padding: "10px 8px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers
                        // Optionally filter users by chapter if the current user is an Admin but not SuperAdmin
                        .filter(u => isSuperAdmin || !userChapter /* Show all if user is superadmin or user has no chapter */ || u.chapter === userChapter || !u.chapter /* Also show users without chapter assigned */ )
                        .map((u) => {
                          // Determine if controls should be disabled for this user row
                          const isSelf = u.uid === user.uid;
                          const targetIsSuperAdmin = u.role === 'superAdmin';
                          const disableRoleChange = isSelf || (targetIsSuperAdmin && !isSuperAdmin) || (!isAdmin); // Added !isAdmin just in case
                          const disableChapterChange = !isSuperAdmin || isSelf; // Only SuperAdmin can change chapter, cannot change own chapter
                          const disablePasswordReset = isSelf;
                          const disableDelete = isSelf || (targetIsSuperAdmin && !isSuperAdmin);

                          return (
                            <tr key={u.uid} style={{ borderBottom: "1px solid #eee", background: isSelf ? '#f0f8ff' : '#fff' }}>
                              <td style={{ padding: "8px" }}>{u.name || <i style={{color: '#888'}}>(No Name Set)</i>}</td>
                              <td style={{ padding: "8px" }}>{u.email}</td>
                              {/* Role Select */}
                              <td style={{ padding: "8px" }}>
                                <select
                                  value={u.role || 'unauthorized'} // Default to unauthorized if role missing
                                  onChange={(e) => handleUpdateUser(u.uid, "role", e.target.value)}
                                  disabled={disableRoleChange}
                                  style={{ padding: "4px", height: "28px", maxWidth: '150px', border: '1px solid #ccc', borderRadius: '3px', fontFamily:'inherit', background: disableRoleChange ? '#eee' : '#fff', fontSize:'1em' }}
                                  title={disableRoleChange ? (isSelf ? "Cannot change own role" : "Permission denied") : "Change user role"}
                                >
                                  <option value="unauthorized"> Unauthorized</option>
                                  <option value="lp">LP</option>
                                  <option value="admin">Admin</option>
                                  {/* Only show SuperAdmin option if current user is SuperAdmin OR if target is already SuperAdmin (to allow demotion maybe?) */}
                                  {(isSuperAdmin || targetIsSuperAdmin) && <option value="superAdmin"> SuperAdmin</option>}
                                </select>
                              </td>
                              {/* Chapter Select (Only SuperAdmin can change) */}
                              <td style={{ padding: "8px" }}>
                                <select
                                  value={u.chapter || ""}
                                  onChange={(e) => handleUpdateUser(u.uid, "chapter", e.target.value)}
                                  disabled={disableChapterChange}
                                  style={{ padding: "4px", height: "28px", maxWidth: '180px', border: '1px solid #ccc', borderRadius: '3px', fontFamily:'inherit', background: disableChapterChange ? '#eee' : '#fff', fontSize:'1em' }}
                                  title={disableChapterChange ? "Only SuperAdmin can change chapter (cannot change own)" : "Change user chapter"}
                                >
                                  <option value="">-- No Chapter --</option>
                                  {/* TODO: Make chapter list dynamic or constant */}
                                  <option value="Western New York">Western New York</option>
                                  <option value="Denver">Denver</option>
                                  {/* Add other chapters */}
                                </select>
                              </td>
                              {/* Action Buttons */}
                              <td style={{ padding: "8px", whiteSpace: 'nowrap' }}>
                                <RetroButton
                                  onClick={() => handleAdminPasswordReset(u.email)}
                                  disabled={disablePasswordReset}
                                  style={{ background: disablePasswordReset ? '#ccc':'#fff3e0', color: disablePasswordReset ? '#666':'#e65100', border: `1px solid ${disablePasswordReset ? '#bbb' : '#ffe0b2'}`, padding: '3px 8px', fontSize: '0.9em', marginRight: '5px' }}
                                  title={disablePasswordReset ? "Cannot reset own password here" : `Send password reset to ${u.email}`}
                                >
                                  🔑 Reset Pwd {/* Added Emoji */}
                                </RetroButton>
                                <RetroButton
                                  onClick={() => handleDeleteUser(u.uid, u.email)}
                                  disabled={disableDelete}
                                  style={{ background: disableDelete ? '#ccc' : '#ffebee', color: disableDelete ? '#666' : 'red', border: `1px solid ${disableDelete ? '#bbb' : '#ffcdd2'}`, padding: '3px 8px', fontSize: '0.9em' }}
                                  title={disableDelete ? (isSelf ? "Cannot delete self" : "Permission denied") : `Delete portal profile data for ${u.email}`}
                                >
                                  🗑️ Delete {/* Added Emoji */}
                                </RetroButton>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Admin: Create User Sub-Tab Content */}
          {activeAdminTab === 'createUser' && isAdmin && (
            <div>
              <h4>Create New LP User</h4>
              <p style={{ fontSize: '0.9em', color: '#555', marginBottom: '20px' }}>
                Create a new Limited Partner user profile. The user will need to use the "Forgot Password" 
                flow to create their authentication credentials on first access.
              </p>
              
              
              <div style={{ maxWidth: '600px', background: '#f9f9f9', padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
                <div style={{ marginBottom: '20px', padding: '15px', background: '#e3f2fd', border: '1px solid #1976d2', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#1976d2' }}>
                    📋 Before You Begin:
                  </p>
                  <ol style={{ margin: '0', paddingLeft: '20px', color: '#555' }}>
                    <li>Go to Firebase Console → Authentication</li>
                    <li>Click "Add user" and create the account</li>
                    <li>Copy the generated UID</li>
                    <li>Paste it below to create the matching Firestore profile</li>
                  </ol>
                </div>
                
                <form onSubmit={handleCreateUser}>
                  {/* UID */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Firebase UID <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newUserData.uid || ''}
                      onChange={(e) => setNewUserData({ ...newUserData, uid: e.target.value.trim() })}
                      required
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.9em' }}
                      placeholder="Paste the UID from Firebase Console"
                    />
                    <small style={{ color: '#666', fontSize: '0.85em' }}>
                      This will be used as the document ID in Firestore
                    </small>
                  </div>
                  
                  {/* Email */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Email Address <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={newUserData.email || ''}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value.toLowerCase() })}
                      required
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'inherit' }}
                      placeholder="user@example.com"
                    />
                  </div>
                  
                  {/* Name */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Full Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newUserData.name || ''}
                      onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                      required
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'inherit' }}
                      placeholder="Jane Smith"
                    />
                  </div>
                  
                  {/* Role */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Role <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      value={newUserData.role || 'lp'}
                      onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                      required
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'inherit', background: '#fff' }}
                    >
                      <option value="lp">Limited Partner (LP)</option>
                      <option value="admin">Admin</option>
                      {isSuperAdmin && <option value="superAdmin">Super Admin</option>}
                    </select>
                  </div>
                  
                  {/* Chapter */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Chapter <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      value={newUserData.chapter || ''}
                      onChange={(e) => setNewUserData({ ...newUserData, chapter: e.target.value })}
                      required
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'inherit', background: '#fff' }}
                    >
                      <option value="">-- Select Chapter --</option>
                      <option value="Western New York">Western New York</option>
                      <option value="Denver">Denver</option>
                      {/* Add other chapters as needed */}
                    </select>
                  </div>
                  
                  {/* Anniversary Date */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Join Date (Anniversary) <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={newUserData.anniversary || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setNewUserData({ ...newUserData, anniversary: e.target.value })}
                      required
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'inherit' }}
                    />
                  </div>
                  
                  
                  {/* Submit Buttons */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <RetroButton
                      type="submit"
                      primary
                      style={{ 
                        background: '#d4edda', 
                        border: '1px solid #c3e6cb',
                        padding: '8px 20px',
                        fontSize: '0.9em'
                      }}
                    >
                      ✅ Create User
                    </RetroButton>
                    <RetroButton
                      type="button"
                      onClick={() => {
                        setNewUserData({
                          email: '',
                          name: '',
                          role: 'lp',
                          chapter: '',
                          anniversary: new Date().toISOString().split('T')[0]
                        });
                      }}
                      style={{ 
                        background: '#f0f0f0',
                        padding: '8px 20px',
                        fontSize: '0.9em'
                      }}
                    >
                      🔄 Reset Form
                    </RetroButton>
                  </div>
                </form>
              </div>
              
            </div>
          )}

          {/* Admin: Super Admin Tools Sub-Tab Content (Conditional) */}
          {activeAdminTab === 'superAdminTools' && isSuperAdmin && (
            <div>
              <h4> Super Admin Tools</h4>
              <p>This area is reserved for SuperAdmin functions.</p>
              
              {/* Anniversary Badge Assignment */}
              <div style={{ marginBottom: '30px', padding: '20px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '4px' }}>
                <h5 style={{ marginTop: 0 }}>🎂 Anniversary Badge Assignment</h5>
                <p style={{ fontSize: '0.9em', color: '#555' }}>
                  Assign OG Neighbor and Year Club badges to all qualifying LPs based on their join dates.
                </p>
                <ul style={{ fontSize: '0.85em', color: '#666' }}>
                  <li>🏛️ OG Neighbor - for LPs who joined in 2023</li>
                  <li>📅 2 Year Club - for LPs active 2+ years</li>
                  <li>🎂 3 Year Club - for LPs active 3+ years</li>
                  <li>🎊 4 Year Club - for LPs active 4+ years</li>
                  <li>🏅 5 Year Club - for LPs active 5+ years</li>
                </ul>
                <RetroButton
                  onClick={handleAssignAnniversaryBadges}
                  style={{
                    background: '#d4edda',
                    border: '1px solid #c3e6cb',
                    padding: '8px 16px',
                    fontSize: '0.9em',
                    marginTop: '10px'
                  }}
                >
                  🎊 Assign Anniversary Badges
                </RetroButton>
              </div>
              
              <div style={{border:'1px dashed #ccc', padding:'20px', background:'#fafafa'}}>
                <strong>Coming Soon:</strong> More super admin tools for managing chapters, global settings, etc.
              </div>
            </div>
          )}
        </div>
      )} {/* End Admin Panel Content */}
      
      {/* --- Badges Tab Content --- */}
      {activeTab === 'badges' && (
        <TrophyCase 
          badges={userBadges || []}
          userStats={userStats || {}}
        />
      )}
      </div> {/* End Main Content Area */}
    </div> {/* End Main Content Container */}
  </div> // End Logged-In Container
); // End Main Return

} // End Component