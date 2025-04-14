// DesktopApp.jsx (Updated for Music Player)
import React, { useEffect, useState } from "react";
import BootScreen from "./BootScreen";
import DesktopIcon from "./DesktopIcon";
import RetroWindow from "./RetroWindow";
import StandalonePitchForm from "./StandalonePitchForm";
import MusicPlayer from "./MusicPlayer"; // Keep MusicPlayer
import LPPortal from "./LPPortal";
import BrowserWindow from "./BrowserWindow";
// Removed auth/db imports - handled inside LPPortal
import "./App.css";

export default function DesktopApp() {
  const [booted, setBooted] = useState(false);
  const [openApp, setOpenApp] = useState("website"); // Tracks primary focused app window
  const [currentTime, setCurrentTime] = useState("");
  const [showMusic, setShowMusic] = useState(true); // Music player visibility controlled separately

  // Boot screen timer
  useEffect(() => { const timer = setTimeout(() => setBooted(true), 8800); return () => clearTimeout(timer); }, []);

  // Clock logic
  useEffect(() => { const updateClock = () => { const now = new Date(); const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); setCurrentTime(`${dateStr} ${timeStr}`); }; updateClock(); const interval = setInterval(updateClock, 1000 * 60); return () => clearInterval(interval); }, []);

  if (!booted) { return <BootScreen onFinish={() => setBooted(true)} />; }

  // Function to handle opening main app windows (plays sound, sets focus)
  const handleAppOpen = (appName) => {
      const clickSound = document.getElementById("click-sound");
      if (clickSound) { clickSound.currentTime = 0; clickSound.play().catch(e => console.error("Error playing click sound:", e)); }
      setOpenApp(appName); // Set the currently "active" app window
      // We DON'T control showMusic here
  };

  return (
    <div className="desktop">
      <audio id="click-sound" src="/sounds/click.mp3" preload="auto" />

      {/* Taskbar */}
      <div className="taskbar"> {/* ... (no changes) ... */}
        <div className="taskbar-left"> <img src="/favicon.png" alt="GNF icon" className="taskbar-icon" /> <span>NeighborhoodOS</span> </div>
        <div className="taskbar-right"> <span className="retro-clock">{currentTime}</span> </div>
      </div>

      {/* Desktop Icons */}
      <div className="icon-grid">
        {/* Left Side Icons */}
        <div className="icon-left">
          <DesktopIcon icon="/assets/icon-submit.png" label="Submit Pitch" onClick={() => handleAppOpen("submit")} />
          <DesktopIcon icon="/assets/icon-review.png" label="LP Portal" onClick={() => handleAppOpen("lpPortal")} />
        </div>
         {/* Right Side Icons */}
        <div className="icon-right">
          <DesktopIcon icon="/assets/icon-browser.png" label="N. Navigator" onClick={() => handleAppOpen("website")} />
          <DesktopIcon
            icon="/assets/radio.png"
            label="Radio FM"
            onClick={() => {
                // --- CHANGE: Only control showMusic state ---
                setShowMusic(true);
                // Do NOT call handleAppOpen here
                // --- End Change ---
                // Play click sound manually if desired for icon click
                const clickSound = document.getElementById("click-sound");
                if (clickSound) { clickSound.currentTime = 0; clickSound.play().catch(e => console.error("Error playing click sound:", e)); }
            }}
          />
        </div>
      </div>

      {/* App Windows (Managed by openApp state) */}
      {openApp === "submit" && ( <StandalonePitchForm onClose={() => setOpenApp(null)} /> )}
      {openApp === "lpPortal" && ( <RetroWindow title="LP Portal" onClose={() => setOpenApp(null)}> <LPPortal onOpenGNFWebsite={() => handleAppOpen("website")} /> </RetroWindow> )}
      {openApp === "website" && ( <BrowserWindow onClose={() => setOpenApp(null)} /> )}

      {/* Music Player (Rendered independently based on showMusic state) */}
      {/* --- CHANGE: Removed openApp === 'music' condition --- */}
      {showMusic && (
        <MusicPlayer
          onClose={() => {
            setShowMusic(false); // Close button only hides it
          }}
        />
      )}
      {/* --- End Change --- */}

    </div>
  );
}