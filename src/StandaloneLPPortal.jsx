// StandaloneLPPortal.jsx
import React, { useState, useEffect } from 'react';
import LimitedPartnerPortal from './components/limited-partner/LimitedPartnerPortal/LimitedPartnerPortal';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseConfig";
import './styles/App.css';

export default function StandaloneLPPortal() {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }));
      setCurrentDate(now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Full-screen wrapper for the LP Portal
  const handleOpenGNFWebsite = () => {
    window.location.href = '/';
  };

  // Store auth state for desktop navigation
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        sessionStorage.setItem('lpPortalAuthenticated', 'true');
      } else {
        sessionStorage.removeItem('lpPortalAuthenticated');
      }
    });
    return unsubscribe;
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      margin: 0,
      padding: 0,
      fontFamily: 'var(--font-body)'
    }}>
      {/* Standard Win95 Taskbar */}
      <div className="taskbar">
        <a href="/" className="taskbar-left" style={{ textDecoration: 'none', color: 'inherit' }}>
          <img src="/favicon.png" alt="GNF icon" className="taskbar-icon" />
          <span>NeighborhoodOS</span>
        </a>
        <div className="taskbar-right">
          <span className="retro-clock">{currentTime} · {currentDate} {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Portal content below taskbar */}
      <div style={{
        position: 'fixed',
        top: '34px',
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden'
      }}>
        <LimitedPartnerPortal
          onOpenGNFWebsite={handleOpenGNFWebsite}
          isStandalone={true}
        />
      </div>
    </div>
  );
}