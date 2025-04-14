// AdminLogin.jsx
import React, { useState } from "react";
import { auth, db } from "./firebaseConfig";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import GoogleLogo from "/assets/Google.webp";

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      if (userDoc.exists()) {
        onLogin({ uid: result.user.uid, ...userDoc.data() });
      } else {
        setError("Access denied. You are not an admin.");
      }
    } catch (err) {
      console.error("Google login error:", err);
      setError("Login failed. Try again.");
    }
  };

  const handleEmailLogin = async () => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      if (userDoc.exists()) {
        onLogin({ uid: result.user.uid, ...userDoc.data() });
      } else {
        setError("Access denied. You are not an admin.");
      }
    } catch (err) {
      console.error("Email login error:", err);
      setError("Login failed. Double check your credentials.");
    }
  };

  return (
    <div
      style={{
        background: "white",
        border: "2px solid #d48fc7",
        padding: "32px",
        width: "420px",
        margin: "60px auto",
        fontFamily: "sans-serif",
        borderRadius: "6px",
        textAlign: "center"
      }}
    >
      <h2 style={{ marginBottom: "12px" }}>Admin Login</h2>
      <p>This portal is for GNF Admins only.</p>

      <button
        onClick={handleGoogleLogin}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          margin: "20px auto",
          padding: "10px 16px",
          background: "#fff",
          border: "1px solid #ccc",
          cursor: "pointer"
        }}
      >
        <img src={GoogleLogo} alt="Google" style={{ width: "20px" }} />
        Sign in with Google
      </button>

      <div style={{ marginTop: "20px" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          style={{ padding: "8px", width: "90%", marginBottom: "8px" }}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          style={{ padding: "8px", width: "90%", marginBottom: "12px" }}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={handleEmailLogin} style={{ padding: "8px 16px" }}>
          Sign in with Email
        </button>
      </div>

      {error && (
        <div style={{ marginTop: "12px", color: "red", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <p style={{ fontSize: "12px", marginTop: "24px" }}>
        Need access? Contact your chapter director.
      </p>
    </div>
  );
}