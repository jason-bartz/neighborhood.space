// RetroNav.jsx
import React from "react";
import { Home, UserCheck, Lock, FileText } from "lucide-react"; 
import "./App.css"; 

function RetroNav({ setRole }) {
  return (
    <div className="retro-navbar">
      <div className="retro-nav-left">
        <button onClick={() => setRole("applicant")} className="nav-button">
          <FileText size={16} style={{ marginRight: 6 }} /> Submit Pitch
        </button>
      </div>
      <div className="retro-nav-right">
        <button onClick={() => setRole("lp")} className="nav-button">
          <UserCheck size={16} style={{ marginRight: 6 }} /> Review Pitches
        </button>
        <button onClick={() => setRole("admin")} className="nav-button">
          <Lock size={16} style={{ marginRight: 6 }} /> Admin Panel
        </button>
        <a href="https://www.goodneighbor.fund" target="_blank" rel="noopener noreferrer" className="nav-button">
          <Home size={16} style={{ marginRight: 6 }} /> Home
        </a>
      </div>
    </div>
  );
}

export default RetroNav;
