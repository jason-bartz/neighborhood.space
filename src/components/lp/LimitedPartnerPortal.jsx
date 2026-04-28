// LimitedPartnerPortal.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc,
  orderBy, addDoc, getDoc, Timestamp, serverTimestamp, deleteField
} from "firebase/firestore";
import {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut,
  isSignInWithEmailLink, signInWithEmailLink
} from "firebase/auth";
import { db, auth, storage, functions } from "../../firebaseConfig.js";
import { httpsCallable } from "firebase/functions";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import Confetti from "react-confetti";
import StatsBar from "../pitch/StatsBar";
import { BadgeNotification, TrophyCase } from "../badges/BadgeDisplay";
import { BADGES } from "../../data/badgeDefinitions";
import { getChapterMembershipLinks } from "../../data/chapterConfig";
import BadgeIcon from "../icons/BadgeIcon";
import ReviewRatingIcon from "../icons/ReviewRatingIcon";
import StatusIcon from "../icons/StatusIcon";
import PitchMap from "../pitch/PitchMap";
import {
  trackReviewSubmission,
  initializeUserStats,
  calculateRetroactiveStats,
  updateWinnerPredictions,
  reverseWinnerPredictions,
  calculateChapterRankings,
  getCurrentQuarter
} from "../../services/statsTracking";
import {
  RetroButton,
  RetroPill,
  EmptyState,
  ConfirmDialog,
  AdminTabStrip,
  useConfirm,
} from "../ui/retro";
import {
  roleLabel,
  roleTonePill,
  ratingTonePill,
  dashIfEmpty,
} from "../../helpers/labels";
import {
  resolveAwardAmount,
  sumAwarded,
  chaptersByNameMap,
} from "../../helpers/awardAmount";
import { isLMIZip, LMI_THRESHOLD, LMI_ACS_YEAR } from "../../helpers/lmiZips";
import ResourceLibrary from "./resources/ResourceLibrary";
import FormsLibrary from "./forms-library/FormsLibrary";
import AssetsLibrary from "./assets-library/AssetsLibrary";
import StatisticsTab from "./statistics/StatisticsTab";
import LiveReviewPane from "./review/LiveReviewPane";
import "./review/live-review.css";

// --- Constants ---
const provider = new GoogleAuthProvider();
const ratingEmojis = { Favorite: "⭐", Consideration: "💡", Pass: "❌", Ineligible: "🚫" };
const VALID_ROLES = ['lp', 'chapter_director', 'superAdmin'];
const APP_NAME = "Neighborhood OS";
const CHAPTERS = ['Western New York', 'Central New York', 'Capital Region', 'Denver'];
// Mirrors PITCH_CATEGORIES in functions/aiSummary.js — keep in sync.
const PITCH_CATEGORIES = ['Food & Drink', 'Products', 'Wellness', 'Arts & Media', 'Education', 'Services', 'Tech', 'Civic & Impact'];
// Admin-only LP rating weights. Shown in the admin review summary so we can rank pitches,
// deliberately NOT exposed on the public review page so reviewers aren't anchored by prior votes.
const LP_RATING_WEIGHTS = { Favorite: 2, Consideration: 1, Pass: 0, Ineligible: -2 };

const generateAboutCallable = httpsCallable(functions, "generateAboutFromApplication");
const inviteUserCallable = httpsCallable(functions, "inviteUser");
const sendSignInLinkCallable = httpsCallable(functions, "sendSignInLink");
const EMAIL_FOR_SIGN_IN_KEY = "lpPortal:emailForSignIn";


// --- Helper Functions for Alerts/Confirmations ---
const showAppAlert = (message) => {
  alert(message); 
};

const showAppConfirm = (message) => {
  return window.confirm(message); 
};


// --- Helper Components ---
function AuthInput({ type = "text", placeholder, value, onChange, required, minLength, ariaLabel }) {
  const autoCompleteType = type === 'email' ? 'email' : type === 'password' ? (placeholder.toLowerCase().includes('new') ? 'new-password' : 'current-password') : 'off';
  const inputMode = type === 'email' ? 'email' : undefined;
  return (
     <input
       type={type}
       placeholder={placeholder}
       value={value}
       onChange={onChange}
       required={required}
       minLength={minLength}
       aria-label={ariaLabel || placeholder}
       inputMode={inputMode}
       className="auth-input"
       style={{ display: 'block', width: 'calc(100% - 20px)', padding: '10px', margin: '10px auto', border: '2px solid', borderColor: '#d48fc7 #fff #fff #d48fc7', boxShadow: 'inset 1px 1px 0 rgba(180,100,160,0.3), inset -1px -1px 0 rgba(255,255,255,0.7)', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit', fontSize: '1em' }}
       autoComplete={autoCompleteType}
     />
  );
}

// RetroButton previously defined inline here; moved to a shared primitive so
// hover/active/focus states are consistent and a11y-friendly across the app.
// See src/components/ui/retro/RetroButton.jsx — imported at the top of this file.

/**
 * Local helper for the Social Cards tab. Wraps the 1080×1080 preview canvas
 * in a Millennium-Bug tile with eyebrow, title, and a ghost-style "Download"
 * button. Clicking either the canvas preview or the button triggers the
 * download callback passed in.
 */
function SocialCardTile({ canvasId, title, eyebrow, description, onDownload }) {
  return (
    <article className="social-card-tile">
      <div className="social-card-tile__preview" onClick={onDownload}>
        <canvas
          id={canvasId}
          width="1080"
          height="1080"
          style={{ display: 'block', width: '100%', height: 'auto', cursor: 'pointer' }}
          aria-label={`${title} preview — click to download`}
        />
      </div>
      <div className="social-card-tile__body">
        <div className="social-card-tile__eyebrow">{eyebrow}</div>
        <h3 className="social-card-tile__title">{title}</h3>
        <p className="social-card-tile__description">{description}</p>
        <button type="button" className="social-card-tile__download" onClick={onDownload}>
          Download PNG
          <span aria-hidden="true">↓</span>
        </button>
      </div>
    </article>
  );
}

/**
 * Local helper used on the Super Admin Tools tab. Renders a Millennium-Bug
 * styled "tool card" — eyebrow label, display-serif heading, body copy,
 * optional footnote / warning, and a single call-to-action. Kept local
 * because the shape is specific to the admin tool rail.
 */
function AdminToolCard({ eyebrow, title, body, footnote, warning, action }) {
  return (
    <section className="admin-tool-card">
      {eyebrow && <div className="admin-tool-card__eyebrow">{eyebrow}</div>}
      <h5 className="admin-tool-card__title">{title}</h5>
      {body && <div className="admin-tool-card__body">{body}</div>}
      {footnote && <div className="admin-tool-card__footnote">{footnote}</div>}
      {warning && (
        <div className="admin-tool-card__warning" role="note">
          {warning}
        </div>
      )}
      {action && <div className="admin-tool-card__action">{action}</div>}
    </section>
  );
}


// --- Main Component ---
export default function LimitedPartnerPortal({ onOpenGNFWebsite, isStandalone = false }) {

// Retro-styled confirm dialog (replaces window.confirm for the main destructive
// admin actions — delete user, delete chapter, delete resource). Other call sites
// can migrate over time using the same `requestConfirm` helper.
const { requestConfirm, confirmDialog } = useConfirm();

// --- State Variables ---
const [user, setUser] = useState(null);
const [isLoadingAuth, setIsLoadingAuth] = useState(true);
const [email, setEmail] = useState("");
const [authError, setAuthError] = useState("");
const [signInLinkSending, setSignInLinkSending] = useState(false);
const [signInLinkSentTo, setSignInLinkSentTo] = useState("");
const [completingSignIn, setCompletingSignIn] = useState(false);
const [activeTab, setActiveTab] = useState("reviewPitches"); // Default tab
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile menu state
const [activeAdminTab, setActiveAdminTab] = useState("pitchesAndReviews");

// Helper to check if viewport is mobile
const isMobile = () => window.innerWidth < 768;
const [showConfetti, setShowConfetti] = useState(false);
const [expandedPitchId, setExpandedPitchId] = useState(null);
const [lpPitches, setLpPitches] = useState([]);
const [lpPitchesLoaded, setLpPitchesLoaded] = useState(false);
const [selectedPitch, setSelectedPitch] = useState(null);
const [reviews, setReviews] = useState({}); // State for user's reviews { pitchId: reviewData }
const [reviewFormData, setReviewFormData] = useState({});
const [hidePassedReviews, setHidePassedReviews] = useState(false);
const [reviewSearchTerm, setReviewSearchTerm] = useState("");
const [reviewFilter, setReviewFilter] = useState("all");
const [reviewChapterFilter, setReviewChapterFilter] = useState(""); // State for review pitches chapter filter
const [reviewQuarterFilter, setReviewQuarterFilter] = useState([]); // Multi-select quarter filter for review pitches
const [reviewCategoryFilter, setReviewCategoryFilter] = useState(""); // AI-generated category filter for review pitches
const [adminPitches, setAdminPitches] = useState([]);
const [users, setUsers] = useState([]);
const [chapterMembers, setChapterMembers] = useState([]);
const [allReviewsData, setAllReviewsData] = useState([]); // State for ALL reviews [{...reviewData}]
const [pitchComments, setPitchComments] = useState({}); // { pitchId: [{ comment, reviewerName, reviewerId }] }
const [adminChapterFilter, setAdminChapterFilter] = useState("");
const [adminQuarterFilter, setAdminQuarterFilter] = useState([]);
const [adminSearch, setAdminSearch] = useState("");
const [adminHidePassed, setAdminHidePassed] = useState(false); // State for admin hide passed filter
const [adminFavoriteFilterMode, setAdminFavoriteFilterMode] = useState("all"); // all | favsOnly | favsAndCons | shortlisted
const [adminSortMode, setAdminSortMode] = useState("newest"); // newest | oldest | avgDesc | avgAsc | sumDesc | sumAsc | mostReviews
// Admin discussion notes. Flat list, grouped by pitchId at render. Loaded
// once with the rest of the admin data and refreshed after every create/edit/delete.
const [adminNotes, setAdminNotes] = useState([]);
// Draft composer state keyed by pitchId so each expanded card keeps its own draft.
const [adminNoteDrafts, setAdminNoteDrafts] = useState({});
// Edit state — which note is being edited, and the in-flight text for that edit.
const [editingAdminNoteId, setEditingAdminNoteId] = useState(null);
const [editingAdminNoteText, setEditingAdminNoteText] = useState("");
const [adminNoteSavingId, setAdminNoteSavingId] = useState(null);
const [shortlistTogglingId, setShortlistTogglingId] = useState(null);
// Live Review focus: which pitch the right pane is showing. Distinct from
// expandedPitchId, which remains List-mode-only.
const [focusedPitchId, setFocusedPitchId] = useState(null);
const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);
const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
const [aboutById, setAboutById] = useState({});
const [websiteById, setWebsiteById] = useState({});
const [winnerChapterFilter, setWinnerChapterFilter] = useState("");
const [photosById, setPhotosById] = useState({});
const [winnerSearchTerm, setWinnerSearchTerm] = useState("");
const [pendingChanges, setPendingChanges] = useState({});
const [generatingAboutId, setGeneratingAboutId] = useState(null);

// Gamification state
const [userStats, setUserStats] = useState(null);
const [userBadges, setUserBadges] = useState([]);
const [showBadgeNotification, setShowBadgeNotification] = useState(null);
const [statsInitialized, setStatsInitialized] = useState(false);

// User creation state
const [newUserData, setNewUserData] = useState({
  email: '',
  name: '',
  role: 'lp',
  chapter: '',
  anniversary: new Date().toISOString().split('T')[0]
});
const [isInviting, setIsInviting] = useState(false);

// User editing state
const [editingUsers, setEditingUsers] = useState({}); // { userId: { linkedinUrl: '', professionalRole: '', bio: '' } }
// Per-user member-photo upload progress, keyed by uid → boolean.
const [uploadingPhotoFor, setUploadingPhotoFor] = useState({});

// Chapters collection state. Seeded from the hardcoded CHAPTERS constant until the
// /chapters collection is populated. `chapters` holds raw docs; `chapterNames` is
// what dropdowns render — always the source-of-truth list of display names.
const [chapters, setChapters] = useState([]);
const [chaptersLoaded, setChaptersLoaded] = useState(false);
const [editingChapterId, setEditingChapterId] = useState(null);
const [chapterFormData, setChapterFormData] = useState({
  slug: '',
  name: '',
  pageSlug: '',
  tagline: '',
  foundedYear: '',
  foundedDate: '',
  emailAlias: '',
  slackChannel: '',
  lpSlackChannel: '',
  active: true,
  order: 0,
  // Landing page content (hydrated onto public/<slug>.html by chapter-hydration.js)
  heroTitle: '',
  heroTagline: '',
  heroImage: '',
  heroImageCaption: '',
  servingTitle: '',
  servingText: '',
  counties: [],
  poweredByText: '',
  galleryPhotos: [],
  showLPs: true,
  showGallery: true,
  showImpact: true
});
const [isAddingChapter, setIsAddingChapter] = useState(false);
// Active tab inside the chapter edit panel. Values: 'identity' | 'content' | 'photos' | 'visibility'.
const [chapterFormTab, setChapterFormTab] = useState('content');

// Message board state
const [bulletinMessages, setBulletinMessages] = useState([]);
const [newBulletinMessage, setNewBulletinMessage] = useState('');
const [lastViewedTimestamp, setLastViewedTimestamp] = useState(() => {
  const stored = localStorage.getItem(`messageBoard_lastViewed_${user?.uid}`);
  return stored || new Date().toISOString();
});

// Resources management state
const [managedResources, setManagedResources] = useState([]);
const [editingResource, setEditingResource] = useState(null);
const [resourceFormData, setResourceFormData] = useState({
  Resource: '',
  Chapter: '',
  Type: '',
  'Focus Area': '',
  'Business Stage': 'Ideation',
  'Counties Served': '',
  URL: '',
  'Expanded Details': '',
  'Average Check Size': '',
  'Relocation Required?': 'No'
});
const [isAddingResource, setIsAddingResource] = useState(false);
const [resourceSearchTerm, setResourceSearchTerm] = useState('');
const [resourceTypeFilter, setResourceTypeFilter] = useState('');
const [resourceStageFilter, setResourceStageFilter] = useState('');
const [resourceChapterFilter, setResourceChapterFilter] = useState('');

// Calculate new message count
const newMessageCount = useMemo(() => {
  if (!lastViewedTimestamp || !bulletinMessages.length) return 0;
  const lastViewed = new Date(lastViewedTimestamp);
  return bulletinMessages.filter(msg => {
    const msgDate = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
    return msgDate > lastViewed && msg.authorId !== user?.uid;
  }).length;
}, [bulletinMessages, lastViewedTimestamp, user?.uid]);

// --- Refs ---
const listScrollRef = useRef(null); // Ref for the scrollable list container
const [listScrollPosition, setListScrollPosition] = useState(0); // Store scroll position

// --- Derived State (Roles) ---
const isSuperAdmin = user?.role === "superAdmin";
const isChapterDirector = user?.role === "chapter_director";
const isLP = user?.role === "lp";
// isAdmin means "has elevated portal access" — any validated role. After the admin
// role was collapsed into lp, every validated user reaches the admin panel; superAdmin
// and chapter_director are further-scoped tiers within it.
const isAdmin = isLP || isChapterDirector || isSuperAdmin;
const userChapter = user?.chapter;

// Chapter directors can only invite into their own chapter — keep it pinned
// even if the field was blank on first mount.
useEffect(() => {
  if (isChapterDirector && userChapter && newUserData.chapter !== userChapter) {
    setNewUserData((prev) => ({ ...prev, chapter: userChapter }));
  }
}, [isChapterDirector, userChapter, newUserData.chapter]);

// Active chapter names, sourced dynamically from /chapters when populated. Falls
// back to the hardcoded CHAPTERS constant while the collection is empty or still
// loading so dropdowns never collapse to nothing.
const activeChapterNames = useMemo(() => {
  const fromCollection = chapters
    .filter(c => c.active !== false)
    .map(c => c.name)
    .filter(Boolean);
  return fromCollection.length > 0 ? fromCollection : CHAPTERS;
}, [chapters]);

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

// Effect 0: Magic-link return-trip handler. Runs once on mount BEFORE the
// auth listener registers a user. If the current URL is a Firebase
// email-link, complete the sign-in with the email we stashed in
// localStorage when the user requested the link. We then strip the link
// query params from the URL so a refresh doesn't try to re-consume the
// (now-spent) oobCode.
useEffect(() => {
  if (typeof window === "undefined") return;
  if (!isSignInWithEmailLink(auth, window.location.href)) return;

  const completeFromLink = async () => {
    setCompletingSignIn(true);
    let storedEmail = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY) || "";
    if (!storedEmail) {
      // Cross-device case: link opened on a device that never requested it.
      // Prompt for the original address so Firebase can verify the link.
      storedEmail = window.prompt(
        "To finish signing in, confirm the email address you requested the sign-in link with:"
      ) || "";
      storedEmail = storedEmail.trim().toLowerCase();
    }
    if (!storedEmail) {
      setCompletingSignIn(false);
      setAuthError("Sign-in cancelled — no email confirmed.");
      return;
    }
    try {
      await signInWithEmailLink(auth, storedEmail, window.location.href);
      window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
      // Clean the URL so a refresh doesn't try to re-consume the spent oobCode.
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      console.error("LPPortal: signInWithEmailLink failed:", err);
      const friendly =
        err?.code === "auth/invalid-action-code"
          ? "This sign-in link has already been used or expired. Request a new one below."
          : err?.code === "auth/invalid-email"
          ? "That email doesn't match the address the link was sent to."
          : err?.message || "Sign-in failed.";
      setAuthError(friendly);
    } finally {
      setCompletingSignIn(false);
    }
  };

  completeFromLink();
  // Intentionally no deps — this should run exactly once on mount.
}, []);

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
            
            // If the user arrived here from a gated /pitch/:id link, bounce
            // them back there instead of the default portal landing.
            const pendingPitchUrl = sessionStorage.getItem('pendingPitchUrl');
            if (pendingPitchUrl) {
              sessionStorage.removeItem('pendingPitchUrl');
              window.location.href = pendingPitchUrl;
              return;
            }

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
      setLpPitchesLoaded(false);
      setAdminPitches([]);
      setReviews({}); // Clear reviews on logout
      setSelectedPitch(null);
      setReviewFormData({});
      setUsers([]);
      setAllReviewsData([]);
      setAdminNotes([]);
      setChapterMembers([]); // Clear chapter members on logout
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
    setLpPitchesLoaded(true);
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
    setLpPitchesLoaded(true);
    console.log(`LPPortal: Successfully fetched ${pitchDocs.length} pitches for LP view.`);
  } catch (error) {
    console.error(`LPPortal: Error loading LP pitches for ${user.email} / chapter ${chapterToQuery}:`, error.code, error.message);
    setLpPitches([]); // Clear pitches on error
    setLpPitchesLoaded(true);
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

  // Load all review comments for pitches in this chapter (for shared team notes)
  try {
    const chapterReviewsQuery = chapterToQuery
      ? query(collection(db, "reviews"), where("chapter", "==", chapterToQuery))
      : query(collection(db, "reviews")); // SuperAdmin gets all
    const chapterReviewsSnap = await getDocs(chapterReviewsQuery);
    const commentsMap = {};
    chapterReviewsSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.comments && data.comments.trim() !== "" && data.pitchId) {
        if (!commentsMap[data.pitchId]) commentsMap[data.pitchId] = [];
        commentsMap[data.pitchId].push({
          comment: data.comments.trim(),
          reviewerName: data.reviewerName || 'LP',
          reviewerId: data.reviewerId
        });
      }
    });
    setPitchComments(commentsMap);
    console.log(`LPPortal: Loaded team notes for ${Object.keys(commentsMap).length} pitches.`);
  } catch (commentsError) {
    console.warn("LPPortal: Could not load team notes:", commentsError.message);
    setPitchComments({});
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
    setAdminPitches([]); setUsers([]); setAllReviewsData([]); setAdminNotes([]);
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
    
    // Filter chapter members for the Chapter Members tab
    if (user?.chapter) {
      const chapterMembersList = usersList.filter(u =>
        u.chapter === user.chapter &&
        ['lp', 'chapter_director', 'superAdmin'].includes(u.role)
      );
      setChapterMembers(chapterMembersList);
      console.log(`LPPortal: Chapter members loaded (${chapterMembersList.length}).`);
    }
  } catch (error) {
    console.error(`LPPortal: Error loading ALL users for admin panel:`, error.code, error.message);
    setUsers([]); success = false;
    showAppAlert(`Error loading users list: ${error.message}. Check Firestore Rules.`);
  }

  // Load Reviews for admin summary (chapter-scoped for Admins, all for SuperAdmin)
  try {
    console.log("LPPortal: Querying reviews for admin summary...");
    const allReviewsQuery = chapterForAdminQuery
      ? query(collection(db, "reviews"), where("chapter", "==", chapterForAdminQuery), orderBy("submittedAt", "desc"))
      : query(collection(db, "reviews"), orderBy("submittedAt", "desc"));
    const allReviewsSnap = await getDocs(allReviewsQuery);
    const allReviewsList = allReviewsSnap.docs.map(d => ({ reviewId: d.id, ...d.data(), submittedAt: d.data().submittedAt /* Store raw */ }));
    setAllReviewsData(allReviewsList); // Update the allReviewsData state
    console.log(`LPPortal: All reviews loaded (${allReviewsList.length}).`);
  } catch (error) {
    console.error(`LPPortal: Error loading ALL reviews summary:`, error.code, error.message);
    setAllReviewsData([]); success = false;
    showAppAlert(`Error loading reviews summary: ${error.message}. Check Firestore Rules.`);
  }

  // Load admin discussion notes (chapter-scoped for chapter directors, all for SuperAdmin).
  try {
    console.log("LPPortal: Querying admin notes...");
    const adminNotesQuery = chapterForAdminQuery
      ? query(collection(db, "adminNotes"), where("chapter", "==", chapterForAdminQuery), orderBy("createdAt", "desc"))
      : query(collection(db, "adminNotes"), orderBy("createdAt", "desc"));
    const adminNotesSnap = await getDocs(adminNotesQuery);
    const adminNotesList = adminNotesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setAdminNotes(adminNotesList);
    console.log(`LPPortal: Admin notes loaded (${adminNotesList.length}).`);
  } catch (error) {
    console.error(`LPPortal: Error loading admin notes:`, error.code, error.message);
    setAdminNotes([]);
    // Non-fatal — admin panel should still function if notes fail to load.
  }

  if (success) {
    console.log(`LPPortal: Admin Data loading attempt finished successfully.`);
  } else {
    console.warn(`LPPortal: Admin Data loading attempt finished with errors.`);
  }

}, [user, isAdmin, isSuperAdmin, userChapter]); // Dependencies for loadAdminData

const loadChapterMembers = useCallback(async () => {
  if (!user || !user.chapter) {
    console.log("LPPortal: loadChapterMembers skipped, no user or chapter.");
    return;
  }

  try {
    console.log(`LPPortal: Loading chapter members for ${user.chapter}...`);
    
    // Query users from the same chapter - simplified to avoid index requirements
    const usersQuery = query(
      collection(db, "users"),
      where("chapter", "==", user.chapter)
    );
    
    const usersSnap = await getDocs(usersQuery);
    
    // Filter for active roles after fetching
    const chapterMembersList = usersSnap.docs
      .map(d => ({ 
        id: d.id, 
        ...d.data(), 
        uid: d.id 
      }))
      .filter(u => ["lp", "chapter_director", "superAdmin"].includes(u.role))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    
    setChapterMembers(chapterMembersList);
    console.log(`LPPortal: Chapter members loaded (${chapterMembersList.length}).`);
  } catch (error) {
    console.error(`LPPortal: Error loading chapter members:`, error);
    console.error(`LPPortal: Error details - Code: ${error.code}, Message: ${error.message}`);
    setChapterMembers([]);
    
    // Provide specific error guidance
    if (error.code === 'permission-denied') {
      console.error("LPPortal: Permission denied - LP users may not have read access to users collection");
      console.error("LPPortal: IMPORTANT - Update Firestore rules to allow LPs to read users in their chapter");
      
      // Temporary fallback: Show at least the current user
      if (user) {
        setChapterMembers([{
          id: user.uid,
          uid: user.uid,
          name: user.name || user.email,
          email: user.email,
          role: user.role,
          chapter: user.chapter,
          badges: user.badges || [],
          anniversary: user.anniversary
        }]);
        console.log("LPPortal: Showing current user only as fallback");
      }
    } else if (error.message?.includes('index')) {
      console.log("LPPortal: Firestore composite index may be required for chapter members query");
    }
  }
}, [user]);

// Loads the /chapters collection. Safe for any authenticated user (read rule is
// public). Sorted by `order`, then `name`. Populates dropdowns across the portal.
const loadChapters = useCallback(async () => {
  try {
    const chaptersSnap = await getDocs(collection(db, "chapters"));
    const chaptersList = chaptersSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ao = typeof a.order === 'number' ? a.order : 999;
        const bo = typeof b.order === 'number' ? b.order : 999;
        if (ao !== bo) return ao - bo;
        return (a.name || '').localeCompare(b.name || '');
      });
    setChapters(chaptersList);
    setChaptersLoaded(true);
    console.log(`LPPortal: Loaded ${chaptersList.length} chapter(s).`);
  } catch (error) {
    console.error('LPPortal: Error loading chapters collection:', error);
    setChapters([]);
    setChaptersLoaded(true); // fall back to hardcoded CHAPTERS constant in UI
  }
}, []);

const loadBulletinMessages = useCallback(async () => {
  if (!user || !user.chapter) {
    console.log("LPPortal: Cannot load bulletin messages without user or chapter");
    return;
  }

  try {
    console.log(`LPPortal: Loading bulletin messages for chapter ${user.chapter}...`);
    
    // Query bulletin messages for the user's chapter
    const messagesQuery = query(
      collection(db, "bulletinMessages"),
      where("authorChapter", "==", user.chapter),
      orderBy("timestamp", "desc")
    );
    
    const messagesSnap = await getDocs(messagesQuery);
    
    const messagesList = messagesSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate ? d.data().timestamp.toDate() : new Date(d.data().timestamp)
    }));
    
    setBulletinMessages(messagesList);
    console.log(`LPPortal: Loaded ${messagesList.length} bulletin messages.`);
  } catch (error) {
    console.error(`LPPortal: Error loading bulletin messages:`, error);
    setBulletinMessages([]);
    
    // Handle index error
    if (error.message?.includes('index')) {
      console.log("LPPortal: Firestore composite index may be required for bulletin messages query");
      showAppAlert("Please create a Firestore index for bulletinMessages with authorChapter and timestamp fields.");
    }
  }
}, [user]);

useEffect(() => {
  // Only load data if auth check is done AND we have a valid user object
  if (!isLoadingAuth && user && user.uid && user.role) {
    console.log("LPPortal: User authenticated and ready, triggering data load...");
    loadLPData(); // Load data relevant to LPs (pitches for their chapter, their reviews)
    loadChapterMembers(); // Load chapter members for all authenticated users
    loadBulletinMessages(); // Load bulletin messages for all authenticated users
    loadChapters(); // Load chapters collection for dropdowns + management UI
    if (isAdmin) {
      loadAdminData(); // Load additional data if user is admin/superAdmin
    }
  } else if (!isLoadingAuth) {
    // If auth check is done but we DON'T have a user, ensure data is cleared
    console.log("LPPortal: Auth check complete, but no user. Clearing data state.");
    setLpPitches([]);
    setLpPitchesLoaded(false);
    setAdminPitches([]);
    setReviews({});
    setSelectedPitch(null);
    setReviewFormData({});
    setUsers([]);
    setAllReviewsData([]);
    setAdminNotes([]);
    setChapterMembers([]);
    setBulletinMessages([]);
  }

  // This effect runs when user or isLoadingAuth changes.
}, [user, isLoadingAuth, isAdmin, loadLPData, loadAdminData, loadChapterMembers, loadBulletinMessages, loadChapters]);

// Update last viewed timestamp when viewing Message Board
useEffect(() => {
  if (user && activeTab === 'bulletinBoard') {
    const now = new Date().toISOString();
    setLastViewedTimestamp(now);
    localStorage.setItem(`messageBoard_lastViewed_${user.uid}`, now);
  }
}, [user, activeTab]);

// Load resources when admin panel is active
useEffect(() => {
  if (user && activeTab === 'adminPanel' && activeAdminTab === 'resourcesManagement' && isSuperAdmin) {
    loadManagedResources();
  }
}, [user, activeTab, activeAdminTab, isSuperAdmin]);

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

