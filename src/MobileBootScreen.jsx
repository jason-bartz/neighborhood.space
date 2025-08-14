import React, { useState, useEffect } from "react";
import "./App.css";

const bootMessages = [
  "Booting up NeighborhoodOS...",
  "Spinning up micro-grants...",
  "Reticulating splines...",
  "Finishing up today's Wordle...",
  "Petting neighborhood dogs...",
  "Installing good_vibes.dmg..."
];

export default function MobileBootScreen({ onFinish }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [desktopPreloaded, setDesktopPreloaded] = useState(false);

  // Handle click/touch bypass
  const handleBypass = () => {
    if (onFinish) {
      onFinish(false); // Skip directly to mobile landing
    }
  };

  // Handle preloading desktop components
  useEffect(() => {
    if (progress >= 50 && !desktopPreloaded) {
      setDesktopPreloaded(true);
      if (onFinish) {
        onFinish(true); // true = preload mode
      }
    }
  }, [progress, desktopPreloaded, onFinish]);

  // Progress bar animation and boot messages
  useEffect(() => {
    if (progress >= 100) return;

    const timer = setTimeout(() => {
      const increment = Math.random() * 2.5 + 2.5; 
      const newProgress = Math.min(progress + increment, 100);
      setProgress(newProgress);

      const newIndex = Math.min(
        Math.floor((newProgress / 100) * bootMessages.length),
        bootMessages.length - 1
      );
      setMessageIndex(newIndex);

      // Signal boot completion
      if (newProgress >= 100 && onFinish) {
        onFinish(false); // false = final boot complete
      }
    }, 110); 

    return () => clearTimeout(timer);
  }, [progress, onFinish]);

  return (
    <div 
      className="boot-screen" 
      onClick={handleBypass}
      onTouchStart={handleBypass}
      style={{ 
        background: `url('/assets/gnf-wallpaper-blue.webp')`, 
        backgroundSize: 'cover',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        cursor: 'default'
      }}>
      <div className="boot-box" style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        width: '85%',
        maxWidth: '350px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div className="logo-container">
          <img
            src="/assets/gnf-logo.webp"
            alt="NeighborhoodOS Logo"
            className="boot-logo"
            style={{
              width: '120px',
              height: 'auto',
              marginBottom: '15px'
            }}
          />
        </div>
        <h1 style={{
          fontSize: '20px',
          margin: '0 0 10px 0',
          fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif'
        }}>NeighborhoodOS v2.0</h1>
        <p className="boot-loading-text" style={{
          fontSize: '14px',
          margin: '0 0 15px 0',
          textAlign: 'center',
          fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif'
        }}>{bootMessages[messageIndex]}</p>

        <div className="boot-progress-container" style={{
          width: '100%',
          height: '20px',
          background: '#f0f0f0',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #ccc'
        }}>
          <div
            className="boot-progress-bar"
            style={{ 
              width: `${progress}%`, 
              height: '100%',
              background: 'linear-gradient(to right, #FFD6EC, #d48fc7)',
              transition: 'width 0.11s ease-out' 
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}