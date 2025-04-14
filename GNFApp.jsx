// GNFApp.jsx
import React, { useState, useEffect } from "react";
import LPLogin, { LPLogout } from "./LPLogin";
import PitchForm from "./PitchForm";
import { Home, UserCheck, Lock, FileText } from "lucide-react";
import { auth } from "./firebaseConfig";
import "./App.css";

function GNFApp() {
  const [role, setRole] = useState(() => localStorage.getItem("gnf-role") || "applicant");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = auth?.onAuthStateChanged?.((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("gnf-role", role);
  }, [role]);

  const RetroNav = () => (
    <nav className="navbar skeuo-nav spaced-nav">
      <div className="nav-left">
        <button className="submit-button" onClick={() => setRole("applicant")}> 
          <FileText size={16} /> Submit Pitch
        </button>
      </div>
      <div className="nav-right">
        <button onClick={() => setRole("lp")}> <UserCheck size={16} /> Review Pitches </button>
        <button onClick={() => setRole("admin")}> <Lock size={16} /> Admin Panel </button>
        <button className="home-button" onClick={() => window.open("https://www.goodneighbor.fund", "_blank")}> <Home size={16} /> Home </button>
      </div>
    </nav>
  );

  return (
    <div className="retro-container skeuo-gradient lofi-bg">
      <div className="logo-container">
        <h1 className="welcome-text skeuo-title">Welcome to the Neighborhood</h1>
      </div>
      <RetroNav />

      {role === "applicant" && (
        <div className="content-panel">
          <h2>GNF Pitch Application 💜</h2>

          <p>📝 Please fill out this application to be considered for a Good Neighbor Fund $1,000 micro-grant.</p>
          <p>This typically takes 10–15 minutes to complete and requires a 60-second pitch video to be uploaded.</p>

          <h3>✅ What we look for:</h3>
          <ul>
            <li>Early-stage businesses at the ideation stage</li>
            <li>Clear understanding of the problem you're solving</li>
            <li>Maximum impact use of the $1,000</li>
            <li>Passion in your pitch video</li>
          </ul>

          <h3>🚫 What we typically avoid:</h3>
          <ul>
            <li>Personal use or self-promotion (e.g. home reno, utility bills)</li>
            <li>Short-term events/projects</li>
            <li>Established companies with significant revenue/funding</li>
            <li>Unclear use of funds or no pitch video</li>
          </ul>

          <p>📌 These are just guidelines—please apply even if you're unsure!</p>
          <p>Learn more at <a href="https://www.goodneighbor.fund" target="_blank" rel="noopener noreferrer">goodneighbor.fund</a></p>
          <p>Thank you for being a good neighbor 💜</p>

          <PitchForm />
        </div>
      )}

      {role === "lp" && (
        <div className="content-panel">
          {!isLoggedIn ? (
            <LPLogin onLogin={() => setIsLoggedIn(true)} />
          ) : (
            <>
              <p>Welcome LP! 🎉</p>
              <LPLogout onLogout={() => setIsLoggedIn(false)} />
              <p>[LP Review Portal Placeholder]</p>
            </>
          )}
        </div>
      )}

      {role === "admin" && (
        <div className="content-panel">
          <p>[Admin Panel Placeholder]</p>
        </div>
      )}
    </div>
  );
}

export default GNFApp;
