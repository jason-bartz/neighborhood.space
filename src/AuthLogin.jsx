// AuthLogin.jsx
import React, { useState } from "react";
import { auth, db } from "./firebaseConfig";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword
} from "firebase/auth";
import {
  getDocs,
  collection,
  query,
  where
} from "firebase/firestore";

import GoogleLogo from "/assets/Google.webp";

export default function AuthLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // 'login' or 'signup'

  const checkInvited = async (email) => {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);
    return !snap.empty;
  };

  const handleLogin = async () => {
    try {
      setError("");
      const invited = await checkInvited(email);
      if (!invited) {
        setError("You're not on the invited user list. Please contact your chapter director.");
        return;
      }

      const result = await signInWithEmailAndPassword(auth, email, pw);
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSignup = async () => {
    try {
      setError("");
      const invited = await checkInvited(email);
      if (!invited) {
        setError("You're not on the invited user list. Please contact your chapter director.");
        return;
      }

      const result = await createUserWithEmailAndPassword(auth, email, pw);
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setError("");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const invited = await checkInvited(result.user.email);
      if (!invited) {
        setError("You're not on the invited user list. Please contact your chapter director.");
        return;
      }

      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2 style={{ marginBottom: "12px" }}>LP Review Portal</h2>
      <p>This portal is for GNF LPs only. You must be logged in to review pitches.</p>
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={loginWithGoogle}
          style={{
            background: "white",
            padding: "6px 14px",
            border: "1px solid #ccc",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "14px"
          }}
        >
          <img src={GoogleLogo} alt="Google logo" style={{ width: "20px" }} />
          Sign in with Google
        </button>
      </div>
      <div>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: "8px", margin: "4px", width: "220px" }}
        />
        <input
          placeholder="password"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={{ padding: "8px", margin: "4px", width: "220px" }}
        />
        <br />
        <button
          onClick={mode === "login" ? handleLogin : handleSignup}
          style={{
            background: "#ffeaf5",
            border: "1px solid #d48fc7",
            padding: "6px 18px",
            margin: "8px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          {mode === "login" ? "Sign in with Email" : "Sign up with Email"}
        </button>
        <br />
        <small>
          {mode === "login" ? (
            <>
              Don’t have a password?{" "}
              <button
                style={{ background: "none", border: "none", color: "#0077cc", cursor: "pointer" }}
                onClick={() => setMode("signup")}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have a password?{" "}
              <button
                style={{ background: "none", border: "none", color: "#0077cc", cursor: "pointer" }}
                onClick={() => setMode("login")}
              >
                Sign in
              </button>
            </>
          )}
        </small>
        {error && (
          <div style={{ color: "red", marginTop: "10px", fontSize: "14px" }}>{error}</div>
        )}
      </div>
      <p style={{ marginTop: "40px", fontSize: "14px", color: "#666" }}>
        Interested in becoming an LP and joining a chapter?{" "}
        <a href="#" onClick={() => onLogin(null)}>Visit the GNF Website</a> to learn more.
      </p>
    </div>
  );
}