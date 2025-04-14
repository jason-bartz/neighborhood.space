// LPPortal.jsx - COMPLETE CODE (Fix review submit ID, Refined Data Load Error Handling)
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, orderBy, addDoc, getDoc, Timestamp
} from "firebase/firestore";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword, // Using client-side create again
  GoogleAuthProvider, signOut, sendPasswordResetEmail, updatePassword, fetchSignInMethodsForEmail
} from "firebase/auth";
import { db, auth } from "./firebaseConfig.js";
import Papa from "papaparse";
import { saveAs } from "file-saver";

// --- Constants ---
const provider = new GoogleAuthProvider();
const ratingEmojis = { Favorite: "🌟", Consideration: "👍", Pass: "❌", Ineligible: "🚫" };
const VALID_ROLES = ['lp', 'admin', 'superAdmin'];

// --- Helper Components ---
function AuthInput({ type = "text", placeholder, value, onChange, required, minLength }) {
    const autoCompleteType = type === 'email' ? 'email' : type === 'password' ? (placeholder.toLowerCase().includes('new') ? 'new-password' : 'current-password') : 'off';
    return ( <input type={type} placeholder={placeholder} value={value} onChange={onChange} required={required} minLength={minLength} style={{ display: 'block', width: 'calc(100% - 20px)', padding: '10px', margin: '10px auto', border: '1px solid #7d7d7d', borderRadius: '0', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit', fontSize: '1em' }} autoComplete={autoCompleteType} /> );
}
function RetroButton({ onClick, children, style = {}, primary = false, disabled = false, type = "button" }) {
    const baseStyle = { padding: primary ? "10px 25px" : "8px 15px", cursor: disabled ? 'not-allowed' : 'pointer', background: primary ? "#FFD6EC" : "#E0E0E0", color: disabled ? '#888' : "black", border: disabled ? '2px inset #aaa' : '2px outset #aaa', borderRadius: '0', fontSize: '1em', fontWeight: 'bold', fontFamily: 'inherit', boxShadow: disabled ? 'none' : '1px 1px 1px #555', opacity: disabled ? 0.6 : 1, margin: '5px', };
    return <button type={type} onClick={onClick} style={{ ...baseStyle, ...style }} disabled={disabled}>{children}</button>;
}

// --- Main Component ---
export default function LPPortal({ onOpenGNFWebsite }) {

  // --- State Variables ---
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState("reviewPitches");
  const [activeAdminTab, setActiveAdminTab] = useState("userManagement");
  const [expandedPitchId, setExpandedPitchId] = useState(null);
  const [lpPitches, setLpPitches] = useState([]);
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [reviews, setReviews] = useState({});
  const [reviewFormData, setReviewFormData] = useState({});
  const [hidePassedReviews, setHidePassedReviews] = useState(false);
  const [reviewSearchTerm, setReviewSearchTerm] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [adminPitches, setAdminPitches] = useState([]);
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [allReviewsData, setAllReviewsData] = useState([]);
  const [adminChapterFilter, setAdminChapterFilter] = useState("");
  const [adminQuarterFilter, setAdminQuarterFilter] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [newUserInvite, setNewUserInvite] = useState({ name: "", email: "", role: "lp", chapter: "" });

  // --- Derived State (Roles) ---
  const isSuperAdmin = user?.role === "superAdmin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;
  const userChapter = user?.chapter;

  // --- Effects ---

  // Effect 1: Authentication Listener
  useEffect(() => {
    setIsLoadingAuth(true); const unsubscribe = onAuthStateChanged(auth, async (authUserData) => { if (authUserData) { try { const userDocRef = doc(db, "users", authUserData.uid); const userDocSnap = await getDoc(userDocRef); if (userDocSnap.exists()) { const userData = userDocSnap.data(); if (userData.role && VALID_ROLES.includes(userData.role)) { setUser({ uid: authUserData.uid, email: authUserData.email, ...userData }); setAuthError(""); if (userData.role === 'admin' && userData.chapter) { setNewUserInvite(prev => ({ ...prev, chapter: userData.chapter })); } } else { setUser(null); setAuthError("Account role invalid."); await signOut(auth); } } else { if (authUserData.providerData.some(p => p.providerId === GoogleAuthProvider.PROVIDER_ID)) { const invitationsRef = collection(db, "invitations"); const q = query(invitationsRef, where("email", "==", authUserData.email.toLowerCase()), where("used", "==", false)); const inviteSnap = await getDocs(q); if (!inviteSnap.empty) { const inviteDoc = inviteSnap.docs[0]; const inviteData = inviteDoc.data(); const newUserDocData = { uid: authUserData.uid, email: authUserData.email.toLowerCase(), name: inviteData.name || authUserData.displayName || "Invited User", role: inviteData.role, chapter: inviteData.chapter, createdAt: Timestamp.fromDate(new Date()) }; await setDoc(userDocRef, newUserDocData); await updateDoc(inviteDoc.ref, { used: true, usedAt: Timestamp.fromDate(new Date()), registeredUserId: authUserData.uid }); setUser(newUserDocData); setAuthError(""); if (newUserDocData.role === 'admin' && newUserDocData.chapter) { setNewUserInvite(prev => ({ ...prev, chapter: newUserDocData.chapter })); } } else { setUser(null); setAuthError("Google account not invited or invite used."); await signOut(auth); } } else { setUser(null); setAuthError("Account setup incomplete."); await signOut(auth); } } } catch (error) { console.error("Auth state change error:", error); setUser(null); setAuthError("Error verifying account."); await signOut(auth); } } else { setUser(null); setAuthError(""); setLpPitches([]); setAdminPitches([]); setReviews({}); setSelectedPitch(null); setReviewFormData({}); setUsers([]); setInvitations([]); setAllReviewsData([]); } setIsLoadingAuth(false); }); return () => unsubscribe();
  }, []);

  // --- Data Loading Functions (Using useCallback, improved error handling) ---
  const loadLPData = useCallback(async () => {
      if (!user) return;
      const chapterToQuery = isSuperAdmin ? null : userChapter;
      if (!chapterToQuery && !isSuperAdmin) { console.warn(`LPPortal: No chapter for LP ${user.email}`); setLpPitches([]); setReviews({}); return; }
      console.log(`LPPortal: Loading LP pitches for chapter: ${chapterToQuery || 'ALL'}`);
      let pitchQuery = chapterToQuery ? query(collection(db, "pitches"), where("chapter", "==", chapterToQuery), orderBy("createdAt", "desc")) : query(collection(db, "pitches"), orderBy("createdAt", "desc"));
      let pitchDocs = []; // Initialize outside try
      try {
          const pitchSnap = await getDocs(pitchQuery);
          pitchDocs = pitchSnap.docs.map(d => ({ id: d.id, ...d.data(), createdDate: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(d.data().createdAt || 0) }));
          setLpPitches(pitchDocs); // Set pitches state immediately after successful fetch
          console.log(`LPPortal: Successfully fetched ${pitchDocs.length} pitches for LP view.`);
      } catch (error) {
           console.error(`LPPortal: Error loading LP pitches for ${user.email} / chapter ${chapterToQuery}:`, error.code, error.message);
           setLpPitches([]); // Clear pitches on error
           setReviews({}); // Clear reviews too if pitches fail
           // Alert user specifically about pitch loading failure
           alert(`Error loading pitches: ${error.message}. Check console/rules/indexes.`);
           return; // Stop processing if pitches fail
      }

      // Try fetching reviews only if pitches loaded and user exists
      if (user && user.uid) {
        try {
            const reviewQuery = query(collection(db, "reviews"), where("reviewerId", "==", user.uid));
            const reviewSnap = await getDocs(reviewQuery);
            const rMap = {}; reviewSnap.forEach((d) => { rMap[d.data().pitchId] = d.data(); }); setReviews(rMap);
            console.log(`LPPortal: Fetched ${Object.keys(rMap).length} reviews for user ${user.email}.`);
        } catch (reviewError) {
             console.error(`LPPortal: Error loading reviews for user ${user.email}:`, reviewError.code, reviewError.message);
             setReviews({}); // Clear reviews on error, but don't alert again
             // Don't clear pitches here, they might have loaded successfully
        }
      } else {
          setReviews({}); // Clear reviews if no user
      }
  }, [user, isSuperAdmin, userChapter]);

  const loadAdminData = useCallback(async () => {
    if (!user || !isAdmin) return;
    const chapterForAdminQuery = isSuperAdmin ? null : userChapter;
    console.log(`LPPortal: Loading ADMIN data. User Chapter: ${userChapter}, IsSuper: ${isSuperAdmin}`);
    let success = true; // Flag to track if all loads succeed

    try { // Pitches
        console.log("LPPortal: Querying admin pitches...");
        let adminPitchQuery = chapterForAdminQuery ? query(collection(db, "pitches"), where("chapter", "==", chapterForAdminQuery), orderBy("createdAt", "desc")) : query(collection(db, "pitches"), orderBy("createdAt", "desc"));
        const adminPitchSnap = await getDocs(adminPitchQuery);
        const adminPitchDocs = adminPitchSnap.docs.map((d) => { const data = d.data(); const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || 0); const quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`; return { id: d.id, ...data, createdDate: date, quarter }; });
        setAdminPitches(adminPitchDocs);
        console.log(`LPPortal: Admin pitches loaded (${adminPitchDocs.length}).`);
    } catch (error) {
        console.error(`LPPortal: Error loading ADMIN pitches for ${user.email} / chapter ${chapterForAdminQuery}:`, error.code, error.message);
        setAdminPitches([]); success = false;
        alert(`Error loading admin pitches: ${error.message}. Check Rules/Indexes.`);
    }
    try { // Users (Fetch ALL for review summary regardless of admin chapter filter status)
        console.log("LPPortal: Querying ALL users for admin panel...");
        let usersQuery = query(collection(db, "users")); // Always fetch all for name lookup
        const usersSnap = await getDocs(usersQuery);
        const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data(), uid: d.id }));
        setUsers(usersList);
        console.log(`LPPortal: ALL users loaded (${usersSnap.docs.length}).`);
    } catch (error) {
        console.error(`LPPortal: Error loading ALL users for ${user.email}:`, error.code, error.message);
        setUsers([]); success = false;
        alert(`Error loading users: ${error.message}. Check Rules.`);
    }
    try { // Invitations
        console.log("LPPortal: Querying admin invitations...");
        let invitesQuery = chapterForAdminQuery ? query(collection(db, "invitations"), where("chapter", "==", chapterForAdminQuery), orderBy("createdAt", "desc")) : query(collection(db, "invitations"), orderBy("createdAt", "desc"));
        const invitesSnap = await getDocs(invitesQuery);
        setInvitations(invitesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        console.log(`LPPortal: Admin invitations loaded (${invitesSnap.docs.length}).`);
    } catch (error) {
        console.error(`LPPortal: Error loading ADMIN invitations for ${user.email} / chapter ${chapterForAdminQuery}:`, error.code, error.message);
        setInvitations([]); success = false;
        alert(`Error loading invitations: ${error.message}. Check Rules/Indexes.`);
    }
    try { // All Reviews
        console.log("LPPortal: Querying all reviews...");
        const allReviewsQuery = query(collection(db, "reviews"));
        const allReviewsSnap = await getDocs(allReviewsQuery);
        const allReviewsList = allReviewsSnap.docs.map(d => ({ reviewId: d.id, ...d.data() }));
        setAllReviewsData(allReviewsList);
        console.log(`LPPortal: All reviews loaded (${allReviewsList.length}).`);
    } catch (error) {
         console.error(`LPPortal: Error loading ALL reviews for ${user.email}:`, error.code, error.message);
         setAllReviewsData([]); success = false;
         alert(`Error loading reviews summary: ${error.message}. Check Rules.`);
    }

    if (success) { console.log(`LPPortal: Admin Data loading attempt finished successfully.`); }
    else { console.warn(`LPPortal: Admin Data loading attempt finished with errors.`); }

}, [user, isAdmin, isSuperAdmin, userChapter]);

  // Effect 2: Load Data when User state is valid
  useEffect(() => { if (!isLoadingAuth && user && user.uid && user.role) { loadLPData(); loadAdminData(); } else { if (!isLoadingAuth) { setLpPitches([]); setAdminPitches([]); setReviews({}); setSelectedPitch(null); setReviewFormData({}); setUsers([]); setInvitations([]); setAllReviewsData([]); } } }, [user, isLoadingAuth, loadLPData, loadAdminData]);

  // Effect 3: Form Data Reset/Update
  useEffect(() => { if (selectedPitch) { const userReview = reviews[selectedPitch.id]; console.log('LPPortal: Populating review form for Pitch ID:', selectedPitch?.id, 'User review data found:', userReview); if (userReview) { setReviewFormData({ pitchVideoRating: userReview.pitchVideoRating || "", businessModelRating: userReview.businessModelRating || "", productMarketFitRating: userReview.productMarketFitRating || "", overallLpRating: userReview.overallLpRating || "", comments: userReview.comments || "" }); } else { setReviewFormData({}); } } else { setReviewFormData({}); } }, [selectedPitch, reviews]);

  // --- Helper Functions ---
   const formatDate = (ts) => { /* ... (no change) ... */ if (!ts) return "No date"; try { const date = ts?.toDate ? ts.toDate() : new Date(ts); if (isNaN(date.getTime())) { throw new Error("Invalid date"); } return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (error) { console.error("Date format error:", error, ts); return "Invalid"; } };
   const generateInviteCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  // --- Handlers ---

  // Auth Handlers
   const handleEmailLogin = async () => { /* ... (no change) ... */ setAuthError(""); if (!email || !password) { setAuthError("Email/pass required."); return; } const loginEmail = email.trim().toLowerCase(); try { await signInWithEmailAndPassword(auth, loginEmail, password); setEmail(""); setPassword(""); } catch (err) { console.error("LPPortal: Email Login Error:", err.code, err.message); if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(err.code)) { setAuthError("Invalid credentials or user not found."); } else { setAuthError("Login error."); } } };
   const handleGoogleLogin = async () => { /* ... (no change) ... */ try { setAuthError(""); await signInWithPopup(auth, provider); } catch (err) { console.error("LPPortal: Google Login Error:", err); if (err.code === 'auth/popup-closed-by-user') {} else { setAuthError("Google login failed."); } } };
   const handleSignOut = async () => { /* ... (no change) ... */ try { await signOut(auth); } catch (error) { console.error("LPPortal: Sign out Error:", error); alert("Sign out failed."); } };
   const handleRegisterEmail = async () => { /* ... (no change) ... */ setAuthError(""); if (!name.trim()) { setAuthError("Name required."); return; } if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setAuthError("Valid email required."); return; } if (password.length < 6) { setAuthError("Pass min 6 chars."); return; } if (password !== confirmPassword) { setAuthError("Passwords don't match."); return; } if (!inviteCode.trim()) { setAuthError("Invite code required."); return; } const registerEmail = email.trim().toLowerCase(); const registerInviteCode = inviteCode.trim().toUpperCase(); try { const invitationsRef = collection(db, "invitations"); const q = query( invitationsRef, where("code", "==", registerInviteCode), where("email", "==", registerEmail), where("used", "==", false) ); const querySnapshot = await getDocs(q); if (querySnapshot.empty) { setAuthError("Invalid invite code, email mismatch, or code already used."); return; } const inviteDoc = querySnapshot.docs[0]; const inviteData = inviteDoc.data(); const userCredential = await createUserWithEmailAndPassword(auth, registerEmail, password); const newAuthUser = userCredential.user; await setDoc(doc(db, "users", newAuthUser.uid), { uid: newAuthUser.uid, email: registerEmail, name: name.trim(), role: inviteData.role, chapter: inviteData.chapter, createdAt: Timestamp.fromDate(new Date()) }); await updateDoc(inviteDoc.ref, { used: true, usedAt: Timestamp.fromDate(new Date()), registeredUserId: newAuthUser.uid }); setName(""); setEmail(""); setPassword(""); setConfirmPassword(""); setInviteCode(""); alert("Registration successful! Logged in."); } catch (error) { console.error("LPPortal: Registration Error:", error); if (error.code === 'auth/email-already-in-use') { setAuthError("Email already registered."); } else if (error.code === 'auth/weak-password') { setAuthError("Password too weak."); } else if (error.code === 'auth/invalid-email') { setAuthError("Invalid email."); } else if (error.code === 'auth/admin-restricted-operation') { setAuthError("Registration disabled by admin."); } else { setAuthError(`Registration failed: ${error.message}`); } } };

   // LP Review Handlers
   const handleReviewSubmit = async (e) => { // CORRECTED reviewId definition AGAIN
    e.preventDefault();
    if (!user || !selectedPitch) {
        console.error("Review submit cancelled: Missing user or selected pitch.");
        alert("Cannot submit review: User or Pitch data missing."); // User-facing alert
        return;
    }

    // --- FIX: Ensure correct JavaScript template literal syntax using backticks ` ` ---
    const reviewId = `${user.uid}_${selectedPitch.id}`;
    // -----------------------------------------------------------------------------

    // Double-check the generated ID before proceeding (for debugging)
    console.log(`LPPortal: Attempting to submit/update review with ID: ${reviewId} by user ${user.uid} (Role: ${user.role})`);
    if (!reviewId || reviewId.includes('<span') || !selectedPitch.id || !user.uid) {
        console.error("LPPortal: Invalid reviewId generated!", reviewId);
        alert("Failed submit. Critical error generating review ID.");
        return; // Stop if ID is clearly wrong
    }


    const newReview = {
        reviewerId: user.uid,
        pitchId: selectedPitch.id,
        chapter: selectedPitch.chapter || user.chapter || "Unknown", // Include chapter info
        ...reviewFormData, // Spread existing form data
        submittedAt: Timestamp.fromDate(new Date()) // Use Firestore Timestamp
    };

    try {
        // Use the corrected reviewId variable
        await setDoc(doc(db, "reviews", reviewId), newReview, { merge: true });

        // Update local state optimistically
        setReviews((prev) => ({ ...prev, [selectedPitch.id]: newReview }));
        setSelectedPitch(null); // Close detail view
        setReviewFormData({}); // Reset form
        alert("Review submitted successfully!");
        console.log(`LPPortal: Review ${reviewId} submitted successfully.`);

     } catch (error) {
         console.error(`LPPortal: Error submitting review ${reviewId}:`, error.code, error.message);
         // Provide more specific feedback based on potential Firestore rule errors
         if (error.code === 'permission-denied') {
              alert(`Failed submit: Permission Denied. Please check Firestore rules allow role '${user.role}' to write to /reviews/${reviewId}`);
         } else {
              alert(`Failed submit. Error: ${error.message}.`);
         }
     }
 };
   const handleReviewFormChange = (e) => { /* ... (no change) ... */ const { name, value } = e.target; setReviewFormData((prev) => ({ ...prev, [name]: value })); };
   const selectPitchForReview = (pitch) => { /* ... (no change) ... */ setSelectedPitch(pitch); };

   // Admin Panel Handlers
   const handleInviteSubmit = async () => { /* ... (no change) ... */ if (!user || !isAdmin) return; setAuthError(''); if (!newUserInvite.name || !newUserInvite.email) { setAuthError("Name/email required."); return; } const chapterForInvite = isSuperAdmin ? newUserInvite.chapter : userChapter; if (!chapterForInvite) { setAuthError(isSuperAdmin ? "Select chapter." : "Admin chapter missing."); return; } const inviteEmailLower = newUserInvite.email.toLowerCase().trim(); const inviteName = newUserInvite.name.trim(); const inviteRole = newUserInvite.role; try { const methods = await fetchSignInMethodsForEmail(auth, inviteEmailLower); if (methods.length > 0) { setAuthError(`Account exists for ${inviteEmailLower}.`); return; } const usersRef = collection(db, "users"); const userQuery = query(usersRef, where("email", "==", inviteEmailLower)); const existingUserSnap = await getDocs(userQuery); if (!existingUserSnap.empty) { setAuthError(`User profile exists.`); return; } const invitationsRef = collection(db, "invitations"); const q = query( invitationsRef, where("email", "==", inviteEmailLower), where("used", "==", false) ); const existingInvitesSnapshot = await getDocs(q); if (!existingInvitesSnapshot.empty) { setAuthError(`Active invite exists.`); return; } const inviteCodeValue = generateInviteCode(); await addDoc(collection(db, "invitations"), { email: inviteEmailLower, name: inviteName, role: inviteRole, chapter: chapterForInvite, code: inviteCodeValue, createdAt: Timestamp.fromDate(new Date()), createdBy: user.uid, used: false, }); setNewUserInvite({ name: "", email: "", role: "lp", chapter: isSuperAdmin ? "" : userChapter }); loadAdminData(); alert(`Invitation logged for ${inviteEmailLower}.\nShare Invite Code: ${inviteCodeValue}`); } catch (error) { console.error("Error creating invitation:", error); setAuthError(`Invite failed: ${error.message}`); } };
    const handleDeleteUser = async (userIdToDelete, userEmailToDelete) => { /* ... (Detailed error added) ... */ console.log("Attempting delete user:", userIdToDelete, userEmailToDelete); if (!userIdToDelete) { alert("Delete failed: Missing user ID."); return; } if (userIdToDelete === user.uid) { alert("Cannot delete self."); return; } if (window.confirm(`DELETE user ${userEmailToDelete || userIdToDelete}? (Auth user remains)`)) { try { await deleteDoc(doc(db, "users", userIdToDelete)); alert(`User deleted.`); loadAdminData(); } catch (error) { console.error("Error deleting user:", error); alert(`Delete failed: ${error.message}`); } } };
    const handleUpdateUser = async (userIdToUpdate, field, value) => { /* ... (Detailed error added) ... */ if (userIdToUpdate === user.uid && !isSuperAdmin && (field === 'role' || field === 'chapter')) { alert("Cannot change own role/chapter."); loadAdminData(); return; } if (field === 'role' && value === 'superAdmin' && !isSuperAdmin) { alert("Only SuperAdmins can assign role."); loadAdminData(); return; } try { await updateDoc(doc(db, "users", userIdToUpdate), { [field]: value }); loadAdminData(); } catch (error) { console.error("Error updating user:", error); alert(`Update failed: ${error.message}`); loadAdminData(); } };
    const handleDeleteInvitation = async (inviteIdToDelete, inviteEmail) => { /* ... (Detailed error added) ... */ if (window.confirm(`Delete invitation for ${inviteEmail}? Prevents code use.`)) { try { await deleteDoc(doc(db, "invitations", inviteIdToDelete)); alert(`Invitation deleted.`); loadAdminData(); } catch (error) { console.error("Error deleting invitation:", error); alert(`Delete failed: ${error.message}`); } } };
    const handleAssignWinner = async (pitchId, currentWinnerStatus) => { /* ... (Detailed error added, uses useCallback loaders) ... */ const action = currentWinnerStatus ? "Remove winner" : "Assign winner"; const pitchToUpdate = [...lpPitches, ...adminPitches].find(p => p.id === pitchId); if (!pitchToUpdate) { console.error("Pitch not found:", pitchId); return; } if (window.confirm(`${action} status for ${pitchToUpdate.businessName}?`)) { try { await updateDoc(doc(db, "pitches", pitchId), { isWinner: !currentWinnerStatus }); loadLPData(); loadAdminData(); } catch (error) { console.error("Assign Winner Error:", error); alert(`Update failed: ${error.message}. Check Rules.`); } } };
    const handleAdminPitchExport = () => { /* ... (no change) ... */ const filteredAdminPitches = adminFilteredPitches; if (filteredAdminPitches.length === 0) { alert("No pitches to export."); return; } const rows = filteredAdminPitches.map((p) => ({ /* ... fields ... */ })); try { const csv = Papa.unparse(rows, { header: true }); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const filename = `gnf_admin_pitches_${adminChapterFilter || 'all'}_${adminQuarterFilter || 'all'}.csv`; saveAs(blob, filename); } catch (error) { console.error("CSV Export Error:", error); alert("Export failed."); } };
    const handleAdminPasswordReset = async (emailToReset) => { /* ... (no change) ... */ if (!emailToReset) { alert("User email missing."); return; } if (window.confirm(`Send password reset email to ${emailToReset}?`)) { try { await sendPasswordResetEmail(auth, emailToReset); alert(`Password reset email sent to ${emailToReset}.`); } catch (error) { console.error("Error sending reset email:", error); alert(`Failed reset send: ${error.message}`); } } };

   // --- Memos for derived data ---
    const lpFilteredPitches = useMemo(() => { /* ... (no change) ... */ if (!Array.isArray(lpPitches)) return []; return lpPitches.filter((p) => { const review = reviews[p.id]; const matchesSearch = !reviewSearchTerm || p.businessName?.toLowerCase().includes(reviewSearchTerm.toLowerCase()) || p.founderName?.toLowerCase().includes(reviewSearchTerm.toLowerCase()); if (!matchesSearch) return false; if (reviewFilter === "reviewed" && !review) return false; if (reviewFilter === "notReviewed" && review) return false; if (reviewFilter === "favorites" && (!review || review.overallLpRating !== "Favorite")) return false; if (hidePassedReviews && review && ["Pass", "Ineligible"].includes(review.overallLpRating)) return false; return true; }); }, [lpPitches, reviews, reviewSearchTerm, reviewFilter, hidePassedReviews]);
    const adminFilteredPitches = useMemo(() => { /* ... (no change) ... */ if (!Array.isArray(adminPitches)) return []; return adminPitches.filter((p) => { const mq = !adminQuarterFilter || p.quarter === adminQuarterFilter; const mc = (!isSuperAdmin || !adminChapterFilter) || p.chapter === adminChapterFilter; const ms = !adminSearch || p.businessName?.toLowerCase().includes(adminSearch.toLowerCase()) || p.founderName?.toLowerCase().includes(adminSearch.toLowerCase()) || p.email?.toLowerCase().includes(adminSearch.toLowerCase()); return mq && mc && ms; }); }, [adminPitches, adminQuarterFilter, adminChapterFilter, adminSearch, isSuperAdmin]);
    const getGroupedReviewsForAdmin = useCallback((pitchId) => { // Corrected dependency
         if (!allReviewsData || allReviewsData.length === 0) return { count: 0 };
         const relevantReviews = allReviewsData.filter(r => r.pitchId === pitchId);
         if (relevantReviews.length === 0) return { count: 0 };
         const grouped = relevantReviews.reduce((acc, review) => {
             const rating = review.overallLpRating || 'No Rating';
             if (!acc[rating]) { acc[rating] = { count: 0, reviewers: [] }; }
             acc[rating].count++;
             // Use 'users' state which is now fetched for all roles in loadAdminData
             const reviewerInfo = users.find(u => u.uid === review.reviewerId || u.id === review.reviewerId);
             acc[rating].reviewers.push(reviewerInfo ? reviewerInfo.name || reviewerInfo.email : (review.reviewerId ? review.reviewerId.substring(0,6) : 'Unknown'));
             return acc;
         }, {});
         grouped.count = relevantReviews.length;
         return grouped;
     }, [allReviewsData, users]); // Depend on allReviewsData and users state
    const sortedUsers = useMemo(() => users.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)), [users]);
    const sortedInvitations = useMemo(() => invitations.sort((a, b) => (b.createdAt?.toDate()?.getTime() || 0) - (a.createdAt?.toDate()?.getTime() || 0)), [invitations]);


  // --- Render Logic ---

  if (isLoadingAuth) { return <div style={{ padding: '50px', textAlign: 'center', fontFamily: '"MS Sans Serif", sans-serif' }}>Verifying access...</div>; }

  // --- Login/Register Screen ---
  if (!user) { return ( <div style={{ maxWidth: "450px", margin: "40px auto", padding: "20px 30px", border: "2px outset #ccc", boxShadow: 'inset 1px 1px 0px #fff, inset -1px -1px 0px #888', textAlign: "center", background: '#E0E0E0', fontFamily: '"MS Sans Serif", "Pixel Arial", sans-serif', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}> <h2 style={{ borderBottom: '2px solid #888', paddingBottom: '10px', marginBottom: '20px', color: '#222' }}>LP Portal</h2> <div style={{ marginBottom: "25px" }}> <RetroButton onClick={() => { setAuthMode("login"); setAuthError(""); }} style={{ background: authMode === "login" ? "#FFD6EC" : "#E0E0E0", border: authMode === "login" ? "2px inset #aaa" : "2px outset #aaa" }}>Login</RetroButton> <RetroButton onClick={() => { setAuthMode("register"); setAuthError(""); }} style={{ background: authMode === "register" ? "#FFD6EC" : "#E0E0E0", border: authMode === "register" ? "2px inset #aaa" : "2px outset #aaa"}}>Register</RetroButton> </div> <div style={{ margin: "25px 0", paddingTop: '20px', borderTop: '1px solid #888' }}> <div style={{ marginBottom: "15px", color: '#333', fontWeight: 'bold' }}>Login with:</div> <button onClick={handleGoogleLogin} title="Login with Google" style={{ background: "transparent", border: "none", cursor: "pointer", padding: "0", display: 'inline-block' }}> <img src="/assets/Google.webp" alt="Google logo" style={{ height: "60px", width: "auto", verticalAlign: 'middle' }} /> </button> </div> {authError && ( <div style={{ color: "#880000", background: '#FFDDDD', border: '1px solid #CC0000', padding: '10px', marginBottom: "20px", marginTop: '10px', fontSize: '0.9em', textAlign: 'left' }}> <strong style={{marginRight: '5px'}}>Error:</strong>{authError} </div> )} <div style={{ paddingTop: '20px', borderTop: '1px solid #888', marginTop: '25px' }}> <div style={{ marginBottom: "15px", color: '#333', fontWeight: 'bold' }}> {authMode === 'login' ? 'Login with Email:' : 'Register with Invite Code:'} </div> {authMode === 'login' && ( <> <AuthInput type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required /> <AuthInput type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required /> <RetroButton onClick={handleEmailLogin} primary style={{ margin: "20px auto 5px auto", display: 'block', width: "calc(100% - 20px)"}}>Sign In</RetroButton> </> )} {authMode === 'register' && ( <> <AuthInput placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required /> <AuthInput type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required /> <AuthInput type="password" placeholder="Choose Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /> <AuthInput type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /> <AuthInput placeholder="Invitation Code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required /> <RetroButton onClick={handleRegisterEmail} primary style={{ margin: "20px auto 5px auto", display: 'block', width: "calc(100% - 20px)"}}>Register Account</RetroButton> <p style={{ fontSize: "0.85em", color: "#555", marginTop: "15px" }}>Requires code shared by admin.</p> </> )} </div> <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #888', fontSize: '0.9em', color: '#444', lineHeight: '1.4' }}> <p> Interested in becoming a Limited Partner? <br /> <a href="https://docs.google.com/forms/d/e/1FAIpQLScKxNP8Kf1bSzl1uay3G1ewyOgRUKpLRDkiGMuSyJns_cBksQ/viewform" target="_blank" rel="noopener noreferrer" style={{ color: "#0000EE", textDecoration: 'underline', fontWeight: 'bold' }} > Apply Here </a> </p> </div> </div> ); }

  // --- Logged-In View ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: '"MS Sans Serif", "Pixel Arial", sans-serif' }}>
        {/* Header */}
        <div style={{ borderBottom: '2px outset #ccc', padding: '5px 10px', marginBottom: '10px', background: '#eee', flexShrink: 0 }}> <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{user?.chapter || "GNF"} Chapter: LP Portal</div> <div style={{ fontSize: '0.9em', color: '#333' }}> Welcome, {user?.name || user?.email}! ({user?.role}) </div> </div>
        {/* Top Level Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #888', marginBottom: '15px', flexShrink: 0 }}> <button onClick={() => setActiveTab('reviewPitches')} style={{ padding: '8px 15px', border: '1px solid #888', borderBottom: activeTab === 'reviewPitches' ? '1px solid #E0E0E0' : '1px solid #888', background: activeTab === 'reviewPitches' ? '#E0E0E0' : '#ccc', marginBottom: '-1px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: activeTab === 'reviewPitches' ? 'bold' : 'normal' }}> Review Pitches </button> {isAdmin && ( <button onClick={() => setActiveTab('adminPanel')} style={{ padding: '8px 15px', border: '1px solid #888', borderBottom: activeTab === 'adminPanel' ? '1px solid #E0E0E0' : '1px solid #888', background: activeTab === 'adminPanel' ? '#E0E0E0' : '#ccc', marginBottom: '-1px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: activeTab === 'adminPanel' ? 'bold' : 'normal' }}> Admin Panel </button> )} <div style={{ flexGrow: 1, borderBottom: '1px solid #888', marginBottom: '-1px'}}></div> <RetroButton onClick={handleSignOut} style={{ padding: "4px 10px", fontSize: "13px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "4px", height: "28px", alignSelf: 'center', marginBottom: '5px' }}> Logout </RetroButton> </div>
        {/* Main Content Area */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0 10px 10px 10px' }}>
            {/* --- Review Pitches Tab Content --- */}
            {activeTab === 'reviewPitches' && ( /* ... (JSX unchanged) ... */ <> {!selectedPitch ? ( <> <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center", flexWrap: "wrap", background: "#f0f0f0", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}> <input type="text" placeholder="🔍 Search name/business" value={reviewSearchTerm} onChange={(e) => setReviewSearchTerm(e.target.value)} style={{ padding: "6px", fontSize: "14px", flexGrow: 1, minWidth: "150px", height: "28px", border: "1px solid #bbb", borderRadius: "0px", boxSizing: "border-box", fontFamily: 'inherit' }} /> <select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)} style={{ padding: "0 6px", fontSize: "14px", height: "28px", border: "1px solid #bbb", borderRadius: "0px", backgroundColor: "#fff", boxSizing: "border-box", cursor: 'pointer', fontFamily: 'inherit' }}> <option value="all">🧼 All</option> <option value="reviewed">✅ Reviewed</option> <option value="notReviewed">🆕 Not Reviewed</option> <option value="favorites">🌟 Favorites Only</option> </select> <RetroButton onClick={() => setHidePassedReviews(!hidePassedReviews)} style={{ background: "#eee", padding: "6px 10px", height: "28px", whiteSpace: "nowrap" }}> {hidePassedReviews ? "🔓 Show All" : "🙈 Hide Pass"} </RetroButton> </div> {lpFilteredPitches.length === 0 ? ( <div style={{ textAlign: "center", padding: "40px 0", color: "#666" }}>No pitches found.</div> ) : ( <div> {lpFilteredPitches.map((p) => { const review = reviews[p.id]; return ( <div key={p.id} onClick={() => selectPitchForReview(p)} style={{ background: "#fff", padding: "12px", marginBottom: "12px", border: review ? "2px solid #a5d6a7" : "1px solid #ccc", borderRadius: "3px", cursor: "pointer", transition: 'background-color 0.2s ease', opacity: (hidePassedReviews && review && ["Pass", "Ineligible"].includes(review.overallLpRating)) ? 0.6 : 1, boxShadow: '1px 1px 2px #ccc' }} title={`Review status: ${review ? (ratingEmojis[review.overallLpRating] || '') + ' ' + review.overallLpRating : 'Not Reviewed'}`}> <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}> <div> <span style={{fontWeight: 'bold'}}>{p.businessName}</span> <span style={{fontWeight: 'normal', color: '#555'}}>– {p.founderName}</span> {p.isWinner && <span style={{ marginLeft: '10px', color: 'green', fontWeight: 'bold', fontSize: '0.9em' }}>🏆 Grant Winner</span>} </div> {review && (<div style={{ fontSize: "13px", fontWeight: 'bold', color: review.overallLpRating === 'Favorite' ? '#e65100' : '#388e3c', border: '1px solid', borderColor: review.overallLpRating === 'Favorite' ? '#ffe0b2' : '#c8e6c9', background: review.overallLpRating === 'Favorite' ? '#fff3e0' : '#e8f5e9', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}> {ratingEmojis[review.overallLpRating]} {review.overallLpRating}</div> )} </div> <div style={{fontSize: '0.9em', color: '#444', margin: '4px 0', maxHeight: '3.6em', overflow: 'hidden'}}>{p.valueProp || "No value prop"}</div> <div style={{fontSize: "12px", marginTop: "6px", color: "#666" }}> Submitted: {formatDate(p.createdAt)} | Chapter: {p.chapter || 'N/A'} </div> </div> ); })} </div> )} </> ) : ( <div style={{ display: "flex", gap: "20px", flexDirection: 'row', flexWrap: 'wrap', height: '100%' }}> <div style={{ flex: '1 1 300px', borderRight: '1px solid #eee', paddingRight: '20px', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}> <RetroButton onClick={() => setSelectedPitch(null)} style={{ marginBottom: '15px' }}>← Back to List</RetroButton> <h3 style={{marginTop: 0}}>{selectedPitch.businessName}</h3> {selectedPitch.isWinner && <p style={{ color: 'green', fontWeight: 'bold' }}>🏆 Grant Winner</p>} <p><strong>Founder:</strong> {selectedPitch.founderName}</p> <p><strong>Email:</strong> <a href={`mailto:${selectedPitch.email}`}>{selectedPitch.email}</a></p> <p><strong>Website:</strong> {selectedPitch.website ? <a href={selectedPitch.website.startsWith('http') ? selectedPitch.website : `//${selectedPitch.website}`} target="_blank" rel="noopener noreferrer">{selectedPitch.website}</a> : "N/A"}</p> <p><strong>Video:</strong> {selectedPitch.pitchVideoUrl ? <a href={selectedPitch.pitchVideoUrl} target="_blank" rel="noopener noreferrer" style={{color: 'blue', textDecoration:'underline'}}>Watch Pitch Video</a> : "Not provided"}</p> <hr style={{margin: '15px 0', borderTop: '1px solid #eee', borderBottom: 'none'}} /> <p><strong>Value Prop:</strong> {selectedPitch.valueProp}</p> <p><strong>Problem:</strong> {selectedPitch.problem}</p> <p><strong>Solution:</strong> {selectedPitch.solution}</p> <p><strong>Business Model:</strong> {selectedPitch.businessModel}</p> <p><strong>Paying Customers:</strong> {selectedPitch.hasPayingCustomers ? 'Yes' : 'No'}</p> <p><strong>Grant Use:</strong> {selectedPitch.grantUsePlan}</p> <hr style={{margin: '15px 0', borderTop: '1px solid #eee', borderBottom: 'none'}} /> <p><strong>Zip:</strong> {selectedPitch.zipCode}</p> <p><strong>Tags:</strong> {selectedPitch.selfIdentification?.join(", ") || "N/A"}</p> </div> <div style={{ flex: '1 1 300px', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)', paddingLeft: '10px'}}> <h4 style={{marginTop: 0}}>{reviews[selectedPitch.id] ? 'Edit Your Review' : 'Submit Your Review'}</h4> <form onSubmit={handleReviewSubmit}> <div style={{marginBottom: '15px'}}> <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>📼 Pitch Video</label> <select name="pitchVideoRating" value={reviewFormData.pitchVideoRating || ""} onChange={handleReviewFormChange} required style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '0px', fontFamily:'inherit'}}> <option value="" disabled>-- Rate Video --</option> <option value="Strong">Strong</option> <option value="Average">Average</option> <option value="Poor">Poor</option> </select> </div> <div style={{marginBottom: '15px'}}> <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>📈 Business Model</label> <select name="businessModelRating" value={reviewFormData.businessModelRating || ""} onChange={handleReviewFormChange} required style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '0px', fontFamily:'inherit'}}> <option value="" disabled>-- Rate Model --</option> <option value="Strong">Strong</option> <option value="Average">Average</option> <option value="Poor">Poor</option> </select> </div> <div style={{marginBottom: '15px'}}> <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>🧩 Product Market Fit</label> <select name="productMarketFitRating" value={reviewFormData.productMarketFitRating || ""} onChange={handleReviewFormChange} required style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '0px', fontFamily:'inherit'}}> <option value="" disabled>-- Rate Fit --</option> <option value="Strong">Strong</option> <option value="Average">Average</option> <option value="Poor">Poor</option> </select> </div> <div style={{marginBottom: '15px'}}> <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>🌟 Overall LP Rating</label> <select name="overallLpRating" value={reviewFormData.overallLpRating || ""} onChange={handleReviewFormChange} required style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '0px', fontFamily:'inherit'}}> <option value="" disabled>-- Select Overall --</option> <option value="Favorite">🌟 Favorite</option> <option value="Consideration">👍 Consideration</option> <option value="Pass">❌ Pass</option> <option value="Ineligible">🚫 Ineligible</option> </select> </div> <div style={{marginBottom: '15px'}}> <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Private Comments (for GNF team):</label> <textarea name="comments" rows="5" style={{ width: "calc(100% - 18px)", padding: '8px', border: '1px solid #ccc', borderRadius: '0px', fontFamily:'inherit' }} value={reviewFormData.comments || ""} onChange={handleReviewFormChange} /> </div> <RetroButton type="submit" primary>{reviews[selectedPitch.id] ? 'Update Review' : 'Submit Review'}</RetroButton> </form> </div> </div> )} </>
            )}

             {/* --- Admin Panel Tab Content --- */}
             {activeTab === 'adminPanel' && isAdmin && (
                <div>
                    {/* Admin Sub-Tabs */}
                     <div style={{ display: 'flex', borderBottom: '1px solid #aaa', marginBottom: '15px', marginTop: '-5px' }}> <button onClick={() => setActiveAdminTab('pitchesAndReviews')} style={{ padding: '6px 12px', border: 'none', borderBottom: activeAdminTab === 'pitchesAndReviews' ? '3px solid #FFD6EC' : '3px solid transparent', background: 'transparent', cursor: 'pointer', fontWeight: activeAdminTab === 'pitchesAndReviews' ? 'bold' : 'normal'}}>Pitches & Reviews</button> <button onClick={() => setActiveAdminTab('userManagement')} style={{ padding: '6px 12px', border: 'none', borderBottom: activeAdminTab === 'userManagement' ? '3px solid #FFD6EC' : '3px solid transparent', background: 'transparent', cursor: 'pointer', fontWeight: activeAdminTab === 'userManagement' ? 'bold' : 'normal'}}>User Management</button> {isSuperAdmin && <button onClick={() => setActiveAdminTab('superAdminTools')} style={{ padding: '6px 12px', border: 'none', borderBottom: activeAdminTab === 'superAdminTools' ? '3px solid #FFD6EC' : '3px solid transparent', background: 'transparent', cursor: 'pointer', fontWeight: activeAdminTab === 'superAdminTools' ? 'bold' : 'normal'}}>Super Admin Tools</button>} </div>
                    {/* Admin: Pitches & Reviews Sub-Tab */}
                    {activeAdminTab === 'pitchesAndReviews' && ( /* ... (JSX unchanged) ... */ <> <h4>🎯 Admin: Pitches + LP Reviews Summary</h4> <div style={{ display: "flex", flexWrap: 'wrap', gap: "10px", marginBottom: "20px", paddingBottom: '15px', borderBottom: '1px dashed #eee', background: '#f8f8f8', padding: '10px', borderRadius: '4px' }}> {isSuperAdmin && ( <select value={adminChapterFilter} onChange={(e) => setAdminChapterFilter(e.target.value)} style={{ padding: '8px', height: '38px', border:'1px solid #ccc', fontFamily:'inherit' }}> <option value="">All Chapters</option> {[...new Set(adminPitches.map((p) => p.chapter).filter(Boolean))].sort().map((c) => (<option key={c} value={c}>{c}</option>))} </select> )} <select value={adminQuarterFilter} onChange={(e) => setAdminQuarterFilter(e.target.value)} style={{ padding: '8px', height: '38px', border:'1px solid #ccc', fontFamily:'inherit' }}> <option value="">All Quarters</option> {[...new Set(adminPitches.map((p) => p.quarter).filter(Boolean))].sort((a, b) => { const [aQ, aY] = a.split(' '); const [bQ, bY] = b.split(' '); if (bY !== aY) return bY - aY; return bQ.substring(1) - aQ.substring(1); }).map((q) => ( <option key={q} value={q}>{q}</option>))} </select> <input type="text" placeholder="Search name, business, email..." value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} style={{ flexGrow: 1, padding: '8px', height: '22px', border: '1px solid #ccc', fontFamily:'inherit' }} /> <RetroButton onClick={handleAdminPitchExport}>📄 Export CSV</RetroButton> </div> {adminFilteredPitches.length === 0 && <p>No pitches match filters.</p>} {adminFilteredPitches.map((p) => { const groupedReviews = getGroupedReviewsForAdmin(p.id); return ( <div key={p.id} style={{ padding: "15px", border: "1px solid #ccc", marginBottom: "15px", borderRadius: "6px", background: p.isWinner ? "#d7fddc" : "#fff", boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}> <div style={{ flexGrow: 1 }}> <strong style={{ fontSize: '1.1em' }}>{p.businessName || "N/A"}</strong> by {p.founderName || "N/A"} <br /> <em style={{ color: '#555' }}>{p.valueProp?.substring(0, 100)}{p.valueProp?.length > 100 ? '...' : ''}</em> <br /> <span style={{ fontSize: '0.9em', color: '#777' }}> Chapter: {p.chapter || "N/A"} | Q: {p.quarter || "N/A"} | Submitted: {formatDate(p.createdDate)} </span> {p.isWinner && <span style={{ marginLeft: '10px', color: 'green', fontWeight: 'bold' }}>🏆 Grant Winner</span>} </div> <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}> <RetroButton onClick={() => handleAssignWinner(p.id, p.isWinner)} style={{ background: p.isWinner ? '#ffcdd2' : '#c8e6c9', color: p.isWinner ? '#b71c1c' : '#1b5e20', border: p.isWinner ? '1px solid #ef9a9a' : '1px solid #a5d6a7', padding: '5px 10px' }}> {p.isWinner ? '❌ Remove Winner' : '🏆 Assign Winner'} </RetroButton> <RetroButton onClick={() => setExpandedPitchId(expandedPitchId === p.id ? null : p.id)} style={{padding: '5px 10px'}}> {expandedPitchId === p.id ? 'Hide Details' : 'View Details'} </RetroButton> </div> </div> {groupedReviews.count > 0 && ( <div style={{ marginTop: "10px", paddingTop: '10px', borderTop: '1px dashed #eee', fontSize: "13px", color: '#444' }}> <strong>LP Reviews ({groupedReviews.count}):</strong> {Object.entries(groupedReviews) .filter(([key]) => key !== 'count').sort(([, a], [, b]) => b.count - a.count).map(([rating, data]) => ( <span key={rating} style={{ marginLeft: '10px', border: '1px solid #eee', padding: '2px 5px', borderRadius: '3px', background: '#f9f9f9', display: 'inline-block', marginBottom: '3px' }} title={data.reviewers.join(', ')}> {ratingEmojis[rating] || ''} {rating}: {data.count} </span> ))} </div> )} {expandedPitchId === p.id && ( <div style={{ marginTop: "15px", paddingTop: '15px', borderTop: '1px solid #eee', fontSize: "14px", lineHeight: '1.6', background: '#fdfdfd', padding: '10px', borderRadius: '4px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}> <strong>Full Pitch Details:</strong><br /> Name: {p.founderName}<br /> Email: {p.email}<br /> Zip: {p.zipCode}<br /> Bio: {p.bio}<br /> Value Prop: {p.valueProp}<br /> Problem: {p.problem}<br /> Solution: {p.solution}<br /> Model: {p.businessModel}<br /> Use of Funds: {p.grantUsePlan}<br /> Paying Customers: {p.hasPayingCustomers ? 'Yes':'No'}<br /> Website: {p.website}<br /> Heard About: {p.heardAbout}<br /> Video URL: {p.pitchVideoUrl}<br /> Video File: {p.pitchVideoFile}<br /> </div> )} </div> ); })} </>
                    )}
                     {/* Admin: User Management Sub-Tab */}
                    {activeAdminTab === 'userManagement' && (
                         <>
                             <h4>👥 User Management</h4>
                             {/* Invite Section */}
                             <div style={{ marginBottom: "25px", border: "1px solid #ccc", padding: "20px", borderRadius: "5px", background: '#f9f9f9' }}> <h5 style={{ marginTop: 0, marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>📨 Invite New User</h5> {authError && ( <div style={{ color: "red", background: '#ffebee', border: '1px solid red', padding: '10px', marginBottom: "16px", borderRadius: '4px', fontSize: '0.9em' }}>{authError}</div>)} <div style={{ display: "flex", flexWrap: 'wrap', gap: "10px", alignItems: 'center' }}> <input type="text" placeholder="Full Name" value={newUserInvite.name} onChange={(e) => setNewUserInvite({ ...newUserInvite, name: e.target.value })} style={{ padding: "8px", height: "20px", flexBasis: '200px', flexGrow: 1, border:'1px solid #ccc' }} /> <input type="email" placeholder="Email Address" value={newUserInvite.email} onChange={(e) => setNewUserInvite({ ...newUserInvite, email: e.target.value })} style={{ padding: "8px", height: "20px", flexBasis: '250px', flexGrow: 1, border:'1px solid #ccc' }} /> <select value={newUserInvite.role} onChange={(e) => setNewUserInvite({ ...newUserInvite, role: e.target.value })} style={{ padding: "8px", height: "36px", flexBasis: '120px', border:'1px solid #ccc' }}> <option value="lp">LP</option> <option value="admin">Admin</option> {isSuperAdmin && <option value="superAdmin">SuperAdmin</option>} </select> {isSuperAdmin ? ( <select value={newUserInvite.chapter} required onChange={(e) => setNewUserInvite({ ...newUserInvite, chapter: e.target.value })} style={{ padding: "8px", height: "36px", flexBasis: '180px', border:'1px solid #ccc' }}> <option value="">-- Select Chapter --</option> <option value="Western New York">Western New York</option> <option value="Denver">Denver</option> </select> ) : ( <input value={userChapter || "No Chapter Assigned"} disabled style={{ padding: "8px", height: "20px", flexBasis: '180px', background: '#eee', border:'1px solid #ccc' }} /> )} <RetroButton onClick={() => { setAuthError(''); handleInviteSubmit(); }}> Send Invite </RetroButton> </div> <p style={{fontSize: '0.85em', color: '#666', marginTop: '10px'}}>Logs invitation and user registers with invite code.</p> </div>
                             {/* Invitations Table */}
                             <h5>Pending & Used Invitations</h5>
                             {/* Added safety check Array.isArray */}
                             {!Array.isArray(sortedInvitations) || sortedInvitations.length === 0 ? ( <p>No invitations found{(!isSuperAdmin && userChapter) ? ` for ${userChapter}` : ''}.</p> ) : ( <div style={{ overflowX: 'auto', marginBottom: '30px' }}> <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}> <thead><tr style={{ borderBottom: "2px solid #ccc", textAlign: "left", background: '#f2f2f2' }}> <th style={{ padding: "10px 8px" }}>Name</th> <th style={{ padding: "10px 8px" }}>Email</th> <th style={{ padding: "10px 8px" }}>Role</th> <th style={{ padding: "10px 8px" }}>Chapter</th> <th style={{ padding: "10px 8px" }}>Invite Code</th> <th style={{ padding: "10px 8px" }}>Status</th> <th style={{ padding: "10px 8px" }}>Sent</th> <th style={{ padding: "10px 8px" }}>Actions</th> </tr></thead> <tbody>{sortedInvitations.map((invite) => ( <tr key={invite.id} style={{ borderBottom: "1px solid #eee", background: invite.used ? '#e8f5e9' : '#fff' }}> <td style={{ padding: "8px" }}>{invite.name}</td> <td style={{ padding: "8px" }}>{invite.email}</td> <td style={{ padding: "8px" }}>{invite.role}</td> <td style={{ padding: "8px" }}>{invite.chapter || "N/A"}</td> <td style={{ padding: "8px", fontFamily: 'monospace' }}>{invite.code || 'N/A'}</td> <td style={{ padding: "8px" }}>{invite.used ? ( <span style={{ color: "green" }}>✅ Used</span>) : ( <span style={{ color: "blue" }}>⏳ Pending</span>)}</td> <td style={{ padding: "8px" }}>{formatDate(invite.createdAt)}</td> <td style={{ padding: "8px" }}>{!invite.used && (<RetroButton onClick={() => handleDeleteInvitation(invite.id, invite.email)} style={{background:'#ffebee', color:'red', border:'1px solid #ffcdd2', padding:'3px 8px', fontSize:'0.9em'}}>Delete</RetroButton>)}</td> </tr> ))}</tbody> </table></div> )}
                             {/* Users List */}
                             <h5>Registered User Accounts</h5>
                              {/* Added safety check Array.isArray */}
                             {!Array.isArray(sortedUsers) || sortedUsers.length === 0 ? (<p>No users found.</p>) : ( <div style={{ overflowX: 'auto' }}> <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}> <thead><tr style={{ borderBottom: "2px solid #ccc", textAlign: "left", background: '#f2f2f2' }}> <th style={{ padding: "10px 8px" }}>Name</th> <th style={{ padding: "10px 8px" }}>Email</th> <th style={{ padding: "10px 8px" }}>Role</th> <th style={{ padding: "10px 8px" }}>Chapter</th> <th style={{ padding: "10px 8px" }}>Actions</th> </tr></thead> <tbody>{sortedUsers.map((u) => ( <tr key={u.uid} style={{ borderBottom: "1px solid #eee" }}> <td style={{ padding: "8px" }}>{u.name || <i style={{color: '#888'}}>(N/A)</i>}</td> <td style={{ padding: "8px" }}>{u.email}</td> <td style={{ padding: "8px" }}> <select value={u.role} onChange={(e) => handleUpdateUser(u.uid, "role", e.target.value)} disabled={!isAdmin || (u.uid === user.uid && !isSuperAdmin && u.role === 'admin') || (u.role === 'superAdmin' && !isSuperAdmin)} style={{ padding: "4px", height: "28px", maxWidth: '150px', border: '1px solid #ccc', borderRadius: '3px', fontFamily:'inherit' }}> <option value="unauthorized">🚫 Unauth</option> <option value="lp">LP</option> <option value="admin">Admin</option> {isSuperAdmin && <option value="superAdmin">✨ Super</option>} </select> </td> <td style={{ padding: "8px" }}> <select value={u.chapter || ""} onChange={(e) => handleUpdateUser(u.uid, "chapter", e.target.value)} disabled={!isSuperAdmin} style={{ padding: "4px", height: "28px", maxWidth: '180px', border: '1px solid #ccc', borderRadius: '3px', fontFamily:'inherit' }}> <option value="">-- None --</option> <option value="Western New York">WNY</option> <option value="Denver">Denver</option> </select> </td> <td style={{ padding: "8px", whiteSpace: 'nowrap' }}> <RetroButton onClick={() => handleAdminPasswordReset(u.email)} disabled={u.uid === user.uid} style={{ background: u.uid === user.uid ? '#ccc':'#fff3e0', color: u.uid === user.uid ? '#666':'#e65100', border: `1px solid ${u.uid === user.uid ? '#bbb' : '#ffe0b2'}`, padding: '3px 8px', fontSize: '0.9em', marginRight: '5px' }}> Reset Pwd </RetroButton> <RetroButton onClick={() => handleDeleteUser(u.uid, u.email)} disabled={u.uid === user.uid} style={{ background: u.uid === user.uid ? '#ccc' : '#ffebee', color: u.uid === user.uid ? '#666' : 'red', border: `1px solid ${u.uid === user.uid ? '#bbb' : '#ffcdd2'}`, padding: '3px 8px', fontSize: '0.9em' }}> Delete </RetroButton> </td> </tr> ))}</tbody> </table> </div> )}
                         </>
                    )}

                     {/* Admin: Super Admin Tools Sub-Tab */}
                    {activeAdminTab === 'superAdminTools' && isSuperAdmin && ( /* ... (no change) ... */
                         <div> <h4>⚙️ SuperAdmin Tools</h4> <p>Placeholder for future chapter management, global settings, etc.</p> </div>
                    )}
                </div>
             )}
        </div> {/* End Main Content Area */}
    </div> // End Logged-In Container
  ); // End Main Return

} // End Component