// --- Multi-Select Dropdown Component ---
const MultiSelectDropdown = ({ options, selected, onChange, placeholder = "Select options" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const selectAll = () => {
    onChange(options);
  };

  const deselectAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (selected.length === 0 || selected.length === options.length) {
      return placeholder;
    } else if (selected.length === 1) {
      return selected[0];
    } else {
      return `${selected.length} selected`;
    }
  };

  return (
    <div ref={dropdownRef} className="multi-select-dropdown" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 10px',
          minHeight: '34px',
          border: '2px solid var(--mb-ink)',
          boxShadow: 'none',
          fontFamily: 'var(--font-content)',
          background: 'var(--mb-chalk)',
          color: 'var(--mb-ink)',
          fontSize: '14px',
          cursor: 'pointer',
          minWidth: '150px',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>{getDisplayText()}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ marginLeft: '8px', flexShrink: 0 }}>
          <path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
        </svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '2px',
          minWidth: '200px',
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 1000,
          background: 'var(--mb-chalk)',
          border: '2px solid var(--mb-ink)',
          boxShadow: 'var(--shadow-hard-sm)',
          fontFamily: 'var(--font-content)'
        }}>
          <div style={{
            padding: '6px 8px',
            borderBottom: '1px solid var(--mb-ink-15)',
            display: 'flex',
            justifyContent: 'space-between',
            background: 'var(--mb-paper)'
          }}>
            <button
              onClick={selectAll}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--mb-magenta)',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'var(--font-content)',
                fontWeight: 'bold',
                padding: '2px 6px'
              }}
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--mb-ink-60)',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'var(--font-content)',
                fontWeight: 'bold',
                padding: '2px 6px'
              }}
            >
              Clear All
            </button>
          </div>
          {options.map((option) => (
            <label
              key={option}
              style={{
                display: 'block',
                padding: '8px 12px',
                cursor: 'pointer',
                transition: 'none',
                fontSize: '14px',
                color: 'var(--mb-ink)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--mb-butter)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggleOption(option)}
                style={{ marginRight: '8px' }}
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Social Card Functions ---
//
// All four cards are 1080×1080 PNGs rendered to a hidden <canvas> and
// downloaded via canvas.toBlob. They share a Millennium Bug aesthetic:
// flat MB-palette blocks (no gradients), 3px ink borders with hard-offset
// shadows, Instrument Serif display, Inter body, Silkscreen eyebrows,
// JetBrains Mono numerals. The colorful gnf logo and emoji accents are
// the only image-based content; everything else is typographic.

// ---------- Card palette (hex mirrors of the theme-tokens.css vars) ----------
const MB_COLORS = {
  ink:           '#141419',
  ink60:         'rgba(20, 20, 25, 0.6)',
  chalk:         '#ffffff',
  paper:         '#faf4e3',
  paperDeep:     '#ede0bd',
  magenta:       '#e93a7d',
  magentaDeep:   '#c21d61',
  magentaSoft:   '#fde0ec',
  grape:         '#6b4fbb',
  grapeDeep:     '#4a2f95',
  aqua:          '#2bb3c4',
  aquaDeep:      '#157b8a',
  aquaSoft:      '#d5f1f4',
  butter:        '#f0c94b',
  butterDeep:    '#c89918',
  butterSoft:    '#fbf1cc',
  tangerine:     '#f28c3b',
  tangerineDeep: '#c66915',
};

const CARD_FONTS = {
  display:  '"Instrument Serif", "Times New Roman", Georgia, serif',
  content:  '"Inter", "Helvetica Neue", Arial, sans-serif',
  pixel:    '"Silkscreen", "Courier New", monospace',
  numeral:  '"JetBrains Mono", "Menlo", "Courier New", monospace',
};

// Load an image + resolve to the HTMLImageElement, or null on failure.
const loadImage = (src) => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

// Serialize a <BadgeIcon> React element to an HTMLImageElement so the canvas
// can draw the SVG glyph directly — replacing the emoji fallback used on the
// badge social card.
const loadBadgeIconImage = (badgeId, size = 96) => new Promise((resolve) => {
  try {
    const markup = renderToStaticMarkup(<BadgeIcon id={badgeId} size={size} />);
    const ns = markup.includes('xmlns="http://www.w3.org/2000/svg"')
      ? markup
      : markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const blob = new Blob([ns], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  } catch {
    resolve(null);
  }
});

// Await web-font readiness so Instrument Serif / Silkscreen actually
// render on the canvas instead of silently falling back to serif/Courier.
const waitForCardFonts = async () => {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    // Preload specific size/weight combos the cards need.
    await Promise.all([
      document.fonts.load('italic 72px "Instrument Serif"'),
      document.fonts.load('400 48px "Instrument Serif"'),
      document.fonts.load('700 32px "Inter"'),
      document.fonts.load('400 24px "Inter"'),
      document.fonts.load('700 18px "Silkscreen"'),
      document.fonts.load('700 120px "JetBrains Mono"'),
    ]);
    await document.fonts.ready;
  } catch {
    /* font preload failed — fall back to system fonts silently */
  }
};

// Slugify a name to find a matching /assets/lps/<slug>.png portrait.
const lpSlug = (name) =>
  name ? name.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '') : null;

// Draw the ink top band shared across all four cards: black bar with the
// brand wordmark + tagline in pixel font, centered.
const drawMasthead = (ctx, subtitle) => {
  ctx.fillStyle = MB_COLORS.ink;
  ctx.fillRect(0, 0, 1080, 120);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = MB_COLORS.chalk;
  ctx.font = `700 22px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '4px';
  ctx.fillText('GOOD NEIGHBOR FUND', 540, 50);

  ctx.fillStyle = MB_COLORS.butter;
  ctx.font = `700 18px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '3px';
  ctx.fillText(subtitle.toUpperCase(), 540, 84);

  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';
};

// Draw the ink bottom band (footer): website URL left-aligned, colorful
// logo floats on the right. Accepts the pre-loaded logo image.
const drawFooter = (ctx, logoImg) => {
  const footerY = 960;
  const footerH = 120;

  ctx.fillStyle = MB_COLORS.ink;
  ctx.fillRect(0, footerY, 1080, footerH);

  // Magenta top stripe
  ctx.fillStyle = MB_COLORS.magenta;
  ctx.fillRect(0, footerY, 1080, 4);

  ctx.fillStyle = MB_COLORS.chalk;
  ctx.font = `700 22px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '3px';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WWW.GOODNEIGHBOR.FUND', 60, footerY + 62);

  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';

  if (logoImg) {
    const size = 88;
    ctx.drawImage(logoImg, 1080 - size - 40, footerY + (footerH - size) / 2, size, size);
  }
};

// Draw an ink-bordered rectangle with an offset hard-shadow behind it.
// Mimics the `box-shadow: 3px 3px 0 var(--mb-ink)` pattern.
const drawShadowRect = (ctx, x, y, w, h, fill, shadowOffset = 6, border = MB_COLORS.ink) => {
  ctx.fillStyle = border;
  ctx.fillRect(x + shadowOffset, y + shadowOffset, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
};

// Draw a circular portrait at (cx, cy) with radius r and a 4px ink ring.
// Falls back to a solid magenta square with initials if no photo loads.
const drawPortrait = (ctx, cx, cy, r, photoImg, name) => {
  // Ink ring
  ctx.save();
  ctx.strokeStyle = MB_COLORS.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  if (photoImg) {
    ctx.drawImage(photoImg, cx - r, cy - r, r * 2, r * 2);
  } else {
    // Initial-based fallback on paper background
    ctx.fillStyle = MB_COLORS.paper;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const initials = (name || 'LP')
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'LP';
    ctx.fillStyle = MB_COLORS.magenta;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `400 ${Math.round(r * 0.9)}px ${CARD_FONTS.display}`;
    ctx.fillText(initials, cx, cy + 2);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
};

// ---------- 1. Welcome Card — new LP introduces themselves ----------
const drawWelcomeCard = async (canvas) => {
  await waitForCardFonts();
  const ctx = canvas.getContext('2d');

  // Paper base fill for full 1080×1080
  ctx.fillStyle = MB_COLORS.paper;
  ctx.fillRect(0, 0, 1080, 1080);

  drawMasthead(ctx, 'Welcome to the chapter');

  // Pre-load photo + logo in parallel so drawing is deterministic.
  const [photoImg, logoImg] = await Promise.all([
    lpSlug(user?.name) ? loadImage(`/assets/lps/${lpSlug(user.name)}.png`) : Promise.resolve(null),
    loadImage('/assets/gnf-logo.png'),
  ]);

  // Portrait at center
  drawPortrait(ctx, 540, 300, 120, photoImg, user?.name);

  // Eyebrow + name
  ctx.textAlign = 'center';
  ctx.fillStyle = MB_COLORS.magenta;
  ctx.font = `700 20px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '3px';
  ctx.fillText(`LIMITED PARTNER · ${(user?.chapter || 'CHAPTER').toUpperCase()}`, 540, 470);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `400 64px ${CARD_FONTS.display}`;
  ctx.fillText(user?.name || 'New Neighbor', 540, 545);

  // Editorial headline
  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `400 56px ${CARD_FONTS.display}`;
  ctx.fillText("I'm backing founders", 540, 660);
  ctx.font = `italic 400 56px ${CARD_FONTS.display}`;
  ctx.fillStyle = MB_COLORS.magenta;
  ctx.fillText('in my neighborhood.', 540, 730);

  // Supporting body
  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `400 22px ${CARD_FONTS.content}`;
  ctx.fillText('$1,000 micro-grants · No pitch deck · No equity · Just belief', 540, 790);

  // Tag row
  const tags = ['Belief Capital', 'Since 2023', 'Volunteer-Led'];
  const tagW = 180;
  const tagH = 50;
  let tagX = 540 - ((tags.length * tagW + (tags.length - 1) * 14) / 2);
  tags.forEach((t) => {
    drawShadowRect(ctx, tagX, 830, tagW, tagH, MB_COLORS.chalk, 4);
    ctx.fillStyle = MB_COLORS.ink;
    ctx.font = `700 15px ${CARD_FONTS.pixel}`;
    ctx.letterSpacing = '2px';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.toUpperCase(), tagX + tagW / 2, 855);
    ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = '0px';
    tagX += tagW + 14;
  });

  drawFooter(ctx, logoImg);
};

// ---------- 2. Badge Card — achievement showcase ----------
const drawBadgeCard = async (canvas) => {
  await waitForCardFonts();
  const ctx = canvas.getContext('2d');

  // Grape field
  ctx.fillStyle = MB_COLORS.grape;
  ctx.fillRect(0, 0, 1080, 1080);

  drawMasthead(ctx, `${(user?.chapter || 'Chapter')} · Badges`);

  const [photoImg, logoImg] = await Promise.all([
    lpSlug(user?.name) ? loadImage(`/assets/lps/${lpSlug(user.name)}.png`) : Promise.resolve(null),
    loadImage('/assets/gnf-logo.png'),
  ]);

  // Small portrait + name in a row
  drawPortrait(ctx, 180, 220, 70, photoImg, user?.name);

  ctx.textAlign = 'left';
  ctx.fillStyle = MB_COLORS.butter;
  ctx.font = `700 18px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '3px';
  ctx.fillText('LIMITED PARTNER', 280, 192);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = MB_COLORS.chalk;
  ctx.font = `400 52px ${CARD_FONTS.display}`;
  ctx.fillText(user?.name || 'Achievement Hunter', 280, 252);

  // Big numeral: badge count
  ctx.textAlign = 'center';
  ctx.fillStyle = MB_COLORS.butter;
  ctx.font = `700 180px ${CARD_FONTS.numeral}`;
  ctx.fillText(String(userBadges.length), 540, 470);

  ctx.fillStyle = MB_COLORS.chalk;
  ctx.font = `700 22px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '4px';
  ctx.fillText('BADGES UNLOCKED', 540, 514);
  ctx.letterSpacing = '0px';

  // Recent-badges grid (up to 4 badges, 2×2, on a chalk card with ink shadow)
  const recentBadges = userBadges
    .filter((b) => b.earnedAt || b.earnedDate)
    .sort((a, b) => {
      const dA = new Date(a.earnedAt || a.earnedDate || 0).getTime();
      const dB = new Date(b.earnedAt || b.earnedDate || 0).getTime();
      return dB - dA;
    })
    .slice(0, 4);

  if (recentBadges.length > 0) {
    const gridX = 120;
    const gridY = 560;
    const gridW = 840;
    const gridH = 340;

    // Card background
    drawShadowRect(ctx, gridX, gridY, gridW, gridH, MB_COLORS.chalk, 8);

    // Eyebrow on card
    ctx.textAlign = 'left';
    ctx.fillStyle = MB_COLORS.magenta;
    ctx.font = `700 18px ${CARD_FONTS.pixel}`;
    ctx.letterSpacing = '3px';
    ctx.fillText('RECENTLY EARNED', gridX + 24, gridY + 38);
    ctx.letterSpacing = '0px';

    const cell = { w: 180, h: 130, gapX: 24, gapY: 18 };
    const rowCount = Math.ceil(recentBadges.length / 4);
    const cellsPerRow = Math.ceil(recentBadges.length / rowCount);
    const startX = gridX + (gridW - (cellsPerRow * cell.w + (cellsPerRow - 1) * cell.gapX)) / 2;
    const startY = gridY + 64;

    const iconImgs = await Promise.all(
      recentBadges.map((b) => loadBadgeIconImage(b.id || b.badgeId, 128))
    );

    recentBadges.forEach((badge, i) => {
      const row = Math.floor(i / cellsPerRow);
      const col = i % cellsPerRow;
      const bx = startX + col * (cell.w + cell.gapX);
      const by = startY + row * (cell.h + cell.gapY);

      const badgeData = BADGES[badge.id || badge.badgeId];
      if (!badgeData) return;

      // Cell background (butter-soft)
      ctx.fillStyle = MB_COLORS.butterSoft;
      ctx.fillRect(bx, by, cell.w, cell.h);
      ctx.strokeStyle = MB_COLORS.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, cell.w, cell.h);

      // BadgeIcon SVG pictogram
      const iconSize = 64;
      const iconImg = iconImgs[i];
      if (iconImg) {
        ctx.drawImage(iconImg, bx + (cell.w - iconSize) / 2, by + 14, iconSize, iconSize);
      }

      // Name (wrap if long) — strip the leading emoji glyph from stored name.
      ctx.textAlign = 'center';
      ctx.fillStyle = MB_COLORS.ink;
      ctx.font = `700 13px ${CARD_FONTS.content}`;
      const words = badgeData.name.split(' ').slice(1).join(' ').split(' ');
      let line = '';
      const lines = [];
      words.forEach((word) => {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > cell.w - 16 && line !== '') {
          lines.push(line.trim());
          line = word + ' ';
        } else {
          line = test;
        }
      });
      lines.push(line.trim());
      lines.slice(0, 2).forEach((txt, idx) => {
        ctx.fillText(txt, bx + cell.w / 2, by + 96 + idx * 18);
      });
    });
  }

  drawFooter(ctx, logoImg);
};

// ---------- 3. Chapter Stats Card — impact numbers ----------
const drawChapterStatsCard = async (canvas) => {
  await waitForCardFonts();
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = MB_COLORS.paper;
  ctx.fillRect(0, 0, 1080, 1080);

  drawMasthead(ctx, `${user?.chapter || 'Chapter'} · Impact`);

  const logoImg = await loadImage('/assets/gnf-logo.png');

  // Calculate all-time stats — admin uses adminPitches, LP uses lpPitches
  const pitchesToUse = isAdmin ? adminPitches : lpPitches;
  const chapterPitches = (pitchesToUse || []).filter((p) => p.chapter === user?.chapter);
  const grantsAwarded = chapterPitches.filter((p) => p.isWinner).length;
  const dollarsAwarded = grantsAwarded * 1000;

  // Eyebrow + chapter name
  ctx.textAlign = 'center';
  ctx.fillStyle = MB_COLORS.magenta;
  ctx.font = `700 24px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '4px';
  ctx.fillText('CHAPTER IMPACT · SINCE 2023', 540, 204);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `400 72px ${CARD_FONTS.display}`;
  ctx.fillText(user?.chapter || 'Chapter', 540, 280);

  // Two stat cards side-by-side
  const statsY = 340;
  const cardW = 420;
  const cardH = 220;
  const leftX = 80;
  const rightX = 580;

  // Left: grants count (magenta)
  drawShadowRect(ctx, leftX, statsY, cardW, cardH, MB_COLORS.magenta, 8);
  ctx.fillStyle = MB_COLORS.chalk;
  ctx.font = `700 20px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '3px';
  ctx.textAlign = 'left';
  ctx.fillText('BUSINESSES FUNDED', leftX + 24, statsY + 48);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = MB_COLORS.butter;
  ctx.font = `700 140px ${CARD_FONTS.numeral}`;
  ctx.textAlign = 'right';
  ctx.fillText(String(grantsAwarded), leftX + cardW - 24, statsY + 180);

  // Right: dollars awarded (aqua)
  drawShadowRect(ctx, rightX, statsY, cardW, cardH, MB_COLORS.aqua, 8);
  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `700 20px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '3px';
  ctx.textAlign = 'left';
  ctx.fillText('AWARDED IN GRANTS', rightX + 24, statsY + 48);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `700 120px ${CARD_FONTS.numeral}`;
  ctx.textAlign = 'right';
  ctx.fillText(`$${(dollarsAwarded / 1000).toFixed(dollarsAwarded % 1000 === 0 ? 0 : 1)}K`, rightX + cardW - 24, statsY + 180);

  // Pull quote
  ctx.textAlign = 'center';
  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `italic 400 46px ${CARD_FONTS.display}`;
  ctx.fillText('"Funded by belief.', 540, 670);
  ctx.fillText('Fueled by neighbors."', 540, 720);

  // CTA bar (magenta)
  drawShadowRect(ctx, 80, 770, 920, 120, MB_COLORS.magenta, 8);
  ctx.fillStyle = MB_COLORS.chalk;
  ctx.font = `700 20px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '3px';
  ctx.fillText('GOT AN IDEA?', 540, 814);
  ctx.letterSpacing = '0px';
  ctx.font = `700 36px ${CARD_FONTS.content}`;
  ctx.fillText('Apply for a $1,000 micro-grant today.', 540, 862);

  drawFooter(ctx, logoImg);
};

// ---------- 4. Recruitment Card — LP personal brand ----------
const drawRecruitmentCard = async (canvas) => {
  await waitForCardFonts();
  const ctx = canvas.getContext('2d');

  // Magenta field
  ctx.fillStyle = MB_COLORS.magenta;
  ctx.fillRect(0, 0, 1080, 1080);

  drawMasthead(ctx, 'Join the LP Network');

  const [photoImg, logoImg] = await Promise.all([
    lpSlug(user?.name) ? loadImage(`/assets/lps/${lpSlug(user.name)}.png`) : Promise.resolve(null),
    loadImage('/assets/gnf-logo.png'),
  ]);

  // Portrait, large
  drawPortrait(ctx, 540, 310, 120, photoImg, user?.name);

  ctx.textAlign = 'center';
  ctx.fillStyle = MB_COLORS.butter;
  ctx.font = `700 20px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '3px';
  ctx.fillText(`LIMITED PARTNER · ${(user?.chapter || 'CHAPTER').toUpperCase()}`, 540, 475);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = MB_COLORS.chalk;
  ctx.font = `400 60px ${CARD_FONTS.display}`;
  ctx.fillText(user?.name || 'LP Name', 540, 550);

  // Editorial headline
  ctx.font = `400 52px ${CARD_FONTS.display}`;
  ctx.fillText('I fund neighbors', 540, 640);
  ctx.font = `italic 400 52px ${CARD_FONTS.display}`;
  ctx.fillStyle = MB_COLORS.butter;
  ctx.fillText('before the VCs do.', 540, 700);

  // CTA — butter rect with ink text
  drawShadowRect(ctx, 90, 770, 900, 140, MB_COLORS.butter, 8);
  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `700 20px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '3px';
  ctx.fillText('WANT IN?', 540, 814);
  ctx.letterSpacing = '0px';
  ctx.font = `700 34px ${CARD_FONTS.content}`;
  ctx.fillText("DM me — we're looking for neighbors like you.", 540, 872);

  drawFooter(ctx, logoImg);
};

// ---------- Win95 chrome helpers (shared by approval + application cards) ----------
const drawWindowChrome = (ctx, x, y, w, h, titleText) => {
  // Outer paper window with hard ink shadow
  drawShadowRect(ctx, x, y, w, h, MB_COLORS.chalk, 10);

  // Titlebar band
  const tbH = 60;
  ctx.fillStyle = MB_COLORS.paperDeep;
  ctx.fillRect(x, y, w, tbH);
  ctx.fillStyle = MB_COLORS.ink;
  ctx.fillRect(x, y + tbH - 2, w, 2);

  // Titlebar text
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `700 22px ${CARD_FONTS.content}`;
  ctx.fillText(titleText, x + 36, y + tbH / 2);

  // Faux window-control buttons (right-aligned: _ □ ×)
  const symbols = ['_', '□', '×'];
  const btnW = 28; const btnH = 26; const gap = 6;
  const totalW = symbols.length * btnW + (symbols.length - 1) * gap;
  let bx = x + w - 24 - totalW;
  const by = y + (tbH - btnH) / 2;
  symbols.forEach((sym) => {
    ctx.fillStyle = MB_COLORS.paper;
    ctx.fillRect(bx, by, btnW, btnH);
    ctx.strokeStyle = MB_COLORS.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, btnW, btnH);
    ctx.fillStyle = MB_COLORS.ink;
    ctx.font = `700 16px ${CARD_FONTS.content}`;
    ctx.textAlign = 'center';
    ctx.fillText(sym, bx + btnW / 2, by + btnH / 2 + 1);
    bx += btnW + gap;
  });

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
};

// ---------- 5. Approval Dialog Card — Win95 "grant approved" notification ----------
const drawApprovalDialogCard = async (canvas) => {
  await waitForCardFonts();
  const ctx = canvas.getContext('2d');

  // Soft pink desktop field
  ctx.fillStyle = MB_COLORS.magentaSoft;
  ctx.fillRect(0, 0, 1080, 1080);

  drawMasthead(ctx, 'Belief, in writing');

  const [photoImg, logoImg] = await Promise.all([
    lpSlug(user?.name) ? loadImage(`/assets/lps/${lpSlug(user.name)}.png`) : Promise.resolve(null),
    loadImage('/assets/gnf-logo.png'),
  ]);

  // Dialog window
  const winX = 60, winY = 200, winW = 960, winH = 700;
  drawWindowChrome(ctx, winX, winY, winW, winH, 'Good Neighbor Fund — Notification');

  // Award icon (butter trophy block) on the left
  drawShadowRect(ctx, 130, 320, 140, 140, MB_COLORS.butter, 8);
  ctx.strokeStyle = MB_COLORS.ink;
  ctx.lineWidth = 12;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(160, 395);
  ctx.lineTo(195, 432);
  ctx.lineTo(255, 360);
  ctx.stroke();

  // Eyebrow
  ctx.textAlign = 'left';
  ctx.fillStyle = MB_COLORS.magentaDeep;
  ctx.font = `700 18px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '4px';
  ctx.fillText('GRANT APPROVED  ·  SYSTEM MESSAGE', 320, 345);
  ctx.letterSpacing = '0px';

  // Editorial headline — split into roman + italic-magenta + roman
  const hLineY1 = 440;
  const hLineY2 = 540;
  const hSize = 88;
  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `400 ${hSize}px ${CARD_FONTS.display}`;
  ctx.fillText('$1,000 ', 320, hLineY1);
  const part1W = ctx.measureText('$1,000 ').width;
  ctx.font = `italic 400 ${hSize}px ${CARD_FONTS.display}`;
  ctx.fillStyle = MB_COLORS.magenta;
  ctx.fillText('for your', 320 + part1W, hLineY1);
  ctx.font = `400 ${hSize}px ${CARD_FONTS.display}`;
  ctx.fillStyle = MB_COLORS.ink;
  ctx.fillText('big idea.', 320, hLineY2);

  // Subhead
  ctx.fillStyle = MB_COLORS.ink60;
  ctx.font = `400 26px ${CARD_FONTS.content}`;
  ctx.fillText('no pitch deck.  no equity.  just belief.', 320, 610);

  // LP byline (portrait + name + chapter) — anchors the card to the sharer
  const bylineY = 730;
  drawPortrait(ctx, 165, bylineY, 38, photoImg, user?.name);
  ctx.textAlign = 'left';
  ctx.fillStyle = MB_COLORS.magentaDeep;
  ctx.font = `700 16px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '3px';
  ctx.fillText('SHARED BY', 220, bylineY - 14);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `400 28px ${CARD_FONTS.display}`;
  ctx.fillText(user?.name || 'A Limited Partner', 220, bylineY + 14);
  ctx.fillStyle = MB_COLORS.ink60;
  ctx.font = `400 18px ${CARD_FONTS.content}`;
  ctx.fillText(`${user?.chapter || 'GNF'} · LP`, 220, bylineY + 40);

  // Button row (right-aligned inside dialog)
  const btnY = 800;
  drawShadowRect(ctx, 600, btnY, 170, 60, MB_COLORS.paper, 4);
  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `700 16px ${CARD_FONTS.content}`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '2px';
  ctx.textBaseline = 'middle';
  ctx.fillText('CLOSE', 600 + 85, btnY + 30);

  drawShadowRect(ctx, 790, btnY, 200, 60, MB_COLORS.magenta, 4);
  ctx.fillStyle = MB_COLORS.chalk;
  ctx.fillText('APPLY NOW →', 790 + 100, btnY + 30);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';

  drawFooter(ctx, logoImg);
};

