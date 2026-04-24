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
    <div className="mb-form-shell" style={{
      padding: "48px 40px",
      textAlign: "center",
      background: "var(--mb-chalk)",
      color: "var(--mb-ink)"
    }}>
      <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>LP Review Portal</span>
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontWeight: 400,
        fontSize: 32,
        letterSpacing: "-0.015em",
        margin: "12px 0 12px"
      }}>
        Sign in to review pitches
      </h2>
      <p style={{ margin: "0 0 28px", color: "var(--mb-ink-60)", fontSize: 14 }}>
        This portal is for GNF LPs only. You must be logged in to review pitches.
      </p>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <button
          onClick={loginWithGoogle}
          className="mb-btn mb-btn-chalk"
          style={{ gap: 10 }}
        >
          <img src={GoogleLogo} alt="" aria-hidden="true" style={{ width: 18, height: 18 }} />
          Sign in with Google
        </button>
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "20px auto",
        maxWidth: 260
      }}>
        <span style={{ flex: 1, height: 1, background: "var(--mb-ink-15)" }} />
        <span className="mb-numeral" style={{ fontSize: 11, color: "var(--mb-ink-60)", letterSpacing: "0.1em" }}>OR</span>
        <span style={{ flex: 1, height: 1, background: "var(--mb-ink-15)" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 300, margin: "0 auto" }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <button
          onClick={mode === "login" ? handleLogin : handleSignup}
          className="mb-btn"
          style={{ marginTop: 4 }}
        >
          {mode === "login" ? "Sign in with Email" : "Sign up with Email"}
          <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
        </button>
      </div>

      <p style={{ marginTop: 16, fontSize: 13, color: "var(--mb-ink-60)" }}>
        {mode === "login" ? (
          <>
            Don't have a password?{" "}
            <button
              style={{ background: "none", border: "none", color: "var(--mb-magenta)", cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have a password?{" "}
            <button
              style={{ background: "none", border: "none", color: "var(--mb-magenta)", cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
          </>
        )}
      </p>
      {error && (
        <div style={{
          color: "#c0392b",
          marginTop: 16,
          padding: "10px 14px",
          border: "2px solid #c0392b",
          background: "#ffe0e0",
          fontSize: 13,
          fontFamily: "var(--font-content)"
        }}>
          {error}
        </div>
      )}

      <p style={{ marginTop: "40px", fontSize: "13px", color: "var(--mb-ink-60)" }}>
        Interested in becoming an LP and joining a chapter?{" "}
        <a href="#" onClick={() => onLogin(null)} style={{ color: "var(--mb-magenta)", textDecoration: "underline" }}>
          Visit the GNF Website
        </a>{" "}
        to learn more.
      </p>
    </div>
  );
}
