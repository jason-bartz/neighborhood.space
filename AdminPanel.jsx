import React, { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider
} from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  getDoc,
  addDoc
} from "firebase/firestore";
import { db, auth } from "./firebaseConfig"; // Assuming firebaseConfig.js is in the same directory
// import { v4 as uuidv4 } from "uuid"; // Not used
import Papa from "papaparse";
import { saveAs } from "file-saver";

const provider = new GoogleAuthProvider();

// --- New helper component for input fields ---
function AuthInput({ type = "text", placeholder, value, onChange, required, minLength }) {
    return (
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            minLength={minLength}
            style={{
                display: 'block', // Make inputs block elements
                width: 'calc(100% - 20px)', // Adjust width to account for padding
                padding: '10px',
                margin: '10px auto', // Center inputs horizontally with margin
                border: '1px solid #7d7d7d', // Retro border
                borderRadius: '0', // No border radius for retro look
                boxSizing: 'border-box',
                background: '#fff', // White background typical for inputs
                fontFamily: 'inherit', // Inherit retro font
                fontSize: '1em',
            }}
        />
    );
}


export default function AdminPanel({ currentUser: propUser }) {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pitches");
  const [currentUser, setCurrentUser] = useState(propUser || null);
  const [authMode, setAuthMode] = useState("login"); // "login" or "register"

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [authError, setAuthError] = useState("");

  const [users, setUsers] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [chapterFilter, setChapterFilter] = useState("");
  const [quarterFilter, setQuarterFilter] = useState("");
  const [search, setSearch] = useState("");

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "lp",
    chapter: ""
  });

  const [expanded, setExpanded] = useState(null);

  // Determine user roles
  const isSuperAdmin = currentUser?.role === "superAdmin";
  const isAdmin = currentUser?.role === "admin" || isSuperAdmin;
  const adminChapter = currentUser?.chapter;

  // If we get currentUser via props, we should use that
  useEffect(() => {
    if (propUser) {
      setCurrentUser(propUser);
      setLoading(false);
    }
  }, [propUser]);

  // If not provided via props, listen for auth state changes
  useEffect(() => {
    if (!propUser) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (userDoc.exists()) {
              // User already exists in Firestore
              setCurrentUser({ uid: user.uid, ...userDoc.data() });
            } else {
              // User authenticated but not in Firestore database
              setCurrentUser({ uid: user.uid, email: user.email, role: "unauthorized" });
            }
          } catch (err) {
            console.error("Error loading user:", err);
            setCurrentUser({ uid: user.uid, email: user.email, role: "unauthorized" });
          }
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [propUser]);

  // Load data when user is authenticated as admin
  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    loadPitches();
    loadReviews();
    loadInvitations();
  }, [currentUser, isAdmin]);

  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadInvitations = async () => {
    try {
      let q = collection(db, "invitations");
      if (isAdmin && !isSuperAdmin && adminChapter) {
          q = query(q, where("chapter", "==", adminChapter));
      }
      const snap = await getDocs(q);
      const invitationsData = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      invitationsData.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
      setInvitations(invitationsData);
    } catch (error) {
      console.error("Error loading invitations:", error);
    }
  };

  const loadPitches = async () => {
    try {
      const q = isSuperAdmin || !adminChapter
        ? collection(db, "pitches")
        : query(collection(db, "pitches"), where("chapter", "==", adminChapter));
      const snap = await getDocs(q);
      const docs = snap.docs.map((doc) => {
        const data = doc.data();
        const date = data.createdAt?.toDate
          ? data.createdAt.toDate()
          : data.createdAt ? new Date(data.createdAt) : new Date();
        const quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
        return {
          id: doc.id,
          ...data,
          createdDate: date,
          quarter
        };
      });
      docs.sort((a, b) => b.createdDate - a.createdDate);
      setPitches(docs);
    } catch (error) {
      console.error("Error loading pitches:", error);
    }
  };

  const loadReviews = async () => {
    try {
      const snap = await getDocs(collection(db, "reviews"));
      setReviews(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleInvite = async () => {
    try {
      if (!newUser.name || !newUser.email) {
        setAuthError("Please enter a name and email for the invitation.");
        return;
      }
      if (isSuperAdmin && !newUser.chapter) {
          setAuthError("SuperAdmin must select a chapter for the invitation.");
          return;
      }

      setAuthError("");

      const invitationsRef = collection(db, "invitations");
      const q = query(
          invitationsRef,
          where("email", "==", newUser.email.toLowerCase().trim()),
          where("used", "==", false)
      );
      const existingInvitesSnapshot = await getDocs(q);
      if (!existingInvitesSnapshot.empty) {
          setAuthError(`An active invitation already exists for ${newUser.email}.`);
          return;
      }

      const inviteCode = generateInviteCode();

      await addDoc(collection(db, "invitations"), {
        code: inviteCode,
        email: newUser.email.toLowerCase().trim(),
        name: newUser.name.trim(),
        role: newUser.role,
        chapter: isSuperAdmin ? newUser.chapter : adminChapter,
        createdAt: new Date(),
        createdBy: currentUser.uid,
        used: false
      });

      setNewUser({ name: "", email: "", role: "lp", chapter: isSuperAdmin ? "" : adminChapter });
      loadInvitations();
      alert(`Invitation created with code: ${inviteCode}\n\nShare this code with ${newUser.name} (${newUser.email}) for them to register.`);
    } catch (error) {
      console.error("Error creating invitation:", error);
      setAuthError("Failed to create invitation. Please try again. " + error.message);
    }
  };


  const handleDeleteUser = async (id) => {
    if (id === currentUser.uid) {
        alert("You cannot delete your own account.");
        return;
    }
    const userToDelete = users.find(u => u.id === id);
    const userEmail = userToDelete ? userToDelete.email : 'this user';

    if (window.confirm(`Are you sure you want to delete the user ${userEmail}? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, "users", id));
        alert(`User ${userEmail} deleted from Firestore.`);
        loadUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Failed to delete user from Firestore.");
      }
    }
  };

  const handleUpdateRole = async (id, field, value) => {
     if (id === currentUser.uid && field === 'role' && value !== currentUser.role && currentUser.role === 'superAdmin') {
        const otherSuperAdmins = users.filter(u => u.role === 'superAdmin' && u.id !== id);
        if (otherSuperAdmins.length === 0) {
            alert("Cannot change the role of the only SuperAdmin.");
            loadUsers();
            return;
        }
     }
      if (id === currentUser.uid && field === 'chapter' && value !== currentUser.chapter && !isSuperAdmin) {
            alert("Admins cannot change their own chapter assignment.");
            loadUsers();
            return;
      }
       if (field === 'role' && value === 'superAdmin' && !isSuperAdmin) {
            alert("Only SuperAdmins can assign the SuperAdmin role.");
            loadUsers();
            return;
       }

    try {
      await updateDoc(doc(db, "users", id), { [field]: value });
       loadUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user");
      loadUsers();
    }
  };

  const handleLoginEmail = async () => {
    try {
      setAuthError("");
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      console.error("Email Login Error:", e.code, e.message);
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setAuthError("Login failed. Please check your email and password.");
      } else {
        setAuthError("An unexpected error occurred during login. " + e.message);
      }
    }
  };

  const handleRegisterEmail = async () => {
    try {
      setAuthError("");

      if (!name.trim()) {
        setAuthError("Please enter your full name.");
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          setAuthError("Please enter a valid email address.");
          return;
      }
      if (password.length < 6) {
          setAuthError("Password must be at least 6 characters long.");
          return;
      }
      if (password !== confirmPassword) {
        setAuthError("Passwords don't match.");
        return;
      }
       if (!inviteCode.trim()) {
        setAuthError("Please enter your invitation code.");
        return;
      }

      const invitationsRef = collection(db, "invitations");
      const q = query(
        invitationsRef,
        where("code", "==", inviteCode.trim().toUpperCase()),
        where("email", "==", email.toLowerCase().trim()),
        where("used", "==", false)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
         const codeCheckQuery = query(invitationsRef, where("code", "==", inviteCode.trim().toUpperCase()));
         const codeCheckSnapshot = await getDocs(codeCheckQuery);
         if (codeCheckSnapshot.empty) {
             setAuthError("Invalid invitation code.");
         } else {
             const inviteDocCheck = codeCheckSnapshot.docs[0].data();
             if (inviteDocCheck.email !== email.toLowerCase().trim()) {
                 setAuthError("This invitation code is for a different email address.");
             } else if (inviteDocCheck.used) {
                 setAuthError("This invitation code has already been used.");
             } else {
                setAuthError("Invalid invitation code or email mismatch.");
             }
         }
        return;
      }

      const inviteDoc = querySnapshot.docs[0];
      const inviteData = inviteDoc.data();

      // Check Firebase Console -> Authentication -> Sign-in method if this fails
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email.toLowerCase(),
        name: name.trim(),
        role: inviteData.role,
        chapter: inviteData.chapter,
        createdAt: new Date()
      });

      await updateDoc(doc(db, "invitations", inviteDoc.id), {
        used: true,
        usedAt: new Date(),
        registeredUserId: user.uid
      });

       setName("");
       setEmail("");
       setPassword("");
       setConfirmPassword("");
       setInviteCode("");

      if (isAdmin) loadInvitations();


    } catch (e) {
      console.error("Registration Error:", e.code, e.message);
      if (e.code === 'auth/email-already-in-use') {
        setAuthError("This email is already registered. Please log in instead.");
      } else if (e.code === 'auth/weak-password') {
        setAuthError("Password should be at least 6 characters.");
      } else if (e.code === 'auth/invalid-email') {
          setAuthError("The email address is not valid.");
      } else if (e.code === 'auth/admin-restricted-operation') {
          console.error("ADMIN RESTRICTED OPERATION: Check Firebase Auth settings. Email/Password sign-up might be disabled.");
          setAuthError("Registration failed: Account creation is restricted by the administrator. Please contact support.");
      } else {
        setAuthError("Registration failed: " + e.message);
      }
    }
  };

  const handleLoginGoogle = async () => {
    try {
      setAuthError("");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
             setCurrentUser({ uid: user.uid, email: user.email, role: "unauthorized" });
            console.log("Google user not found in Firestore. Role set to unauthorized.");
        } else {
             console.log("Google user found in Firestore.");
        }

    } catch (e) {
      console.error("Google Login Error:", e.code, e.message);
       if (e.code === 'auth/popup-closed-by-user') {
            setAuthError("Google Sign-In cancelled.");
       } else if (e.code === 'auth/account-exists-with-different-credential') {
            setAuthError("An account already exists with this email address using a different sign-in method (e.g., email/password). Try logging in that way.");
       }
      else {
        setAuthError("Google login failed. Please try again. " + e.message);
      }
    }
  };

  const handleDeleteInvitation = async (id) => {
     const invitationToDelete = invitations.find(inv => inv.id === id);
     const inviteeEmail = invitationToDelete ? invitationToDelete.email : 'this invitation';
    if (window.confirm(`Are you sure you want to delete the invitation for ${inviteeEmail}?`)) {
      try {
        await deleteDoc(doc(db, "invitations", id));
        alert(`Invitation for ${inviteeEmail} deleted.`);
        loadInvitations();
      } catch (error) {
        console.error("Error deleting invitation:", error);
        alert("Failed to delete invitation.");
      }
    }
  };

  const getGroupedReviews = (pitchId) =>
    reviews
      .filter((r) => r.pitchId === pitchId)
      .reduce((acc, r) => {
        const reviewer = users.find((u) => u.id === r.reviewerId);
        const name = reviewer?.name || reviewer?.email || "Unknown Reviewer";
        const group = r.overallLpRating || "Not Yet Rated";
        if (!acc[group]) acc[group] = [];
        acc[group].push(name);
        return acc;
      }, {});

  const filteredPitches = pitches.filter((p) => {
    const matchQuarter = !quarterFilter || p.quarter === quarterFilter;
    const matchChapter = !chapterFilter || p.chapter === chapterFilter;
    const searchTermLower = search.toLowerCase();
    const matchSearch =
      !search ||
      p.businessName?.toLowerCase().includes(searchTermLower) ||
      p.founderName?.toLowerCase().includes(searchTermLower) ||
      p.email?.toLowerCase().includes(searchTermLower);
    return matchQuarter && matchChapter && matchSearch;
  });

  const exportCSV = () => {
     if (filteredPitches.length === 0) {
         alert("No pitches to export with the current filters.");
         return;
     }
    const rows = filteredPitches.map((p) => ({
      'Business Name': p.businessName || "",
      'Founder Name': p.founderName || "",
      'Founder Email': p.email || "",
      'Zip Code': p.zipCode || "",
      'Website': p.website || "",
      'Value Proposition': p.valueProp || "",
      'Problem': p.problem || "",
      'Solution': p.solution || "",
      'Business Model': p.businessModel || "",
      'Paying Customers': p.hasPayingCustomers || "",
      'Grant Use Plan': p.grantUsePlan || "",
      'Pitch Video URL': p.pitchVideoUrl || "",
      'Is Grant Winner': p.isWinner ? "Yes" : "No",
      'GNF Chapter': p.chapter || "",
      'Date Submitted': p.createdDate ? p.createdDate.toLocaleDateString() : "",
      'Quarter Submitted': p.quarter || "",
       'Founder Bio': p.bio || "",
       'Heard About GNF': p.heardAbout || "",
    }));

    try {
        const csv = Papa.unparse(rows, { header: true });
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const filename = `gnf_pitches_${chapterFilter || 'all'}_${quarterFilter || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
        saveAs(blob, filename);
    } catch (error) {
        console.error("Error generating CSV:", error);
        alert("Failed to generate CSV export.");
    }
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Loading Admin Panel...</p>
      </div>
    );
  }

  // Unauthorized Access Screen
  if (currentUser && currentUser.role === "unauthorized") {
    return (
      <div style={{ padding: "40px", textAlign: "center", border: '2px solid red', margin: '20px', borderRadius: '8px' }}>
        <h2>Access Denied</h2>
        <p>Your account (<strong>{currentUser.email}</strong>) is not authorized to access this admin panel.</p>
        <p>Please contact a GNF administrator if you believe this is an error.</p>
        <button onClick={() => signOut(auth)} style={{ padding: '10px 20px', marginTop: '15px' }}>Sign Out</button>
      </div>
    );
  }

  // --- Login/Register Screen (Improved Layout) ---
  if (!currentUser || !isAdmin) {
    return (
        // Container with retro feel
      <div style={{
          maxWidth: "450px",
          margin: "40px auto",
          padding: "20px 30px",
          border: "2px outset #ccc",
          boxShadow: 'inset 1px 1px 0px #fff, inset -1px -1px 0px #888',
          textAlign: "center",
          // --- Background Color Change ---
          background: '#E0E0E0', // Changed from #c0c0c0 to lighter grey
          // --- End Background Color Change ---
          fontFamily: '"MS Sans Serif", "Pixel Arial", sans-serif', // Suggest retro font stack (ensure font is loaded via CSS)
        }}>
        <h2 style={{
            borderBottom: '2px solid #888',
            paddingBottom: '10px',
            marginBottom: '20px',
            color: '#222'
        }}>
            GNF Admin Portal
        </h2>

        {/* Login/Register Tabs */}
        <div style={{ marginBottom: "25px" }}>
          <button
            onClick={() => { setAuthMode("login"); setAuthError(""); }}
            style={{
              fontWeight: authMode === "login" ? "bold" : "normal",
              background: authMode === "login" ? "#FFD6EC" : "#E0E0E0", // Match background or use theme pink
              border: authMode === "login" ? "2px inset #aaa" : "2px outset #aaa",
              color: '#000',
              padding: "8px 15px",
              cursor: "pointer",
              margin: '0 2px',
              boxShadow: authMode === 'login' ? 'none' : '1px 1px 1px #555',
            }}
          >
            Login
          </button>
          <button
            onClick={() => { setAuthMode("register"); setAuthError(""); }}
            style={{
              fontWeight: authMode === "register" ? "bold" : "normal",
               background: authMode === "register" ? "#FFD6EC" : "#E0E0E0", // Match background or use theme pink
               border: authMode === "register" ? "2px inset #aaa" : "2px outset #aaa",
               color: '#000',
               padding: "8px 15px",
               cursor: "pointer",
               margin: '0 2px',
               boxShadow: authMode === 'register' ? 'none' : '1px 1px 1px #555',
            }}
          >
            Register
          </button>
        </div>

        {/* Google Login Section */}
        <div style={{ margin: "25px 0", paddingTop: '20px', borderTop: '1px solid #888' }}>
            <div style={{ marginBottom: "15px", color: '#333', fontWeight: 'bold' }}>Login with:</div>
            <button
                onClick={handleLoginGoogle}
                title="Login with Google"
                style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "0",
                    display: 'inline-block',
                }}
            >
                <img
                    src="/assets/Google.webp"
                    alt="Google logo"
                    style={{
                        height: "60px",
                        width: "auto",
                        verticalAlign: 'middle'
                    }}
                />
            </button>
             <p style={{ fontSize: "0.85em", color: "#555", marginTop: "10px" }}>
                (Requires prior registration via invite)
            </p>
        </div>

        {/* Error Message Area */}
        {authError && (
          <div style={{
              color: "#880000",
              background: '#FFDDDD',
              border: '1px solid #CC0000',
              padding: '10px',
              marginBottom: "20px",
              marginTop: '10px',
              fontSize: '0.9em',
              textAlign: 'left'
            }}>
             <strong style={{marginRight: '5px'}}>Error:</strong>{authError}
          </div>
        )}

        {/* Email/Password Form Area */}
        <div style={{ paddingTop: '20px', borderTop: '1px solid #888', marginTop: '25px' }}>
             <div style={{ marginBottom: "15px", color: '#333', fontWeight: 'bold' }}>
                {authMode === 'login' ? 'Login with Email:' : 'Register (Invite Required):'}
            </div>

             {authMode === "register" && (
                <AuthInput
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
             )}
             <AuthInput
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
             />
             <AuthInput
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={authMode === 'login'}
                minLength={authMode === 'register' ? 6 : undefined}
             />
             {authMode === "register" && (
                 <>
                    <AuthInput
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <AuthInput
                        placeholder="Invitation Code"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        required
                    />
                 </>
             )}

            <button
                onClick={authMode === "login" ? handleLoginEmail : handleRegisterEmail}
                style={{
                    margin: "20px auto 5px auto",
                    display: 'block',
                    padding: "10px 25px",
                    width: "calc(100% - 20px)",
                    cursor: "pointer",
                    background: "#FFD6EC", // Use theme pink for primary action
                    color: "black",
                    border: '2px outset #aaa',
                    borderRadius: '0',
                    fontSize: '1em',
                    fontWeight: 'bold',
                    boxShadow: '1px 1px 1px #555',
                }}
            >
                {authMode === "login" ? "Sign In" : "Register Account"}
            </button>

             {authMode === "register" && (
                 <p style={{ fontSize: "0.85em", color: "#555", marginTop: "15px" }}>
                    An invitation code is required.
                 </p>
            )}
        </div>
      </div>
    );
  }

  // --- Main Admin Panel View ---
  // (No changes below this line in this update)
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center', marginBottom: "20px", paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
        <div>
            Welcome, <strong>{currentUser.name || currentUser.email}</strong>!
            <span style={{ marginLeft: '10px', fontSize: '0.9em', color: '#666' }}>({currentUser.role}{currentUser.chapter ? ` - ${currentUser.chapter}` : ''})</span>
        </div>
        <button onClick={() => signOut(auth)} style={{ padding: '8px 15px', cursor: 'pointer' }}>Log Out</button>
      </div>

        {/* Tab Navigation */}
      <div style={{ marginBottom: "25px" }}>
        <button
          onClick={() => setTab("pitches")}
          style={{
            background: tab === "pitches" ? "#ffd6ec" : "transparent",
            padding: "10px 15px", marginRight: "8px", border: "1px solid #ccc",
             borderBottom: tab === "pitches" ? 'none' : '1px solid #ccc',
             borderBottomColor: tab === "pitches" ? '#ffd6ec' : '#ccc',
             marginBottom: '-1px', borderRadius: "3px 3px 0 0", cursor: "pointer"
          }}
        >
          📂 Pitches & Reviews
        </button>
        <button
          onClick={() => setTab("users")}
          style={{
            background: tab === "users" ? "#ffd6ec" : "transparent",
            padding: "10px 15px", marginRight: "8px", border: "1px solid #ccc",
            borderBottom: tab === "users" ? 'none' : '1px solid #ccc',
            borderBottomColor: tab === "users" ? '#ffd6ec' : '#ccc',
            marginBottom: '-1px', borderRadius: "3px 3px 0 0", cursor: "pointer"
          }}
        >
          👥 Users & Invitations
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setTab("super")}
            style={{
              background: tab === "super" ? "#ffd6ec" : "transparent",
              padding: "10px 15px", border: "1px solid #ccc",
              borderBottom: tab === "super" ? 'none' : '1px solid #ccc',
              borderBottomColor: tab === "super" ? '#ffd6ec' : '#ccc',
              marginBottom: '-1px', borderRadius: "3px 3px 0 0", cursor: "pointer"
            }}
          >
            ⚙️ SuperAdmin Tools
          </button>
        )}
      </div>

       {/* Tab Content Area */}
       <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '0 5px 5px 5px', minHeight: '400px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>

        {/* Pitches Tab */}
        {tab === "pitches" && (
          <>
            <h3>🎯 Pitches + LP Reviews</h3>
            <div style={{ display: "flex", flexWrap: 'wrap', gap: "10px", marginBottom: "20px", paddingBottom: '15px', borderBottom: '1px dashed #eee' }}>
              {isSuperAdmin && (
                 <select value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value)} style={{ padding: '8px', height: '38px' }}>
                   <option value="">All Chapters</option>
                   {[...new Set(pitches.map((p) => p.chapter).filter(Boolean))].sort().map((c) => (<option key={c} value={c}>{c}</option>))}
                 </select>
              )}
              <select value={quarterFilter} onChange={(e) => setQuarterFilter(e.target.value)} style={{ padding: '8px', height: '38px' }}>
                <option value="">All Quarters</option>
                {[...new Set(pitches.map((p) => p.quarter).filter(Boolean))].sort((a, b) => {
                    const [aQ, aY] = a.split(' '); const [bQ, bY] = b.split(' ');
                    if (bY !== aY) return bY - aY; return bQ.substring(1) - aQ.substring(1);
                }).map((q) => (<option key={q} value={q}>{q}</option>))}
              </select>
              <input type="text" placeholder="Search name, business, or email..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flexGrow: 1, padding: '8px', height: '22px' }} />
              <button onClick={exportCSV} style={{ padding: '8px 15px', height: '38px', cursor: 'pointer' }}>📄 Export Filtered CSV</button>
            </div>

              {filteredPitches.length === 0 && <p>No pitches match the current filters.</p>}

            {filteredPitches.map((p) => {
                const pitchReviews = getGroupedReviews(p.id);
                const reviewRatings = Object.keys(pitchReviews);
                return (
                <div key={p.id} style={{ padding: "15px", border: "1px solid #ccc", marginBottom: "15px", borderRadius: "6px", background: p.isWinner ? "#d7fddc" : "#fff", boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ flexGrow: 1 }}>
                            <strong style={{ fontSize: '1.1em' }}>{p.businessName || "No Business Name"}</strong> by {p.founderName || "No Founder Name"} <br />
                            <em style={{ color: '#555' }}>{p.valueProp || "No value proposition provided."}</em> <br />
                            <span style={{ fontSize: '0.9em', color: '#777' }}>
                                Chapter: {p.chapter || "N/A"} | Submitted: {p.createdDate ? p.createdDate.toLocaleDateString() : "N/A"} | Quarter: {p.quarter || "N/A"}
                            </span>
                             {p.isWinner && <span style={{ marginLeft: '10px', color: 'green', fontWeight: 'bold' }}>🏆 Grant Winner</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                            {p.isWinner ? (
                                <button onClick={() => { if (window.confirm(`REMOVE winner status from ${p.businessName}?`)) { updateDoc(doc(db, "pitches", p.id), { isWinner: false }).then(loadPitches).catch(err => alert("Error: "+err.message)); } }} style={{ background: '#ffcdd2', color: '#b71c1c', border: '1px solid #ef9a9a', padding: '5px 10px', cursor: 'pointer', order: 1 }}>❌ Remove Winner</button>
                            ) : (
                                <button onClick={() => { if (window.confirm(`Assign ${p.businessName} as Grant Winner?`)) { updateDoc(doc(db, "pitches", p.id), { isWinner: true }).then(loadPitches).catch(err => alert("Error: "+err.message)); } }} style={{ background: '#c8e6c9', color: '#1b5e20', border: '1px solid #a5d6a7', padding: '5px 10px', cursor: 'pointer', order: 1 }}>🏆 Assign Winner</button>
                            )}
                            <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} style={{ padding: '5px 10px', cursor: 'pointer', order: 2 }}>{expanded === p.id ? 'Hide Details' : 'View Details'}</button>
                        </div>
                    </div>
                    <div style={{ marginTop: "10px", paddingTop: '10px', borderTop: '1px dashed #eee', fontSize: "14px" }}>
                        <strong>LP Reviews:</strong>
                        {reviewRatings.length > 0 ? ( reviewRatings.sort().map((rating) => ( <div key={rating} style={{ marginLeft: '15px', marginTop: '3px' }}> <strong>{rating}:</strong> ({pitchReviews[rating].length}) {pitchReviews[rating].join(", ")} </div> )) ) : ( <span style={{ marginLeft: '5px', fontStyle: 'italic', color: '#888' }}>No reviews submitted yet.</span> )}
                    </div>
                    {expanded === p.id && (
                        <div style={{ marginTop: "15px", paddingTop: '15px', borderTop: '1px solid #eee', fontSize: "14px", lineHeight: '1.6', background: '#fdfdfd', padding: '10px', borderRadius: '4px' }}>
                        <strong>Full Pitch Details:</strong><br />
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                            <strong>Business Name:</strong> {p.businessName || "N/A"}<br /> <strong>Founder Name:</strong> {p.founderName || "N/A"}<br /> <strong>Founder Email:</strong> {p.email || "N/A"}<br /> <strong>Zip Code:</strong> {p.zipCode || "N/A"}<br /> <strong>Bio:</strong> {p.bio || "N/A"}<br /> <strong>Value Proposition:</strong> {p.valueProp || "N/A"}<br /> <strong>Problem:</strong> {p.problem || "N/A"}<br /> <strong>Solution:</strong> {p.solution || "N/A"}<br /> <strong>Business Model:</strong> {p.businessModel || "N/A"}<br /> <strong>Use of Funds:</strong> {p.grantUsePlan || "N/A"}<br /> <strong>Has Paying Customers:</strong> {p.hasPayingCustomers === undefined ? "N/A" : p.hasPayingCustomers ? 'Yes' : 'No'}<br /> <strong>Website:</strong> {p.website ? <a href={p.website.startsWith('http') ? p.website : `http://${p.website}`} target="_blank" rel="noopener noreferrer">{p.website}</a> : "N/A"}<br /> <strong>Heard About GNF:</strong> {p.heardAbout || "N/A"}<br />
                            {p.pitchVideoUrl && <div><strong>Pitch Video URL:</strong> <a href={p.pitchVideoUrl} target="_blank" rel="noopener noreferrer">{p.pitchVideoUrl}</a><br /></div>}
                            {p.pitchVideoFile && <div><strong>Pitch Video File:</strong> <a href={p.pitchVideoFile} target="_blank" rel="noopener noreferrer">View Uploaded File</a><br /></div>}
                         </pre>
                        </div>
                    )}
                </div>
                );
            })}
          </>
        )}

        {/* Users Tab */}
         {tab === "users" && (
            <>
            <h3>👥 User Management & Invitations</h3>
            <div style={{ marginBottom: "25px", border: "1px solid #ccc", padding: "20px", borderRadius: "5px", background: '#f9f9f9' }}>
                <h4 style={{ marginTop: 0, marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>📨 Send New Invitation</h4>
                 {authError && ( <div style={{ color: "red", background: '#ffebee', border: '1px solid red', padding: '10px', marginBottom: "16px", borderRadius: '4px', fontSize: '0.9em' }}>{authError}</div>)}
                <div style={{ display: "flex", flexWrap: 'wrap', gap: "10px", alignItems: 'center' }}>
                <input type="text" placeholder="Full Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} style={{ padding: "8px", height: "20px", flexBasis: '200px', flexGrow: 1 }} />
                <input type="email" placeholder="Email Address" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} style={{ padding: "8px", height: "20px", flexBasis: '250px', flexGrow: 1 }} />
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={{ padding: "8px", height: "36px", flexBasis: '120px' }}>
                    <option value="lp">LP (Reviewer)</option> <option value="admin">Admin</option> {isSuperAdmin && <option value="superAdmin">SuperAdmin</option>}
                </select>
                {isSuperAdmin ? (
                    <select value={newUser.chapter} required onChange={(e) => setNewUser({ ...newUser, chapter: e.target.value })} style={{ padding: "8px", height: "36px", flexBasis: '180px' }}>
                    <option value="">-- Select Chapter --</option> <option value="Western New York">Western New York</option> <option value="Denver">Denver</option>
                    </select>
                ) : ( <input value={adminChapter || "No Chapter Assigned"} disabled style={{ padding: "8px", height: "20px", flexBasis: '180px', background: '#eee' }} /> )}
                <button onClick={() => { setAuthError(''); handleInvite(); }} style={{ padding: "8px 16px", height: '36px', cursor: 'pointer' }}> Send Invite </button>
                </div>
            </div>
            <h4 style={{ marginTop: '30px' }}>Pending & Used Invitations</h4>
            {invitations.length === 0 ? ( <p>No invitations found{adminChapter ? ` for the ${adminChapter} chapter` : ''}.</p> ) : (
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse", marginBottom: "30px" }}>
                <thead><tr style={{ borderBottom: "2px solid #ccc", textAlign: "left", background: '#f2f2f2' }}> <th style={{ padding: "10px 8px" }}>Name</th> <th style={{ padding: "10px 8px" }}>Email</th> <th style={{ padding: "10px 8px" }}>Role</th> <th style={{ padding: "10px 8px" }}>Chapter</th> <th style={{ padding: "10px 8px" }}>Invite Code</th> <th style={{ padding: "10px 8px" }}>Status</th> <th style={{ padding: "10px 8px" }}>Sent Date</th> <th style={{ padding: "10px 8px" }}>Actions</th> </tr></thead>
                <tbody>{invitations.map((invite) => ( <tr key={invite.id} style={{ borderBottom: "1px solid #eee", background: invite.used ? '#e8f5e9' : '#fff' }}> <td style={{ padding: "8px" }}>{invite.name}</td> <td style={{ padding: "8px" }}>{invite.email}</td> <td style={{ padding: "8px" }}>{invite.role}</td> <td style={{ padding: "8px" }}>{invite.chapter || "N/A"}</td> <td style={{ padding: "8px", fontFamily: 'monospace' }}>{invite.code}</td> <td style={{ padding: "8px" }}>{invite.used ? ( <span style={{ color: "green", fontWeight: 'bold' }}>✅ Used</span>) : ( <span style={{ color: "blue" }}>⏳ Pending</span>)}</td> <td style={{ padding: "8px" }}>{invite.createdAt?.toDate ? invite.createdAt.toDate().toLocaleDateString() : invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : "N/A"}</td> <td style={{ padding: "8px" }}>{!invite.used && (<button onClick={() => handleDeleteInvitation(invite.id)} style={{ background: '#ffebee', color: 'red', border: '1px solid #ffcdd2', padding: '3px 8px', fontSize: '0.9em', cursor: 'pointer' }}> Delete Invite </button> )}</td> </tr> ))}</tbody>
                </table></div>
            )}
            <h4 style={{ marginTop: '30px' }}>Registered User Accounts</h4>
             <div style={{ overflowX: 'auto' }}>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: "2px solid #ccc", textAlign: "left", background: '#f2f2f2' }}> <th style={{ padding: "10px 8px" }}>Name</th> <th style={{ padding: "10px 8px" }}>Email</th> <th style={{ padding: "10px 8px" }}>Role</th> <th style={{ padding: "10px 8px" }}>Chapter</th> <th style={{ padding: "10px 8px" }}>Actions</th> </tr></thead>
                <tbody>{users.filter(u => isSuperAdmin || !adminChapter || u.chapter === adminChapter || !u.chapter).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)).map((u) => ( <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}> <td style={{ padding: "8px" }}>{u.name || <i style={{color: '#888'}}>(No Name Provided)</i>}</td> <td style={{ padding: "8px" }}>{u.email}</td> <td style={{ padding: "8px" }}> <select value={u.role} onChange={(e) => handleUpdateRole(u.id, "role", e.target.value)} disabled={u.id === currentUser.uid && !isSuperAdmin && u.role === 'admin'} style={{ padding: "4px", height: "28px", maxWidth: '150px', border: '1px solid #ccc', borderRadius: '3px' }}> <option value="unauthorized">🚫 Unauthorized</option> <option value="lp">LP (Reviewer)</option> <option value="admin">Admin</option> {isSuperAdmin && <option value="superAdmin">✨ SuperAdmin</option>} </select> </td> <td style={{ padding: "8px" }}> <select value={u.chapter || ""} onChange={(e) => handleUpdateRole(u.id, "chapter", e.target.value)} disabled={!isSuperAdmin && u.id === currentUser.uid} style={{ padding: "4px", height: "28px", maxWidth: '180px', border: '1px solid #ccc', borderRadius: '3px' }}> <option value="">-- No Chapter --</option> <option value="Western New York">Western New York</option> <option value="Denver">Denver</option> </select> </td> <td style={{ padding: "8px" }}> <button onClick={() => handleDeleteUser(u.id)} disabled={u.id === currentUser.uid} title={u.id === currentUser.uid ? "Cannot delete your own account" : `Delete user ${u.email}`} style={{ background: u.id === currentUser.uid ? '#ccc' : '#ffebee', color: u.id === currentUser.uid ? '#666' : 'red', border: `1px solid ${u.id === currentUser.uid ? '#bbb' : '#ffcdd2'}`, padding: '3px 8px', fontSize: '0.9em', cursor: u.id === currentUser.uid ? 'not-allowed' : 'pointer' }}> Delete User </button> </td> </tr> ))}</tbody>
                </table></div>
            </>
         )}

        {/* SuperAdmin Tab */}
        {tab === "super" && isSuperAdmin && (
          <div>
            <h3>⚙️ SuperAdmin Tools</h3> <p>This area is reserved for Super Administrators.</p>
             <ul style={{ listStyle: 'disc', marginLeft: '20px' }}> <li>Chapter Management</li> <li>Global Settings</li> <li>Bulk User Actions</li> <li>Audit Logs</li> <li>Database Maintenance Tools</li> </ul>
          </div>
        )}
         {tab === "super" && !isSuperAdmin && ( <p style={{ color: 'red' }}>Access Denied. This section requires SuperAdmin privileges.</p> )}
      </div> {/* End Tab Content Area */}
    </div> // End Main Panel Container
  );
}