// ---------- 6. Application Form Card — Win95 "step 1 of 3" form ----------
const drawApplicationFormCard = async (canvas) => {
  await waitForCardFonts();
  const ctx = canvas.getContext('2d');

  // Soft aqua desktop field
  ctx.fillStyle = MB_COLORS.aquaSoft;
  ctx.fillRect(0, 0, 1080, 1080);

  drawMasthead(ctx, 'Apply in one sentence');

  const [photoImg, logoImg] = await Promise.all([
    lpSlug(user?.name) ? loadImage(`/assets/lps/${lpSlug(user.name)}.png`) : Promise.resolve(null),
    loadImage('/assets/gnf-logo.png'),
  ]);

  const winX = 60, winY = 200, winW = 960, winH = 700;
  drawWindowChrome(ctx, winX, winY, winW, winH, 'GNF Application — Step 1 of 3');

  // Step bar — left label
  ctx.textAlign = 'left';
  ctx.fillStyle = MB_COLORS.ink60;
  ctx.font = `700 18px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '4px';
  ctx.fillText('STEP 1 OF 3  ·  THE IDEA', 130, 320);
  ctx.letterSpacing = '0px';

  // Progress dots (right)
  const dotSize = 18;
  const dotGap = 10;
  const dotsRightX = 950;
  const dotsY = 308;
  for (let i = 0; i < 3; i++) {
    const dx = dotsRightX - (3 - i) * (dotSize + dotGap);
    ctx.fillStyle = i === 0 ? MB_COLORS.magenta : MB_COLORS.paper;
    ctx.fillRect(dx, dotsY, dotSize, dotSize);
    ctx.strokeStyle = MB_COLORS.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(dx, dotsY, dotSize, dotSize);
  }

  // Editorial label: "What's your big idea?"
  ctx.textAlign = 'left';
  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `400 88px ${CARD_FONTS.display}`;
  ctx.fillText('What’s your ', 130, 440);
  const lblW = ctx.measureText('What’s your ').width;
  ctx.font = `italic 400 88px ${CARD_FONTS.display}`;
  ctx.fillStyle = MB_COLORS.magenta;
  ctx.fillText('big idea?', 130 + lblW, 440);

  // Sunken input field with typed example + cursor
  drawShadowRect(ctx, 130, 510, 820, 110, MB_COLORS.paper, 6);
  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `400 30px ${CARD_FONTS.content}`;
  ctx.textBaseline = 'middle';
  const fillText = 'I want to start a mobile bike-repair shop';
  ctx.fillText(fillText, 156, 565);
  // Solid cursor (rendered statically — safe for canvas export)
  const cursorX = 156 + ctx.measureText(fillText).width + 6;
  ctx.fillStyle = MB_COLORS.ink;
  ctx.fillRect(cursorX, 542, 4, 46);
  ctx.textBaseline = 'alphabetic';

  // Helper text + counter
  ctx.fillStyle = MB_COLORS.ink60;
  ctx.font = `400 22px ${CARD_FONTS.content}`;
  ctx.fillText('no pitch deck required.  no equity.  just belief.', 130, 660);
  ctx.textAlign = 'right';
  ctx.font = `400 18px ${CARD_FONTS.numeral}`;
  ctx.fillText('1 / 1 sentence', 950, 660);

  // LP byline (left) + buttons (right) on the same row
  const btnY = 800;
  const bylineCY = btnY + 30;
  drawPortrait(ctx, 170, bylineCY, 36, photoImg, user?.name);
  ctx.textAlign = 'left';
  ctx.fillStyle = MB_COLORS.magentaDeep;
  ctx.font = `700 16px ${CARD_FONTS.pixel}`;
  ctx.letterSpacing = '3px';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('SHARED BY', 220, bylineCY - 14);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = MB_COLORS.ink;
  ctx.font = `400 22px ${CARD_FONTS.display}`;
  ctx.fillText(`${user?.name || 'A Limited Partner'} — ${user?.chapter || 'GNF'} LP`, 220, bylineCY + 14);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawShadowRect(ctx, 620, btnY, 150, 60, MB_COLORS.paper, 4);
  ctx.fillStyle = MB_COLORS.ink60;
  ctx.font = `700 16px ${CARD_FONTS.content}`;
  ctx.letterSpacing = '2px';
  ctx.fillText('← BACK', 620 + 75, btnY + 30);

  drawShadowRect(ctx, 790, btnY, 200, 60, MB_COLORS.magenta, 4);
  ctx.fillStyle = MB_COLORS.chalk;
  ctx.fillText('NEXT →', 790 + 100, btnY + 30);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  drawFooter(ctx, logoImg);
};

const downloadCard = async (type) => {
  const canvasId =
    type === 'welcome' ? 'welcome-canvas' :
    type === 'badge' ? 'badge-canvas' :
    type === 'stats' ? 'stats-canvas' :
    type === 'recruitment' ? 'recruitment-canvas' :
    type === 'approval' ? 'approval-canvas' :
    'application-canvas';
  const canvas = document.getElementById(canvasId);

  if (!canvas) return;

  if (type === 'welcome') {
    await drawWelcomeCard(canvas);
  } else if (type === 'badge') {
    await drawBadgeCard(canvas);
  } else if (type === 'stats') {
    await drawChapterStatsCard(canvas);
  } else if (type === 'recruitment') {
    await drawRecruitmentCard(canvas);
  } else if (type === 'approval') {
    await drawApprovalDialogCard(canvas);
  } else if (type === 'application') {
    await drawApplicationFormCard(canvas);
  }

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gnf-${type}-card-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
};

// Draw cards when Social Cards tab is active
useEffect(() => {
  if (activeTab === 'socialCards') {
    setTimeout(async () => {
      const welcomeCanvas = document.getElementById('welcome-canvas');
      const badgeCanvas = document.getElementById('badge-canvas');
      const statsCanvas = document.getElementById('stats-canvas');
      const recruitmentCanvas = document.getElementById('recruitment-canvas');
      const approvalCanvas = document.getElementById('approval-canvas');
      const applicationCanvas = document.getElementById('application-canvas');

      if (welcomeCanvas) await drawWelcomeCard(welcomeCanvas);
      if (badgeCanvas) await drawBadgeCard(badgeCanvas);
      if (statsCanvas) await drawChapterStatsCard(statsCanvas);
      if (recruitmentCanvas) await drawRecruitmentCard(recruitmentCanvas);
      if (approvalCanvas) await drawApprovalDialogCard(approvalCanvas);
      if (applicationCanvas) await drawApplicationFormCard(applicationCanvas);
    }, 100);
  }
}, [activeTab, user, userStats, userBadges, adminPitches]);

// --- Helper Functions ---

const getNextUnreviewedPitch = () => {
  if (!lpPitches || lpPitches.length === 0) return null;
  
  // Get currently filtered pitches (same logic as the main filter)
  const filteredPitches = lpPitches.filter((p) => {
    const review = reviews[p.id];
    
    // Filter by Chapter
    const matchesChapter = !reviewChapterFilter || p.chapter === reviewChapterFilter;
    if (!matchesChapter) return false;

    // Filter by Quarter (multi-select)
    const matchesQuarter = reviewQuarterFilter.length === 0 || reviewQuarterFilter.includes(p.quarter);
    if (!matchesQuarter) return false;

    // Filter by Category
    if (reviewCategoryFilter && p.category !== reviewCategoryFilter) return false;

    // Filter by Review Status Dropdown
    if (reviewFilter === "reviewed" && !review) return false;
    if (reviewFilter === "notReviewed" && review) return false;

    // Hide Passed Reviews Filter
    if (hidePassedReviews && review && (review.overallLpRating === "Pass" || review.overallLpRating === "Ineligible")) {
      return false;
    }

    // Search Term Filter
    const searchLower = reviewSearchTerm.toLowerCase();
    if (searchLower && !(
      (p.businessName && p.businessName.toLowerCase().includes(searchLower)) ||
      (p.founderName && p.founderName.toLowerCase().includes(searchLower)) ||
      (p.email && p.email.toLowerCase().includes(searchLower))
    )) {
      return false;
    }

    return true;
  });

  // Find the current pitch index in filtered results
  const currentIndex = filteredPitches.findIndex(p => p.id === selectedPitch?.id);
  
  // Look for next unreviewed pitch starting from current position
  for (let i = currentIndex + 1; i < filteredPitches.length; i++) {
    const pitch = filteredPitches[i];
    if (!reviews[pitch.id]) {
      return pitch;
    }
  }
  
  // If no unreviewed pitch found after current, wrap around to beginning
  for (let i = 0; i < currentIndex; i++) {
    const pitch = filteredPitches[i];
    if (!reviews[pitch.id]) {
      return pitch;
    }
  }
  
  return null; // No unreviewed pitches found
};

// Helper function to handle tab changes (closes mobile menu)
const handleTabChange = (tab) => {
  setActiveTab(tab);
  if (isMobile()) {
    setIsMobileMenuOpen(false);
  }
};

// Bulletin board functions
const handleCreateBulletinMessage = async () => {
  if (!newBulletinMessage.trim()) {
    showAppAlert("Please enter a message.");
    return;
  }

  try {
    const messageData = {
      message: newBulletinMessage.trim(),
      authorId: user.uid,
      authorName: user.name || user.email,
      authorChapter: user.chapter,
      authorRole: user.role,
      timestamp: Timestamp.now(),
      isPinned: false,
      pinnedBy: null,
      pinnedAt: null
    };

    await addDoc(collection(db, "bulletinMessages"), messageData);
    
    // Clear form
    setNewBulletinMessage('');
    
    // Reload messages
    await loadBulletinMessages();
    
    console.log("LPPortal: Bulletin message posted successfully");
  } catch (error) {
    console.error("LPPortal: Error creating bulletin message:", error);
    showAppAlert("Failed to post message. Please try again.");
  }
};

const handleDeleteBulletinMessage = async (messageId) => {
  if (showAppConfirm("Are you sure you want to delete this message?")) {
    try {
      await deleteDoc(doc(db, "bulletinMessages", messageId));
      console.log("LPPortal: Bulletin message deleted");
      loadBulletinMessages();
    } catch (error) {
      console.error("LPPortal: Error deleting bulletin message:", error);
      showAppAlert("Failed to delete message.");
    }
  }
};

const handleTogglePinMessage = async (message) => {
  try {
    const updates = {
      isPinned: !message.isPinned,
      pinnedBy: !message.isPinned ? user.uid : null,
      pinnedAt: !message.isPinned ? Timestamp.now() : null
    };
    
    await updateDoc(doc(db, "bulletinMessages", message.id), updates);
    console.log(`LPPortal: Message ${message.isPinned ? 'unpinned' : 'pinned'}`);
    loadBulletinMessages();
  } catch (error) {
    console.error("LPPortal: Error toggling pin:", error);
    showAppAlert("Failed to update message pin status.");
  }
};

const handleReactToMessage = async (messageId, emoji) => {
  try {
    const messageRef = doc(db, "bulletinMessages", messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      console.error("LPPortal: Message not found");
      return;
    }
    
    const messageData = messageDoc.data();
    const reactions = messageData.reactions || {};
    const emojiReactions = reactions[emoji] || [];
    
    // Toggle reaction
    let updatedReactions;
    if (emojiReactions.includes(user.uid)) {
      // Remove reaction
      updatedReactions = emojiReactions.filter(uid => uid !== user.uid);
    } else {
      // Add reaction
      updatedReactions = [...emojiReactions, user.uid];
    }
    
    // Update the reactions object
    const updatedReactionsObj = {
      ...reactions,
      [emoji]: updatedReactions
    };
    
    // Remove emoji key if no reactions left
    if (updatedReactions.length === 0) {
      delete updatedReactionsObj[emoji];
    }
    
    await updateDoc(messageRef, {
      reactions: updatedReactionsObj
    });
    
    console.log(`LPPortal: Reaction ${emoji} toggled for message ${messageId}`);
    loadBulletinMessages();
  } catch (error) {
    console.error("LPPortal: Error toggling reaction:", error);
    showAppAlert("Failed to update reaction.");
  }
};

// Reactions component for bulletin board messages
const MessageReactions = ({ message, user, handleReactToMessage, chapterMembers }) => {
  const availableEmojis = ['👍', '💖', '🎉', '🤔', '😊', '👀'];
  const reactions = message.reactions || {};
  
  return (
    <div style={{ 
      marginTop: '15px', 
      display: 'flex', 
      gap: '8px',
      flexWrap: 'wrap',
      alignItems: 'center'
    }}>
      {/* Display existing reactions */}
      {Object.entries(reactions).map(([emoji, users]) => {
        if (users.length === 0) return null;
        const hasReacted = users.includes(user.uid);
        
        return (
          <button
            key={emoji}
            onClick={() => handleReactToMessage(message.id, emoji)}
            style={{
              background: hasReacted ? '#FFE4F1' : 'white',
              border: `1px solid ${hasReacted ? '#FFB6D9' : '#e0e0e0'}`,
              padding: '4px 10px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              const tooltip = e.currentTarget.querySelector('.reaction-tooltip');
              if (tooltip) tooltip.style.display = 'block';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              const tooltip = e.currentTarget.querySelector('.reaction-tooltip');
              if (tooltip) tooltip.style.display = 'none';
            }}
          >
            <span>{emoji}</span>
            <span style={{ fontSize: '12px', color: '#666' }}>{users.length}</span>
            
            {/* Tooltip showing who reacted */}
            <div 
              className="reaction-tooltip"
              style={{
                display: 'none',
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '6px 10px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                marginBottom: '4px',
                zIndex: 1000,
                maxWidth: '200px',
                textAlign: 'center'
              }}
            >
              {users.slice(0, 3).map((uid, idx) => {
                const member = chapterMembers.find(m => m.uid === uid);
                return member?.name || member?.email || 'Unknown';
              }).join(', ')}
              {users.length > 3 && ` and ${users.length - 3} more`}
            </div>
          </button>
        );
      })}
      
      {/* Add reaction button */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={(e) => {
            const btn = e.currentTarget;
            const picker = btn.nextElementSibling;
            picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
          }}
          style={{
            background: 'transparent',
            border: '1px solid #e0e0e0',
            padding: '4px 10px',
            fontSize: '14px',
            cursor: 'pointer',
            color: '#666'
          }}
          title="Add reaction"
        >
          + 😊
        </button>
        
        {/* Emoji picker dropdown */}
        <div style={{
          display: 'none',
          position: 'absolute',
          bottom: '100%',
          left: '0',
          background: 'white',
          border: '1px solid #e0e0e0',
          padding: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '4px',
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {availableEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  handleReactToMessage(message.id, emoji);
                  // Hide picker
                  const picker = document.currentScript?.parentElement;
                  if (picker) picker.style.display = 'none';
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Resources Management Functions
const loadManagedResources = async () => {
  try {
    const resourcesRef = collection(db, 'resources');
    const q = query(resourcesRef, orderBy('Resource'));
    const querySnapshot = await getDocs(q);
    
    const resources = [];
    querySnapshot.forEach((doc) => {
      resources.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    setManagedResources(resources);
    console.log(`LPPortal: Loaded ${resources.length} resources`);
  } catch (error) {
    console.error("LPPortal: Error loading resources:", error);
    showAppAlert("Failed to load resources.");
  }
};

const handleSaveResource = async () => {
  try {
    // Validate required fields
    if (!resourceFormData.Resource || !resourceFormData.Chapter || !resourceFormData.Type || !resourceFormData['Business Stage']) {
      showAppAlert("Please fill in all required fields: Resource Name, Chapter, Type, and Business Stage.");
      return;
    }

    // Map form data to Firestore field names
    const firestoreData = {
      Resource: resourceFormData.Resource,
      Chapter: resourceFormData.Chapter,
      Type: resourceFormData.Type,
      Stage: resourceFormData['Business Stage'],
      FocusArea: resourceFormData['Focus Area'] || '',
      CountiesServed: resourceFormData['Counties Served'] || '',
      Website: resourceFormData.URL || '',
      About: resourceFormData['Expanded Details'] || '',
      AverageCheckSize: resourceFormData['Average Check Size'] || '',
      RelocationRequired: resourceFormData['Relocation Required?'] || 'No'
    };
    
    if (editingResource) {
      // Update existing resource
      const resourceRef = doc(db, 'resources', editingResource.id);
      await updateDoc(resourceRef, {
        ...firestoreData,
        updatedAt: Timestamp.now()
      });
      console.log(`LPPortal: Updated resource ${editingResource.id}`);
      showAppAlert("Resource updated successfully!");
    } else {
      // Add new resource
      const resourcesRef = collection(db, 'resources');
      await addDoc(resourcesRef, {
        ...firestoreData,
        createdAt: Timestamp.now(),
        createdBy: user.uid
      });
      console.log("LPPortal: Added new resource");
      showAppAlert("Resource added successfully!");
    }
    
    // Reset form and reload
    setEditingResource(null);
    setIsAddingResource(false);
    setResourceFormData({
      Resource: '',
      Chapter: '',
      Type: '',
      'Focus Area': '',
      'Business Stage': 'Ideation',
      'Counties Served': '',
      URL: '',
      'Expanded Details': '',
      'Average Check Size': '',
      'Relocation Required?': 'No'
    });
    loadManagedResources();
  } catch (error) {
    console.error("LPPortal: Error saving resource:", error);
    showAppAlert("Failed to save resource.");
  }
};

const handleDeleteResource = async (resourceId) => {
  const ok = await requestConfirm({
    title: 'Delete this resource?',
    message: 'This cannot be undone. The resource will disappear from every chapter page immediately.',
    confirmLabel: 'Delete',
    variant: 'danger',
  });
  if (!ok) return;
  try {
    await deleteDoc(doc(db, "resources", resourceId));
    console.log(`LPPortal: Resource ${resourceId} deleted`);
    showAppAlert("Resource deleted successfully!");
    loadManagedResources();
  } catch (error) {
    console.error("LPPortal: Error deleting resource:", error);
    showAppAlert("Failed to delete resource.");
  }
};

const handleEditResource = (resource) => {
  setEditingResource(resource);
  setResourceFormData({
    Resource: resource.Resource || resource.resource || '',
    Chapter: resource.Chapter || resource.chapter || '',
    Type: resource.Type || resource.type || '',
    'Focus Area': resource.FocusArea || resource['Focus Area'] || resource.focusArea || '',
    'Business Stage': resource.Stage || resource['Business Stage'] || resource.businessStage || 'Ideation',
    'Counties Served': resource.CountiesServed || resource['Counties Served'] || resource.countiesServed || '',
    URL: resource.Website || resource.URL || resource.url || '',
    'Expanded Details': resource.About || resource['Expanded Details'] || resource.expandedDetails || '',
    'Average Check Size': resource.AverageCheckSize || resource['Average Check Size'] || resource.averageCheckSize || '',
    'Relocation Required?': resource.RelocationRequired || resource['Relocation Required?'] || resource.relocationRequired || 'No'
  });
  setIsAddingResource(true);
};

// Navigation items component (shared between desktop and mobile)
const navButtonStyle = (tabName) => {
  const isActive = activeTab === tabName;
  return {
    padding: '8px 12px',
    border: '2px solid',
    borderColor: isActive ? 'var(--mb-ink)' : 'transparent',
    background: isActive ? 'var(--mb-magenta)' : 'transparent',
    boxShadow: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-content)',
    fontSize: '13px',
    fontWeight: 'bold',
    color: isActive ? 'var(--mb-chalk)' : 'var(--mb-ink)',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'none',
    width: '100%'
  };
};

const NavigationItems = () => (
  <>
    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--mb-ink-15)' }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 'bold',
        color: 'var(--mb-ink-60)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        Navigation
        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            display: 'none',
            background: 'var(--mb-paper-deep)',
            border: '2px solid',
            borderColor: '#fff #d48fc7 #d48fc7 #fff',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '0 4px',
            fontWeight: 'bold'
          }}
          className="mobile-close-btn"
        >
          ✖
        </button>
      </div>
    </div>

    <div style={{ padding: '4px' }}>
    {/* Review Pitches */}
    <button
      onClick={() => handleTabChange('reviewPitches')}
      style={navButtonStyle('reviewPitches')}
      onMouseEnter={(e) => {
        if (activeTab !== 'reviewPitches') {
          e.currentTarget.style.background = 'var(--mb-paper-deep)';
        }
      }}
      onMouseLeave={(e) => {
        if (activeTab !== 'reviewPitches') {
          e.currentTarget.style.background = 'transparent';
        }
      }}>
      Review Pitches
    </button>

    {/* Pitch Map */}
    <button
      onClick={() => handleTabChange('pitchMap')}
      style={navButtonStyle('pitchMap')}
      onMouseEnter={(e) => {
        if (activeTab !== 'pitchMap') {
          e.currentTarget.style.background = 'var(--mb-paper-deep)';
        }
      }}
      onMouseLeave={(e) => {
        if (activeTab !== 'pitchMap') {
          e.currentTarget.style.background = 'transparent';
        }
      }}>
      Pitch Map
    </button>

    {/* Badges */}
    <button
      onClick={() => handleTabChange('badges')}
      style={navButtonStyle('badges')}
      onMouseEnter={(e) => {
        if (activeTab !== 'badges') {
          e.currentTarget.style.background = 'var(--mb-paper-deep)';
        }
      }}
      onMouseLeave={(e) => {
        if (activeTab !== 'badges') {
          e.currentTarget.style.background = 'transparent';
        }
      }}>
      Trophy Case
    </button>

    {/* Statistics */}
    <button
      onClick={() => handleTabChange('statistics')}
      style={navButtonStyle('statistics')}
      onMouseEnter={(e) => {
        if (activeTab !== 'statistics') {
          e.currentTarget.style.background = 'var(--mb-paper-deep)';
        }
      }}
      onMouseLeave={(e) => {
        if (activeTab !== 'statistics') {
          e.currentTarget.style.background = 'transparent';
        }
      }}>
      Statistics
    </button>

    {/* Chapter Members */}
    <button
      onClick={() => handleTabChange('chapterMembers')}
      style={navButtonStyle('chapterMembers')}
      onMouseEnter={(e) => {
        if (activeTab !== 'chapterMembers') {
          e.currentTarget.style.background = 'var(--mb-paper-deep)';
        }
      }}
      onMouseLeave={(e) => {
        if (activeTab !== 'chapterMembers') {
          e.currentTarget.style.background = 'transparent';
        }
      }}>
      Chapter Members
    </button>

    {/* Social Cards */}
    <button
      onClick={() => handleTabChange('socialCards')}
      style={navButtonStyle('socialCards')}
      onMouseEnter={(e) => {
        if (activeTab !== 'socialCards') {
          e.currentTarget.style.background = 'var(--mb-paper-deep)';
        }
      }}
      onMouseLeave={(e) => {
        if (activeTab !== 'socialCards') {
          e.currentTarget.style.background = 'transparent';
        }
      }}>
      Social Cards
    </button>

    {/* Resources — LP-facing document library */}
    <button
      onClick={() => handleTabChange('resources')}
      style={navButtonStyle('resources')}
      onMouseEnter={(e) => {
        if (activeTab !== 'resources') {
          e.currentTarget.style.background = 'var(--mb-paper-deep)';
        }
      }}
      onMouseLeave={(e) => {
        if (activeTab !== 'resources') {
          e.currentTarget.style.background = 'transparent';
        }
      }}>
      Resources
    </button>

    {/* Admin Panel - Visible to chapter directors and super admins */}
    {isAdmin && (
      <button
        onClick={() => handleTabChange('adminPanel')}
        style={navButtonStyle('adminPanel')}
        onMouseEnter={(e) => {
          if (activeTab !== 'adminPanel') {
            e.currentTarget.style.background = 'var(--mb-paper-deep)';
          }
        }}
        onMouseLeave={(e) => {
          if (activeTab !== 'adminPanel') {
            e.currentTarget.style.background = 'transparent';
          }
        }}>
        Admin Panel
      </button>
    )}
    </div>

    {/* Bottom-stuck footer: optional LP Membership payment links + Chapter Info card */}
    <div style={{ marginTop: 'auto' }}>
      {(() => {
        const links = getChapterMembershipLinks(user?.chapter);
        if (!links || (!links.annualUrl && !links.semiAnnualUrl)) return null;
        const btnStyle = {
          display: 'block',
          width: '100%',
          padding: '8px 10px',
          fontSize: '12px',
          fontWeight: 'bold',
          textAlign: 'center',
          textDecoration: 'none',
          color: 'var(--mb-ink)',
          background: 'var(--mb-paper)',
          border: '2px solid var(--mb-ink)',
          boxShadow: 'var(--shadow-hard-sm)',
          fontFamily: 'var(--font-content)',
          cursor: 'pointer',
          marginTop: '6px',
          boxSizing: 'border-box',
        };
        return (
          <div style={{ margin: '8px', marginBottom: 0 }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: 'var(--mb-ink-60)',
              marginBottom: '3px',
              fontFamily: 'var(--font-content)'
            }}>LP Membership</div>
            {links.annualUrl && (
              <a href={links.annualUrl} target="_blank" rel="noopener noreferrer" style={btnStyle}>
                Renew Annual
              </a>
            )}
            {links.semiAnnualUrl && (
              <a href={links.semiAnnualUrl} target="_blank" rel="noopener noreferrer" style={btnStyle}>
                Renew Semi-Annual
              </a>
            )}
          </div>
        );
      })()}

      {/* Slack community invite */}
      <div style={{ margin: '8px', marginBottom: 0 }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: 'var(--mb-ink-60)',
          marginBottom: '3px',
          fontFamily: 'var(--font-content)'
        }}>Community</div>
        <a
          href="https://join.slack.com/t/goodneighborfund/shared_invite/zt-3w6mgybja-8ASKwhvUyXsrFRlJ4uxdLQ"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 10px',
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center',
            textDecoration: 'none',
            color: 'var(--mb-ink)',
            background: 'var(--mb-paper)',
            border: '2px solid var(--mb-ink)',
            boxShadow: 'var(--shadow-hard-sm)',
            fontFamily: 'var(--font-content)',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          Join Slack
        </a>
      </div>

      {/* Chapter Info — flat ink-bordered card */}
      <div style={{
        margin: '8px',
        padding: '10px 12px',
        fontSize: '11px',
        color: 'var(--mb-ink)',
        background: 'var(--mb-paper)',
        border: '2px solid var(--mb-ink)',
        boxShadow: 'var(--shadow-hard-sm)',
        fontFamily: 'var(--font-content)'
      }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: 'var(--mb-ink-60)',
          marginBottom: '3px'
        }}>Chapter</div>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{user?.chapter || 'Not assigned'}</div>
        <div style={{
          fontSize: '10px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: 'var(--mb-ink-60)',
          marginBottom: '3px',
          borderTop: '1px solid var(--gnf-border-pink)',
          paddingTop: '8px'
        }}>Member Since</div>
        <div style={{ fontWeight: 'bold' }}>{user?.anniversary ? new Date(user.anniversary.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Unknown'}</div>
      </div>
    </div>
  </>
);

// --- Helper Functions ---

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Unknown time';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

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
// Magic-link sign-in: user enters their email and we ask the cloud function
// to mint + email a Firebase email-link. The link routes back to /portal,
// where the useEffect below picks it up and calls signInWithEmailLink.
const handleSendSignInLink = async () => {
  setAuthError("");
  const requestEmail = email.trim().toLowerCase();
  if (!requestEmail || !requestEmail.includes("@")) {
    setAuthError("Enter a valid email address.");
    return;
  }
  setSignInLinkSending(true);
  try {
    await sendSignInLinkCallable({ email: requestEmail });
    // Stash the email so the return-trip handler can complete sign-in even if
    // the user opens the link on a device that doesn't have it cached yet.
    window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, requestEmail);
    setSignInLinkSentTo(requestEmail);
  } catch (err) {
    console.error("LPPortal: sendSignInLink error:", err);
    setAuthError(err?.message || "Couldn't send sign-in link. Try again in a moment.");
  } finally {
    setSignInLinkSending(false);
  }
};

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
      setAuthError("This email is already linked to a different sign-in method. Try the magic-link option instead.");
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


  const previousReview = reviews[selectedPitch.id] || null;
  const isEdit = !!previousReview;
  const nextEditCount = (previousReview?.editCount || 0) + (isEdit ? 1 : 0);

  const newReview = {
    reviewerId: user.uid,
    reviewerName: user.name || user.email, // Store reviewer name/email for easier display later if needed
    pitchId: selectedPitch.id,
    pitchBusinessName: selectedPitch.businessName || "Unknown Business", // Store for context
    chapter: selectedPitch.chapter || user.chapter || "Unknown", // Get chapter from pitch if possible, else from user
    quarter: selectedPitch.quarter || null, // Needed for quarter-scoped badge stats (Midas Touch, Completionist)
    editCount: nextEditCount, // Persisted on review doc; used by trackReviewSubmission for maxReviewEdits
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
    const trackingResult = await trackReviewSubmission(user.uid, newReview, selectedPitch, isEdit, previousReview);
    
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

    // Update pitchComments so team notes reflect immediately
    if (newReview.comments && newReview.comments.trim() !== "") {
      setPitchComments(prev => {
        const existing = (prev[selectedPitch.id] || []).filter(c => c.reviewerId !== user.uid);
        return {
          ...prev,
          [selectedPitch.id]: [...existing, {
            comment: newReview.comments.trim(),
            reviewerName: user.name || user.email,
            reviewerId: user.uid
          }]
        };
      });
    } else {
      // Remove user's comment if they cleared it
      setPitchComments(prev => ({
        ...prev,
        [selectedPitch.id]: (prev[selectedPitch.id] || []).filter(c => c.reviewerId !== user.uid)
      }));
    }


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

const handleCreateUser = async (e) => {
  e.preventDefault();

  if (!isAdmin) {
    showAppAlert("You do not have permission to invite users.");
    return;
  }
  if (isChapterDirector && newUserData.chapter && newUserData.chapter !== userChapter) {
    showAppAlert(`Chapter directors can only invite users to ${userChapter}.`);
    return;
  }
  if (newUserData.role === 'superAdmin' && !isSuperAdmin) {
    showAppAlert("Only Super Admins can create Super Admin accounts.");
    return;
  }
  if (!newUserData.email || !newUserData.name || !newUserData.chapter) {
    showAppAlert("Please fill in email, name, and chapter.");
    return;
  }

  setIsInviting(true);
  try {
    const result = await inviteUserCallable({
      email: newUserData.email.toLowerCase().trim(),
      name: newUserData.name.trim(),
      role: newUserData.role || 'lp',
      chapter: newUserData.chapter,
      anniversary: newUserData.anniversary,
      // Only meaningful for superAdmin invites — empty/undefined otherwise.
      chapterRole: newUserData.role === 'superAdmin' ? (newUserData.chapterRole || '') : '',
    });

    const data = result.data || {};
    const lines = [`Invite sent to ${data.email}.`];
    if (data.alreadyHadAuth) {
      lines.push(`Note: this email already had a Firebase Auth account, so we reused it.`);
    }
    if (data.emailSent === false) {
      lines.push(`⚠️ The profile was created but the sign-in link email failed to send: ${data.emailError || 'unknown error'}. Use "Send link" in the users table to retry.`);
    } else {
      lines.push(`They'll receive a magic-link email — one tap and they're signed in. No password setup needed.`);
    }
    showAppAlert(lines.join('\n\n'));

    setNewUserData({
      email: '',
      name: '',
      role: 'lp',
      chapter: isChapterDirector ? userChapter : '',
      anniversary: new Date().toISOString().split('T')[0],
      chapterRole: '',
    });

    loadAdminData();
  } catch (error) {
    console.error('LPPortal: Error inviting user:', error);
    const msg = error?.message || 'Unknown error.';
    showAppAlert(`Failed to invite user: ${msg}`);
  } finally {
    setIsInviting(false);
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
  if (isChapterDirector && userToDeleteData?.chapter && userToDeleteData.chapter !== userChapter) {
    showAppAlert(`Chapter directors can only delete users in ${userChapter}.`);
    return;
  }

  // Retro-styled confirm. Note: this only removes the Firestore profile doc —
  // the Firebase Auth account stays intact until an admin clears it manually
  // from the Firebase console. The dialog makes that distinction clear.
  const ok = await requestConfirm({
    title: `Delete profile for ${userEmailToDelete || 'this user'}?`,
    confirmLabel: 'Delete profile',
    cancelLabel: 'Keep',
    variant: 'danger',
    message: (
      <>
        <p>This removes their Firestore profile data (role, chapter, name, bio).</p>
        <p><strong>It does NOT delete the Firebase Authentication account.</strong> To prevent sign-in, disable the account in the Firebase console.</p>
      </>
    ),
  });
  if (ok) {
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
    // LPs are read-only on other users' records. They can edit their own
    // profile (name/links/bio/photo via the self-edit rule branch) but not
    // anyone else's. Mirrors the firestore /users update policy so the user
    // gets a clear message instead of a generic permission-denied.
    if (isLP && userIdToUpdate !== user.uid) {
      showAppAlert("LPs can only edit their own profile. Ask a chapter director or SuperAdmin to update other members.");
      loadAdminData();
      return;
    }
    // Chapter directors are scoped to their own chapter.
    if (isChapterDirector) {
      if (targetUser.chapter && targetUser.chapter !== userChapter) {
        showAppAlert(`Chapter directors can only modify users in ${userChapter}.`);
        loadAdminData();
        return;
      }
      if (field === 'chapter' && value && value !== userChapter) {
        showAppAlert(`Chapter directors can only assign users to ${userChapter}.`);
        loadAdminData();
        return;
      }
    }
  }

  // Prevent assigning an invalid role
  if (field === 'role' && !VALID_ROLES.concat('unauthorized').includes(value)) { // Allow 'unauthorized' for disabling
    showAppAlert(`Invalid role selected: ${value}`);
    loadAdminData();
    return;
  }

  // chapterRole is only meaningful on superAdmin users and must be one of
  // the two presentation tiers (or empty to clear). Only superAdmins may
  // write it. Mirrors the firestore.rules chapterRoleInvariant — caught
  // client-side so the user gets a clear message.
  if (field === 'chapterRole') {
    if (!isSuperAdmin) {
      showAppAlert("Only Super Admins can set a chapter listing role.");
      loadAdminData();
      return;
    }
    if (targetUser.role !== 'superAdmin') {
      showAppAlert("Chapter listing role only applies to Super Admin accounts.");
      loadAdminData();
      return;
    }
    if (value && !['lp', 'chapter_director'].includes(value)) {
      showAppAlert(`Invalid chapter listing role: ${value}`);
      loadAdminData();
      return;
    }
  }

  try {
    console.log(`LPPortal: Updating Firestore doc /users/${userIdToUpdate} with {${field}: ${value}}...`);
    const updates = { [field]: value };
    // When demoting a superAdmin, strip any stale chapterRole so the
    // firestore chapterRoleInvariant doesn't reject the write. chapterRole
    // is presentation-only and meaningless on non-superAdmin accounts.
    if (field === 'role' && value !== 'superAdmin' && targetUser.chapterRole) {
      updates.chapterRole = deleteField();
    }
    // Clearing chapterRole via the "— none —" option should remove the
    // field entirely rather than leave a null behind.
    if (field === 'chapterRole' && !value) {
      updates.chapterRole = deleteField();
    }
    await updateDoc(doc(db, "users", userIdToUpdate), updates);
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

// Upload a chapter member's profile photo to Firebase Storage and propagate
// the URL to the two surfaces that render it:
//   1. /users/{uid}.photoUrl            — drives the in-portal members directory
//   2. /chapters/{slug}.lpPhotos[uid]   — drives the public static chapter pages
//      (read by public/assets/js/chapter-hydration.js, which swaps the
//      hardcoded /assets/lps/*.png src on matching <img> tags).
// Storage path is namespaced by target uid so storage.rules can resolve the
// owning chapter and enforce that only that chapter's director (or a
// superAdmin) can write.
const handleMemberPhotoUpload = async (targetUser, file) => {
  if (!targetUser?.uid || !file) return;
  // Mirrors storage.rules: superAdmin can upload for any member, chapter
  // directors only for users in their chapter, LPs only for themselves.
  if (!isSuperAdmin) {
    if (isLP && targetUser.uid !== user.uid) {
      showAppAlert("LPs can only upload their own profile photo.");
      return;
    }
    if (isChapterDirector && targetUser.chapter && targetUser.chapter !== userChapter) {
      showAppAlert(`Chapter directors can only upload photos for users in ${userChapter}.`);
      return;
    }
    if (!isLP && !isChapterDirector) {
      showAppAlert("You don't have permission to upload member photos.");
      return;
    }
  }
  if (!file.type.startsWith('image/')) {
    showAppAlert("Please choose an image file (PNG, JPG, etc.).");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showAppAlert("Image must be smaller than 5 MB.");
    return;
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `LP-photos/${targetUser.uid}/${Date.now()}.${ext}`;

  setUploadingPhotoFor(prev => ({ ...prev, [targetUser.uid]: true }));
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: file.type });
    const photoUrl = await getDownloadURL(storageRef);

    await updateDoc(doc(db, "users", targetUser.uid), { photoUrl });

    // Best-effort mirror onto the chapter doc. If it fails (e.g. chapter doc
    // not yet seeded) the in-portal directory still works off the user doc.
    const chapterDoc = chapters.find(c => c.name === targetUser.chapter);
    if (chapterDoc?.id) {
      try {
        await updateDoc(doc(db, "chapters", chapterDoc.id), {
          [`lpPhotos.${targetUser.uid}`]: {
            name: targetUser.name || '',
            photoUrl,
          },
          updatedAt: Timestamp.now(),
        });
      } catch (chapterErr) {
        console.warn(`LPPortal: photo saved on user ${targetUser.uid} but chapter doc mirror failed:`, chapterErr);
      }
    }

    showAppAlert("Member photo uploaded.");
    loadAdminData();
    loadChapterMembers();
  } catch (err) {
    console.error("LPPortal: member photo upload failed:", err);
    if (err.code === 'storage/unauthorized') {
      showAppAlert("Upload failed: you don't have permission to upload this photo.");
    } else {
      showAppAlert(`Upload failed: ${err.message || err}`);
    }
  } finally {
    setUploadingPhotoFor(prev => {
      const next = { ...prev };
      delete next[targetUser.uid];
      return next;
    });
  }
};

// ───── Chapter hero + gallery photo uploads ─────
// Hero path:    chapter-photos/{chapterSlug}/hero      (stable, no extension)
// Gallery path: chapter-photos/{chapterSlug}/gallery-{ts}.{ext}
//
// Hero uploads use a STABLE path so the static chapter HTML can hardcode the
// download URL — visitors get the latest upload on first paint with no
// Firestore round-trip and no flash. Each new upload overwrites the same
// object; Cache-Control: max-age=300 means the change is visible to visitors
// within 5 min. URL is the canonical token-less Firebase Storage REST URL,
// which works because storage.rules grants public read on chapter-photos/*.
//
// Gallery photos remain timestamped — they're a list, so each upload is a
// new URL. The 24h cache there is fine because URLs rotate.
//
// Writes to storage, then persists the URL back to the /chapters/{slug} doc
// immediately so the form doesn't need a separate Save click to retain the
// upload. Storage rules allow this for superAdmin or the chapter's director.
const uploadChapterPhoto = async (chapterSlug, file, kind) => {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = kind === 'hero'
    ? `chapter-photos/${chapterSlug}/hero`
    : `chapter-photos/${chapterSlug}/${kind}-${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  const metadata = {
    contentType: file.type,
    cacheControl: kind === 'hero'
      ? 'public, max-age=300, must-revalidate'
      : 'public, max-age=86400',
  };
  await uploadBytes(storageRef, file, metadata);
  const url = kind === 'hero'
    // Canonical token-less URL — stable across uploads, governed by storage.rules.
    // Bucket is hardcoded (matches firebaseConfig.js) to avoid runtime SDK
    // version dependence on storage.app.options.storageBucket.
    ? `https://firebasestorage.googleapis.com/v0/b/gnf-app-9d7e3.firebasestorage.app/o/${encodeURIComponent(path)}?alt=media`
    // Token-bearing URL — needed for timestamped paths since each upload is a
    // new object and a stable URL would 404 once the file is replaced.
    : await getDownloadURL(storageRef);
  return { url, storagePath: path };
};

const handleChapterHeroUpload = async (file) => {
  if (!file || !editingChapterId) return;
  if (!isSuperAdmin && !isChapterDirector) {
    showAppAlert("Only chapter directors and super admins can upload chapter photos.");
    return;
  }
  if (!file.type.startsWith('image/')) {
    showAppAlert("Please choose an image file (PNG, JPG, etc.).");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showAppAlert("Image must be smaller than 5 MB.");
    return;
  }
  setUploadingPhotoFor(prev => ({ ...prev, [`hero:${editingChapterId}`]: true }));
  try {
    const { url, storagePath } = await uploadChapterPhoto(editingChapterId, file, 'hero');
    // If there was a previous hero image we uploaded, best-effort delete it to
    // avoid stranding orphans in storage. We only try when the previous URL
    // includes our own path prefix so we don't try to delete external URLs.
    const prevPath = chapterFormData.heroImageStoragePath;
    await updateDoc(doc(db, "chapters", editingChapterId), {
      heroImage: url,
      heroImageStoragePath: storagePath,
      updatedAt: Timestamp.now(),
    });
    setChapterFormData(prev => ({ ...prev, heroImage: url, heroImageStoragePath: storagePath }));
    if (prevPath && prevPath !== storagePath) {
      try { await deleteObject(ref(storage, prevPath)); } catch (_) { /* best-effort */ }
    }
    loadChapters();
  } catch (err) {
    console.error("LPPortal: chapter hero upload failed:", err);
    showAppAlert(err.code === 'storage/unauthorized'
      ? "Upload failed: you don't have permission on this chapter."
      : `Upload failed: ${err.message || err}`);
  } finally {
    setUploadingPhotoFor(prev => { const n = { ...prev }; delete n[`hero:${editingChapterId}`]; return n; });
  }
};

const handleGalleryPhotoUpload = async (file) => {
  if (!file || !editingChapterId) return;
  if (!isSuperAdmin && !isChapterDirector) {
    showAppAlert("Only chapter directors and super admins can upload chapter photos.");
    return;
  }
  if (!file.type.startsWith('image/')) {
    showAppAlert("Please choose an image file.");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showAppAlert("Image must be smaller than 5 MB.");
    return;
  }
  setUploadingPhotoFor(prev => ({ ...prev, [`gallery:${editingChapterId}`]: true }));
  try {
    const { url, storagePath } = await uploadChapterPhoto(editingChapterId, file, 'gallery');
    const current = Array.isArray(chapterFormData.galleryPhotos) ? chapterFormData.galleryPhotos : [];
    const next = [...current, { url, storagePath }];
    await updateDoc(doc(db, "chapters", editingChapterId), {
      galleryPhotos: next,
      updatedAt: Timestamp.now(),
    });
    setChapterFormData(prev => ({ ...prev, galleryPhotos: next }));
    loadChapters();
  } catch (err) {
    console.error("LPPortal: chapter gallery upload failed:", err);
    showAppAlert(err.code === 'storage/unauthorized'
      ? "Upload failed: you don't have permission on this chapter."
      : `Upload failed: ${err.message || err}`);
  } finally {
    setUploadingPhotoFor(prev => { const n = { ...prev }; delete n[`gallery:${editingChapterId}`]; return n; });
  }
};

const handleGalleryPhotoDelete = async (index) => {
  if (!editingChapterId) return;
  if (!isSuperAdmin && !isChapterDirector) return;
  const current = Array.isArray(chapterFormData.galleryPhotos) ? chapterFormData.galleryPhotos : [];
  const target = current[index];
  if (!target) return;
  const ok = await requestConfirm({
    title: 'Remove this photo from the gallery?',
    confirmLabel: 'Remove',
    variant: 'danger',
    message: <p>The file will also be deleted from storage.</p>,
  });
  if (!ok) return;
  const next = current.filter((_, i) => i !== index);
  try {
    await updateDoc(doc(db, "chapters", editingChapterId), {
      galleryPhotos: next,
      updatedAt: Timestamp.now(),
    });
    setChapterFormData(prev => ({ ...prev, galleryPhotos: next }));
    if (target.storagePath) {
      try { await deleteObject(ref(storage, target.storagePath)); } catch (_) { /* best-effort */ }
    }
    loadChapters();
  } catch (err) {
    console.error("LPPortal: chapter gallery delete failed:", err);
    showAppAlert(`Delete failed: ${err.message || err}`);
  }
};

// Admin "resend sign-in link" — replaces the legacy password-reset path now
// that email-link is the only password-style sign-in method. Internally calls
// the same callable the public login form uses, so behavior stays consistent.
const handleAdminPasswordReset = async (emailToReset) => {
  if (!emailToReset) {
    showAppAlert("Cannot send sign-in link: user email is missing.");
    return;
  }
  if (emailToReset === user?.email) {
    showAppAlert("You can't send yourself a sign-in link from here. Sign out and use the regular sign-in form.");
    return;
  }

  if (!showAppConfirm(`Send a magic sign-in link to ${emailToReset}?`)) return;

  try {
    console.log(`LPPortal: Admin ${user.email} sending sign-in link to ${emailToReset}`);
    const result = await sendSignInLinkCallable({ email: emailToReset.toLowerCase().trim() });
    if (result?.data?.sent === false) {
      // Generic-success path: cloud function couldn't find a /users record.
      showAppAlert(`No user record found for ${emailToReset}. Use Invite a new LP to add them first.`);
    } else {
      showAppAlert(`Sign-in link sent to ${emailToReset}.`);
    }
  } catch (error) {
    console.error(`LPPortal: Error sending sign-in link to ${emailToReset}:`, error);
    showAppAlert(`Failed to send sign-in link: ${error.message}`);
  }
};

// One-shot backfill: write `quarter` onto every existing review doc based on its pitch's quarter.
// Needed because quarter-scoped badges (Midas Touch, Completionist) can only see reviews where this field is set.
const handleBackfillReviewQuarters = async () => {
  if (!showAppConfirm('This will scan every review and write a `quarter` field (derived from the review\'s pitch). Safe to run multiple times. Continue?')) {
    return;
  }
  try {
    const reviewsSnapshot = await getDocs(collection(db, "reviews"));
    const pitchesSnapshot = await getDocs(collection(db, "pitches"));
    const pitchQuarterById = {};
    pitchesSnapshot.forEach(p => { pitchQuarterById[p.id] = p.data().quarter || null; });

    let written = 0;
    let skipped = 0;
    let missingPitch = 0;

    for (const reviewDoc of reviewsSnapshot.docs) {
      const review = reviewDoc.data();
      if (review.quarter) { skipped++; continue; }
      const q = pitchQuarterById[review.pitchId];
      if (!q) { missingPitch++; continue; }
      await updateDoc(doc(db, "reviews", reviewDoc.id), { quarter: q });
      written++;
    }

    showAppAlert(`Review quarter backfill complete.\n\nWritten: ${written}\nAlready had quarter: ${skipped}\nPitch not found: ${missingPitch}`);
  } catch (error) {
    console.error('Backfill review quarters error:', error);
    showAppAlert(`Backfill failed: ${error.message}`);
  }
};

// Recalculate chapter rankings for the current quarter across every chapter — unlocks
// Chapter MVP (isChapterLeaderThisQuarter) and Neighborhood Mayor (quarterlyTop3 >= 2).
// Safe to run any time; the stat writes are idempotent for the MVP flag, but quarterlyTop3
// increments every run — see note below in the UI.
const handleRecalculateChapterRankings = async () => {
  if (!showAppConfirm(`This will recalculate chapter-level leaderboards for ${getCurrentQuarter()} across every chapter.\n\nRun this ONCE near the end of each quarter. Running it multiple times will over-increment the "top-3 finishes" counter. Continue?`)) {
    return;
  }
  try {
    // Collect the distinct set of chapters from users currently loaded
    const chapters = [...new Set(users.map(u => u.chapter).filter(Boolean))];
    if (chapters.length === 0) {
      showAppAlert('No chapters found in loaded user list. Load admin data first.');
      return;
    }
    for (const chapter of chapters) {
      await calculateChapterRankings(chapter);
    }
    showAppAlert(`Chapter rankings recalculated for ${chapters.length} chapter(s): ${chapters.join(', ')}`);
    loadAdminData();
  } catch (error) {
    console.error('Chapter rankings recalc error:', error);
    showAppAlert(`Recalculation failed: ${error.message}`);
  }
};

// One-time migration: any user doc still carrying role:'admin' from the pre-rename
// world is promoted to role:'lp' (post-rename lp == what admin used to mean). Safe
// to re-run; does nothing if no admin docs remain.
const handleMigrateAdminToLP = async () => {
  if (!isSuperAdmin) {
    showAppAlert("Only Super Admins can run this migration.");
    return;
  }
  if (!showAppConfirm("This will update every user with role='admin' to role='lp'. Safe to re-run. Continue?")) {
    return;
  }
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const toMigrate = usersSnapshot.docs.filter(d => d.data().role === 'admin');
    if (toMigrate.length === 0) {
      showAppAlert("No legacy 'admin' users found. Already migrated.");
      return;
    }
    for (const d of toMigrate) {
      await updateDoc(doc(db, "users", d.id), { role: 'lp' });
    }
    showAppAlert(`Migrated ${toMigrate.length} user(s) from 'admin' to 'lp':\n\n${toMigrate.map(d => d.data().email || d.id).join('\n')}`);
    loadAdminData();
  } catch (error) {
    console.error('Admin->LP migration error:', error);
    showAppAlert(`Migration failed: ${error.message}`);
  }
};

// --- Chapters management handlers (superAdmin only) ---

// Normalizes user input into a slug for use as the /chapters doc ID.
const slugifyChapter = (value) => (value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-+|-+$/g, '');

// Blank form template, shared by reset paths.
const emptyChapterForm = {
  slug: '', name: '', pageSlug: '', tagline: '', foundedYear: '', foundedDate: '',
  emailAlias: '', slackChannel: '', lpSlackChannel: '', active: true, order: 0,
  heroTitle: '', heroTagline: '', heroImage: '', heroImageCaption: '',
  servingTitle: '', servingText: '',
  counties: [], poweredByText: '', galleryPhotos: [],
  showLPs: true, showGallery: true, showImpact: true,
  // Grant Awardees grid is opt-in per chapter (off by default) — it's a
  // heavier section that only makes sense once a chapter has picked winners.
  showAwardees: false,
  // Dollar value used by the Statistics tab when a winner doc has no explicit
  // awardAmount. Empty/null cascades to HISTORICAL_DEFAULT_GRANT in awardAmount.js.
  defaultGrantAmount: ''
};

// Normalizes a counties value from the form (array OR newline/comma-separated
// string from a textarea) into a clean array of trimmed, deduped strings.
const normalizeCounties = (value) => {
  const list = Array.isArray(value)
    ? value
    : String(value || '').split(/[\n,]/);
  const cleaned = list.map(s => String(s).trim()).filter(Boolean);
  return [...new Set(cleaned)];
};

const handleSaveChapter = async () => {
  if (!isSuperAdmin && !isChapterDirector) {
    showAppAlert("Only Super Admins and Chapter Directors can edit chapters.");
    return;
  }
  const f = chapterFormData;
  // On edit, the target doc ID must not change — use editingChapterId verbatim.
  // On create, normalize the user's slug input (or derive from the name).
  const slug = editingChapterId ? editingChapterId : slugifyChapter(f.slug || f.name);
  if (!f.name || !slug) {
    showAppAlert("Chapter name and slug are required.");
    return;
  }
  // Chapter directors are scoped to their own chapter for edits, and cannot
  // create new chapters at all. Enforced in firestore.rules too.
  if (isChapterDirector && !isSuperAdmin) {
    if (isAddingChapter) {
      showAppAlert("Only Super Admins can create new chapters.");
      return;
    }
    const target = chapters.find(c => c.id === editingChapterId);
    if (!target || target.name !== userChapter) {
      showAppAlert(`Chapter directors can only edit their own chapter (${userChapter}).`);
      return;
    }
  }
  // Uniqueness only matters on create.
  if (isAddingChapter && chapters.some(c => c.id === slug)) {
    showAppAlert(`A chapter with slug "${slug}" already exists.`);
    return;
  }
  try {
    const docRef = doc(db, "chapters", slug);
    // Content fields any director is allowed to write (must match the
    // directorEditableFields allowlist in firestore.rules).
    const contentPayload = {
      heroTitle: (f.heroTitle || '').trim(),
      heroTagline: (f.heroTagline || '').trim(),
      heroImageCaption: (f.heroImageCaption || '').trim(),
      servingTitle: (f.servingTitle || '').trim(),
      servingText: (f.servingText || '').trim(),
      counties: normalizeCounties(f.counties),
      poweredByText: (f.poweredByText || '').trim(),
      showLPs: f.showLPs !== false,
      showGallery: f.showGallery !== false,
      // Defaults to true (matching ChapterPage's destructured default and the
      // static HTML where the impact section starts visible) — so only an
      // explicit toggle to false hides it.
      showImpact: f.showImpact !== false,
      // Strict === true so absence/null defaults to hidden, matching the
      // ChapterPage default and the static-HTML section's initial display:none.
      showAwardees: f.showAwardees === true,
      // Per-chapter default grant size for the Statistics tab fallback chain.
      // null on blank input so the resolver cascades to HISTORICAL_DEFAULT_GRANT.
      defaultGrantAmount: f.defaultGrantAmount === '' || f.defaultGrantAmount == null
        ? null
        : (Number.isFinite(Number(f.defaultGrantAmount)) && Number(f.defaultGrantAmount) > 0
            ? Math.round(Number(f.defaultGrantAmount))
            : null),
      updatedAt: Timestamp.now()
    };
    // heroImage and galleryPhotos are saved immediately by the upload handlers
    // (handleChapterHeroUpload / handleGalleryPhotoUpload) so we do NOT include
    // them in the Save payload — otherwise a stale form snapshot would clobber
    // a photo that was uploaded seconds earlier.
    let payload;
    if (isSuperAdmin) {
      // SuperAdmins write the full doc (metadata + content).
      payload = {
        name: f.name.trim(),
        slug,
        // pageSlug defaults to slug when blank.
        pageSlug: ((f.pageSlug || '').trim() || slug),
        tagline: (f.tagline || '').trim(),
        foundedYear: f.foundedYear === '' || f.foundedYear == null
          ? null
          : (Number.isFinite(Number(f.foundedYear)) ? Number(f.foundedYear) : null),
        // Full founding date drives Founding Member badge eligibility (1-year window).
        // foundedYear stays as a coarse fallback for legacy chapters that haven't set this.
        foundedDate: (() => {
          const v = (f.foundedDate || '').trim();
          if (!v) return null;
          const parsed = new Date(v);
          return isNaN(parsed.getTime()) ? null : Timestamp.fromDate(parsed);
        })(),
        emailAlias: (f.emailAlias || '').trim(),
        slackChannel: (f.slackChannel || '').trim(),
        lpSlackChannel: (f.lpSlackChannel || '').trim(),
        active: f.active !== false,
        order: Number.isFinite(Number(f.order)) ? Number(f.order) : 0,
        ...contentPayload
      };
      if (isAddingChapter) {
        payload.createdAt = Timestamp.now();
        payload.createdBy = user.uid;
      }
    } else {
      // Chapter directors can only touch the content allowlist. Firestore
      // rules also enforce this — we just keep the client write minimal to
      // avoid tripping the affectedKeys().hasOnly(...) check.
      payload = contentPayload;
    }
    await setDoc(docRef, payload, { merge: true });
    showAppAlert(`Chapter "${f.name.trim()}" saved.`);
    setIsAddingChapter(false);
    setEditingChapterId(null);
    setChapterFormData({ ...emptyChapterForm });
    loadChapters();
  } catch (error) {
    console.error('Save chapter error:', error);
    showAppAlert(`Failed to save chapter: ${error.message}`);
  }
};

