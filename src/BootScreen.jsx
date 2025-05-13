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

export default function BootScreen({ onFinish }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [desktopPreloaded, setDesktopPreloaded] = useState(false);

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
    <div className="boot-screen" style={{ background: `url('/assets/gnf-wallpaper-blue.webp')`, backgroundSize: 'cover' }}>
      <div className="boot-box">
        <div className="logo-container">
          <img
            src="/assets/gnf-logo.webp"
            alt="NeighborhoodOS Logo"
            className="boot-logo"
          />
        </div>
        <h1>NeighborhoodOS v1.1</h1>
        <p className="boot-loading-text">{bootMessages[messageIndex]}</p>

        <div className="boot-progress-container">
          <div
            className="boot-progress-bar"
            style={{ width: `${progress}%`, transition: 'width 0.11s ease-out' }}
          ></div>
        </div>
      </div>
    </div>
  );
}