import React, { useState } from "react";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { app } from "./firebaseConfig";

export default function LPLogin({ onLoginSuccess }) {
  const auth = getAuth(app);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      onLoginSuccess(result.user);
    } catch (err) {
      console.error("Google login failed:", err);
      setError("Google login failed. Please try again.");
    }
  };

  const handleEmailLogin = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess(result.user);
    } catch (err) {
      console.error("Email login failed:", err);
      setError("Email login failed. Please try again.");
    }
  };

  return (
    <div style={{
      fontFamily: "'Comic Sans MS', cursive",
      padding: "24px",
      color: "#333"
    }}>
      <h1 style={{ fontSize: "20px", marginBottom: "10px" }}>🗂️ LP Review Portal</h1>
      <p style={{ fontSize: "14px", marginBottom: "14px" }}>
        This portal is for use by <strong>GNF LPs only</strong>. You must be logged in to review pitches.
      </p>

      <button
        onClick={handleGoogleLogin}
        style={{
          backgroundColor: "#ffccff",
          border: "2px outset #cc66cc",
          borderRadius: "6px",
          padding: "8px 14px",
          fontWeight: "bold",
          cursor: "pointer",
          fontSize: "14px",
          marginBottom: "16px"
        }}
      >
        Login with Google
      </button>

      <div style={{
        background: "#ffe6f0",
        padding: "16px",
        border: "2px inset #ff99cc",
        borderRadius: "8px",
        marginBottom: "20px"
      }}>
        <p style={{ fontWeight: "bold", marginBottom: "8px" }}>Email Login</p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            marginBottom: "8px",
            fontSize: "14px"
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            marginBottom: "8px",
            fontSize: "14px"
          }}
        />
        <button
          onClick={handleEmailLogin}
          style={{
            backgroundColor: "#ffccff",
            border: "2px outset #cc66cc",
            borderRadius: "6px",
            padding: "8px 14px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          Login with Email
        </button>
      </div>

      {error && <p style={{ color: "red", fontSize: "13px" }}>{error}</p>}

      <p style={{ fontSize: "13px", marginTop: "10px" }}>
        If you're interested in becoming a Good Neighbor Fund LP and supporting emerging entrepreneurs,{" "}
        <a href="#" onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: "home" }))}>
          visit the Neighborhood Navigator
        </a>{" "}
        to learn more.
      </p>

      <p style={{ fontSize: "11px", color: "#777", marginTop: "10px" }}>
        LP accounts must be created by an Admin via the Admin Panel. Self-signup is not available.
      </p>
    </div>
  );
}