const handleDeleteChapter = async (chapterId, chapterName) => {
  if (!isSuperAdmin) return;
  const ok = await requestConfirm({
    title: `Delete chapter "${chapterName}"?`,
    confirmLabel: 'Delete chapter',
    variant: 'danger',
    message: (
      <>
        <p>This removes the <code>/chapters/{chapterId}</code> document.</p>
        <p>Existing user, pitch, and review docs that reference this chapter by name are left untouched — you&rsquo;ll need to reassign or archive them separately.</p>
      </>
    ),
  });
  if (!ok) return;
  try {
    await deleteDoc(doc(db, "chapters", chapterId));
    showAppAlert(`Chapter "${chapterName}" deleted.`);
    loadChapters();
  } catch (error) {
    console.error('Delete chapter error:', error);
    showAppAlert(`Delete failed: ${error.message}`);
  }
};

// Seeds /chapters with the four known chapters from the legacy hardcoded maps in
// functions/index.js. Idempotent: skips any chapter whose slug already exists.
const handleSeedLegacyChapters = async () => {
  if (!isSuperAdmin) return;
  if (!showAppConfirm("Seed /chapters with the 4 known chapters?\n\n• Creates any missing chapter.\n• For existing chapters, fills in only MISSING fields (tagline, foundedYear, pageSlug, etc.). Does NOT overwrite anything you've edited.\n\nSafe to re-run.")) {
    return;
  }
  const legacyChapters = [
    {
      slug: 'wny', pageSlug: 'wny', name: 'Western New York',
      tagline: 'Where it all started, serving Buffalo and the surrounding 8 counties.',
      foundedYear: 2023,
      foundedDate: Timestamp.fromDate(new Date('2023-10-01')),
      emailAlias: 'wny@goodneighbor.fund', slackChannel: 'C04V14N4W83', lpSlackChannel: 'C04K9G2L29L', order: 1,
      heroTitle: '$1,000 Micro-Grants for Buffalo Business Ideas',
      heroTagline: 'No pitch deck required. No equity taken. Just belief in your vision and potential.',
      servingTitle: 'Serving All of Western New York',
      servingText: "Good Neighbor Fund WNY supports entrepreneurs across 8 counties in Western New York. Whether you're in the heart of Buffalo or rural Wyoming County, we believe in your potential.",
      counties: ['Erie County', 'Niagara County', 'Cattaraugus', 'Chautauqua', 'Allegany County', 'Genesee County', 'Wyoming County', 'Orleans County'],
      poweredByText: "Good Neighbor Fund is a collective giving organization. Our funding comes from Limited Partners (LPs) — local founders, operators, and community members who pool their own capital each quarter to fund the boldest new ideas in WNY. No overhead. No bureaucracy. Just neighbors investing in neighbors.",
      showLPs: true, showGallery: true
    },
    {
      slug: 'denver', pageSlug: 'denver', name: 'Denver',
      tagline: 'Serving the greater Denver metropolitan area.',
      foundedYear: 2023,
      foundedDate: Timestamp.fromDate(new Date('2024-01-01')),
      emailAlias: 'denver@goodneighbor.fund', slackChannel: 'C04ULN7FPB9', lpSlackChannel: 'C04K9G4PVML', order: 2,
      heroTitle: '$1,000 Micro-Grants for Denver Business Ideas',
      heroTagline: 'No pitch deck required. No equity taken. Just belief in your vision and potential.',
      servingTitle: 'Serving the Mile High City',
      servingText: 'Good Neighbor Fund Denver supports entrepreneurs across the Denver metro area. From downtown to the suburbs, we believe in your Mile High dreams.',
      counties: ['Denver County', 'Jefferson County', 'Arapahoe County', 'Adams County', 'Douglas County', 'Boulder County'],
      poweredByText: "Good Neighbor Fund is a collective giving organization. Our funding comes from Limited Partners (LPs) — local founders, operators, and community members who pool their own capital each quarter to fund the boldest new ideas in Denver. No overhead. No bureaucracy. Just neighbors investing in neighbors.",
      showLPs: true, showGallery: true
    },
    {
      slug: 'upstate', pageSlug: 'central', name: 'Central New York',
      tagline: 'Bringing belief capital to founders across Central New York — Syracuse, Ithaca, Binghamton, Utica and beyond.',
      foundedYear: 2026,
      foundedDate: Timestamp.fromDate(new Date('2026-05-26')),
      emailAlias: 'cny@goodneighbor.fund', slackChannel: 'C0AUSSA9DGW', lpSlackChannel: 'C0AUUTAB2BC', order: 3,
      heroTitle: '$1,000 Micro-Grants for Central NY Business Ideas',
      heroTagline: 'No pitch deck required. No equity taken. Just belief in your vision and potential.',
      servingTitle: 'Serving Central New York',
      servingText: "Good Neighbor Fund Central NY supports entrepreneurs across Central New York — from Syracuse to Ithaca, Binghamton to Utica. Wherever you're building, we believe in your potential.",
      counties: ['Onondaga County', 'Tompkins County', 'Broome County', 'Oneida County', 'Madison County', 'Cortland County', 'Tioga County', 'Chemung County'],
      poweredByText: "Good Neighbor Fund is a collective giving organization. Our funding comes from Limited Partners (LPs) — local founders, operators, and community members who pool their own capital each quarter to fund the boldest new ideas in Central NY. No overhead. No bureaucracy. Just neighbors investing in neighbors.",
      showLPs: false, showGallery: false
    },
    {
      slug: 'capital-region', pageSlug: 'capital-region', name: 'Capital Region',
      tagline: "Supporting bold ideas across New York's Capital Region — Albany, Schenectady, Troy and the surrounding area.",
      foundedYear: 2026,
      foundedDate: Timestamp.fromDate(new Date('2026-05-26')),
      emailAlias: 'capitalregion@goodneighbor.fund', slackChannel: 'C0B096U4KK2', lpSlackChannel: 'C0AV7QJS1TK', order: 4,
      heroTitle: '$1,000 Micro-Grants for Capital Region Business Ideas',
      heroTagline: 'No pitch deck required. No equity taken. Just belief in your vision and potential.',
      servingTitle: "Serving New York's Capital Region",
      servingText: "Good Neighbor Fund Capital Region supports entrepreneurs across Albany, Schenectady, Troy, Saratoga Springs and the surrounding counties. Wherever you're building, we believe in your potential.",
      counties: ['Albany County', 'Schenectady County', 'Rensselaer County', 'Saratoga County', 'Columbia County', 'Greene County', 'Washington County', 'Warren County'],
      poweredByText: "Good Neighbor Fund is a collective giving organization. Our funding comes from Limited Partners (LPs) — local founders, operators, and community members who pool their own capital each quarter to fund the boldest new ideas in the Capital Region. No overhead. No bureaucracy. Just neighbors investing in neighbors.",
      showLPs: false, showGallery: false
    },
  ];
  try {
    let created = 0, toppedUp = 0, unchanged = 0;
    for (const c of legacyChapters) {
      const existing = chapters.find(x => x.id === c.slug);
      if (!existing) {
        await setDoc(doc(db, "chapters", c.slug), {
          ...c,
          active: true,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          updatedAt: Timestamp.now()
        });
        created++;
        continue;
      }
      // Chapter exists — only fill in fields that are currently empty/missing.
      // Never overwrite a value the user has already set.
      const topUp = {};
      const isEmpty = (v) => v === undefined || v === null || v === '';
      for (const [k, v] of Object.entries(c)) {
        if (isEmpty(existing[k])) topUp[k] = v;
      }
      if (Object.keys(topUp).length === 0) {
        unchanged++;
      } else {
        topUp.updatedAt = Timestamp.now();
        await setDoc(doc(db, "chapters", existing.id), topUp, { merge: true });
        toppedUp++;
      }
    }
    showAppAlert(`Seed complete.\n• Created: ${created}\n• Topped up (added missing fields): ${toppedUp}\n• Already complete (no changes): ${unchanged}`);
    loadChapters();
  } catch (error) {
    console.error('Seed chapters error:', error);
    showAppAlert(`Seed failed: ${error.message}`);
  }
};

const handleAssignAnniversaryBadges = async () => {
  if (!showAppConfirm('This will check all users and assign Founding Member and Year Club badges to those who qualify based on their join dates. Continue?')) {
    return;
  }

  try {
    showAppAlert('Starting anniversary badge assignment...');

    // Load chapter founding dates so the Founding Member check is chapter-aware.
    // Falls back to Jan 1 of foundedYear when foundedDate isn't set on a chapter.
    const chaptersSnapshot = await getDocs(collection(db, "chapters"));
    const chapterFoundingByName = {};
    chaptersSnapshot.forEach((cDoc) => {
      const c = cDoc.data();
      let founding = null;
      if (c.foundedDate) {
        founding = c.foundedDate.toDate ? c.foundedDate.toDate() : new Date(c.foundedDate);
      } else if (typeof c.foundedYear === 'number') {
        founding = new Date(Date.UTC(c.foundedYear, 0, 1));
      }
      if (founding && !isNaN(founding.getTime()) && c.name) {
        chapterFoundingByName[c.name] = founding;
      }
    });

    // Get all users
    const usersSnapshot = await getDocs(collection(db, "users"));
    let processedCount = 0;
    let badgesAddedCount = 0;

    // Anniversary badge definitions. og_neighbor takes (joinDate, foundingDate);
    // year-club badges only need joinDate.
    const ANNIVERSARY_BADGES = {
      og_neighbor: {
        id: 'og_neighbor',
        name: '🏛️ Founding Member',
        description: "LP who joined within their chapter's first year",
        category: 'general',
        checkFunction: (joinDate, foundingDate) => {
          if (!foundingDate) return false;
          const daysDiff = (joinDate.getTime() - foundingDate.getTime()) / (24 * 60 * 60 * 1000);
          return daysDiff >= 0 && daysDiff <= 365;
        }
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
      
      // Check which badges they should have. og_neighbor needs the chapter's
      // founding date; year-club badges ignore the second arg.
      const newBadges = [];
      const userFoundingDate = chapterFoundingByName[userData.chapter] || null;

      for (const [badgeId, badge] of Object.entries(ANNIVERSARY_BADGES)) {
        if (!currentBadgeIds.includes(badgeId) && badge.checkFunction(joinDate, userFoundingDate)) {
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

// Toggle the group "shortlist" flag on a pitch. Used by chapter directors during
// the live review meeting to bookmark candidates for deeper discussion. The flag
// lives directly on the pitch doc; only admins can toggle it (rules allow admin
// updates on any pitch field).
const handleToggleShortlist = async (pitchId, currentShortlisted) => {
  if (!isAdmin) return;
  setShortlistTogglingId(pitchId);
  const nextValue = !currentShortlisted;
  try {
    await updateDoc(doc(db, "pitches", pitchId), {
      shortlisted: nextValue,
      shortlistedAt: nextValue ? serverTimestamp() : null,
      shortlistedBy: nextValue ? (user.name || user.email || user.uid) : null,
    });
    // Optimistic local update so the UI reflects the change before the next reload.
    setAdminPitches(prev => prev.map(p => p.id === pitchId
      ? { ...p, shortlisted: nextValue, shortlistedBy: nextValue ? (user.name || user.email || user.uid) : null }
      : p
    ));
  } catch (error) {
    console.error(`LPPortal: Shortlist toggle failed for pitch ${pitchId}:`, error);
    showAppAlert(`Could not update shortlist: ${error.message}`);
  } finally {
    setShortlistTogglingId(null);
  }
};

// Admin notes CRUD. Notes are stored in /adminNotes and attributed to the signed-in
// admin. Each note carries enough scoping metadata (pitchId, chapter, quarter) to
// support chapter-scoped list queries and future export.
const handleAddAdminNote = async (pitch) => {
  if (!isAdmin || !pitch?.id) return;
  const draft = (adminNoteDrafts[pitch.id] || "").trim();
  if (!draft) return;
  setAdminNoteSavingId(pitch.id);
  try {
    const docRef = await addDoc(collection(db, "adminNotes"), {
      pitchId: pitch.id,
      pitchBusinessName: pitch.businessName || "",
      chapter: pitch.chapter || userChapter || "",
      quarter: pitch.quarter || "",
      authorId: user.uid,
      authorName: user.name || user.email || "",
      text: draft,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      editCount: 0,
    });
    // Optimistic: prepend the new note so it shows up instantly.
    setAdminNotes(prev => [{
      id: docRef.id,
      pitchId: pitch.id,
      pitchBusinessName: pitch.businessName || "",
      chapter: pitch.chapter || userChapter || "",
      quarter: pitch.quarter || "",
      authorId: user.uid,
      authorName: user.name || user.email || "",
      text: draft,
      createdAt: new Date(),
      updatedAt: new Date(),
      editCount: 0,
    }, ...prev]);
    setAdminNoteDrafts(prev => ({ ...prev, [pitch.id]: "" }));
  } catch (error) {
    console.error(`LPPortal: Add admin note failed for pitch ${pitch.id}:`, error);
    showAppAlert(`Could not save note: ${error.message}`);
  } finally {
    setAdminNoteSavingId(null);
  }
};

const handleStartEditAdminNote = (note) => {
  setEditingAdminNoteId(note.id);
  setEditingAdminNoteText(note.text || "");
};

const handleCancelEditAdminNote = () => {
  setEditingAdminNoteId(null);
  setEditingAdminNoteText("");
};

const handleSaveEditAdminNote = async (noteId) => {
  const trimmed = editingAdminNoteText.trim();
  if (!trimmed) return;
  const note = adminNotes.find(n => n.id === noteId);
  if (!note) return;
  setAdminNoteSavingId(noteId);
  try {
    await updateDoc(doc(db, "adminNotes", noteId), {
      text: trimmed,
      updatedAt: serverTimestamp(),
      editCount: (note.editCount || 0) + 1,
    });
    setAdminNotes(prev => prev.map(n => n.id === noteId
      ? { ...n, text: trimmed, updatedAt: new Date(), editCount: (n.editCount || 0) + 1 }
      : n
    ));
    handleCancelEditAdminNote();
  } catch (error) {
    console.error(`LPPortal: Edit admin note failed for ${noteId}:`, error);
    showAppAlert(`Could not update note: ${error.message}`);
  } finally {
    setAdminNoteSavingId(null);
  }
};

const handleDeleteAdminNote = async (noteId) => {
  if (!showAppConfirm("Delete this note? This cannot be undone.")) return;
  setAdminNoteSavingId(noteId);
  try {
    await deleteDoc(doc(db, "adminNotes", noteId));
    setAdminNotes(prev => prev.filter(n => n.id !== noteId));
    if (editingAdminNoteId === noteId) handleCancelEditAdminNote();
  } catch (error) {
    console.error(`LPPortal: Delete admin note failed for ${noteId}:`, error);
    showAppAlert(`Could not delete note: ${error.message}`);
  } finally {
    setAdminNoteSavingId(null);
  }
};

const handleAssignWinner = async (pitchId, currentWinnerStatus) => {
  const pitchToUpdate = adminPitches.find(p => p.id === pitchId);
  if (!pitchToUpdate) {
    console.error(`LPPortal: Assign Winner failed - Pitch ${pitchId} not found in adminPitches state.`);
    showAppAlert("Error: Could not find pitch data to update.");
    return;
  }

  // Per-chapter grant default, falling back to the historical $1,000 when no
  // chapter-level override is set. Pitch-level awardAmount always wins over both.
  const chapterDoc = chapters.find(c => c.name === pitchToUpdate.chapter);
  const chapterDefault = Number.isFinite(chapterDoc?.defaultGrantAmount) && chapterDoc.defaultGrantAmount > 0
    ? chapterDoc.defaultGrantAmount
    : 1000;

  if (!currentWinnerStatus) {
    // Promoting to winner — capture award amount (blank accepts the chapter default).
    const input = window.prompt(
      `Enter grant amount for "${pitchToUpdate.businessName || 'this pitch'}" in dollars.\nLeave blank to use the chapter default ($${chapterDefault.toLocaleString()}).`,
      ''
    );
    if (input === null) return; // user cancelled prompt
    const trimmed = input.trim();
    const parsed = trimmed === '' ? chapterDefault : Number(trimmed.replace(/[$,]/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showAppAlert('Award amount must be a positive number.');
      return;
    }
    const amount = Math.round(parsed);
    try {
      // Newly-assigned winners default to hidden — chapters publish from the
      // Grant Winners tab when they're ready to announce. Existing winners
      // (no field) read as published; only docs explicitly set to false hide.
      await updateDoc(doc(db, "pitches", pitchId), {
        isWinner: true,
        awardAmount: amount,
        awardedAt: serverTimestamp(),
        winnerPublished: false
      });
      await updateWinnerPredictions(pitchId, pitchToUpdate);
      showAppAlert(`Winner marked: "${pitchToUpdate.businessName}" — $${amount.toLocaleString()}. Not yet live on the website — toggle "Live on website" in the Grant Winners tab to publish.`);
      loadLPData();
      loadAdminData();
    } catch (error) {
      console.error(`LPPortal: Assign Winner Error for pitch ${pitchId}:`, error);
      if (error.code === 'permission-denied' || (error.message || '').includes('permission-denied')) {
        showAppAlert(`Update failed: Permission Denied. Check Firestore rules for updating pitch winner status.`);
      } else {
        showAppAlert(`Update failed: ${error.message}. Check Firestore Rules.`);
      }
    }
    return;
  }

  // Un-marking an existing winner.
  if (!showAppConfirm(`Remove winner status for "${pitchToUpdate.businessName || 'Unknown'}"?\nThis also clears the award amount and adjusts LP prediction stats.`)) return;
  try {
    await updateDoc(doc(db, "pitches", pitchId), {
      isWinner: false,
      awardAmount: deleteField(),
      awardedAt: deleteField(),
      winnerPublished: deleteField()
    });
    // Reverse the stat bumps updateWinnerPredictions applied when this pitch was marked.
    // Prior behavior left these stale on un-mark.
    await reverseWinnerPredictions(pitchId);
    showAppAlert(`"${pitchToUpdate.businessName}" is no longer marked as a winner.`);
    loadLPData();
    loadAdminData();
  } catch (error) {
    console.error(`LPPortal: Remove Winner Error for pitch ${pitchId}:`, error);
    if (error.code === 'permission-denied' || (error.message || '').includes('permission-denied')) {
      showAppAlert(`Update failed: Permission Denied. Check Firestore rules for updating pitch winner status.`);
    } else {
      showAppAlert(`Update failed: ${error.message}. Check Firestore Rules.`);
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
      "Terms & Privacy Agreed": p.consentToShare ? "Yes" : "No",
      "In-Person Meetup Agreed": p.consentToMeetup ? "Yes" : "No",
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
    const quarterPart = adminQuarterFilter.length === 0 ? 'allQuarters' : adminQuarterFilter.join('-');
    const favFilterPart = adminFavoriteFilterMode === 'favsOnly' ? '_favsOnly' : (adminFavoriteFilterMode === 'favsAndCons' ? '_favsAndCons' : ''); // Updated logic
    const filename = `neighborhoodOS_pitches_${chapterPart}_${quarterPart}${favFilterPart}_${timestamp}.csv`;

    saveAs(blob, filename);
    console.log(`LPPortal: CSV export successful: ${filename}`);
  } catch (error) {
    console.error("LPPortal: CSV Export Error:", error);
    showAppAlert(`CSV export failed: ${error.message}`);
  }
};

// Export the LP pitch list (all fields, based on current filters)
const handleLpPitchExport = () => {
  const pitchesToExport = lpFilteredPitches;
  if (!pitchesToExport || pitchesToExport.length === 0) {
    showAppAlert("No pitches match the current filters to export.");
    return;
  }

  const normalizeValue = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'object') {
      if (typeof val.toDate === 'function') {
        try { return val.toDate().toISOString(); } catch { return ""; }
      }
      if (val instanceof Date) return val.toISOString();
      if (Array.isArray(val)) return val.join(", ");
      try { return JSON.stringify(val); } catch { return String(val); }
    }
    return val;
  };

  // Collect the union of all keys across pitches for "all fields"
  const allKeys = new Set();
  pitchesToExport.forEach((p) => Object.keys(p || {}).forEach((k) => allKeys.add(k)));
  const orderedKeys = Array.from(allKeys).sort();

  const rows = pitchesToExport.map((p) => {
    const row = {};
    orderedKeys.forEach((k) => { row[k] = normalizeValue(p[k]); });
    const myReview = reviews[p.id];
    row["myReviewRating"] = myReview?.overallLpRating || "";
    row["myReviewComments"] = myReview?.comments || "";
    row["mySubmittedAt"] = myReview?.submittedAt ? normalizeValue(myReview.submittedAt) : "";
    return row;
  });

  try {
    const csv = Papa.unparse(rows, { header: true });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const timestamp = new Date().toISOString().slice(0, 10);
    const chapterPart = reviewChapterFilter || 'allChapters';
    const quarterPart = reviewQuarterFilter.length === 0 ? 'allQuarters' : reviewQuarterFilter.join('-');
    const filename = `neighborhoodOS_review_pitches_${chapterPart}_${quarterPart}_${timestamp}.csv`;
    saveAs(blob, filename);
  } catch (error) {
    console.error("LPPortal: LP CSV Export Error:", error);
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

    // Filter by Quarter (multi-select)
    const matchesQuarter = reviewQuarterFilter.length === 0 || reviewQuarterFilter.includes(p.quarter);
    if (!matchesQuarter) return false;

    // Filter by Category
    if (reviewCategoryFilter && p.category !== reviewCategoryFilter) return false;

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
}, [lpPitches, reviews, reviewSearchTerm, reviewFilter, reviewChapterFilter, reviewQuarterFilter, reviewCategoryFilter, hidePassedReviews]);


// Memoized function to group reviews for a specific pitch in the admin view
const getGroupedReviewsForAdmin = useCallback((pitchId) => {
  // Ensure dependencies (allReviewsData, users) are available
  if (!Array.isArray(allReviewsData) || !Array.isArray(users)) {
    // console.warn("getGroupedReviewsForAdmin: Called before allReviewsData or users loaded.");
    return { count: 0, byRating: {}, details: [], comments: [] }; // Return empty structure, added comments array
  }

  const relevantReviews = allReviewsData.filter(r => r.pitchId === pitchId);
  const count = relevantReviews.length;
  if (count === 0) return { count: 0, byRating: {}, details: [], comments: [], score: 0, scoredCount: 0, averageScore: null };

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

    // Collect comment with reviewer info
    if (review.comments && review.comments.trim() !== "") {
        allComments.push({ text: review.comments.trim(), reviewer: reviewerDisplay });
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

  // Weighted score: Favorite +2, Consideration +1, Pass 0, Ineligible -2.
  // "No Rating" rows are ignored so partial reviews don't skew the average.
  let score = 0;
  let scoredCount = 0;
  Object.entries(groupedByRating).forEach(([rating, data]) => {
    if (rating in LP_RATING_WEIGHTS) {
      score += LP_RATING_WEIGHTS[rating] * data.count;
      scoredCount += data.count;
    }
  });
  const averageScore = scoredCount > 0 ? score / scoredCount : null;

  return {
    count: count,
    byRating: groupedByRating,
    details: detailedReviews,
    comments: allComments,
    score,
    scoredCount,
    averageScore
  };
}, [allReviewsData, users]); // Depend on the full reviews list and the users list

// Group admin notes by pitchId for render. Sorted newest-first within each pitch
// so the live discussion always shows the most recent thought at the top.
const adminNotesByPitch = useMemo(() => {
  const grouped = {};
  for (const note of adminNotes) {
    if (!note?.pitchId) continue;
    if (!grouped[note.pitchId]) grouped[note.pitchId] = [];
    grouped[note.pitchId].push(note);
  }
  const getTime = (ts) => {
    if (!ts) return 0;
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    return 0;
  };
  Object.values(grouped).forEach(list => {
    list.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
  });
  return grouped;
}, [adminNotes]);

// Memoized list of Admin pitches filtered AND sorted by current UI settings
const adminFilteredSortedPitches = useMemo(() => {
  if (!Array.isArray(adminPitches)) return [];

  let filtered = adminPitches.filter((p) => {
    const groupedReviews = getGroupedReviewsForAdmin(p.id); // Get review summary once

    // Filter by Quarter
    const matchesQuarter = adminQuarterFilter.length === 0 || adminQuarterFilter.includes(p.quarter);
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
    if (adminFavoriteFilterMode === 'shortlisted' && !p.shortlisted) {
      return false; // Hide if filtering by shortlist and this pitch isn't on it
    }

    // Passed all admin filters
    return true;
  });

  // --- Sorting Logic ---
  const submittedTime = (p) => (
    p.createdAt?.toDate ? p.createdAt.toDate().getTime()
      : (p.createdAt instanceof Date ? p.createdAt.getTime() : 0)
  );

  // Favorite-filter precedence: if the user is filtering by favorites,
  // sort by favorite count regardless of sort dropdown.
  if (adminFavoriteFilterMode === 'favsOnly' || adminFavoriteFilterMode === 'favsAndCons') {
    filtered.sort((a, b) => {
      const favCountA = getGroupedReviewsForAdmin(a.id).byRating?.["Favorite"]?.count || 0;
      const favCountB = getGroupedReviewsForAdmin(b.id).byRating?.["Favorite"]?.count || 0;
      if (favCountB !== favCountA) return favCountB - favCountA;
      return (submittedTime(b) || 0) - (submittedTime(a) || 0);
    });
  } else if (adminSortMode === 'oldest') {
    filtered.sort((a, b) => submittedTime(a) - submittedTime(b));
  } else if (adminSortMode === 'sumDesc' || adminSortMode === 'sumAsc') {
    // Raw score (sum). Rewards volume of favorable reviews. Unreviewed = 0.
    filtered.sort((a, b) => {
      const scoreA = getGroupedReviewsForAdmin(a.id).score || 0;
      const scoreB = getGroupedReviewsForAdmin(b.id).score || 0;
      const diff = adminSortMode === 'sumDesc' ? scoreB - scoreA : scoreA - scoreB;
      if (diff !== 0) return diff;
      return (submittedTime(b) || 0) - (submittedTime(a) || 0);
    });
  } else if (adminSortMode === 'avgDesc' || adminSortMode === 'avgAsc') {
    // Average score (quality per review). Unreviewed treated as 0.
    // Tiebreakers: more reviews first (higher confidence), then newest.
    filtered.sort((a, b) => {
      const gA = getGroupedReviewsForAdmin(a.id);
      const gB = getGroupedReviewsForAdmin(b.id);
      const avgA = gA.averageScore === null || gA.averageScore === undefined ? 0 : gA.averageScore;
      const avgB = gB.averageScore === null || gB.averageScore === undefined ? 0 : gB.averageScore;
      const diff = adminSortMode === 'avgDesc' ? avgB - avgA : avgA - avgB;
      if (diff !== 0) return diff;
      const reviewDiff = (gB.scoredCount || 0) - (gA.scoredCount || 0);
      if (reviewDiff !== 0) return reviewDiff;
      return (submittedTime(b) || 0) - (submittedTime(a) || 0);
    });
  } else if (adminSortMode === 'mostReviews') {
    filtered.sort((a, b) => {
      const countA = getGroupedReviewsForAdmin(a.id).count || 0;
      const countB = getGroupedReviewsForAdmin(b.id).count || 0;
      if (countB !== countA) return countB - countA;
      return (submittedTime(b) || 0) - (submittedTime(a) || 0);
    });
  } else {
    // 'newest' (default)
    filtered.sort((a, b) => (submittedTime(b) || 0) - (submittedTime(a) || 0));
  }

  return filtered;

}, [
    adminPitches,
    adminQuarterFilter,
    adminChapterFilter,
    adminSearch,
    isSuperAdmin,
    adminHidePassed,
    adminFavoriteFilterMode,
    adminSortMode,
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

if (isLoadingAuth || completingSignIn) {
  const message = completingSignIn ? "Signing you in…" : "Verifying access…";
  return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'var(--font-content)', fontSize: '1.2em', color: 'var(--mb-ink-60)' }}>{message}</div>;
}


// --- Login Screen ---
if (!user) {
  const linkSent = !!signInLinkSentTo;
  return (
    <div className="lp-login">
      <div className="lp-login__card">
        <span className="lp-login__eyebrow">Limited Partner Access</span>

        {linkSent ? (
          <>
            <h1 className="lp-login__title">Check <em>your email.</em></h1>
            <p className="lp-login__lede">
              We sent a one-tap sign-in link to <strong style={{ color: 'var(--mb-ink)' }}>{signInLinkSentTo}</strong>.
              Open it on this device to sign in. The link expires in about an hour.
            </p>
            {authError && (
              <div role="alert" className="lp-login__error">
                <strong>Error:</strong><span>{authError}</span>
              </div>
            )}
            <div className="lp-login__sent">
              <div className="lp-login__sent-icon" aria-hidden="true">✉️</div>
              <button
                type="button"
                onClick={() => { setSignInLinkSentTo(""); setAuthError(""); }}
                className="lp-login__use-different"
              >
                Use a different email
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="lp-login__title">Welcome, <em>neighbor.</em></h1>
            <p className="lp-login__lede">
              Sign in to review pitches, vote on grants, and help your chapter decide who gets $1,000 next.
            </p>

            {authError && (
              <div role="alert" className="lp-login__error">
                <strong>Error:</strong><span>{authError}</span>
              </div>
            )}

            <form className="lp-login__form" onSubmit={(e) => { e.preventDefault(); if (!signInLinkSending) handleSendSignInLink(); }}>
              <label className="lp-login__label" htmlFor="lp-login-email">Email Address</label>
              <input
                id="lp-login-email"
                className="lp-login__input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@goodneighbor.fund"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                className="lp-login__submit"
                disabled={signInLinkSending}
              >
                {signInLinkSending ? 'Sending…' : 'Email me a sign-in link'}
              </button>
            </form>

            <div className="lp-login__divider" aria-hidden="true">or</div>

            <button
              type="button"
              className="lp-login__google"
              onClick={handleGoogleLogin}
            >
              <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}

        <div className="lp-login__footer">
          <p>This tool is for internal GNF Limited Partner use and requires an Admin invite.</p>
          <p>
            Interested in becoming a Limited Partner?{' '}
            <a href="/lp-application" className="lp-login__apply">Apply here →</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Removed invite code screen - no longer needed

// --- Logged-In View ---
return (
  <div className="win95-window" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: 'var(--font-content)' }}>
    
    {/* Mobile Styles */}
    <style>{`
      @media (max-width: 768px) {
        .mobile-menu-btn { display: block !important; }
        .mobile-close-btn { display: block !important; }
        .desktop-sidebar { display: none !important; }
        .mobile-sidebar-overlay {
          display: ${isMobileMenuOpen ? 'block' : 'none'} !important;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 998;
        }
        .mobile-sidebar {
          display: flex !important;
          position: fixed;
          top: 0;
          left: ${isMobileMenuOpen ? '0' : '-100%'};
          height: 100vh;
          width: 80%;
          max-width: 300px;
          background: var(--gnf-bg-gray);
          transition: left 0.3s ease;
          z-index: 999;
          flex-direction: column;
          border-right: 2px solid var(--gnf-border-pink);
          box-shadow: 2px 2px 0 var(--gnf-pink-300);
        }
        .main-content-area {
          width: 100% !important;
        }
        .content-section {
          width: 100% !important;
          max-width: 100% !important;
          padding: 15px !important;
        }
        .stats-grid {
          display: flex !important;
          flex-direction: column !important;
          gap: 15px !important;
        }
        .stats-card {
          width: 100% !important;
        }
        .pitch-card, .member-card {
          width: 100% !important;
          max-width: 100% !important;
        }
        /* Filter bar: 2-col grid with full-width search + pitch-type and
           paired chapter/quarter + Hide/Export. Overrides .filter-bar--one-row's
           nowrap so nothing clips at 390px. Layout:
             row 1: [search       ] (span 2)
             row 2: [chapter][quarter]
             row 3: [pitch-type   ] (span 2)
             row 4: [hide-passes][export]
        */
        .filter-bar, .filter-bar--one-row {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          padding: 10px !important;
          margin-bottom: 14px !important;
        }
        .filter-bar select, .filter-bar input,
        .filter-bar--one-row select, .filter-bar--one-row input {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 40px !important;
          font-size: 14px !important;
        }
        .filter-bar > input[type="text"],
        .filter-bar > input[type="search"],
        .filter-bar--one-row > input[type="text"],
        .filter-bar--one-row > input[type="search"] {
          grid-column: 1 / -1 !important;
          min-width: 0 !important;
        }
        .filter-bar--one-row > .multi-select-dropdown {
          min-width: 0 !important;
        }
        /* 4th child (pitch-type filter) spans full width on its own row */
        .filter-bar--one-row > *:nth-child(4) {
          grid-column: 1 / -1 !important;
        }
        .filter-bar--one-row > button,
        .filter-bar--one-row > .retro-toggle {
          height: 40px !important;
          min-height: 40px !important;
          padding: 0 10px !important;
          font-size: 12px !important;
        }
        .badge-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 10px !important;
        }
        .social-cards-container {
          flex-direction: column !important;
          align-items: center !important;
        }
        .social-card-wrapper {
          width: 100% !important;
          max-width: 350px !important;
        }
        .header-text {
          max-width: 200px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .logout-btn {
          padding: 6px 10px !important;
          font-size: 12px !important;
        }
        canvas {
          max-width: 100% !important;
          height: auto !important;
        }
        .pitch-card {
          margin-bottom: 10px !important;
        }
        .hide-on-mobile {
          display: none !important;
        }
        
        /* Hide the full stats bar (LP stats / chapter stats / awarded /
           badges) on mobile — it takes too much vertical space. LPs can still
           see these on desktop. */
        .stats-bar {
          display: none !important;
        }
        
        /* Admin table responsive */
        table {
          font-size: 12px !important;
        }
        table th, table td {
          padding: 6px !important;
          font-size: 11px !important;
        }
        
        /* Form responsive */
        form {
          padding: 15px !important;
        }
        textarea {
          font-size: 14px !important;
        }
        
        /* Member cards grid */
        .member-cards-grid {
          grid-template-columns: 1fr !important;
        }
        
        /* Multi-select dropdown */
        .multi-select-dropdown {
          width: 100% !important;
        }

        /* ── LP Pitch Card — tighter typography, stacked founder line ── */
        .lp-pitch-card {
          padding: 12px 14px !important;
          margin-bottom: 10px !important;
        }
        .lp-pitch-card__head {
          gap: 8px !important;
        }
        .lp-pitch-card__title {
          font-size: 16px !important;
          line-height: 1.2 !important;
        }
        .lp-pitch-card__by {
          display: block !important;
          font-size: 12px !important;
          margin-top: 2px !important;
        }
        .lp-pitch-card__summary {
          font-size: 13px !important;
          line-height: 1.45 !important;
        }
        .lp-pitch-card__summary-body {
          display: -webkit-box !important;
          -webkit-line-clamp: 4 !important;
          -webkit-box-orient: vertical !important;
          overflow: hidden !important;
        }
        .lp-pitch-card__meta {
          font-size: 11px !important;
          margin-top: 8px !important;
        }

        /* ── Pitch Review grid — full-width single column on mobile with
           reduced card padding and unlimited height so form flows naturally. */
        .pr-grid {
          grid-template-columns: 1fr !important;
          gap: 14px !important;
        }
        .pr-card {
          padding: 18px 14px !important;
          max-height: none !important;
        }
        .pr-header__title {
          font-size: 22px !important;
        }
        .pr-identity {
          gap: 4px 14px !important;
          font-size: 13px !important;
        }
        .pr-actions {
          gap: 6px !important;
          margin-bottom: 16px !important;
        }
        .pr-btn {
          padding: 10px 12px !important;
          font-size: 11px !important;
          min-height: 40px !important;
        }
        .pr-ai {
          padding: 12px 14px !important;
          margin-bottom: 18px !important;
        }
        .pr-ai__body {
          font-size: 13px !important;
        }
        .pr-section {
          padding-top: 14px !important;
          margin-top: 14px !important;
        }
        .pr-field {
          margin-bottom: 14px !important;
        }
        .pr-field__value {
          font-size: 13px !important;
        }
        /* Form controls get 44px touch targets */
        .pr-select,
        .pr-textarea {
          font-size: 15px !important;
          padding: 11px 12px !important;
        }
        .pr-select {
          height: 44px !important;
        }
        .pr-form__title {
          font-size: 20px !important;
        }
        .pr-form__group--required {
          padding: 12px 14px !important;
        }
        .pr-submit-row {
          flex-wrap: wrap !important;
          gap: 8px !important;
          padding-top: 14px !important;
        }
        .pr-submit-row .pr-btn {
          padding: 12px 12px !important;
          font-size: 12px !important;
        }

      }
      @media (min-width: 769px) {
        .mobile-menu-btn { display: none !important; }
        .mobile-sidebar-overlay { display: none !important; }
        .mobile-sidebar { display: none !important; }
      }
    `}</style>

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

    {/* Header Bar — Win95 Titlebar */}
    <div className="win95-titlebar" style={{ padding: '6px 12px', flexShrink: 0, cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            display: 'none',
            background: 'var(--mb-paper-deep)',
            border: '2px solid',
            borderColor: 'var(--mb-ink)',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '2px 6px',
            lineHeight: '1'
          }}
          className="mobile-menu-btn"
        >
          ☰
        </button>
        <div className="header-text">
          <div style={{ fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap' }}>{(user?.chapter || "Neighborhood OS") + ": LP Portal"}</div>
          <div style={{ fontSize: '11px', color: 'var(--mb-ink-60)', whiteSpace: 'nowrap', fontWeight: 'normal' }}>Welcome, {user?.name || user?.email}!</div>
        </div>
      </div>
      <RetroButton onClick={handleSignOut} className="logout-btn" style={{ padding: '4px 12px', fontSize: '12px', margin: 0 }}>
        Logout
      </RetroButton>
    </div>
    
    {/* Stats Bar */}
    {userStats && (
      <StatsBar 
        user={user}
        stats={userStats}
        badges={userBadges}
        pitchStats={{
          quarterlyPitches: (() => {
            const quarterPitches = {};
            // Use adminPitches for admin/superadmin, lpPitches for regular LPs
            const pitchesToUse = isAdmin ? adminPitches : lpPitches;
            const chapterPitches = user.chapter ? pitchesToUse.filter(p => p.chapter === user.chapter) : pitchesToUse;
            chapterPitches.forEach(pitch => {
              const quarter = pitch.quarter;
              if (quarter) {
                quarterPitches[quarter] = (quarterPitches[quarter] || 0) + 1;
              }
            });
            return quarterPitches;
          })(),
          yearlyPitches: (() => {
            const yearPitches = {};
            // Use adminPitches for admin/superadmin, lpPitches for regular LPs
            const pitchesToUse = isAdmin ? adminPitches : lpPitches;
            const chapterPitches = user.chapter ? pitchesToUse.filter(p => p.chapter === user.chapter) : pitchesToUse;
            chapterPitches.forEach(pitch => {
              const quarter = pitch.quarter;
              if (quarter) {
                const year = quarter.split(' ')[1];
                if (year) {
                  yearPitches[year] = (yearPitches[year] || 0) + 1;
                }
              }
            });
            return yearPitches;
          })(),
          totalGrantWinners: (() => {
            // Use adminPitches for admin/superadmin, lpPitches for regular LPs
            const pitchesToUse = isAdmin ? adminPitches : lpPitches;
            return user.chapter
              ? pitchesToUse.filter(p => p.isWinner && p.chapter === user.chapter).length
              : pitchesToUse.filter(p => p.isWinner).length;
          })(),
          // Resolved dollar sum: respects per-pitch awardAmount overrides and
          // per-chapter defaults, falling back to the historical $1,000 only for
          // winners that predate both. Replaces the hardcoded count × $1,000 default.
          totalDollarsAwarded: (() => {
            const pitchesToUse = isAdmin ? adminPitches : lpPitches;
            const scopedWinners = (user.chapter
              ? pitchesToUse.filter(p => p.isWinner && p.chapter === user.chapter)
              : pitchesToUse.filter(p => p.isWinner));
            return sumAwarded(scopedWinners, chaptersByNameMap(chapters));
          })()
        }}
      />
    )}

    {/* Main Content Area with Sidebar */}
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }} className="main-content-container">
      {/* Mobile Sidebar Overlay */}
      <div 
        className="mobile-sidebar-overlay" 
        onClick={() => setIsMobileMenuOpen(false)}
        style={{ display: 'none' }}
      />
      
      {/* Desktop Sidebar */}
      <div style={{
        width: '200px',
        background: 'var(--mb-paper)',
        borderRight: '2px solid var(--mb-ink)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }} className="desktop-sidebar">
        <NavigationItems />
      </div>

      {/* Mobile Sidebar */}
      <div className="mobile-sidebar" style={{
        display: 'none',
        width: '200px',
        background: 'var(--mb-paper)',
        borderRight: '2px solid var(--mb-ink)',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        <NavigationItems />
      </div>

      {/* Main Content Area (Scrollable) */}
      <div ref={listScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'var(--gnf-bg)' }} className="main-content-area content-section">

      {/* --- Review Pitches Tab Content --- */}
      {activeTab === 'reviewPitches' && (
        <>
          {/* --- Pitch List View --- */}
          {!selectedPitch ? (
            <>
              {/* Filter bar — styling from `.filter-bar` utility class; controls
                  inherit MB select/input styling (chalk bg, ink border, SVG
                  chevron). Inline style hooks are dropped so the MB cascade
                  wins and the oversized native chevron doesn't leak through. */}
              <div className="filter-bar filter-bar--one-row" role="group" aria-label="Filter pitches">
                <input
                  type="search"
                  aria-label="Search pitches"
                  placeholder="Search name/business"
                  value={reviewSearchTerm}
                  onChange={(e) => setReviewSearchTerm(e.target.value)}
                />
                {isSuperAdmin && (
                  <select
                    aria-label="Filter by chapter"
                    value={reviewChapterFilter}
                    onChange={(e) => setReviewChapterFilter(e.target.value)}
                    style={{ minWidth: 160 }}
                  >
                    <option value="">All Chapters</option>
                    {[...new Set(lpPitches.map((p) => p.chapter).filter(Boolean))].sort().map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                )}
                <MultiSelectDropdown
                  options={[...new Set(lpPitches.map((p) => p.quarter).filter(q => q && q !== "Invalid Quarter"))]
                    .sort((a, b) => {
                      const [aQ, aY] = a.split(' ');
                      const [bQ, bY] = b.split(' ');
                      if (bY !== aY) return parseInt(bY) - parseInt(aY);
                      return parseInt(bQ.substring(1)) - parseInt(aQ.substring(1));
                    })}
                  selected={reviewQuarterFilter}
                  onChange={setReviewQuarterFilter}
                  placeholder="All Quarters"
                />
                <select
                  aria-label="Filter by category"
                  value={reviewCategoryFilter}
                  onChange={(e) => setReviewCategoryFilter(e.target.value)}
                  style={{ minWidth: 150 }}
                >
                  <option value="">All Categories</option>
                  {PITCH_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter by review status"
                  value={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.value)}
                  style={{ minWidth: 150 }}
                >
                  <option value="all">All Pitches</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="notReviewed">Not Reviewed</option>
                  <option value="favorites">Favorites Only</option>
                </select>
                <button
                  type="button"
                  className="retro-toggle"
                  aria-pressed={hidePassedReviews}
                  onClick={() => setHidePassedReviews(!hidePassedReviews)}
                  title={hidePassedReviews ? "Show Passed/Ineligible Reviews" : "Hide Passed/Ineligible Reviews"}
                >
                  {hidePassedReviews ? 'Show Passes' : 'Hide Passes'}
                </button>
                <RetroButton onClick={handleLpPitchExport} title="Export filtered pitches to CSV (all fields)">
                  Export
                </RetroButton>
              </div>

              {/* --- DEBUG LOG --- */}
              {/* { console.log(`LPPortal: Rendering pitch list. Reviews state:`, reviews); } */}

              {/* Pitch List or 'No Pitches' Message */}
              {lpFilteredPitches.length === 0 ? (
                !lpPitchesLoaded ? (
                  <EmptyState
                    icon={null}
                    title="Loading pitches…"
                    description="One moment while we pull the latest submissions."
                  />
                ) : lpPitches.length === 0 ? (
                  <EmptyState
                    icon={null}
                    title="No pitches yet this quarter"
                    description={
                      <>
                        When founders in <strong>{userChapter || 'your chapter'}</strong> submit, they'll land here for your review.
                        Share <a href="/pitch" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mb-magenta)' }}>goodneighbor.fund/pitch</a> to spread the word.
                      </>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={null}
                    title="No pitches match"
                    description="Try clearing a filter or widening your search."
                  />
                )
              ) : (
                <div>
                  {lpFilteredPitches.map((p) => {
                    if (!p || !p.id) return null; // Safety check for valid pitch data
                    const review = reviews[p.id]; // Get the specific user's review
                    const isReviewed = !!review;
                    const rating = review?.overallLpRating;
                    const isPassedOrIneligible = rating === "Pass" || rating === "Ineligible";
                    const isFavorite = rating === "Favorite";

                    // Status → 4px left-accent color in the MB palette.
                    const accent = !isReviewed
                      ? 'var(--mb-magenta)'
                      : isFavorite
                        ? 'var(--mb-butter-deep)'
                        : rating === "Ineligible"
                          ? 'var(--mb-butter)'
                          : rating === "Pass"
                            ? 'var(--mb-ink-15)'
                            : 'var(--mb-aqua-deep)';

                    // --- USE ROBUST FORMATTING FOR DATE ---
                    const formattedDate = formatDate(p.createdAt || p.createdDate);

                    return (
                      <div
                        key={p.id}
                        onClick={() => selectPitchForReview(p)}
                        className="lp-pitch-card"
                        style={{
                          borderLeftColor: accent,
                          opacity: isPassedOrIneligible ? 0.78 : 1,
                        }}
                        title={`Click to view details & ${isReviewed ? 'edit' : 'submit'} review. Status: ${review ? rating : 'Not Reviewed'}`}
                      >
                        <div className="lp-pitch-card__head">
                          <div className="lp-pitch-card__info">
                            <div className="lp-pitch-card__title">
                              <strong>{p.businessName || 'No Business Name'}</strong>
                              <span className="lp-pitch-card__by"> — {p.founderName || 'No Founder Name'}</span>
                            </div>
                            <div className="lp-pitch-card__tags">
                              {p.isContest && <RetroPill tone="purple">🏆 Contest Submission</RetroPill>}
                              {p.isWinner && <RetroPill tone="green" icon={<StatusIcon type="trophy" size={14} />}>Grant Winner</RetroPill>}
                            </div>
                          </div>
                          <div className="lp-pitch-card__status">
                            {review ? (
                              <RetroPill tone={ratingTonePill(rating)} icon={<ReviewRatingIcon rating={rating} size={14} />}>
                                {rating}
                              </RetroPill>
                            ) : (
                              <RetroPill tone="pink">Needs Review</RetroPill>
                            )}
                          </div>
                        </div>
                        {/* AI summary (falls back to value prop) */}
                        <div className="lp-pitch-card__summary">
                          {p.aiSummary ? (
                            <>
                              <div className="lp-pitch-card__ai-tag">
                                <span>AI-generated overview</span>
                              </div>
                              <div className="lp-pitch-card__summary-body">{p.aiSummary}</div>
                            </>
                          ) : (
                            <div className="lp-pitch-card__summary-body">
                              {p.valueProp
                                ? <em>&ldquo;{p.valueProp}&rdquo;</em>
                                : 'No summary available.'}
                            </div>
                          )}
                        </div>
                        <div className="lp-pitch-card__meta">
                          <span>Submitted {formattedDate}</span>
                          <span className="lp-pitch-card__meta-sep" aria-hidden="true">·</span>
                          <span>{p.chapter || 'N/A'}</span>
                          <span className="lp-pitch-card__meta-sep" aria-hidden="true">·</span>
                          <span style={{ fontFamily: 'var(--font-numeral)' }}>{p.quarter || 'N/A'}</span>
                          <span className="lp-pitch-card__meta-sep" aria-hidden="true">·</span>
                          <span>Category: {p.category || 'N/A'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          /* --- Pitch Detail and Review Form View --- */
          ) : (
            <div style={{ display: "flex", flexDirection: 'column', gap: "20px" }}>
              {/* Back Button */}
              <button
                type="button"
                className="pr-back"
                onClick={handleBackToList}
              >
                ← Back to List
              </button>

              {/* Two-column grid: pitch details + review form */}
              <div className="pr-grid">

                {/* Pitch Details Column */}
                <div className="pr-card">
                  <div className="pr-header">
                    <h3 className="pr-header__title">{selectedPitch.businessName || "N/A"}</h3>
                    {(selectedPitch.isContest || selectedPitch.isWinner) && (
                      <div className="pr-chips">
                        {selectedPitch.isContest && (
                          <span className="pr-chip pr-chip--contest">🏆 Contest Submission</span>
                        )}
                        {selectedPitch.isWinner && (
                          <span className="pr-chip pr-chip--winner">
                            <StatusIcon type="trophy" size={14} />
                            Grant Winner
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Founder + email + zip inline */}
                  <div className="pr-identity">
                    <span className="pr-identity__item">
                      <span className="pr-identity__label">Founder</span>
                      <span className="pr-identity__value">{selectedPitch.founderName || "N/A"}</span>
                    </span>
                    {selectedPitch.email && (
                      <span className="pr-identity__item">
                        <span className="pr-identity__label">Email</span>
                        <a href={`mailto:${selectedPitch.email}`}>{selectedPitch.email}</a>
                      </span>
                    )}
                    <span className="pr-identity__item">
                      <span className="pr-identity__label">Zip</span>
                      <span className="pr-identity__value">{selectedPitch.zipCode || "N/A"}</span>
                      {isLMIZip(selectedPitch.zipCode) && (
                        <span
                          className="pr-identity__lmi"
                          title={`ZIP median household income ≤ $${LMI_THRESHOLD.toLocaleString()} (ACS ${LMI_ACS_YEAR} 5-Year)`}
                        >
                          LMI
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Action buttons — left-aligned row */}
                  {(selectedPitch.pitchVideoUrl || selectedPitch.website) && (
                    <div className="pr-actions">
                      {selectedPitch.pitchVideoUrl && (
                        <button
                          type="button"
                          className="pr-btn"
                          onClick={() => window.open(selectedPitch.pitchVideoUrl, '_blank', 'noopener,noreferrer')}
                        >
                          ▶ Watch Pitch Video
                        </button>
                      )}
                      {selectedPitch.website && (
                        <button
                          type="button"
                          className="pr-btn pr-btn--ghost"
                          onClick={() => window.open(
                            selectedPitch.website.startsWith('http') ? selectedPitch.website : `//${selectedPitch.website}`,
                            '_blank',
                            'noopener,noreferrer'
                          )}
                        >
                          ↗ Visit Website
                        </button>
                      )}
                    </div>
                  )}

                  {(selectedPitch.aiSummary || selectedPitch.category) && (
                    <div className="pr-ai">
                      <div className="pr-eyebrow">AI Summary</div>
                      {selectedPitch.aiSummary && (
                        <div className="pr-ai__body">{selectedPitch.aiSummary}</div>
                      )}
                      {selectedPitch.category && (
                        <div className="pr-ai__category">Category: {selectedPitch.category}</div>
                      )}
                    </div>
                  )}

                  <div className="pr-section">
                    <div className="pr-field">
                      <span className="pr-field__label">Value Prop</span>
                      <div className="pr-field__value">{selectedPitch.valueProp || "N/A"}</div>
                    </div>

                    <div className="pr-field">
                      <span className="pr-field__label">Problem</span>
                      <div className="pr-field__value">{selectedPitch.problem || "N/A"}</div>
                    </div>

                    <div className="pr-field">
                      <span className="pr-field__label">Solution</span>
                      <div className="pr-field__value">{selectedPitch.solution || "N/A"}</div>
                    </div>

                    <div className="pr-field">
                      <span className="pr-field__label">Business Model</span>
                      <div className="pr-field__value">{selectedPitch.businessModel || "N/A"}</div>
                    </div>

                    <div className="pr-field pr-field--inline">
                      <span className="pr-field__label">Paying Customers</span>
                      <span className={selectedPitch.hasPayingCustomers ? "pr-yes" : "pr-no"}>
                        {selectedPitch.hasPayingCustomers ? 'Yes' : 'No'}
                      </span>
                    </div>

                    <div className="pr-field">
                      <span className="pr-field__label">Grant Use</span>
                      <div className="pr-field__value">{selectedPitch.grantUsePlan || "N/A"}</div>
                    </div>
                  </div>

                  <div className="pr-section">
                    <div className="pr-field">
                      <span className="pr-field__label">Self Identification Tags</span>
                      <div className="pr-field__value">{selectedPitch.selfIdentification?.join(", ") || "N/A"}</div>
                    </div>

                    <div className="pr-field pr-field--inline">
                      <span className="pr-field__label">Heard About</span>
                      <span className="pr-field__value">{selectedPitch.heardAbout || "N/A"}</span>
                    </div>

                    <div className="pr-field pr-field--inline">
                      <span className="pr-field__label">Terms &amp; Privacy Agreed</span>
                      <span className={selectedPitch.consentToShare ? "pr-yes" : "pr-no"}>
                        {selectedPitch.consentToShare ? 'Yes' : 'No'}
                      </span>
                    </div>

                    <div className="pr-field pr-field--inline">
                      <span className="pr-field__label">In-Person Meetup Agreed</span>
                      <span className={selectedPitch.consentToMeetup ? "pr-yes" : "pr-no"}>
                        {selectedPitch.consentToMeetup ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review Form Column */}
                <div className="pr-card">
                  <h4 className="pr-form__title">
                    {reviews[selectedPitch.id] ? 'Edit Your Review' : 'Submit Your Review'}
                  </h4>
                  <div className="pr-form__subtitle">
                    {reviews[selectedPitch.id]
                      ? 'Update your recommendation and notes.'
                      : 'Rate this pitch and share your thoughts with the team.'}
                  </div>

                  <form onSubmit={handleReviewSubmit}>
                    {/* LP Recommendation - Required */}
                    <div className="pr-form__group pr-form__group--required">
                      <label className="pr-form__label" htmlFor="pr-overall-rating">
                        Overall LP Recommendation
                        <span className="pr-form__required">(Required)</span>
                      </label>
                      <select
                        id="pr-overall-rating"
                        className="pr-select"
                        name="overallLpRating"
                        value={reviewFormData.overallLpRating || ""}
                        onChange={handleReviewFormChange}
                        required
                      >
                        <option value="" disabled>Select an overall rating…</option>
                        <option value="Favorite">Favorite (Strongly Recommend)</option>
                        <option value="Consideration">Consideration (Potential)</option>
                        <option value="Pass">Pass (Not a Fit/Concerns)</option>
                        <option value="Ineligible">Ineligible (Doesn't meet criteria)</option>
                      </select>
                    </div>

                    {/* Optional Rating Selects */}
                    <div className="pr-form__group-head">Additional Ratings · Optional</div>

                    <div className="pr-form__group">
                      <label className="pr-form__label" htmlFor="pr-video-rating">
                        Pitch Video Clarity &amp; Persuasiveness
                        <span className="pr-form__optional">Optional</span>
                      </label>
                      <select
                        id="pr-video-rating"
                        className="pr-select"
                        name="pitchVideoRating"
                        value={reviewFormData.pitchVideoRating || ""}
                        onChange={handleReviewFormChange}
                      >
                        <option value="">Rate video…</option>
                        <option value="Strong">Strong</option>
                        <option value="Average">Average</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>

                    <div className="pr-form__group">
                      <label className="pr-form__label" htmlFor="pr-model-rating">
                        Business Model Viability
                        <span className="pr-form__optional">Optional</span>
                      </label>
                      <select
                        id="pr-model-rating"
                        className="pr-select"
                        name="businessModelRating"
                        value={reviewFormData.businessModelRating || ""}
                        onChange={handleReviewFormChange}
                      >
                        <option value="">Rate model…</option>
                        <option value="Strong">Strong</option>
                        <option value="Average">Average</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>

                    <div className="pr-form__group">
                      <label className="pr-form__label" htmlFor="pr-fit-rating">
                        Product Market Fit Evidence
                        <span className="pr-form__optional">Optional</span>
                      </label>
                      <select
                        id="pr-fit-rating"
                        className="pr-select"
                        name="productMarketFitRating"
                        value={reviewFormData.productMarketFitRating || ""}
                        onChange={handleReviewFormChange}
                      >
                        <option value="">Rate fit…</option>
                        <option value="Strong">Strong</option>
                        <option value="Average">Average</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>

                    {/* Team Notes from other LPs */}
                    {selectedPitch && (() => {
                      const otherComments = (pitchComments[selectedPitch.id] || [])
                        .filter(c => c.reviewerId !== user.uid);
                      if (otherComments.length === 0) return null;
                      return (
                        <div className="pr-form__group">
                          <div className="pr-form__group-head" style={{ marginTop: 0 }}>
                            Notes From the Team · {otherComments.length}
                          </div>
                          <div className="pr-team-notes">
                            {otherComments.map((c, i) => (
                              <div key={i} className="pr-team-note">
                                <div className="pr-team-note__who">
                                  {isSuperAdmin ? c.reviewerName : `LP ${i + 1}`}
                                </div>
                                <div className="pr-team-note__text">{c.comment}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Comments Textarea */}
                    <div className="pr-form__group">
                      <label className="pr-form__label" htmlFor="pr-comments">
                        Notes for the Team
                        <span className="pr-form__optional">Optional</span>
                      </label>
                      <textarea
                        id="pr-comments"
                        className="pr-textarea"
                        name="comments"
                        rows="4"
                        value={reviewFormData.comments || ""}
                        onChange={handleReviewFormChange}
                        placeholder="Share your thoughts, strengths, concerns, or questions with the team…"
                      />
                    </div>

                    {/* Submit + Next Unreviewed Buttons (side by side) */}
                    {(() => {
                      const nextPitch = getNextUnreviewedPitch();
                      return (
                        <div className="pr-submit-row">
                          <button type="submit" className="pr-btn pr-btn--primary">
                            {reviews[selectedPitch.id] ? 'Update Review' : 'Submit Review'}
                          </button>
                          {nextPitch && (
                            <button
                              type="button"
                              className="pr-btn pr-btn--ghost"
                              onClick={() => setSelectedPitch(nextPitch)}
                              title={`Next Unreviewed: ${nextPitch.businessName}`}
                            >
                              Next Unreviewed →
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* --- Social Cards Tab Content --- */}
      {activeTab === 'socialCards' && (
        <div className="social-cards-page">
          <section className="admin-section admin-section--hero admin-section--magenta">
            <div className="admin-section-head">
              <span className="admin-section-head__eyebrow">Social · Share Kit</span>
              <h2 className="admin-section-head__title">
                Make some <em>noise</em> for your neighborhood.
              </h2>
              <p className="admin-section-head__lede">
                Download and post these on Instagram, LinkedIn, or wherever you hang out online.
                Every share helps spotlight under-resourced founders and spreads the mission &mdash; $1,000 at a time.
              </p>
            </div>
          </section>

          <section className="admin-section admin-section--paper">
            <div className="social-cards-container">
              <SocialCardTile
                canvasId="welcome-canvas"
                title="Welcome to GNF"
                eyebrow="Card 01"
                description="Introduce yourself to the chapter."
                onDownload={() => downloadCard('welcome')}
              />
              <SocialCardTile
                canvasId="badge-canvas"
                title="Badge Achievements"
                eyebrow="Card 02"
                description="Show off the trophies you&rsquo;ve earned."
                onDownload={() => downloadCard('badge')}
              />
              <SocialCardTile
                canvasId="stats-canvas"
                title="Chapter Impact"
                eyebrow="Card 03"
                description="Your chapter&rsquo;s funded-business tally."
                onDownload={() => downloadCard('stats')}
              />
              <SocialCardTile
                canvasId="recruitment-canvas"
                title="LP Recruitment"
                eyebrow="Card 04"
                description="Rally new LPs into the network."
                onDownload={() => downloadCard('recruitment')}
              />
              <SocialCardTile
                canvasId="approval-canvas"
                title="Approval Dialog"
                eyebrow="Card 05"
                description="Belief, in writing — Win95 grant-approved notification."
                onDownload={() => downloadCard('approval')}
              />
              <SocialCardTile
                canvasId="application-canvas"
                title="Application Form"
                eyebrow="Card 06"
                description="Apply in one sentence — “What&rsquo;s your big idea?”"
                onDownload={() => downloadCard('application')}
              />
            </div>
          </section>
        </div>
      )}

      {/* --- Admin Panel Tab Content --- */}
      {activeTab === 'adminPanel' && isAdmin && (
        <div>
          {/* Admin Sub-Tabs Navigation — Win95 folder-tab look.
              Tab strip extracted to a shared primitive with full keyboard
              (←/→, Home/End) support and proper role="tablist" semantics.
              The panel below is `.admin-tabpanel` which merges visually with
              the selected tab via negative margin. */}
          <AdminTabStrip
            ariaLabel="Admin sections"
            activeKey={activeAdminTab}
            onChange={setActiveAdminTab}
            tabs={[
              { key: 'pitchesAndReviews', label: 'Reviews' },
              { key: 'grantWinners', label: 'Grant Winners' },
              { key: 'userManagement', label: 'Users' },
              // Chapter directors get the Chapter tab too, but the tab's
              // render branch scopes the list + form to their own chapter.
              ...(isSuperAdmin || isChapterDirector
                ? [{ key: 'chaptersManagement', label: 'Chapter' }]
                : []),
              ...(isSuperAdmin
                ? [{ key: 'resourcesManagement', label: 'Resources' }]
                : []),
              { key: 'createUser', label: 'Create User' },
              ...(isSuperAdmin
                ? [{ key: 'superAdminTools', label: 'Super Admin Tools' }]
                : []),
            ]}
          />
          <div className="admin-tabpanel">

          {/* Admin: Pitches & Reviews Sub-Tab Content */}
          {activeAdminTab === 'pitchesAndReviews' && (() => {
            // Compute hero stats once so they render in the page header rather
            // than being buried at the bottom of a filter toolbar.
            const totalPitches = adminFilteredSortedPitches.length;
            const totalReviews = allReviewsData.length;
            const reviewedByMe = Object.keys(reviews || {}).length;
            // Mobile coerces to List — Live Review is a desktop/projector workflow
            // (two-pane queue + detail layout doesn't work below tablet width).
            const effectiveMode = isMobile() ? 'list' : 'live';
            if (effectiveMode === 'live') {
              return (
                <>
                  <section className="admin-section admin-section--hero admin-section--hero-compact admin-section--paper">
                    <div className="admin-section-head">
                      <span className="admin-section-head__eyebrow">Reviews · Live</span>
                      <h2 className="admin-section-head__title admin-section-head__title--sm">
                        Live <em>Review</em>
                      </h2>
                      <p className="admin-section-head__lede">
                        Two-pane meeting view. Cycle the queue, rate, leave comments, and capture discussion notes.
                      </p>
                    </div>
                  </section>
                  <LiveReviewPane
                    pitches={adminFilteredSortedPitches}
                    focusedPitchId={focusedPitchId}
                    setFocusedPitchId={setFocusedPitchId}
                    detailsDrawerOpen={detailsDrawerOpen}
                    setDetailsDrawerOpen={setDetailsDrawerOpen}
                    keyboardHelpOpen={keyboardHelpOpen}
                    setKeyboardHelpOpen={setKeyboardHelpOpen}
                    formatDate={formatDate}
                    getGroupedReviewsForAdmin={getGroupedReviewsForAdmin}
                    actionProps={{
                      handleToggleShortlist,
                      handleAssignWinner,
                      shortlistTogglingId,
                    }}
                    notesProps={{
                      user,
                      isSuperAdmin,
                      adminNotesByPitch,
                      adminNoteDrafts,
                      setAdminNoteDrafts,
                      editingAdminNoteId,
                      editingAdminNoteText,
                      setEditingAdminNoteText,
                      adminNoteSavingId,
                      handleAddAdminNote,
                      handleStartEditAdminNote,
                      handleSaveEditAdminNote,
                      handleCancelEditAdminNote,
                      handleDeleteAdminNote,
                    }}
                    filtersProps={{
                      isSuperAdmin,
                      adminPitches,
                      adminChapterFilter,
                      setAdminChapterFilter,
                      adminQuarterFilter,
                      setAdminQuarterFilter,
                      adminFavoriteFilterMode,
                      setAdminFavoriteFilterMode,
                      adminSortMode,
                      setAdminSortMode,
                      adminSearch,
                      setAdminSearch,
                      adminHidePassed,
                      setAdminHidePassed,
                      handleAdminPitchExport,
                      MultiSelectDropdown,
                    }}
                  />
                </>
              );
            }
            return (
            <>
              <section className="admin-section admin-section--hero admin-section--paper">
                <div className="admin-section-head">
                  <span className="admin-section-head__eyebrow">Reviews · Admin</span>
                  <h2 className="admin-section-head__title">
                    LP Reviews <em>Summary</em>
                  </h2>
                  <p className="admin-section-head__lede">
                    Every submission, every rating, every comment from your LP team — filtered, sorted, and exportable.
                  </p>
                </div>
                <div className="admin-hero-stats">
                  <div className="admin-hero-stat">
                    <span className="admin-hero-stat__num">{totalPitches}</span>
                    <span className="admin-hero-stat__label">Pitches shown</span>
                  </div>
                  <div className="admin-hero-stat">
                    <span className="admin-hero-stat__num">{totalReviews}</span>
                    <span className="admin-hero-stat__label">LP reviews total</span>
                  </div>
                  <div className="admin-hero-stat">
                    <span className="admin-hero-stat__num">{reviewedByMe}</span>
                    <span className="admin-hero-stat__label">Reviewed by you</span>
                  </div>
                </div>
              </section>

              <section className="admin-section admin-section--chalk">
              {/* Filter bar — styling lives in `.filter-bar` utility class.
                  Controls use the global input/select bevel styling from win95-base.css. */}
              <div className="filter-bar filter-bar--one-row" role="group" aria-label="Filter and sort reviews">
                {isSuperAdmin && (
                  <select
                    aria-label="Filter by chapter"
                    value={adminChapterFilter}
                    onChange={(e) => setAdminChapterFilter(e.target.value)}
                  >
                    <option value="">All Chapters</option>
                    {[...new Set(adminPitches.map((p) => p.chapter).filter(Boolean))].sort().map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                )}
                <MultiSelectDropdown
                  options={[...new Set(adminPitches.map((p) => p.quarter).filter(Boolean))]
                    .sort((a, b) => {
                      const [aQ, aY] = a.split(' ');
                      const [bQ, bY] = b.split(' ');
                      if (bY !== aY) return parseInt(bY) - parseInt(aY);
                      return parseInt(bQ.substring(1)) - parseInt(aQ.substring(1));
                    })}
                  selected={adminQuarterFilter}
                  onChange={setAdminQuarterFilter}
                  placeholder="All Quarters"
                />
                <select
                  aria-label="Filter by rating"
                  value={adminFavoriteFilterMode}
                  onChange={(e) => setAdminFavoriteFilterMode(e.target.value)}
                >
                  <option value="all">All Ratings</option>
                  <option value="favsOnly">Favorites Only</option>
                  <option value="favsAndCons">Favs &amp; Considerations</option>
                  <option value="shortlisted">Shortlisted Only</option>
                </select>
                <select
                  aria-label="Sort order"
                  value={adminSortMode}
                  onChange={(e) => setAdminSortMode(e.target.value)}
                  disabled={adminFavoriteFilterMode === 'favsOnly' || adminFavoriteFilterMode === 'favsAndCons'}
                  title={adminFavoriteFilterMode === 'favsOnly' || adminFavoriteFilterMode === 'favsAndCons'
                    ? 'Sort is fixed to favorite count while filtering by favorites'
                    : 'Sort order'}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="avgDesc">Avg Score ↓</option>
                  <option value="avgAsc">Avg Score ↑</option>
                  <option value="sumDesc">Total Score ↓</option>
                  <option value="sumAsc">Total Score ↑</option>
                  <option value="mostReviews">Most Reviews</option>
                </select>
                <input
                  type="search"
                  aria-label="Search pitches"
                  placeholder="Search name, business, email..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                />
                <button
                  type="button"
                  className="retro-toggle"
                  aria-pressed={adminHidePassed}
                  onClick={() => setAdminHidePassed(!adminHidePassed)}
                  title={adminHidePassed ? "Show pitches with only Pass/Ineligible reviews" : "Hide pitches with only Pass/Ineligible reviews"}
                >
                  {adminHidePassed ? 'Show Passes' : 'Hide Passes'}
                </button>
                <RetroButton onClick={handleAdminPitchExport} title="Download current results as CSV">
                  Export
                </RetroButton>
              </div>

              {/* Admin Pitches List - Uses adminFilteredSortedPitches */}
              {adminFilteredSortedPitches.length === 0 && (
                <EmptyState
                  icon={null}
                  title="No pitches match"
                  description="Try clearing a filter or widening your search."
                />
              )}
              {adminFilteredSortedPitches.map((p) => {
                const groupedReviews = getGroupedReviewsForAdmin(p.id); // Get the summary
                const formattedAdminDate = formatDate(p.createdAt || p.createdDate);
                return (
                  <div key={p.id} className="admin-pitch-card">
                    {/* Top Section: Info & Actions */}
                    <div className="admin-pitch-card__head">
                      {/* Pitch Info */}
                      <div className="admin-pitch-card__info">
                        <div className="admin-pitch-card__title">
                          <strong>{p.businessName || 'N/A'}</strong>
                          <span className="admin-pitch-card__by"> by {p.founderName || 'N/A'}</span>
                        </div>
                        {p.aiSummary
                          ? <div className="admin-pitch-card__summary">{p.aiSummary}</div>
                          : <div className="admin-pitch-card__summary admin-pitch-card__summary--fallback"><em>{p.valueProp?.substring(0, 120)}{p.valueProp?.length > 120 ? '…' : ''}</em></div>
                        }
                        <div className="admin-pitch-card__meta">
                          <span>{p.chapter || 'N/A'}</span>
                          <span className="admin-pitch-card__meta-sep">·</span>
                          <span style={{ fontFamily: 'var(--font-numeral)' }}>{p.quarter || 'N/A'}</span>
                          <span className="admin-pitch-card__meta-sep">·</span>
                          <span>Submitted {formattedAdminDate}</span>
                        </div>
                        <div className="admin-pitch-card__tags">
                          {p.isContest && <RetroPill tone="purple">🎉 Contest Submission</RetroPill>}
                          {p.isWinner && <RetroPill tone="green" icon={<StatusIcon type="trophy" size={14} />}>Grant Winner</RetroPill>}
                          {p.shortlisted && (
                            <RetroPill tone="yellow" title={p.shortlistedBy ? `Shortlisted by ${p.shortlistedBy}` : 'On the group shortlist'}>
                              Shortlisted
                            </RetroPill>
                          )}
                        </div>
                      </div>
                      {/* Action */}
                      <div className="admin-pitch-card__actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <RetroButton
                          size="sm"
                          variant={p.shortlisted ? 'primary' : 'default'}
                          onClick={() => handleToggleShortlist(p.id, p.shortlisted)}
                          disabled={shortlistTogglingId === p.id}
                          title={p.shortlisted ? 'Remove from the group shortlist' : 'Add to the group shortlist for discussion'}
                        >
                          {p.shortlisted ? 'Shortlisted' : 'Shortlist'}
                        </RetroButton>
                        <RetroButton
                          size="sm"
                          onClick={() => setExpandedPitchId(expandedPitchId === p.id ? null : p.id)}
                          aria-expanded={expandedPitchId === p.id}
                        >
                          {expandedPitchId === p.id ? 'Hide Details' : 'Expand Details'}
                        </RetroButton>
                      </div>
                    </div>
                    {/* Review Summary Section */}
                    {groupedReviews.count > 0 && (
                      <div className="admin-pitch-card__reviews">
                        <div className="admin-pitch-card__reviews-label">
                          LP Reviews (<span style={{ fontFamily: 'var(--font-numeral)' }}>{groupedReviews.count}</span>)
                        </div>
                        <div className="admin-pitch-card__reviews-chips">
                          {Object.entries(groupedReviews.byRating)
                            .sort(([ratingA], [ratingB]) => {
                              const order = { Favorite: 1, Consideration: 2, Pass: 3, Ineligible: 4, 'No Rating': 5 };
                              return (order[ratingA] || 99) - (order[ratingB] || 99);
                            })
                            .map(([rating, data]) => (
                              <RetroPill
                                key={rating}
                                tone={ratingTonePill(rating)}
                                icon={<ReviewRatingIcon rating={rating} size={14} />}
                                title={`Reviewers: ${data.reviewers.join(', ')}`}
                              >
                                {rating}: <span style={{ fontFamily: 'var(--font-numeral)', marginLeft: 2 }}>{data.count}</span>
                              </RetroPill>
                            ))}
                          {groupedReviews.scoredCount > 0 && (
                            <span
                              className="admin-pitch-card__score"
                              title={`Weighted score. Favorite +2, Consideration +1, Pass 0, Ineligible -2. Average across ${groupedReviews.scoredCount} rated review(s).`}
                            >
                              Score <strong style={{ fontFamily: 'var(--font-numeral)' }}>
                                {groupedReviews.score > 0 ? `+${groupedReviews.score}` : groupedReviews.score}
                              </strong>
                              <span className="admin-pitch-card__score-avg">
                                avg <span style={{ fontFamily: 'var(--font-numeral)' }}>{groupedReviews.averageScore.toFixed(2)}</span>
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {groupedReviews.count === 0 && (
                      <div className="admin-pitch-card__reviews admin-pitch-card__reviews--empty">
                        No LP reviews submitted yet.
                      </div>
                    )}
                    {/* Expanded Details Section (Conditional) */}
                    {expandedPitchId === p.id && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--mb-ink-15)' }}>
                        {/* Grant Winner controls */}
                        <div style={{
                          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                          gap: 10, marginBottom: 14, fontSize: 12, color: 'var(--mb-ink-60)',
                          fontFamily: 'var(--font-pixel)', letterSpacing: '0.14em', textTransform: 'uppercase',
                        }}>
                          <span>Grant Winner Status</span>
                          <RetroButton
                            size="sm"
                            variant={p.isWinner ? 'default' : 'primary'}
                            onClick={() => handleAssignWinner(p.id, p.isWinner)}
                          >
                            {p.isWinner ? 'Remove Winner' : 'Assign Winner'}
                          </RetroButton>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', flexWrap:'wrap' }}>
                        {/* Pitch Details */}
                        <div style={{ flex: '1 1 50%', minWidth: '300px' }}>
                          <h5 style={{ margin: '0 0 8px 0', color: 'var(--mb-ink)', fontSize: '14px', fontWeight: 'bold' }}>Full Pitch Details</h5>
                          <div style={{ padding: '20px', maxHeight:'500px', overflowY:'auto', background: 'var(--gnf-bg)', border: '1px solid #e0e0e0' }}>
                            {/* Basic Info */}
                            <div style={{ marginBottom: '12px' }}>
                              <span style={{ color: '#999', fontSize: '13px', marginRight: '10px' }}>Founder:</span>
                              <span style={{ color: '#333', fontSize: '14px', fontWeight: '500' }}>{p.founderName || "N/A"}</span>
                            </div>
                            
                            <div style={{ marginBottom: '12px' }}>
                              <span style={{ color: '#999', fontSize: '13px', marginRight: '10px' }}>Email:</span>
                              <span style={{ color: '#333', fontSize: '14px' }}>{p.email || "N/A"}</span>
                            </div>
                            
                            <div style={{ marginBottom: '12px' }}>
                              <span style={{ color: '#999', fontSize: '13px', marginRight: '10px' }}>Website:</span>
                              <span style={{ color: '#333', fontSize: '14px' }}>{p.website || "N/A"}</span>
                            </div>
                            
                            <div style={{ marginBottom: '12px' }}>
                              <span style={{ color: '#999', fontSize: '13px', marginRight: '10px' }}>Paying Customers:</span>
                              <span style={{ color: p.hasPayingCustomers ? '#4CAF50' : '#666', fontSize: '14px', fontWeight: p.hasPayingCustomers ? '600' : 'normal' }}>
                                {p.hasPayingCustomers ? 'Yes' : 'No'}
                              </span>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                              <span style={{ color: '#999', fontSize: '13px', marginRight: '10px' }}>Heard About:</span>
                              <span style={{ color: '#333', fontSize: '14px' }}>{p.heardAbout || "N/A"}</span>
                            </div>

                            {/* Business Details - Less sectioned */}
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ color: '#999', fontSize: '13px', marginBottom: '6px' }}>Value Proposition</div>
                              <div style={{ color: '#333', fontSize: '14px', lineHeight: '1.6' }}>{p.valueProp || "N/A"}</div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ color: '#999', fontSize: '13px', marginBottom: '6px' }}>Problem</div>
                              <div style={{ color: '#333', fontSize: '14px', lineHeight: '1.6' }}>{p.problem || "N/A"}</div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ color: '#999', fontSize: '13px', marginBottom: '6px' }}>Solution</div>
                              <div style={{ color: '#333', fontSize: '14px', lineHeight: '1.6' }}>{p.solution || "N/A"}</div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ color: '#999', fontSize: '13px', marginBottom: '6px' }}>Business Model</div>
                              <div style={{ color: '#333', fontSize: '14px', lineHeight: '1.6' }}>{p.businessModel || "N/A"}</div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ color: '#999', fontSize: '13px', marginBottom: '6px' }}>Grant Fund Use</div>
                              <div style={{ color: '#333', fontSize: '14px', lineHeight: '1.6' }}>{p.grantUsePlan || "N/A"}</div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ color: '#999', fontSize: '13px', marginBottom: '6px' }}>Founder Bio</div>
                              <div style={{ color: '#333', fontSize: '14px', lineHeight: '1.6' }}>{p.bio || "N/A"}</div>
                            </div>

                            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px', marginTop: '20px' }}>
                              <div style={{ marginBottom: '12px' }}>
                                <span style={{ color: '#999', fontSize: '13px', marginRight: '10px' }}>Zip Code:</span>
                                <span style={{ color: '#333', fontSize: '14px' }}>{p.zipCode || "N/A"}</span>
                              </div>

                              <div style={{ marginBottom: '12px' }}>
                                <span style={{ color: '#999', fontSize: '13px', marginRight: '10px' }}>Video URL:</span>
                                <span style={{ color: '#333', fontSize: '14px' }}>{p.pitchVideoUrl || "N/A"}</span>
                              </div>

                              <div style={{ marginBottom: '12px' }}>
                                <div style={{ color: '#999', fontSize: '13px', marginBottom: '6px' }}>Self Identification Tags:</div>
                                <div style={{ color: '#333', fontSize: '14px' }}>{p.selfIdentification?.join(", ") || "N/A"}</div>
                              </div>

                              <div style={{ marginBottom: '12px' }}>
                                <span style={{ color: '#999', fontSize: '13px', marginRight: '10px' }}>Terms & Privacy Agreed:</span>
                                <span style={{ color: p.consentToShare ? '#4CAF50' : '#666', fontSize: '14px', fontWeight: p.consentToShare ? '600' : 'normal' }}>
                                  {p.consentToShare ? 'Yes' : 'No'}
                                </span>
                              </div>

                              <div>
                                <span style={{ color: '#999', fontSize: '13px', marginRight: '10px' }}>In-Person Meetup Agreed:</span>
                                <span style={{ color: p.consentToMeetup ? '#4CAF50' : '#666', fontSize: '14px', fontWeight: p.consentToMeetup ? '600' : 'normal' }}>
                                  {p.consentToMeetup ? 'Yes' : 'No'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Aggregated Comments Added */}
                        <div style={{ flex: '1 1 40%', minWidth: '250px' }}>
                          <h5 style={{ margin: '0 0 8px 0', color: 'var(--mb-ink)', fontSize: '14px', fontWeight: 'bold' }}>LP Review Comments ({groupedReviews.comments.length})</h5>
                          <div style={{ padding: '20px', maxHeight:'500px', overflowY:'auto', background: 'var(--gnf-bg)', border: '1px solid #e0e0e0' }}>
                            {groupedReviews.comments.length > 0 ? (
                                groupedReviews.comments.map((comment, index) => (
                                    <div key={index} style={{
                                      padding: '12px 0',
                                      borderBottom: index < groupedReviews.comments.length - 1 ? '1px solid #f0f0f0' : 'none',
                                    }}>
                                      <div style={{
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: '#999',
                                        marginBottom: '4px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.3px'
                                      }}>
                                        {comment.reviewer}
                                      </div>
                                      <div style={{
                                        fontSize: '14px',
                                        lineHeight: '1.6',
                                        color: '#333'
                                      }}>
                                        {comment.text}
                                      </div>
                                    </div>
                                ))
                            ) : (
                                <p style={{ fontStyle: 'italic', color: '#999', textAlign: 'center', padding: '20px' }}>No comments provided in reviews.</p>
                            )}
                          </div>

                          {/* Admin discussion notes — visible only to chapter directors and
                              superAdmins. Captures follow-ups and live discussion during the
                              quarterly review meeting. Anyone with admin access can add notes
                              under their own name; authors can edit or delete their own. */}
                          {(() => {
                            const notesForPitch = adminNotesByPitch[p.id] || [];
                            return (
                              <div style={{ marginTop: 14 }}>
                                <h5 style={{ margin: '0 0 8px 0', color: 'var(--mb-ink)', fontSize: '14px', fontWeight: 'bold' }}>
                                  Admin Discussion Notes ({notesForPitch.length})
                                </h5>
                                <div style={{ padding: '20px', background: 'var(--gnf-bg)', border: '1px solid #e0e0e0' }}>
                                  {notesForPitch.length > 0 ? (
                                    notesForPitch.map((note, index) => {
                                      const isAuthor = note.authorId === user.uid;
                                      const canManage = isAuthor || isSuperAdmin;
                                      const isEditing = editingAdminNoteId === note.id;
                                      const timestampLabel = formatDate(note.createdAt);
                                      const edited = (note.editCount || 0) > 0 ? ' · edited' : '';
                                      return (
                                        <div key={note.id} style={{
                                          padding: '12px 0',
                                          borderBottom: index < notesForPitch.length - 1 ? '1px solid #f0f0f0' : 'none',
                                        }}>
                                          <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'baseline',
                                            gap: 8,
                                            marginBottom: 4,
                                          }}>
                                            <div style={{
                                              fontSize: '11px',
                                              fontWeight: '600',
                                              color: '#999',
                                              textTransform: 'uppercase',
                                              letterSpacing: '0.3px',
                                            }}>
                                              {note.authorName || 'Admin'} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>· {timestampLabel}{edited}</span>
                                            </div>
                                            {canManage && !isEditing && (
                                              <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                  type="button"
                                                  onClick={() => handleStartEditAdminNote(note)}
                                                  style={{ background: 'transparent', border: 'none', color: 'var(--mb-ink-60)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteAdminNote(note.id)}
                                                  disabled={adminNoteSavingId === note.id}
                                                  style={{ background: 'transparent', border: 'none', color: 'var(--mb-ink-60)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                                >
                                                  Delete
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          {isEditing ? (
                                            <div>
                                              <textarea
                                                value={editingAdminNoteText}
                                                onChange={(e) => setEditingAdminNoteText(e.target.value)}
                                                rows={3}
                                                style={{ width: '100%', fontFamily: 'inherit', fontSize: 14, padding: 8, boxSizing: 'border-box' }}
                                                aria-label="Edit note"
                                              />
                                              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                                <RetroButton
                                                  size="sm"
                                                  variant="primary"
                                                  onClick={() => handleSaveEditAdminNote(note.id)}
                                                  disabled={adminNoteSavingId === note.id || !editingAdminNoteText.trim()}
                                                >
                                                  {adminNoteSavingId === note.id ? 'Saving…' : 'Save'}
                                                </RetroButton>
                                                <RetroButton size="sm" onClick={handleCancelEditAdminNote}>
                                                  Cancel
                                                </RetroButton>
                                              </div>
                                            </div>
                                          ) : (
                                            <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#333', whiteSpace: 'pre-wrap' }}>
                                              {note.text}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p style={{ fontStyle: 'italic', color: '#999', textAlign: 'center', padding: '8px 0 16px', margin: 0 }}>
                                      No notes yet. Capture anything that comes up during discussion.
                                    </p>
                                  )}
                                  <div style={{ marginTop: notesForPitch.length > 0 ? 12 : 0, paddingTop: notesForPitch.length > 0 ? 12 : 0, borderTop: notesForPitch.length > 0 ? '1px solid #f0f0f0' : 'none' }}>
                                    <textarea
                                      value={adminNoteDrafts[p.id] || ''}
                                      onChange={(e) => setAdminNoteDrafts(prev => ({ ...prev, [p.id]: e.target.value }))}
                                      placeholder="Add a note from the discussion — follow-ups, questions, a quote you want to remember."
                                      rows={3}
                                      style={{ width: '100%', fontFamily: 'inherit', fontSize: 14, padding: 8, boxSizing: 'border-box' }}
                                      aria-label="Add admin note"
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                                      <RetroButton
                                        size="sm"
                                        variant="primary"
                                        onClick={() => handleAddAdminNote(p)}
                                        disabled={adminNoteSavingId === p.id || !(adminNoteDrafts[p.id] || '').trim()}
                                      >
                                        {adminNoteSavingId === p.id ? 'Saving…' : 'Add Note'}
                                      </RetroButton>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </section>
            </>
            );
          })()}

          {activeAdminTab === 'grantWinners' && (() => {
            const winnerPitches = adminFilteredSortedPitches.filter(p => p.isWinner);

            const handleFieldChange = (pitchId, field, value) => {
              if (field === "about") {
                setAboutById(prev => ({ ...prev, [pitchId]: value }));
              } else if (field === "website") {
                setWebsiteById(prev => ({ ...prev, [pitchId]: value }));
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

            const handleGenerateAbout = async (pitchId) => {
              const existing = aboutById[pitchId];
              const fallback = (winnerPitches.find(p => p.id === pitchId) || {}).about || "";
              const current = (existing ?? fallback).trim();
              if (current && !window.confirm("Replace the current About text with an AI-generated version?")) return;
              setGeneratingAboutId(pitchId);
              try {
                const result = await generateAboutCallable({ pitchId });
                const text = result?.data?.about || "";
                if (!text) {
                  showAppAlert("AI returned no text.");
                } else {
                  handleFieldChange(pitchId, "about", text);
                  showAppAlert("Generated. Review and Save All Changes when ready.");
                }
              } catch (err) {
                console.error("Generate about failed:", err);
                showAppAlert(`Generate failed: ${err.message || err}`);
              }
              setGeneratingAboutId(null);
            };

            // Upload a grant winner's photo to pitch-photos/ in Firebase Storage,
            // then write the URL into the pitch's `pitch-photo` field. Storage
            // permissions are enforced by storage.rules (any portal user, image
            // ≤ 5 MB). Saves immediately to Firestore so it survives a tab close —
            // independent of the Save All Changes button that batches About /
            // Website edits.
            const handlePhotoUpload = async (pitchId, file) => {
              if (!file) return;
              if (!file.type.startsWith('image/')) {
                showAppAlert('Please choose an image file (PNG, JPG, etc.).');
                return;
              }
              if (file.size > 5 * 1024 * 1024) {
                showAppAlert('Image must be smaller than 5 MB.');
                return;
              }

              const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
              const path = `pitch-photos/${pitchId}_${Date.now()}.${ext}`;

              setUploadingPhotoFor(prev => ({ ...prev, [pitchId]: true }));
              try {
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, file, { contentType: file.type });
                const photoURL = await getDownloadURL(storageRef);

                // Persist immediately. Field name matches what FounderMap and the
                // public-facing pages read (`pitch-photo`, hyphenated — historical).
                await updateDoc(doc(db, "pitches", pitchId), { "pitch-photo": photoURL });

                setPhotosById(prev => ({ ...prev, [pitchId]: photoURL }));
                // Drop any stale pending edit for this field so the Save button
                // state stays accurate after the immediate write.
                setPendingChanges(prev => {
                  const next = { ...prev };
                  if (next[pitchId]) {
                    const { ["pitch-photo"]: _drop, ...rest } = next[pitchId];
                    if (Object.keys(rest).length === 0) delete next[pitchId];
                    else next[pitchId] = rest;
                  }
                  return next;
                });

                showAppAlert('Photo uploaded and saved.');
                loadAdminData();
              } catch (error) {
                console.error('Pitch photo upload failed:', error);
                let errorMessage = 'Failed to upload photo: ';
                if (error.code === 'storage/unauthorized') {
                  errorMessage += 'You do not have permission to upload files.';
                } else if (error.code === 'storage/canceled') {
                  errorMessage += 'Upload was canceled.';
                } else {
                  errorMessage += error.message || 'Unknown error.';
                }
                showAppAlert(errorMessage);
              } finally {
                setUploadingPhotoFor(prev => {
                  const next = { ...prev };
                  delete next[pitchId];
                  return next;
                });
              }
            };

            // Toggle whether a winner is live on the public site (awardees grid,
            // founder map, mobile landing, public pitch detail). Missing field
            // reads as published — only docs explicitly set to false are hidden.
            const handleTogglePublished = async (pitchId, nextPublished) => {
              try {
                await updateDoc(doc(db, "pitches", pitchId), {
                  winnerPublished: nextPublished
                });
                loadAdminData();
              } catch (err) {
                console.error('Toggle publish error:', err);
                showAppAlert(`Failed to update visibility: ${err.message}`);
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

            const winnerCount = winnerPitches.length;
            const shownCount = filteredWinners.length;
            // Sum actual awardAmount per winner, falling back to chapter default
            // then to the historical $1,000. Replaces the prior hardcoded constant
            // that ignored variable grants.
            const chaptersLookup = chaptersByNameMap(chapters);
            const totalAwarded = sumAwarded(winnerPitches, chaptersLookup);
            return (
              <>
                <section className="admin-section admin-section--hero admin-section--grape">
                  <div className="admin-section-head">
                    <span className="admin-section-head__eyebrow">Grant Winners · Editor</span>
                    <h2 className="admin-section-head__title">
                      The <em>founders</em> we funded.
                    </h2>
                    <p className="admin-section-head__lede">
                      Edit public-facing info for grant winners. New winners stay hidden until you flip the "Live on website" switch — useful for staging an announcement.
                    </p>
                  </div>
                  <div className="admin-hero-stats">
                    <div className="admin-hero-stat">
                      <span className="admin-hero-stat__num">{winnerCount}</span>
                      <span className="admin-hero-stat__label">Grant winners</span>
                    </div>
                    <div className="admin-hero-stat">
                      <span className="admin-hero-stat__num">${totalAwarded.toLocaleString()}</span>
                      <span className="admin-hero-stat__label">Awarded since 2023</span>
                    </div>
                    <div className="admin-hero-stat">
                      <span className="admin-hero-stat__num">{shownCount}</span>
                      <span className="admin-hero-stat__label">Shown</span>
                    </div>
                  </div>
                </section>

                <section className="admin-section admin-section--chalk">
                {/* Filters */}
                <div className="filter-bar">
                  <select
                    aria-label="Filter by chapter"
                    value={winnerChapterFilter}
                    onChange={(e) => setWinnerChapterFilter(e.target.value)}
                  >
                    <option value="">All Chapters</option>
                    {[...new Set(winnerPitches.map(p => p.chapter).filter(Boolean))].sort().map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="search"
                    aria-label="Search winners"
                    placeholder="Search business or founder…"
                    value={winnerSearchTerm}
                    onChange={(e) => setWinnerSearchTerm(e.target.value)}
                  />
                </div>

                {filteredWinners.length === 0 && (
                  <EmptyState
                    icon={null}
                    title="No grant winners match"
                    description="Try clearing a filter. Winners appear here after an admin marks a pitch as winning from the Reviews tab."
                  />
                )}

                {filteredWinners.map((p) => {
                  const pendingAmount = pendingChanges[p.id]?.awardAmount;
                  const currentAmount = pendingAmount !== undefined
                    ? pendingAmount
                    : (Number.isFinite(Number(p.awardAmount)) && Number(p.awardAmount) > 0 ? Number(p.awardAmount) : '');
                  const resolvedDisplay = resolveAwardAmount(p, chaptersLookup);
                  // Missing field = published (preserves pre-toggle behavior for
                  // existing winners). Only explicit false hides from public site.
                  const isPublished = p.winnerPublished !== false;
                  return (
                  <div key={p.id} style={{ marginBottom: '15px', padding: '15px', border: '2px solid', borderColor: 'var(--mb-ink)', boxShadow: 'var(--shadow-hard-sm)', background: 'var(--mb-paper-deep)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <h5 style={{ marginTop: 0, marginBottom: 0 }}>
                        {p.businessName} <span style={{ color: '#666', fontWeight: 'normal' }}>by {p.founderName}</span>
                        {!isPublished && (
                          <span style={{
                            marginLeft: 8,
                            padding: '2px 8px',
                            fontSize: '0.7em',
                            fontFamily: 'var(--font-pixel)',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            background: 'var(--mb-ink)',
                            color: 'var(--mb-chalk)',
                            border: '2px solid var(--mb-ink)'
                          }}>Hidden</span>
                        )}
                      </h5>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85em', userSelect: 'none' }}>
                        <span className="win95-toggle">
                          <input
                            type="checkbox"
                            role="switch"
                            checked={isPublished}
                            onChange={(e) => handleTogglePublished(p.id, e.target.checked)}
                          />
                          <span className="win95-toggle__track" />
                          <span className="win95-toggle__thumb" />
                        </span>
                        <strong>Live on website</strong>
                      </label>
                    </div>
                    <p style={{ fontSize: '0.85em', color: '#555', margin: '5px 0' }}>
                      Chapter: {p.chapter} | Quarter: {p.quarter} | Zip Code: {p.zipCode}
                    </p>

                    {/* Award Amount — feeds Statistics tab dollar totals. Blank defers
                        to the chapter default; resolvedDisplay shows the effective value. */}
                    <div style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <label htmlFor={`awardAmount-${p.id}`} style={{ minWidth: 100 }}>
                        <strong>Award Amount:</strong>
                      </label>
                      <span style={{ fontSize: '0.9em' }}>$</span>
                      <input
                        id={`awardAmount-${p.id}`}
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={currentAmount}
                        placeholder={`${resolvedDisplay}`}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setPendingChanges(prev => {
                            const next = { ...prev };
                            const pitchChanges = { ...(next[p.id] || {}) };
                            if (raw === '') {
                              // Blank clears any pending amount edit. Persisted value stays what it is;
                              // to reset to chapter default, admins re-mark the winner (deleteField path).
                              delete pitchChanges.awardAmount;
                            } else {
                              const parsed = Number(raw);
                              if (Number.isFinite(parsed) && parsed > 0) {
                                pitchChanges.awardAmount = Math.round(parsed);
                              }
                            }
                            if (Object.keys(pitchChanges).length === 0) delete next[p.id];
                            else next[p.id] = pitchChanges;
                            return next;
                          });
                        }}
                        style={{ width: 110, padding: '8px 10px', fontFamily: 'inherit', border: '2px solid var(--mb-ink)', boxShadow: 'var(--shadow-hard-sm)', background: 'var(--mb-chalk)' }}
                      />
                      <span style={{ fontSize: '0.8em', color: 'var(--mb-ink-60, #666)' }}>
                        Effective: ${resolvedDisplay.toLocaleString()}
                        {!Number.isFinite(Number(p.awardAmount)) || Number(p.awardAmount) <= 0
                          ? ' (chapter default)'
                          : ''}
                      </span>
                    </div>

                    {/* Website */}
                    <div style={{ margin: '10px 0' }}>
                      <label><strong>Website:</strong></label>
                      <input
                        type="text"
                        value={websiteById[p.id] ?? p.website ?? ""}
                        onChange={(e) => handleFieldChange(p.id, "website", e.target.value)}
                        placeholder="https://..."
                        style={{ display: 'block', width: '100%', maxWidth: 600, marginTop: 4, padding: '8px 10px', fontFamily: 'inherit', border: '2px solid var(--mb-ink)', boxShadow: 'var(--shadow-hard-sm)', background: 'var(--mb-chalk)' }}
                      />
                    </div>

                    {/* About Section */}
                    <div style={{ margin: '10px 0' }}>
                      <label><strong>About Section:</strong></label>
                      <textarea
                        rows={4}
                        value={aboutById[p.id] ?? p.about ?? ""}
                        onChange={(e) => handleFieldChange(p.id, "about", e.target.value)}
                        style={{ display: 'block', width: '100%', maxWidth: 600, marginTop: 4, padding: '8px 10px', fontFamily: 'inherit', fontSize: '0.95em', border: '2px solid var(--mb-ink)', boxShadow: 'var(--shadow-hard-sm)', background: 'var(--mb-chalk)' }}
                        placeholder="Write a short public description about this founder or business..."
                      />
                      <div style={{ marginTop: 8 }}>
                        <RetroButton
                          size="sm"
                          onClick={() => handleGenerateAbout(p.id)}
                          disabled={generatingAboutId === p.id}
                          style={{ textTransform: 'none' }}
                        >
                          {generatingAboutId === p.id ? "Generating..." : "Generate from Application"}
                        </RetroButton>
                      </div>
                    </div>

                    {/* Pitch Photo: direct upload to pitch-photos/ in Firebase Storage. */}
                    <div style={{ margin: '10px 0' }}>
                      <label><strong>Pitch Photo:</strong></label>
                      {(() => {
                        const currentPhoto = photosById[p.id] || p["pitch-photo"] || null;
                        const isUploading = !!uploadingPhotoFor[p.id];
                        return (
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 6 }}>
                            {currentPhoto ? (
                              <img
                                src={currentPhoto}
                                alt={`${p.businessName || 'Pitch'} photo`}
                                style={{
                                  width: 96, height: 96, objectFit: 'cover',
                                  border: '2px solid var(--mb-ink)', background: '#fff', display: 'block'
                                }}
                                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                              />
                            ) : (
                              <div style={{
                                width: 96, height: 96,
                                border: '2px dashed var(--mb-ink-40, #999)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, color: 'var(--mb-ink-60, #666)', textAlign: 'center', padding: 4
                              }}>
                                No photo
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                              <input
                                id={`pitchPhoto-${p.id}`}
                                type="file"
                                accept="image/*"
                                disabled={isUploading}
                                onChange={(e) => {
                                  const file = e.target.files && e.target.files[0];
                                  if (file) handlePhotoUpload(p.id, file);
                                  e.target.value = '';
                                }}
                                style={{ fontFamily: 'inherit', fontSize: 12, padding: 6, border: '2px solid var(--mb-ink)', boxShadow: 'var(--shadow-hard-sm)', background: 'var(--mb-chalk)' }}
                              />
                              <div style={{ fontSize: 11, color: 'var(--mb-ink-60, #666)' }}>
                                {isUploading
                                  ? 'Uploading…'
                                  : 'PNG or JPG. Max 5 MB. Saves immediately to pitch-photos/.'}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Single Save Button */}
                    <RetroButton
                      variant={pendingChanges[p.id] ? 'primary' : 'default'}
                      onClick={() => handleSaveAllChanges(p.id)}
                      style={{ marginTop: '15px', textTransform: 'none' }}
                      disabled={!pendingChanges[p.id]}
                    >
                      Save All Changes
                    </RetroButton>
                  </div>
                  );
                })}
                </section>
              </>
            );
          })()}

          {/* Admin: User Management Sub-Tab Content */}
          {activeAdminTab === 'userManagement' && (() => {
            const totalMembers = Array.isArray(sortedUsers) ? sortedUsers.length : 0;
            const totalAdmins = totalMembers > 0
              ? sortedUsers.filter(u => u.role === 'chapter_director' || u.role === 'superAdmin').length
              : 0;
            const totalLPs = totalMembers > 0
              ? sortedUsers.filter(u => u.role === 'lp').length
              : 0;
            return (
            <>
              <section className="admin-section admin-section--hero admin-section--aqua-soft">
                <div className="admin-section-head">
                  <span className="admin-section-head__eyebrow">Team · Members</span>
                  <h2 className="admin-section-head__title">
                    Everyone on your <em>bench</em>.
                  </h2>
                  <p className="admin-section-head__lede">
                    Manage profiles and roles. Edits sync to the LP directory instantly.
                  </p>
                </div>
                <div className="admin-hero-stats">
                  <div className="admin-hero-stat">
                    <span className="admin-hero-stat__num">{totalMembers}</span>
                    <span className="admin-hero-stat__label">Total members</span>
                  </div>
                  <div className="admin-hero-stat">
                    <span className="admin-hero-stat__num">{totalLPs}</span>
                    <span className="admin-hero-stat__label">Limited Partners</span>
                  </div>
                  <div className="admin-hero-stat">
                    <span className="admin-hero-stat__num">{totalAdmins}</span>
                    <span className="admin-hero-stat__label">Directors &amp; admins</span>
                  </div>
                </div>
              </section>

              <section className="admin-section admin-section--chalk">
              <h5>Registered User Accounts</h5>
              {(!Array.isArray(sortedUsers) || sortedUsers.length === 0) ? (
                <EmptyState
                  icon={null}
                  title="No registered user accounts"
                  description="Users will appear here once they accept an invitation or sign in for the first time."
                />
              ) : (
                <div className="retro-table-wrap">
                  <table className="retro-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '28%' }}>Member</th>
                        <th style={{ width: '14%' }}>Role</th>
                        <th style={{ width: '18%' }}>Chapter</th>
                        <th>Profile</th>
                        <th style={{ width: '90px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers
                        // SuperAdmin sees everyone. Chapter directors / legacy admins are scoped to their own chapter.
                        .filter(u => isSuperAdmin || !userChapter || u.chapter === userChapter)
                        .map((u) => {
                          // Determine if controls should be disabled for this user row
                          const isSelf = u.uid === user.uid;
                          const targetIsSuperAdmin = u.role === 'superAdmin';
                          const disableRoleChange = isSelf || (targetIsSuperAdmin && !isSuperAdmin) || (!isAdmin);
                          // SuperAdmin can reassign anyone to any chapter.
                          // Chapter directors can change chapter on users in their chapter (enforced to own chapter in handleUpdateUser).
                          const disableChapterChange = isSelf || (!isSuperAdmin && !isChapterDirector);
                          const disablePasswordReset = isSelf;
                          const disableDelete = isSelf || (targetIsSuperAdmin && !isSuperAdmin);

                          const isEditing = !!editingUsers[u.uid];
                          const rowClass = isEditing ? 'is-editing' : (isSelf ? 'is-self' : '');
                          const editPanelInputStyle = { width: '100%', padding: '8px 10px', fontSize: '13px', fontFamily: 'var(--font-content)', boxSizing: 'border-box' };
                          // Same fallback the directory + edit-panel preview use.
                          const rowLegacyPhoto = u.name
                            ? `/assets/lps/${u.name.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}.png`
                            : null;
                          const rowPhotoUrl = u.photoUrl || rowLegacyPhoto;
                          return (
                            <React.Fragment key={u.uid}>
                              <tr className={rowClass} style={{ borderBottom: isEditing ? 'none' : undefined }}>
                                {/* Member: photo + name + email stacked */}
                                <td>
                                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                                    {rowPhotoUrl ? (
                                      <img
                                        src={rowPhotoUrl}
                                        alt=""
                                        className="member-photo"
                                        style={{
                                          width: 32, height: 32, objectFit: 'cover', flexShrink: 0
                                        }}
                                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                      />
                                    ) : (
                                      <div style={{
                                        width: 32, height: 32, flexShrink: 0,
                                        border: '2px dashed var(--mb-ink-40, #999)', background: 'transparent'
                                      }} />
                                    )}
                                    <div style={{ minWidth: 0, lineHeight: 1.2 }}>
                                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {u.name || <i style={{ color: 'var(--mb-ink-60)' }}>(No Name Set)</i>}
                                      </div>
                                      <div style={{ fontSize: 11, color: 'var(--mb-ink-60)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {u.email}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                {/* Role Select (+ chapterRole for superAdmins) */}
                                <td>
                                  <select
                                    aria-label={`Role for ${u.name || u.email}`}
                                    value={u.role || 'unauthorized'}
                                    onChange={(e) => handleUpdateUser(u.uid, "role", e.target.value)}
                                    disabled={disableRoleChange}
                                    style={{ width: '100%', maxWidth: '100%' }}
                                    title={disableRoleChange ? (isSelf ? "Cannot change own role" : "Permission denied") : "Change user role"}
                                  >
                                    <option value="unauthorized">Unauthorized</option>
                                    <option value="lp">LP</option>
                                    <option value="chapter_director">Chapter Director</option>
                                    {(isSuperAdmin || targetIsSuperAdmin) && <option value="superAdmin">Super Admin</option>}
                                  </select>
                                  {targetIsSuperAdmin && (
                                    <select
                                      aria-label={`List ${u.name || u.email} on chapter page as`}
                                      value={u.chapterRole || ''}
                                      onChange={(e) => handleUpdateUser(u.uid, "chapterRole", e.target.value)}
                                      disabled={!isSuperAdmin}
                                      style={{ width: '100%', maxWidth: '100%', marginTop: 4, fontSize: 11 }}
                                      title="List this Super Admin on their chapter's public page"
                                    >
                                      <option value="">List as: — none —</option>
                                      <option value="lp">List as: LP</option>
                                      <option value="chapter_director">List as: Chapter Director</option>
                                    </select>
                                  )}
                                </td>
                                {/* Chapter Select */}
                                <td>
                                  <select
                                    aria-label={`Chapter for ${u.name || u.email}`}
                                    value={u.chapter || ""}
                                    onChange={(e) => handleUpdateUser(u.uid, "chapter", e.target.value)}
                                    disabled={disableChapterChange}
                                    style={{ width: '100%', maxWidth: '100%' }}
                                    title={disableChapterChange ? "Only SuperAdmin can change chapter (cannot change own)" : "Change user chapter"}
                                  >
                                    <option value="">— No Chapter —</option>
                                    {activeChapterNames.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </td>
                                {/* Profile: professional role (bold) + bio truncated */}
                                <td style={{ minWidth: 0 }}>
                                  <div style={{ lineHeight: 1.3, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {dashIfEmpty(u.professionalRole)}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--mb-ink-60)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {u.bio || <span style={{ fontStyle: 'italic' }}>No bio</span>}
                                    </div>
                                  </div>
                                </td>
                                {/* Actions: Edit / Close. Send link + Delete moved into the edit panel below. */}
                                <td className="actions">
                                  {isEditing ? (
                                    <RetroButton
                                      size="sm"
                                      onClick={() => {
                                        const newEditingUsers = { ...editingUsers };
                                        delete newEditingUsers[u.uid];
                                        setEditingUsers(newEditingUsers);
                                      }}
                                    >
                                      Close
                                    </RetroButton>
                                  ) : (
                                    <RetroButton
                                      size="sm"
                                      onClick={() => setEditingUsers({
                                        ...editingUsers,
                                        [u.uid]: {
                                          linkedinUrl: u.linkedinUrl || '',
                                          professionalRole: u.professionalRole || '',
                                          bio: u.bio || ''
                                        }
                                      })}
                                      title={`Edit profile for ${u.email}`}
                                    >
                                      Edit
                                    </RetroButton>
                                  )}
                                </td>
                              </tr>
                              {isEditing && (
                                <tr>
                                  <td colSpan={5} style={{ padding: 0 }}>
                                    <div className="retro-edit-panel">
                                      <div className="retro-edit-panel-title">
                                        Editing profile — {u.name || u.email}
                                      </div>
                                      {(() => {
                                        // Mirror the directory fallback so existing members
                                        // (whose photo lives at /assets/lps/{slug}.png and
                                        // hasn't been re-uploaded yet) preview correctly.
                                        const legacyPhoto = u.name
                                          ? `/assets/lps/${u.name.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}.png`
                                          : null;
                                        const previewUrl = u.photoUrl || legacyPhoto;
                                        const isLegacy = !u.photoUrl && !!legacyPhoto;
                                        return (
                                      <div className="retro-form-row" style={{ marginBottom: 16 }}>
                                        <label>Member Photo</label>
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                          {previewUrl ? (
                                            <div style={{ position: 'relative', width: 72, height: 72 }}>
                                              <img
                                                src={previewUrl}
                                                alt={u.name || u.email}
                                                className="member-photo"
                                                style={{
                                                  width: 72, height: 72, objectFit: 'cover',
                                                  display: 'block'
                                                }}
                                                onError={(e) => {
                                                  // Hide a broken legacy fallback (member with no
                                                  // matching /assets/lps/ file) so the user sees
                                                  // an empty preview instead of a broken image.
                                                  e.currentTarget.style.visibility = 'hidden';
                                                }}
                                              />
                                              {isLegacy && (
                                                <div title="Bundled photo from /assets/lps/. Upload a new one to manage it from here." style={{
                                                  position: 'absolute', bottom: -2, right: -2,
                                                  background: 'var(--mb-ink, #333)', color: '#fff',
                                                  fontSize: 9, padding: '1px 4px', borderRadius: 2,
                                                  fontFamily: 'var(--font-content)'
                                                }}>
                                                  legacy
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div style={{
                                              width: 72, height: 72,
                                              border: '2px dashed var(--mb-ink-40, #999)',
                                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                                              fontSize: 11, color: 'var(--mb-ink-60, #666)', textAlign: 'center', padding: 4
                                            }}>
                                              No photo
                                            </div>
                                          )}
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <input
                                              id={`memberPhoto-${u.uid}`}
                                              type="file"
                                              accept="image/*"
                                              disabled={!!uploadingPhotoFor[u.uid]}
                                              onChange={(e) => {
                                                const file = e.target.files && e.target.files[0];
                                                if (file) handleMemberPhotoUpload(u, file);
                                                e.target.value = '';
                                              }}
                                              style={{ fontFamily: 'var(--font-content)', fontSize: 12 }}
                                            />
                                            <div style={{ fontSize: 11, color: 'var(--mb-ink-60, #666)' }}>
                                              {uploadingPhotoFor[u.uid]
                                                ? 'Uploading…'
                                                : 'PNG or JPG. Max 5 MB. Saves immediately.'}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                        );
                                      })()}
                                      <div className="retro-form-grid">
                                        <div className="retro-form-row">
                                          <label htmlFor={`linkedin-${u.uid}`}>LinkedIn URL</label>
                                          <input
                                            id={`linkedin-${u.uid}`}
                                            type="url"
                                            value={editingUsers[u.uid].linkedinUrl || ''}
                                            onChange={(e) => setEditingUsers({
                                              ...editingUsers,
                                              [u.uid]: { ...editingUsers[u.uid], linkedinUrl: e.target.value }
                                            })}
                                            style={editPanelInputStyle}
                                            placeholder="https://linkedin.com/in/username"
                                          />
                                        </div>
                                        <div className="retro-form-row">
                                          <label htmlFor={`profrole-${u.uid}`}>Professional Role</label>
                                          <input
                                            id={`profrole-${u.uid}`}
                                            type="text"
                                            value={editingUsers[u.uid].professionalRole || ''}
                                            onChange={(e) => setEditingUsers({
                                              ...editingUsers,
                                              [u.uid]: { ...editingUsers[u.uid], professionalRole: e.target.value }
                                            })}
                                            style={editPanelInputStyle}
                                            placeholder="e.g. CEO, Investor"
                                          />
                                        </div>
                                      </div>
                                      <div className="retro-form-row">
                                        <label htmlFor={`bio-${u.uid}`}>Bio</label>
                                        <textarea
                                          id={`bio-${u.uid}`}
                                          value={editingUsers[u.uid].bio || ''}
                                          onChange={(e) => setEditingUsers({
                                            ...editingUsers,
                                            [u.uid]: { ...editingUsers[u.uid], bio: e.target.value }
                                          })}
                                          style={{ ...editPanelInputStyle, minHeight: '110px', resize: 'vertical' }}
                                          placeholder="Short bio"
                                        />
                                      </div>
                                      <div className="retro-action-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                          <RetroButton
                                            variant="primary"
                                            onClick={async () => {
                                              const updates = editingUsers[u.uid];
                                              try {
                                                await updateDoc(doc(db, "users", u.uid), {
                                                  linkedinUrl: updates.linkedinUrl || '',
                                                  professionalRole: updates.professionalRole || '',
                                                  bio: updates.bio || ''
                                                });
                                                showAppAlert("User profile updated successfully.");
                                                const newEditingUsers = { ...editingUsers };
                                                delete newEditingUsers[u.uid];
                                                setEditingUsers(newEditingUsers);
                                                loadAdminData();
                                              } catch (error) {
                                                showAppAlert(`Error updating user: ${error.message}`);
                                              }
                                            }}
                                          >
                                            Save Changes
                                          </RetroButton>
                                          <RetroButton
                                            onClick={() => {
                                              const newEditingUsers = { ...editingUsers };
                                              delete newEditingUsers[u.uid];
                                              setEditingUsers(newEditingUsers);
                                            }}
                                          >
                                            Cancel
                                          </RetroButton>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                          <RetroButton
                                            size="sm"
                                            onClick={() => handleAdminPasswordReset(u.email)}
                                            disabled={disablePasswordReset}
                                            title={disablePasswordReset ? "Can't send yourself a sign-in link from here" : `Email a sign-in link to ${u.email}`}
                                          >
                                            Send sign-in link
                                          </RetroButton>
                                          <RetroButton
                                            size="sm"
                                            variant="danger"
                                            onClick={() => handleDeleteUser(u.uid, u.email)}
                                            disabled={disableDelete}
                                            title={disableDelete ? (isSelf ? "Cannot delete self" : "Permission denied") : `Delete portal profile data for ${u.email}`}
                                          >
                                            Delete profile
                                          </RetroButton>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
              </section>
            </>
            );
          })()}

          {/* Admin: Create User Sub-Tab Content */}
          {activeAdminTab === 'createUser' && isAdmin && (
            <>
              <section className="admin-section admin-section--hero admin-section--butter-soft">
                <div className="admin-section-head">
                  <span className="admin-section-head__eyebrow">Team · Onboarding</span>
                  <h2 className="admin-section-head__title">
                    Invite a new <em>LP</em>.
                  </h2>
                  <p className="admin-section-head__lede">
                    Fill out the form and click <strong>Send invite</strong>. We&rsquo;ll create their account and email them a one-tap magic-link to sign in.
                  </p>
                </div>
              </section>

              <section className="admin-section admin-section--chalk">
              <div className="retro-edit-panel" style={{ maxWidth: '640px' }}>
                <form onSubmit={handleCreateUser}>
                  <div className="retro-form-row">
                    <label htmlFor="new-user-email">
                      Email Address <span aria-hidden="true" style={{ color: 'var(--mb-magenta)' }}>*</span>
                    </label>
                    <input
                      id="new-user-email"
                      type="email"
                      value={newUserData.email || ''}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value.toLowerCase() })}
                      required
                      placeholder="user@example.com"
                    />
                  </div>

                  <div className="retro-form-row">
                    <label htmlFor="new-user-name">
                      Full Name <span aria-hidden="true" style={{ color: 'var(--mb-magenta)' }}>*</span>
                    </label>
                    <input
                      id="new-user-name"
                      type="text"
                      value={newUserData.name || ''}
                      onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                      required
                      placeholder="Jane Smith"
                    />
                  </div>

                  <div className="retro-form-grid">
                    <div className="retro-form-row" style={{ marginBottom: 0 }}>
                      <label htmlFor="new-user-role">
                        Role <span aria-hidden="true" style={{ color: 'var(--mb-magenta)' }}>*</span>
                      </label>
                      <select
                        id="new-user-role"
                        value={newUserData.role || 'lp'}
                        onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                        required
                      >
                        <option value="lp">Limited Partner (LP)</option>
                        <option value="chapter_director">Chapter Director</option>
                        {isSuperAdmin && <option value="superAdmin">Super Admin</option>}
                      </select>
                    </div>

                    <div className="retro-form-row" style={{ marginBottom: 0 }}>
                      <label htmlFor="new-user-chapter">
                        Chapter <span aria-hidden="true" style={{ color: 'var(--mb-magenta)' }}>*</span>
                      </label>
                      <select
                        id="new-user-chapter"
                        value={isChapterDirector ? (userChapter || '') : (newUserData.chapter || '')}
                        onChange={(e) => setNewUserData({ ...newUserData, chapter: e.target.value })}
                        required
                        disabled={isChapterDirector}
                        title={isChapterDirector ? `Chapter directors can only invite to ${userChapter}.` : undefined}
                      >
                        {isChapterDirector ? (
                          <option value={userChapter}>{userChapter}</option>
                        ) : (
                          <>
                            <option value="">— Select Chapter —</option>
                            {activeChapterNames.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* SuperAdmins can opt into appearing on their chapter's public
                       roster in a secondary role (LP or Chapter Director). The
                       role field still drives capabilities; chapterRole drives
                       presentation only. */}
                  {newUserData.role === 'superAdmin' && (
                    <div className="retro-form-row">
                      <label htmlFor="new-user-chapter-role">
                        List on chapter page as
                      </label>
                      <select
                        id="new-user-chapter-role"
                        value={newUserData.chapterRole || ''}
                        onChange={(e) => setNewUserData({ ...newUserData, chapterRole: e.target.value })}
                      >
                        <option value="">— Don't list —</option>
                        <option value="lp">Limited Partner (LP)</option>
                        <option value="chapter_director">Chapter Director</option>
                      </select>
                    </div>
                  )}

                  <div className="retro-form-row">
                    <label htmlFor="new-user-anniversary">
                      Join Date (Anniversary) <span aria-hidden="true" style={{ color: 'var(--mb-magenta)' }}>*</span>
                    </label>
                    <input
                      id="new-user-anniversary"
                      type="date"
                      value={newUserData.anniversary || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setNewUserData({ ...newUserData, anniversary: e.target.value })}
                      required
                    />
                  </div>

                  <div className="retro-action-row">
                    <RetroButton type="submit" variant="primary" disabled={isInviting}>
                      {isInviting ? 'Sending invite…' : 'Send invite'}
                    </RetroButton>
                    <RetroButton
                      type="button"
                      disabled={isInviting}
                      onClick={() => {
                        setNewUserData({
                          email: '',
                          name: '',
                          role: 'lp',
                          chapter: isChapterDirector ? userChapter : '',
                          anniversary: new Date().toISOString().split('T')[0],
                          chapterRole: '',
                        });
                      }}
                    >
                      Reset Form
                    </RetroButton>
                  </div>
                </form>
              </div>
              </section>
            </>
          )}

          {/* Admin: Super Admin Tools Sub-Tab Content (Conditional) */}
          {activeAdminTab === 'superAdminTools' && isSuperAdmin && (
            <>
              <section className="admin-section admin-section--hero admin-section--ink">
                <div className="admin-section-head">
                  <span className="admin-section-head__eyebrow">Super Admin · Tools</span>
                  <h2 className="admin-section-head__title">
                    The <em>dangerous</em> stuff.
                  </h2>
                </div>
              </section>

              <section className="admin-section admin-section--paper">
              <div className="admin-tool-grid">
                <AdminToolCard
                  eyebrow="Migration"
                  title="Migrate legacy admin users"
                  body={
                    <>
                      Finds every user with <code>role: "admin"</code> and updates them to{' '}
                      <code>role: "lp"</code>. Your super admin account is unaffected.
                      Safe to re-run — does nothing if no legacy admins remain.
                    </>
                  }
                  action={
                    <RetroButton onClick={handleMigrateAdminToLP} variant="primary">
                      Run admin → lp Migration
                    </RetroButton>
                  }
                />

                <AdminToolCard
                  eyebrow="Badges"
                  title="Anniversary Badge Assignment"
                  body="Assigns OG Neighbor and Year Club badges to all qualifying LPs based on their join dates."
                  footnote={
                    <ul>
                      <li>OG Neighbor — LPs who joined in 2023</li>
                      <li>2 / 3 / 4 / 5 Year Clubs — LPs active that many years</li>
                    </ul>
                  }
                  action={
                    <RetroButton onClick={handleAssignAnniversaryBadges} variant="primary">
                      Assign Anniversary Badges
                    </RetroButton>
                  }
                />

                <AdminToolCard
                  eyebrow="Backfill"
                  title="Backfill Review Quarters"
                  body={
                    <>
                      Writes a <code>quarter</code> field onto legacy review docs (derived from
                      each review's pitch). Required for Midas Touch, Completionist, and Perfect
                      Attendance badges to see historical activity. Safe to re-run — only touches
                      reviews that don't already have a quarter.
                    </>
                  }
                  action={
                    <RetroButton onClick={handleBackfillReviewQuarters} variant="primary">
                      Run Review Quarter Backfill
                    </RetroButton>
                  }
                />

                <AdminToolCard
                  eyebrow="Leaderboards"
                  title={`Recalculate Chapter Rankings — ${getCurrentQuarter()}`}
                  body="Computes this quarter's top reviewer in every chapter and bumps each top-3 finisher's counter. Unlocks Chapter MVP and Neighborhood Mayor badges."
                  warning="Run this ONCE near the end of each quarter. Running multiple times will over-increment the top-3 counter."
                  action={
                    <RetroButton onClick={handleRecalculateChapterRankings} variant="primary">
                      Recalculate Rankings
                    </RetroButton>
                  }
                />
              </div>
              </section>
            </>
          )}

          {/* Chapters Management Sub-Tab Content */}
          {activeAdminTab === 'chaptersManagement' && (isSuperAdmin || isChapterDirector) && (() => {
            // Chapter directors see only their own chapter; superAdmins see the full list.
            const visibleChapters = isSuperAdmin
              ? chapters
              : chapters.filter(c => c.name === userChapter);
            const chapterColSpan = isSuperAdmin ? 8 : 3;
            const renderChapterForm = () => {
                // Minimal local styles — grid layout only. Label / input typography
                // comes from `.mb-form-shell` via theme-tokens.css, which auto-themes
                // every input/textarea/select/label inside the form container.
                const fieldWrapStyle = { display: 'flex', flexDirection: 'column' };
                const gridTwoCol = { display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '36px', rowGap: '24px', marginBottom: '24px' };
                const gridThreeCol = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: '32px', rowGap: '24px', marginBottom: '24px' };
                const tabIntroStyle = {
                  margin: '0 0 18px 0',
                  padding: '0 0 12px 0',
                  borderBottom: '1px dashed var(--mb-ink-15)',
                };
                const tabEyebrowStyle = {
                  display: 'block',
                  fontFamily: 'var(--font-pixel)',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--mb-magenta)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  marginBottom: '4px',
                };
                const tabHeadingStyle = {
                  margin: 0,
                  fontFamily: 'var(--font-heading)',
                  fontSize: '18px',
                  letterSpacing: '-0.01em',
                  color: 'var(--mb-ink)',
                };
                const tabHelpStyle = {
                  display: 'block',
                  marginTop: '6px',
                  fontFamily: 'var(--font-content)',
                  fontSize: '12px',
                  color: 'var(--mb-ink-60)',
                  lineHeight: 1.5,
                };
                const helpStyle = {
                  display: 'block',
                  marginTop: '6px',
                  fontFamily: 'var(--font-content)',
                  fontSize: '12px',
                  color: 'var(--mb-ink-60)',
                  lineHeight: 1.5,
                };
                // Compact input overrides — tighter than the default `.mb-form-shell`
                // so dense admin forms don't feel as chunky as marketing-page fields.
                const labelStyle = { fontSize: '10px', letterSpacing: '0.14em' };
                const inputStyle = { width: '100%', padding: '7px 10px', fontSize: '13px', minHeight: 0, lineHeight: 1.3 };
                const monoInputStyle = { width: '100%', padding: '7px 10px', fontSize: '12px', minHeight: 0, lineHeight: 1.3, fontFamily: 'var(--font-numeral)' };
                const textareaStyle = { width: '100%', padding: '8px 10px', fontSize: '13px', lineHeight: 1.4, resize: 'vertical' };

                const countyList = Array.isArray(chapterFormData.counties)
                  ? chapterFormData.counties.map(s => String(s).trim()).filter(Boolean)
                  : [];
                const galleryList = Array.isArray(chapterFormData.galleryPhotos) ? chapterFormData.galleryPhotos : [];
                const heroBusy = !!uploadingPhotoFor[`hero:${editingChapterId}`];
                const galleryBusy = !!uploadingPhotoFor[`gallery:${editingChapterId}`];

                // Tab strip config. Chapter directors don't see Identity. The add-chapter
                // flow is Identity-only — Content/Photos/Visibility need a saved doc first.
                const tabs = [];
                if (isSuperAdmin) tabs.push({ key: 'identity', label: 'Identity' });
                if (!isAddingChapter) {
                  tabs.push({ key: 'content',    label: 'Content' });
                  tabs.push({ key: 'photos',     label: 'Photos' });
                  tabs.push({ key: 'visibility', label: 'Visibility' });
                }
                const activeTabKey = tabs.some(t => t.key === chapterFormTab) ? chapterFormTab : (tabs[0]?.key || 'content');

                return (
                <div
                  className="mb-form-shell"
                  style={{
                    width: '100%',
                    background: 'var(--mb-paper)',
                    border: '2px solid var(--mb-ink)',
                    boxShadow: 'var(--shadow-hard)',
                    marginBottom: 0,
                  }}
                >
                  {/* Ink titlebar, matching the portal chrome */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'var(--mb-ink)',
                    color: 'var(--mb-chalk)',
                    padding: '14px 32px',
                    fontFamily: 'var(--font-pixel)',
                    fontSize: '11px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}>
                    <span>
                      {isAddingChapter ? 'New Chapter' : `Editing — ${chapterFormData.name || '(unnamed)'}`}
                    </span>
                    {!isAddingChapter && (chapterFormData.pageSlug || chapterFormData.slug) && (
                      <a
                        href={`/${chapterFormData.pageSlug || chapterFormData.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '11px',
                          color: 'var(--mb-butter)',
                          whiteSpace: 'nowrap',
                          textDecoration: 'underline',
                          textUnderlineOffset: '3px',
                        }}
                      >
                        View public page ↗
                      </a>
                    )}
                  </div>

                  {/* Tab strip — flat ink-backed segment control, no bevel overlap. */}
                  {tabs.length > 1 && (
                    <div
                      role="tablist"
                      aria-label="Chapter edit sections"
                      style={{
                        display: 'flex',
                        background: 'var(--mb-chalk)',
                        borderBottom: '2px solid var(--mb-ink)',
                      }}
                    >
                      {tabs.map((t, i) => {
                        const isActive = activeTabKey === t.key;
                        const isLast = i === tabs.length - 1;
                        return (
                          <button
                            key={t.key}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setChapterFormTab(t.key)}
                            style={{
                              padding: '14px 24px',
                              fontFamily: 'var(--font-pixel)',
                              fontSize: '11px',
                              fontWeight: 600,
                              letterSpacing: '0.14em',
                              textTransform: 'uppercase',
                              color: isActive ? 'var(--mb-chalk)' : 'var(--mb-ink-60)',
                              background: isActive ? 'var(--mb-ink)' : 'transparent',
                              border: 'none',
                              borderRight: isLast ? 'none' : '1px solid var(--mb-ink-15)',
                              cursor: 'pointer',
                            }}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ padding: '28px 32px 18px', maxWidth: '720px' }}>
                    {/* ─── Identity & Admin ─── superAdmin only */}
                    {activeTabKey === 'identity' && isSuperAdmin && (
                      <section>
                        <div style={tabIntroStyle}>
                          <span style={tabEyebrowStyle}>Identity · Admin</span>
                          <h3 style={tabHeadingStyle}>Chapter identity &amp; routing</h3>
                          <small style={tabHelpStyle}>Display name, slug, contact email, Slack channel IDs. These drive notifications and access control.</small>
                        </div>

                        <div style={gridTwoCol}>
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>Display name <span style={{ color: '#c00' }}>*</span></label>
                            <input
                              type="text"
                              value={chapterFormData.name}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, name: e.target.value })}
                              placeholder="e.g. Western New York"
                              style={inputStyle}
                            />
                            <small style={helpStyle}>Must match the <code>chapter</code> value already on user/pitch/review docs.</small>
                          </div>
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>
                              Slug (doc ID) {isAddingChapter && <span style={{ color: '#c00' }}>*</span>}
                            </label>
                            <input
                              type="text"
                              value={chapterFormData.slug}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, slug: e.target.value })}
                              placeholder={`auto: ${slugifyChapter(chapterFormData.name) || 'from-name'}`}
                              disabled={!isAddingChapter}
                              style={{ ...monoInputStyle, background: !isAddingChapter ? '#eee' : '#fff' }}
                            />
                            <small style={helpStyle}>Firestore doc ID. Immutable after creation.</small>
                          </div>
                        </div>

                        <div style={gridTwoCol}>
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>Page slug (public URL path)</label>
                            <input
                              type="text"
                              value={chapterFormData.pageSlug}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, pageSlug: e.target.value })}
                              placeholder={`defaults to slug (${chapterFormData.slug || 'e.g. wny'})`}
                              style={monoInputStyle}
                            />
                            <small style={helpStyle}>e.g. <code>wny</code> → <code>goodneighbor.fund/wny</code>. Blank mirrors the slug.</small>
                          </div>
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>Email alias</label>
                            <input
                              type="text"
                              value={chapterFormData.emailAlias}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, emailAlias: e.target.value })}
                              placeholder="e.g. wny@goodneighbor.fund"
                              style={inputStyle}
                            />
                          </div>
                        </div>

                        <div style={{ ...fieldWrapStyle, marginBottom: '12px' }}>
                          <label style={labelStyle}>Tagline / short description</label>
                          <textarea
                            value={chapterFormData.tagline}
                            onChange={(e) => setChapterFormData({ ...chapterFormData, tagline: e.target.value })}
                            placeholder="e.g. Serving Buffalo and the surrounding 8 counties."
                            rows={2}
                            style={textareaStyle}
                          />
                          <small style={helpStyle}>Shown on the chapter list and the dynamic chapter page fallback.</small>
                        </div>

                        <div style={gridTwoCol}>
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>Pitch Slack channel ID</label>
                            <input
                              type="text"
                              value={chapterFormData.slackChannel}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, slackChannel: e.target.value })}
                              placeholder="e.g. C04V14N4W83"
                              style={monoInputStyle}
                            />
                          </div>
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>LP application Slack channel ID</label>
                            <input
                              type="text"
                              value={chapterFormData.lpSlackChannel}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, lpSlackChannel: e.target.value })}
                              placeholder="e.g. C04K9G2L29L"
                              style={monoInputStyle}
                            />
                          </div>
                        </div>

                        {/* Year, founding date & order. Founded date drives the Founding Member
                             badge: any LP joining within 1 year of this date earns it
                             automatically. Active lives on its own row below as a dedicated
                             toggle — a boolean doesn't belong next to numeric fields. */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 160px) minmax(0, 200px) minmax(0, 120px)', columnGap: '32px', rowGap: '24px', marginBottom: '24px', alignItems: 'start' }}>
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>Founded year</label>
                            <input
                              type="number"
                              value={chapterFormData.foundedYear}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, foundedYear: e.target.value })}
                              placeholder="e.g. 2026"
                              style={inputStyle}
                            />
                          </div>
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>Founded date</label>
                            <input
                              type="date"
                              value={chapterFormData.foundedDate}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, foundedDate: e.target.value })}
                              style={inputStyle}
                            />
                            <small style={helpStyle}>Drives Founding Member badge.</small>
                          </div>
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>Order</label>
                            <input
                              type="number"
                              value={chapterFormData.order}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, order: e.target.value })}
                              style={inputStyle}
                            />
                          </div>
                        </div>

                        {/* Active — dedicated checkbox-style toggle row. */}
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 14px',
                          background: chapterFormData.active ? 'var(--mb-chalk)' : 'var(--mb-paper)',
                          border: '2px solid var(--mb-ink)',
                          boxShadow: 'var(--shadow-hard-sm)',
                          cursor: 'pointer',
                          marginBottom: 0,
                          fontFamily: 'var(--font-content)',
                          fontSize: '13px',
                          textTransform: 'none',
                          letterSpacing: 0,
                          fontWeight: 600,
                          color: 'var(--mb-ink)',
                        }}>
                          <input
                            type="checkbox"
                            checked={chapterFormData.active}
                            onChange={(e) => setChapterFormData({ ...chapterFormData, active: e.target.checked })}
                            style={{ width: 16, height: 16, margin: 0, padding: 0, accentColor: 'var(--mb-magenta)' }}
                          />
                          <StatusIcon type={chapterFormData.active ? 'check' : 'cross'} size={14} />
                          <span>{chapterFormData.active ? 'Active' : 'Inactive'}</span>
                          <span style={{ color: 'var(--mb-ink-60)', fontWeight: 400, marginLeft: 4 }}>
                            {chapterFormData.active ? '— appears in chapter dropdowns' : '— hidden from dropdowns'}
                          </span>
                        </label>
                      </section>
                    )}

                    {/* ─── Landing-page content ─── editable by chapter_director + superAdmin */}
                    {activeTabKey === 'content' && !isAddingChapter && (
                      <section>
                        <div style={tabIntroStyle}>
                          <span style={tabEyebrowStyle}>Content · Public page</span>
                          <h3 style={tabHeadingStyle}>What visitors read on <code style={{ fontSize: '16px' }}>/{chapterFormData.pageSlug || chapterFormData.slug}</code></h3>
                          <small style={tabHelpStyle}>Hero copy, &ldquo;Serving&hellip;&rdquo; blurb, counties list, and the closing &ldquo;Powered by People&rdquo; paragraph. Blank fields fall back to defaults baked into the HTML.</small>
                        </div>

                        {/* Hero block — the H1 and its tagline are THE hero, so each gets its own row. */}
                        <div style={{ ...fieldWrapStyle, marginBottom: '24px' }}>
                          <label style={labelStyle}>Hero title (H1)</label>
                          <input
                            type="text"
                            value={chapterFormData.heroTitle}
                            onChange={(e) => setChapterFormData({ ...chapterFormData, heroTitle: e.target.value })}
                            placeholder='e.g. "$1,000 Micro-Grants for Buffalo Business Ideas"'
                            style={inputStyle}
                          />
                        </div>

                        <div style={{ ...fieldWrapStyle, marginBottom: '24px' }}>
                          <label style={labelStyle}>Hero tagline</label>
                          <textarea
                            value={chapterFormData.heroTagline}
                            onChange={(e) => setChapterFormData({ ...chapterFormData, heroTagline: e.target.value })}
                            placeholder='e.g. "No pitch deck required. No equity taken. Just belief in your vision and potential."'
                            rows={2}
                            style={{ ...textareaStyle, minHeight: '60px' }}
                          />
                          <small style={helpStyle}>The brand lede (<em>"We back brilliant ideas…"</em>) stays — this is the sentence that follows it.</small>
                        </div>

                        {/* Serving block — heading + description stacked vertically so heights never mismatch. */}
                        <div style={{ ...fieldWrapStyle, marginBottom: '24px' }}>
                          <label style={labelStyle}>"Serving…" heading</label>
                          <input
                            type="text"
                            value={chapterFormData.servingTitle}
                            onChange={(e) => setChapterFormData({ ...chapterFormData, servingTitle: e.target.value })}
                            placeholder='e.g. "Serving All of Western New York"'
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ ...fieldWrapStyle, marginBottom: '24px' }}>
                          <label style={labelStyle}>"Serving…" description</label>
                          <textarea
                            value={chapterFormData.servingText}
                            onChange={(e) => setChapterFormData({ ...chapterFormData, servingText: e.target.value })}
                            placeholder="One paragraph describing the region."
                            rows={3}
                            style={{ ...textareaStyle, minHeight: '80px' }}
                          />
                        </div>

                        {/* Counties — narrower textarea, one county per line. */}
                        <div style={{ ...fieldWrapStyle, marginBottom: '24px', maxWidth: '520px' }}>
                          <label style={labelStyle}>
                            Counties
                            <span style={{ fontWeight: 'normal', color: 'var(--mb-ink-60)', marginLeft: '8px', textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
                              {countyList.length} {countyList.length === 1 ? 'county' : 'counties'}
                            </span>
                          </label>
                          <textarea
                            value={Array.isArray(chapterFormData.counties) ? chapterFormData.counties.join('\n') : chapterFormData.counties}
                            onChange={(e) => setChapterFormData({ ...chapterFormData, counties: e.target.value.split('\n') })}
                            placeholder={"Erie County\nNiagara County\nCattaraugus"}
                            rows={6}
                            style={{ ...textareaStyle, minHeight: '150px', fontFamily: 'var(--font-numeral)', fontSize: '12px' }}
                          />
                          <small style={helpStyle}>One county per line. Rendered as chips in the &ldquo;Serving&hellip;&rdquo; section on the public page.</small>
                        </div>

                        <div style={{ ...fieldWrapStyle, marginBottom: 0 }}>
                          <label style={labelStyle}>"Powered by People, Not Institutions" paragraph</label>
                          <textarea
                            value={chapterFormData.poweredByText}
                            onChange={(e) => setChapterFormData({ ...chapterFormData, poweredByText: e.target.value })}
                            placeholder="Describe how your chapter's LPs pool capital to fund local founders."
                            rows={4}
                            style={{ ...textareaStyle, minHeight: '110px' }}
                          />
                        </div>

                        <div style={{ ...fieldWrapStyle, marginBottom: '12px' }}>
                          <label style={labelStyle}>Default grant amount</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>$</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              value={
                                chapterFormData.defaultGrantAmount === '' || chapterFormData.defaultGrantAmount == null
                                  ? ''
                                  : chapterFormData.defaultGrantAmount
                              }
                              onChange={(e) => setChapterFormData({
                                ...chapterFormData,
                                defaultGrantAmount: e.target.value === '' ? '' : Number(e.target.value)
                              })}
                              placeholder="1000"
                              style={{ ...monoInputStyle, width: 160 }}
                            />
                          </div>
                          <small style={helpStyle}>
                            Used by the Statistics tab as the dollar value of any winner pitch without an explicit award amount. Blank defers to the historical $1,000 baseline.
                          </small>
                        </div>
                      </section>
                    )}

                    {/* ─── Landing-page photos ─── editable by chapter_director + superAdmin */}
                    {activeTabKey === 'photos' && !isAddingChapter && (
                      <section>
                        <div style={tabIntroStyle}>
                          <span style={tabEyebrowStyle}>Photos · Hero + Gallery</span>
                          <h3 style={tabHeadingStyle}>Imagery for the public page</h3>
                          <small style={tabHelpStyle}>Uploads save immediately to <code>chapter-photos/{editingChapterId}/</code> &mdash; no &ldquo;Save&rdquo; click needed for photos.</small>
                        </div>

                          {/* Hero image */}
                          <div style={{ ...fieldWrapStyle, marginBottom: '16px' }}>
                            <label style={labelStyle}>Hero image</label>
                            <div style={{
                              display: 'flex',
                              gap: '14px',
                              alignItems: 'flex-start',
                              flexWrap: 'wrap',
                              marginTop: '4px',
                            }}>
                              <div style={{
                                width: '220px',
                                height: '140px',
                                background: 'var(--mb-chalk)',
                                border: '2px solid var(--mb-ink)',
                                boxShadow: 'var(--shadow-hard-sm)',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                {chapterFormData.heroImage ? (
                                  <img
                                    src={chapterFormData.heroImage}
                                    alt="Hero preview"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <span style={{ fontSize: '11px', color: 'var(--mb-ink-60)', fontFamily: 'var(--font-pixel)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                    No image
                                  </span>
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                                <label
                                  className="win95-btn win95-btn-primary"
                                  style={{ display: 'inline-block', textAlign: 'center', cursor: heroBusy ? 'wait' : 'pointer', opacity: heroBusy ? 0.6 : 1, padding: '5px 12px', fontSize: '12px' }}
                                >
                                  {heroBusy ? 'Uploading…' : chapterFormData.heroImage ? 'Replace hero image' : 'Upload hero image'}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    disabled={heroBusy}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleChapterHeroUpload(file);
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                                <small style={helpStyle}>PNG/JPG, under 5 MB. Shown on the right side of the hero on <code>/{chapterFormData.pageSlug || chapterFormData.slug}</code>.</small>
                              </div>
                            </div>
                          </div>

                          {/* Hero caption */}
                          <div style={{ ...fieldWrapStyle, marginBottom: '18px' }}>
                            <label style={labelStyle}>Hero image caption</label>
                            <input
                              type="text"
                              value={chapterFormData.heroImageCaption}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, heroImageCaption: e.target.value })}
                              placeholder={`e.g. "Fat Daddy's — Past Micro-Grant Awardee"`}
                              style={inputStyle}
                            />
                            <small style={helpStyle}>Small caption overlaid on the bottom of the hero photo. Leave blank to hide.</small>
                          </div>

                          {/* Gallery photos */}
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>
                              Community gallery
                              <span style={{ fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                                {galleryList.length} photo{galleryList.length === 1 ? '' : 's'}
                              </span>
                            </label>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                              gap: '10px',
                              marginTop: '6px',
                              marginBottom: '10px',
                            }}>
                              {galleryList.map((photo, i) => (
                                <div key={photo.storagePath || photo.url || i} style={{
                                  position: 'relative',
                                  aspectRatio: '4 / 3',
                                  background: 'var(--mb-chalk)',
                                  border: '2px solid var(--mb-ink)',
                                  boxShadow: 'var(--shadow-hard-sm)',
                                  overflow: 'hidden',
                                }}>
                                  <img
                                    src={photo.url}
                                    alt={`Gallery ${i + 1}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleGalleryPhotoDelete(i)}
                                    style={{
                                      position: 'absolute',
                                      top: '4px',
                                      right: '4px',
                                      width: '26px',
                                      height: '26px',
                                      background: 'var(--mb-magenta)',
                                      color: 'var(--mb-chalk)',
                                      border: '2px solid var(--mb-ink)',
                                      boxShadow: 'var(--shadow-hard-sm)',
                                      cursor: 'pointer',
                                      fontFamily: 'var(--font-content)',
                                      fontWeight: 700,
                                      fontSize: '13px',
                                      lineHeight: 1,
                                      padding: 0,
                                    }}
                                    aria-label={`Delete gallery photo ${i + 1}`}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              <label
                                className="win95-btn"
                                style={{
                                  aspectRatio: '4 / 3',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textAlign: 'center',
                                  cursor: galleryBusy ? 'wait' : 'pointer',
                                  opacity: galleryBusy ? 0.6 : 1,
                                  fontSize: '11px',
                                  lineHeight: 1.3,
                                  padding: '10px',
                                }}
                              >
                                {galleryBusy ? 'Uploading…' : '+ Add photo'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  disabled={galleryBusy}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleGalleryPhotoUpload(file);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            </div>
                          <small style={helpStyle}>Photos render in a grid under "Building &lt;Chapter&gt;'s Entrepreneurial Community." Toggle the whole grid on/off via "Show community gallery" below.</small>
                        </div>
                      </section>
                    )}

                    {/* ─── Section visibility ─── */}
                    {activeTabKey === 'visibility' && !isAddingChapter && (
                      <section>
                        <div style={tabIntroStyle}>
                          <span style={tabEyebrowStyle}>Visibility · Public page</span>
                          <h3 style={tabHeadingStyle}>Which sections appear on the landing page</h3>
                          <small style={tabHelpStyle}>Toggle whole blocks of the public <code>/{chapterFormData.pageSlug || chapterFormData.slug}</code> page on or off. Changes take effect immediately on save.</small>
                        </div>
                        <div style={{ ...gridTwoCol, marginBottom: 0 }}>
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <StatusIcon type={chapterFormData.showLPs ? 'check' : 'cross'} size={14} />
                                Show LP grid
                              </span>
                            </label>
                            <select
                              value={chapterFormData.showLPs ? 'true' : 'false'}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, showLPs: e.target.value === 'true' })}
                              style={inputStyle}
                            >
                              <option value="true">Shown on public page</option>
                              <option value="false">Hidden</option>
                            </select>
                            <small style={helpStyle}>Toggles the "Chapter LPs" section on the landing page.</small>
                          </div>
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <StatusIcon type={chapterFormData.showImpact !== false ? 'check' : 'cross'} size={14} />
                                Show impact stats
                              </span>
                            </label>
                            <select
                              value={chapterFormData.showImpact !== false ? 'true' : 'false'}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, showImpact: e.target.value === 'true' })}
                              style={inputStyle}
                            >
                              <option value="true">Shown on public page</option>
                              <option value="false">Hidden</option>
                            </select>
                            <small style={helpStyle}>Toggles the "Our Impact Since YYYY" section. Numbers are auto-calculated from this chapter's grant winners (count, women-owned %, BIPOC-owned %, total awarded).</small>
                          </div>
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <StatusIcon type={chapterFormData.showGallery ? 'check' : 'cross'} size={14} />
                                Show community gallery
                              </span>
                            </label>
                            <select
                              value={chapterFormData.showGallery ? 'true' : 'false'}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, showGallery: e.target.value === 'true' })}
                              style={inputStyle}
                            >
                              <option value="true">Shown on public page</option>
                              <option value="false">Hidden</option>
                            </select>
                            <small style={helpStyle}>Toggles the photo grid at the bottom of the page.</small>
                          </div>
                          <div style={fieldWrapStyle}>
                            <label style={labelStyle}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <StatusIcon type={chapterFormData.showAwardees === true ? 'check' : 'cross'} size={14} />
                                Show grant awardees
                              </span>
                            </label>
                            <select
                              value={chapterFormData.showAwardees === true ? 'true' : 'false'}
                              onChange={(e) => setChapterFormData({ ...chapterFormData, showAwardees: e.target.value === 'true' })}
                              style={inputStyle}
                            >
                              <option value="false">Hidden</option>
                              <option value="true">Shown on public page</option>
                            </select>
                            <small style={helpStyle}>Adds a searchable, sortable grid of this chapter's past grant awardees to the landing page. Off by default.</small>
                          </div>
                        </div>
                      </section>
                    )}
                  </div>

                  {/* Save bar — static footer inside the card */}
                  <div style={{
                    display: 'flex',
                    gap: 10,
                    justifyContent: 'flex-end',
                    padding: '16px 32px',
                    background: 'var(--mb-chalk)',
                    borderTop: '2px solid var(--mb-ink)',
                  }}>
                    <RetroButton
                      onClick={() => {
                        setIsAddingChapter(false);
                        setEditingChapterId(null);
                        setChapterFormTab('content');
                        setChapterFormData({ ...emptyChapterForm });
                      }}
                    >
                      Cancel
                    </RetroButton>
                    <RetroButton onClick={handleSaveChapter} variant="primary">
                      Save Chapter
                    </RetroButton>
                  </div>
                </div>
                );
              };
            return (
            <>
              <section className="admin-section admin-section--hero admin-section--tangerine-soft">
                <div className="admin-section-head">
                  <span className="admin-section-head__eyebrow">Chapter</span>
                  <h2 className="admin-section-head__title">
                    Where your <em>neighborhood</em> lives.
                  </h2>
                  <p className="admin-section-head__lede">
                    Manage your chapter&rsquo;s landing page — the hero, the story, and everything you want the world to see.
                  </p>
                </div>
              </section>

              <section className="admin-section admin-section--chalk">
              {isSuperAdmin && (() => {
                const legacySlugs = ['wny', 'denver', 'upstate', 'capital-region'];
                const missingSlugs = legacySlugs.filter(s => !chapters.some(c => c.id === s));
                if (missingSlugs.length === 0) return null;
                const isFreshSetup = chapters.length === 0;
                return (
                  <div className="admin-tool-card" style={{ marginBottom: 20 }}>
                    <div className="admin-tool-card__eyebrow">Setup</div>
                    <h5 className="admin-tool-card__title">
                      {isFreshSetup ? 'No chapters yet' : `Missing ${missingSlugs.length} chapter${missingSlugs.length === 1 ? '' : 's'}`}
                    </h5>
                    <div className="admin-tool-card__body">
                      {isFreshSetup ? (
                        <>Seed the collection with the 4 legacy chapters using the Slack channel and email values currently in <code>functions/index.js</code>.</>
                      ) : (
                        <>
                          Missing: <code>{missingSlugs.join(', ')}</code>. Seeding creates any missing chapters and fills in only empty fields on existing ones — it will never overwrite values you&rsquo;ve already edited.
                        </>
                      )}
                    </div>
                    <div className="admin-tool-card__action">
                      <RetroButton onClick={handleSeedLegacyChapters} variant="primary">
                        {isFreshSetup ? 'Seed Legacy Chapters' : 'Seed Missing Chapters'}
                      </RetroButton>
                    </div>
                  </div>
                );
              })()}

              {visibleChapters.length > 0 && (
                <div className="retro-table-wrap" style={{ marginBottom: 20 }}>
                  <table className="retro-table">
                    <thead>
                      <tr>
                        {isSuperAdmin && <th style={{ width: '40px' }}>#</th>}
                        <th>Chapter</th>
                        {isSuperAdmin && <th>Public page</th>}
                        {isSuperAdmin && <th>Contact</th>}
                        {isSuperAdmin && <th>Director(s)</th>}
                        <th style={{ textAlign: 'center', width: '130px' }}>Sections</th>
                        {isSuperAdmin && <th style={{ textAlign: 'center', width: '80px' }}>Status</th>}
                        <th style={{ width: '140px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleChapters.map(c => {
                        // Directors are DERIVED, not stored. Any user with role=chapter_director
                        // OR chapterRole=chapter_director (the presentation-only tag for
                        // superAdmins who also serve as directors) and chapter matching this
                        // chapter's display name is a director.
                        const directors = users.filter(u =>
                          u.chapter === c.name &&
                          (u.role === 'chapter_director' || u.chapterRole === 'chapter_director')
                        );
                        const pageSlug = c.pageSlug || c.id;
                        const contactLines = [c.emailAlias, c.slackChannel && `pitch: ${c.slackChannel}`, c.lpSlackChannel && `lp: ${c.lpSlackChannel}`].filter(Boolean);
                        const isEditingThis = editingChapterId === c.id && !isAddingChapter;
                        return (
                          <React.Fragment key={c.id}>
                          <tr className={`${c.active === false ? 'is-inactive ' : ''}${isEditingThis ? 'is-editing' : ''}`}>
                            {isSuperAdmin && <td style={{ color: 'var(--mb-ink-60)', fontFamily: 'var(--font-numeral)' }}>{c.order ?? '—'}</td>}
                            <td>
                              <div style={{ fontWeight: 700 }}>{c.name || <span style={{ color: 'var(--mb-magenta-deep)' }}>(no name)</span>}</div>
                              {isSuperAdmin && <div style={{ fontFamily: 'var(--font-numeral)', fontSize: '11px', color: 'var(--mb-ink-60)', marginTop: 2 }}>{c.id}</div>}
                            </td>
                            {isSuperAdmin && (
                              <td>
                                <a href={`/${pageSlug}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-numeral)', fontSize: 12 }}>
                                  /{pageSlug} ↗
                                </a>
                              </td>
                            )}
                            {isSuperAdmin && (
                              <td style={{ fontSize: 12, lineHeight: 1.4 }}>
                                {contactLines.length === 0
                                  ? <span style={{ color: 'var(--mb-ink-60)' }}>—</span>
                                  : contactLines.map((line, i) => <div key={i} style={{ fontFamily: i === 0 ? 'var(--font-content)' : 'var(--font-numeral)' }}>{line}</div>)}
                              </td>
                            )}
                            {isSuperAdmin && (
                              <td style={{ fontSize: 13 }}>
                                {directors.length === 0 ? (
                                  <span style={{ color: 'var(--mb-ink-60)' }} title="Assign a user role 'Chapter Director' with this chapter in the Users tab.">none</span>
                                ) : (
                                  directors.map(d => d.name || d.email || d.uid).join(', ')
                                )}
                              </td>
                            )}
                            <td style={{ textAlign: 'center', fontSize: 12, whiteSpace: 'nowrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 10 }}>
                                LPs <StatusIcon type={c.showLPs === false ? 'cross' : 'check'} size={14} title={c.showLPs === false ? 'LP grid hidden' : 'LP grid shown'} />
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 10 }}>
                                Impact <StatusIcon type={c.showImpact === false ? 'cross' : 'check'} size={14} title={c.showImpact === false ? 'Impact stats hidden' : 'Impact stats shown'} />
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 10 }}>
                                Gallery <StatusIcon type={c.showGallery === false ? 'cross' : 'check'} size={14} title={c.showGallery === false ? 'Gallery hidden' : 'Gallery shown'} />
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                Awardees <StatusIcon type={c.showAwardees === true ? 'check' : 'cross'} size={14} title={c.showAwardees === true ? 'Awardees shown' : 'Awardees hidden'} />
                              </span>
                            </td>
                            {isSuperAdmin && (
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <StatusIcon type={c.active === false ? 'cross' : 'check'} size={16} title={c.active === false ? 'Inactive' : 'Active'} />
                                </span>
                              </td>
                            )}
                            <td className="actions">
                              <div style={{ display: 'inline-flex', gap: 6, alignItems: 'stretch' }}>
                              <RetroButton
                                size="sm"
                                style={{ minHeight: 28, minWidth: 56, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                                onClick={() => {
                                  setEditingChapterId(c.id);
                                  setIsAddingChapter(false);
                                  setChapterFormTab('identity');
                                  setChapterFormData({
                                    slug: c.id,
                                    name: c.name || '',
                                    pageSlug: c.pageSlug || '',
                                    tagline: c.tagline || '',
                                    foundedYear: typeof c.foundedYear === 'number' ? c.foundedYear : '',
                                    foundedDate: c.foundedDate
                                      ? (c.foundedDate.toDate ? c.foundedDate.toDate() : new Date(c.foundedDate))
                                          .toISOString().split('T')[0]
                                      : '',
                                    emailAlias: c.emailAlias || '',
                                    slackChannel: c.slackChannel || '',
                                    lpSlackChannel: c.lpSlackChannel || '',
                                    active: c.active !== false,
                                    order: typeof c.order === 'number' ? c.order : 0,
                                    heroTitle: c.heroTitle || '',
                                    heroTagline: c.heroTagline || '',
                                    heroImage: c.heroImage || '',
                                    heroImageCaption: c.heroImageCaption || '',
                                    servingTitle: c.servingTitle || '',
                                    servingText: c.servingText || '',
                                    counties: Array.isArray(c.counties) ? c.counties : [],
                                    poweredByText: c.poweredByText || '',
                                    galleryPhotos: Array.isArray(c.galleryPhotos) ? c.galleryPhotos : [],
                                    showLPs: c.showLPs !== false,
                                    showGallery: c.showGallery !== false,
                                    showImpact: c.showImpact !== false,
                                    showAwardees: c.showAwardees === true,
                                    defaultGrantAmount: Number.isFinite(Number(c.defaultGrantAmount)) && Number(c.defaultGrantAmount) > 0
                                      ? Number(c.defaultGrantAmount)
                                      : '',
                                  });
                                }}
                              >
                                Edit
                              </RetroButton>
                              {isSuperAdmin && (
                                <RetroButton
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleDeleteChapter(c.id, c.name || c.id)}
                                  ariaLabel={`Delete chapter ${c.name || c.id}`}
                                  title={`Delete chapter ${c.name || c.id}`}
                                  style={{ minHeight: 28, minWidth: 36, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                                >
                                  <StatusIcon type="trash" size={14} title="" />
                                </RetroButton>
                              )}
                              </div>
                            </td>
                          </tr>
                          {isEditingThis && (
                            <tr className="chapter-edit-row">
                              <td colSpan={chapterColSpan} style={{ padding: 0, background: 'var(--mb-chalk)' }}>
                                <div style={{ padding: '18px 20px' }}>{renderChapterForm()}</div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {isSuperAdmin && !isAddingChapter && !editingChapterId && (
                <RetroButton
                  onClick={() => {
                    setIsAddingChapter(true);
                    setEditingChapterId(null);
                    setChapterFormTab('identity');
                    setChapterFormData({ ...emptyChapterForm, order: chapters.length + 1 });
                  }}
                  variant="primary"
                  style={{ marginBottom: '20px' }}
                >
                  + Add Chapter
                </RetroButton>
              )}

              {isAddingChapter && renderChapterForm()}
              </section>
            </>
            );
          })()}

          {/* Resources Management Sub-Tab Content */}
          {activeAdminTab === 'resourcesManagement' && isSuperAdmin && (() => {
            const RESOURCE_TYPES = [
              'Funding', 'Incubator/Accelerator', 'Mentorship', 'Community', 'Government',
              'Legal', 'Education', 'Venture Capital', 'Angel Group', 'Private Investment Office',
              'Corporate Venture', 'Venture Studio', 'Coworking', 'Nonprofit', 'Private Equity',
              'Investment Platform'
            ];
            const BUSINESS_STAGES = ['Ideation', 'Early', 'Growth', 'Established', 'All'];
            const filteredResources = managedResources.filter(resource => {
              const search = resourceSearchTerm.toLowerCase();
              const matchesSearch = !resourceSearchTerm ||
                resource.Resource?.toLowerCase().includes(search) ||
                resource.Type?.toLowerCase().includes(search) ||
                resource.FocusArea?.toLowerCase().includes(search) ||
                resource['Focus Area']?.toLowerCase().includes(search) ||
                (resource.Chapter || resource.chapter || '').toLowerCase().includes(search);
              const matchesType = !resourceTypeFilter ||
                resource.Type === resourceTypeFilter || resource.type === resourceTypeFilter;
              const matchesStage = !resourceStageFilter ||
                resource.Stage === resourceStageFilter ||
                resource['Business Stage'] === resourceStageFilter ||
                resource.businessStage === resourceStageFilter;
              const resourceChapter = resource.Chapter || resource.chapter || '';
              const matchesChapter = !resourceChapterFilter || resourceChapter === resourceChapterFilter;
              return matchesSearch && matchesType && matchesStage && matchesChapter;
            });
            const hasFilters = resourceSearchTerm || resourceTypeFilter || resourceStageFilter || resourceChapterFilter;
            // Local style stubs — empty so .mb-form-shell + .filter-bar can take over.
            const labelStyle = {};
            const inputStyle = { width: '100%' };
            const clearFilters = () => {
              setResourceSearchTerm('');
              setResourceTypeFilter('');
              setResourceStageFilter('');
              setResourceChapterFilter('');
            };
            const openAddForm = () => {
              setEditingResource(null);
              setResourceFormData({
                Resource: '', Chapter: '', Type: '', 'Focus Area': '',
                'Business Stage': 'Ideation', 'Counties Served': '', URL: '',
                'Expanded Details': '', 'Average Check Size': '', 'Relocation Required?': 'No'
              });
              setIsAddingResource(true);
            };

            const uniqueChapters = new Set(managedResources.map(r => r.Chapter || r.chapter).filter(Boolean)).size;
            return (
            <>
              <section className="admin-section admin-section--hero admin-section--butter">
                <div className="admin-section-head admin-section-head--split">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span className="admin-section-head__eyebrow">Resources · Directory</span>
                    <h2 className="admin-section-head__title">
                      The <em>navigator</em> index.
                    </h2>
                    <p className="admin-section-head__lede">
                      Every funding org, incubator, and community resource your chapters point founders toward.
                    </p>
                  </div>
                  <RetroButton onClick={openAddForm} variant="primary" size="lg">
                    + Add Resource
                  </RetroButton>
                </div>
                <div className="admin-hero-stats">
                  <div className="admin-hero-stat">
                    <span className="admin-hero-stat__num">{managedResources.length}</span>
                    <span className="admin-hero-stat__label">Total resources</span>
                  </div>
                  <div className="admin-hero-stat">
                    <span className="admin-hero-stat__num">{uniqueChapters}</span>
                    <span className="admin-hero-stat__label">Chapters indexed</span>
                  </div>
                  {hasFilters && (
                    <div className="admin-hero-stat">
                      <span className="admin-hero-stat__num">{filteredResources.length}</span>
                      <span className="admin-hero-stat__label">Shown right now</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="admin-section admin-section--chalk">
              {/* Toolbar: search + filters */}
              <div className="filter-bar">
                <input
                  type="search"
                  aria-label="Search resources"
                  placeholder="Search name, type, focus, chapter…"
                  value={resourceSearchTerm}
                  onChange={(e) => setResourceSearchTerm(e.target.value)}
                />
                <select
                  aria-label="Filter by chapter"
                  value={resourceChapterFilter}
                  onChange={(e) => setResourceChapterFilter(e.target.value)}
                >
                  <option value="">All Chapters</option>
                  {activeChapterNames.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  aria-label="Filter by type"
                  value={resourceTypeFilter}
                  onChange={(e) => setResourceTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  aria-label="Filter by stage"
                  value={resourceStageFilter}
                  onChange={(e) => setResourceStageFilter(e.target.value)}
                >
                  <option value="">All Stages</option>
                  {BUSINESS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <RetroButton onClick={clearFilters} disabled={!hasFilters}>
                  Clear
                </RetroButton>
              </div>

              {/* Resource Form (Add/Edit) */}
              {isAddingResource && (
                <div className="mb-form-shell" style={{
                  background: 'var(--mb-chalk)',
                  border: '2px solid var(--mb-ink)',
                  boxShadow: 'var(--shadow-hard)',
                  padding: '24px',
                  marginBottom: '20px'
                }}>
                  <h5 style={{ margin: '0 0 20px 0' }}>
                    {editingResource ? 'Edit Resource' : 'Add New Resource'}
                  </h5>

                  {/* Section 1: Basics */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      fontFamily: 'var(--font-pixel)',
                      fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: 'var(--mb-magenta)',
                      paddingBottom: '6px', marginBottom: '14px',
                      borderBottom: '1px solid var(--mb-ink-15)'
                    }}>
                      Basics
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={labelStyle}>Resource Name *</label>
                        <input
                          type="text"
                          value={resourceFormData.Resource}
                          onChange={(e) => setResourceFormData({ ...resourceFormData, Resource: e.target.value })}
                          style={inputStyle}
                          placeholder="e.g., 43North Accelerator"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Chapter *</label>
                        <select
                          value={resourceFormData.Chapter}
                          onChange={(e) => setResourceFormData({ ...resourceFormData, Chapter: e.target.value })}
                          style={{
                            ...inputStyle,
                            background: resourceFormData.Chapter ? 'var(--gnf-bg)' : 'var(--gnf-yellow-100, #fff9c4)'
                          }}
                        >
                          <option value="">— Select Chapter —</option>
                          {activeChapterNames.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      <div>
                        <label style={labelStyle}>Type *</label>
                        <select
                          value={resourceFormData.Type}
                          onChange={(e) => setResourceFormData({ ...resourceFormData, Type: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="">Select Type</option>
                          {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Business Stage *</label>
                        <select
                          value={resourceFormData['Business Stage']}
                          onChange={(e) => setResourceFormData({ ...resourceFormData, 'Business Stage': e.target.value })}
                          style={inputStyle}
                        >
                          {BUSINESS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Focus & Reach */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      fontFamily: 'var(--font-pixel)',
                      fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: 'var(--mb-magenta)',
                      paddingBottom: '6px', marginBottom: '14px',
                      borderBottom: '1px solid var(--mb-ink-15)'
                    }}>
                      Focus &amp; Reach
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={labelStyle}>Focus Area</label>
                        <input
                          type="text"
                          value={resourceFormData['Focus Area']}
                          onChange={(e) => setResourceFormData({ ...resourceFormData, 'Focus Area': e.target.value })}
                          style={inputStyle}
                          placeholder="e.g., High-growth startups"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Counties Served</label>
                        <input
                          type="text"
                          value={resourceFormData['Counties Served']}
                          onChange={(e) => setResourceFormData({ ...resourceFormData, 'Counties Served': e.target.value })}
                          style={inputStyle}
                          placeholder="e.g., All 8 counties, Erie, Niagara"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Average Check Size</label>
                        <input
                          type="text"
                          value={resourceFormData['Average Check Size']}
                          onChange={(e) => setResourceFormData({ ...resourceFormData, 'Average Check Size': e.target.value })}
                          style={inputStyle}
                          placeholder="e.g., $50K-$250K"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Relocation Required?</label>
                        <select
                          value={resourceFormData['Relocation Required?']}
                          onChange={(e) => setResourceFormData({ ...resourceFormData, 'Relocation Required?': e.target.value })}
                          style={inputStyle}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Details */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      fontFamily: 'var(--font-pixel)',
                      fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: 'var(--mb-magenta)',
                      paddingBottom: '6px', marginBottom: '14px',
                      borderBottom: '1px solid var(--mb-ink-15)'
                    }}>
                      Details
                    </div>
                    <div>
                      <label style={labelStyle}>URL</label>
                      <input
                        type="url"
                        value={resourceFormData.URL}
                        onChange={(e) => setResourceFormData({ ...resourceFormData, URL: e.target.value })}
                        style={inputStyle}
                        placeholder="https://..."
                      />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <label style={labelStyle}>Expanded Details</label>
                      <textarea
                        value={resourceFormData['Expanded Details']}
                        onChange={(e) => setResourceFormData({ ...resourceFormData, 'Expanded Details': e.target.value })}
                        style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                        placeholder="Detailed description of the resource..."
                      />
                    </div>
                  </div>

                  <div className="retro-action-row">
                    <RetroButton onClick={handleSaveResource} variant="primary">
                      {editingResource ? 'Update Resource' : 'Save Resource'}
                    </RetroButton>
                    <RetroButton
                      onClick={() => {
                        setIsAddingResource(false);
                        setEditingResource(null);
                      }}
                    >
                      Cancel
                    </RetroButton>
                  </div>
                </div>
              )}

              {/* Resources Table */}
              <div className="retro-table-wrap">
                <table className="retro-table">
                  <thead>
                    <tr>
                      <th>Resource</th>
                      <th>Chapter</th>
                      <th>Type</th>
                      <th>Stage</th>
                      <th>Focus Area</th>
                      <th>Counties</th>
                      <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResources.map((resource) => {
                      const chapter = resource.Chapter || resource.chapter || '';
                      const url = resource.Website || resource.URL || resource.url;
                      return (
                        <tr key={resource.id}>
                          <td style={{ fontWeight: 700 }}>
                            {resource.Resource || resource.resource || '—'}
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ marginLeft: 6, fontSize: '0.85em' }}
                                title={url}
                                aria-label={`Open ${resource.Resource || resource.resource || 'resource'} in new tab`}
                              >
                                🔗
                              </a>
                            )}
                          </td>
                          <td style={{ fontSize: 13 }}>
                            {chapter ? (
                              <span className="retro-pill retro-pill--pink">{chapter}</span>
                            ) : (
                              <span style={{ color: 'var(--mb-ink-60)', fontStyle: 'italic' }}>Unassigned</span>
                            )}
                          </td>
                          <td>{resource.Type || resource.type || '—'}</td>
                          <td>{resource.Stage || resource['Business Stage'] || resource.businessStage || '—'}</td>
                          <td style={{ fontSize: 13 }}>
                            {resource.FocusArea || resource['Focus Area'] || resource.focusArea || '—'}
                          </td>
                          <td style={{ fontSize: 13 }}>
                            {resource.CountiesServed || resource['Counties Served'] || resource.countiesServed || '—'}
                          </td>
                          <td className="actions" style={{ textAlign: 'center' }}>
                            <RetroButton
                              size="sm"
                              onClick={() => handleEditResource(resource)}
                            >
                              Edit
                            </RetroButton>
                            <RetroButton
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeleteResource(resource.id)}
                            >
                              Delete
                            </RetroButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {managedResources.length === 0 && (
                  <EmptyState
                    icon={null}
                    title="No resources yet"
                    description="Click + Add Resource to create the first one."
                  />
                )}
                {managedResources.length > 0 && filteredResources.length === 0 && (
                  <EmptyState
                    icon={null}
                    title="No resources match"
                    description="Try a different filter."
                    action={
                      <RetroButton size="sm" onClick={() => clearFilters()}>
                        Clear filters
                      </RetroButton>
                    }
                  />
                )}
              </div>
              </section>
            </>
            );
          })()}
          </div> {/* End .admin-tabpanel */}
        </div>
      )} {/* End Admin Panel Content */}
      
      {/* --- Badges Tab Content --- */}
      {activeTab === 'badges' && (
        <TrophyCase
          badges={userBadges || []}
          userStats={userStats || {}}
        />
      )}

      {/* --- Statistics Tab Content --- */}
      {activeTab === 'statistics' && (
        <StatisticsTab user={user} chaptersFromPortal={chapters} />
      )}

      {/* --- Chapter Members Tab Content --- */}
      {activeTab === 'chapterMembers' && (
        <div style={{ padding: '15px', overflow: 'auto' }}>
          <div style={{
            background: 'var(--mb-paper-deep)',
            border: '2px solid',
            borderColor: 'var(--mb-ink)',
            boxShadow: 'var(--shadow-hard-sm)',
            padding: '8px 12px',
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
              {user?.chapter} Chapter Members ({chapterMembers.length})
            </h2>
          </div>
          
          {chapterMembers.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
              No active members found in your chapter.
            </p>
          ) : (
            <div className="member-cards-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '15px'
            }}>
              {chapterMembers
                .sort((a, b) => {
                  // Sort by role (superAdmin > chapter_director > lp), then by name
                  const roleOrder = { superAdmin: 0, chapter_director: 1, lp: 2 };
                  if (roleOrder[a.role] !== roleOrder[b.role]) {
                    return roleOrder[a.role] - roleOrder[b.role];
                  }
                  return (a.name || '').localeCompare(b.name || '');
                })
                .map(member => {
                  const memberBadges = (member.badges || [])
                    .filter(badge => badge.earnedAt || badge.earnedDate)
                    .sort((a, b) => {
                      const dateA = new Date(a.earnedAt || a.earnedDate || 0);
                      const dateB = new Date(b.earnedAt || b.earnedDate || 0);
                      return dateB - dateA;
                    })
                    .slice(0, 8);
                  
                  // Prefer the uploaded photo from /users/{uid}.photoUrl. Fall
                  // back to the legacy /assets/lps/{slug}.png convention so
                  // members who haven't been re-uploaded yet still render.
                  const photoUrl = member.photoUrl
                    || (member.name
                        ? `/assets/lps/${member.name.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}.png`
                        : null);
                  
                  return (
                    <div key={member.id} className="win95-window" style={{
                      padding: '20px',
                      cursor: 'default'
                    }}>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'start', marginBottom: '12px' }}>
                        {photoUrl && (
                          <img
                            src={photoUrl}
                            alt={member.name}
                            className="member-photo"
                            style={{
                              width: '60px',
                              height: '60px',
                              objectFit: 'cover'
                            }}
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#333' }}>
                            {member.name || 'Unknown'}
                          </h4>
                          {(() => {
                            const displayRole = member.role === 'superAdmin' ? member.chapterRole : member.role;
                            const roleTag = {
                              chapter_director: { label: 'Chapter Director', bg: 'var(--gnf-blue-200)' },
                              lp: { label: 'Limited Partner', bg: 'var(--gnf-green-100)' },
                            }[displayRole];
                            if (!roleTag) return null;
                            return (
                              <div style={{
                                display: 'inline-block',
                                background: roleTag.bg,
                                border: '2px solid',
                                borderColor: 'var(--mb-ink)',
                                boxShadow: 'var(--shadow-hard-sm)',
                                padding: '2px 6px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: 'var(--mb-ink)',
                                marginBottom: '6px',
                              }}>
                                {roleTag.label}
                              </div>
                            );
                          })()}
                          {member.professionalRole && (
                            <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>{member.professionalRole}</div>
                          )}
                          {member.linkedinUrl && (
                            <button
                              onClick={() => window.open(member.linkedinUrl, '_blank')}
                              style={{
                                background: 'var(--btn-bg)',
                                color: 'var(--mb-ink)',
                                border: '2px solid',
                                borderColor: 'var(--mb-ink)',
                                boxShadow: 'var(--shadow-hard-sm)',
                                padding: '4px 10px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontFamily: 'var(--font-content)',
                                fontWeight: 'bold',
                                transition: 'none'
                              }}
                            >
                              LinkedIn
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '11px', color: 'var(--mb-ink-60)', paddingTop: '8px', borderTop: '1px solid var(--gnf-border-pink-light)' }}>
                        Member Since: {
                          member.anniversary 
                            ? (() => {
                                const date = new Date(member.anniversary.seconds ? member.anniversary.seconds * 1000 : member.anniversary);
                                const monthNames = ["January", "February", "March", "April", "May", "June", 
                                                   "July", "August", "September", "October", "November", "December"];
                                return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
                              })()
                            : 'Unknown'
                        }
                      </div>
                      
                      {memberBadges.length > 0 && (
                        <div style={{
                          borderTop: '1px solid var(--gnf-border-pink-light)',
                          paddingTop: '10px',
                          display: 'grid',
                          gridTemplateColumns: 'auto 1fr',
                          columnGap: '6px',
                          alignItems: 'start',
                          maxWidth: '100%'
                        }}>
                          <span style={{ fontSize: '10px', color: 'var(--mb-ink-60)', fontWeight: 'bold', paddingTop: '4px' }}>Recent:</span>
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            alignItems: 'center',
                            minWidth: 0
                          }}>
                            {memberBadges.map((badge, idx) => {
                              const badgeId = badge.badgeId || badge.id;
                              const badgeData = BADGES[badgeId];
                              if (!badgeData) return null;

                              return (
                                <div key={idx} style={{
                                  background: 'var(--gnf-pink-100)',
                                  border: '2px solid',
                                  borderColor: 'var(--mb-ink)',
                                  boxShadow: 'var(--shadow-hard-sm)',
                                  padding: '2px 6px',
                                  fontSize: '11px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }} title={badgeData.description}>
                                  <BadgeIcon id={badgeId} size={14} />
                                  <span style={{ fontSize: '9px', fontWeight: 'bold' }}>{badgeData.name.split(' ').slice(1).join(' ')}</span>
                                </div>
                              );
                            })}
                            {member.badges && member.badges.length > 8 && (
                              <span style={{ fontSize: '10px', color: 'var(--mb-ink-60)', fontWeight: 'bold' }}>
                                +{member.badges.length - 8} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
      
      {/* --- Pitch Map Tab Content --- */}
      {activeTab === 'pitchMap' && (
        <div style={{ padding: '15px', overflow: 'auto', height: '100%' }}>
          <div style={{
            background: 'var(--mb-paper-deep)',
            border: '2px solid',
            borderColor: 'var(--mb-ink)',
            boxShadow: 'var(--shadow-hard-sm)',
            padding: '8px 12px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Pitch Map</h2>
          </div>
          <PitchMap
            pitches={isAdmin ? adminPitches : lpPitches}
            currentUserChapter={user?.chapter}
          />
        </div>
      )}

      {/* --- Resources Tab Content --- */}
      {activeTab === 'resources' && (
        <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
          <ResourceLibrary />
          {(isChapterDirector || isSuperAdmin) && (
            <>
              <FormsLibrary user={user} isSuperAdmin={isSuperAdmin} />
              <AssetsLibrary />
            </>
          )}
        </div>
      )}

      {/* --- Bulletin Board Tab Content --- */}
      {activeTab === 'bulletinBoard' && (
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <style>{`
            @media (max-width: 768px) {
              .bulletin-container {
                flex-direction: column !important;
              }
              .bulletin-messages {
                order: 2;
                height: 60vh !important;
                border-right: none !important;
                border-bottom: 1px solid #e0e0e0;
              }
              .bulletin-compose {
                order: 1;
                width: 100% !important;
                height: auto !important;
                border-bottom: 1px solid #e0e0e0;
                padding: 15px !important;
              }
            }
          `}</style>
          
          <div className="bulletin-container" style={{
            display: 'flex',
            height: '100%',
            background: 'var(--mb-paper)'
          }}>
            {/* Messages List - Left Side */}
            <div className="bulletin-messages" style={{
              flex: '1',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--gnf-bg)',
              maxWidth: '700px',
              margin: '0 auto'
            }}>
              <div style={{
                padding: '15px 20px',
                borderBottom: '1px solid var(--gnf-border-pink)',
                background: 'var(--gnf-pink-100)'
              }}>
                <h2 style={{ margin: 0, fontSize: '20px' }}>Chapter Message Board</h2>
              </div>
              
              <div style={{ 
                flex: 1,
                overflowY: 'auto',
                padding: '20px'
              }}>
            {bulletinMessages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#999',
                fontSize: '14px'
              }}>
                No messages yet. Be the first to post!
              </div>
            ) : (
              <>
                {/* Pinned Messages */}
                {bulletinMessages.filter(msg => msg.isPinned).map(message => (
                  <div
                    key={message.id}
                    style={{
                      background: '#fff9e6',
                      border: '2px solid #ffd700',
                      padding: '15px',
                      marginBottom: '15px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '16px' }}>📌 Pinned</span>
                        </div>
                        <p style={{
                          margin: '10px 0',
                          fontSize: '14px',
                          color: '#333',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.5'
                        }}>
                          {message.message}
                        </p>
                        <div style={{
                          fontSize: '12px',
                          color: '#999',
                          display: 'flex',
                          gap: '15px',
                          alignItems: 'center'
                        }}>
                          <span>{message.authorName}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(message.timestamp)}</span>
                        </div>
                        
                        {/* Reactions */}
                        <MessageReactions 
                          message={message} 
                          user={user} 
                          handleReactToMessage={handleReactToMessage}
                          chapterMembers={chapterMembers}
                        />
                      </div>
                      
                      {/* Admin Actions */}
                      {(isAdmin || message.authorId === user.uid) && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {isAdmin && (
                            <button
                              onClick={() => handleTogglePinMessage(message)}
                              style={{
                                background: 'transparent',
                                border: '1px solid #ddd',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                color: '#666'
                              }}
                              title="Unpin message"
                            >
                              Unpin
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBulletinMessage(message.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #ddd',
                              padding: '4px 8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              color: '#d9534f'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Regular Messages */}
                {bulletinMessages.filter(msg => !msg.isPinned).map(message => {
                  const msgDate = message.timestamp?.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
                  const isNew = msgDate > new Date(lastViewedTimestamp) && message.authorId !== user?.uid;
                  
                  return (
                    <div
                      key={message.id}
                      style={{
                        background: isNew ? '#f0f8ff' : 'white',
                        border: isNew ? '2px solid #4da6ff' : '1px solid #e0e0e0',
                        padding: '15px',
                        marginBottom: '15px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        position: 'relative'
                      }}
                    >
                    {isNew && (
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#4da6ff',
                        color: 'white',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        NEW
                      </span>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          margin: '10px 0',
                          fontSize: '14px',
                          color: '#666',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {message.message}
                        </p>
                        <div style={{
                          fontSize: '12px',
                          color: '#999',
                          display: 'flex',
                          gap: '15px',
                          alignItems: 'center'
                        }}>
                          <span>{message.authorName}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(message.timestamp)}</span>
                        </div>
                        
                        {/* Reactions */}
                        <MessageReactions 
                          message={message} 
                          user={user} 
                          handleReactToMessage={handleReactToMessage}
                          chapterMembers={chapterMembers}
                        />
                      </div>
                      
                      {/* Admin Actions */}
                      {(isAdmin || message.authorId === user.uid) && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {isAdmin && (
                            <button
                              onClick={() => handleTogglePinMessage(message)}
                              style={{
                                background: 'transparent',
                                border: '1px solid #ddd',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                color: '#666'
                              }}
                              title="Pin message"
                            >
                              Pin
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBulletinMessage(message.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #ddd',
                              padding: '4px 8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              color: '#d9534f'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </>
            )}
          </div>
          
          {/* Message Compose Box - Bottom of messages */}
          <div className="bulletin-compose" style={{
            background: '#f8f9fa',
            borderTop: '1px solid #e0e0e0',
            padding: '15px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <textarea
              placeholder="Write your message..."
              value={newBulletinMessage}
              onChange={(e) => setNewBulletinMessage(e.target.value)}
              style={{
                minHeight: '60px',
                maxHeight: '120px',
                padding: '10px',
                border: '1px solid #e0e0e0',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                width: '100%'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCreateBulletinMessage}
                style={{
                  padding: '8px 20px',
                  background: '#FFB6D9',
                  color: 'white',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FF9FC7'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#FFB6D9'}
              >
                Post Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}
      
      </div> {/* End Main Content Area */}
    </div> {/* End Main Content Container */}
    {confirmDialog /* Retro confirm modal for destructive admin actions */}
  </div> // End Logged-In Container
); // End Main Return

} // End Component