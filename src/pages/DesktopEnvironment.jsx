// DesktopEnvironment.jsx
import React, { useEffect, useState, useRef } from "react";
import BootScreen from "../BootScreen";
import WindowFrame from "../components/ui/WindowFrame/WindowFrame";
import GrantApplicationForm from "../components/grant/GrantApplicationForm";
import LPApplication from "./standalone/LPApplication";
import LimitedPartnerPortal from "../components/lp/LimitedPartnerPortal";
import BrowserWindow from "../BrowserWindow";
import BuddyMessenger from "../components/BuddyMessenger";
import FounderMap from "../components/FounderMap";
import MobileLanding from "../MobileLanding";
import Dock from "../components/Dock/Dock";
import "../styles/App.css";

export default function DesktopEnvironment() {
  // Skip the boot screen if the user has already booted this session
  // (e.g. they're navigating back from /pitch or /terms).
  const hasBooted = (() => {
    try {
      return sessionStorage.getItem("gnf-has-booted") === "1";
    } catch {
      return false;
    }
  })();

  // State management
  const [bootSequence, setBootSequence] = useState(hasBooted ? "complete" : "booting");
  const [openApp, setOpenApp] = useState("website");
  const [currentTime, setCurrentTime] = useState("");
  const [desktopReady, setDesktopReady] = useState(hasBooted);
  const [showMessenger, setShowMessenger] = useState(false);
  const [showFounderMap, setShowFounderMap] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // const [showBlockParty, setShowBlockParty] = useState(false); // BlockParty removed
  const [openApps, setOpenApps] = useState(['website']); // Track all open apps
  const [lpApplicationChapter, setLpApplicationChapter] = useState("");

  // Improved z-index management - Set website to have a higher initial z-index
  // Use a ref for the counter so rapid successive opens can't read a stale value.
  const zCounterRef = useRef(1100);
  const [windowZIndexes, setWindowZIndexes] = useState({
    website: 1100, // Higher initial z-index for the browser window
    lpPortal: 1000,
    submit: 1000,
    lpApplication: 1000,
    buddyMessenger: 1000,
    founderMap: 1000,
    musicPlayer: 1000
    // blockParty: 1000 - removed
  });

  // Cascade tracking — each open window gets a slot so they fan out
  // diagonally instead of perfectly overlapping. Slots are released on close
  // and the counter resets when the desktop has no open windows.
  const [cascadeSlots, setCascadeSlots] = useState({ website: 0 });
  const nextCascadeStepRef = useRef(1);
  const CASCADE_STEP_PX = 30;
  const CASCADE_WRAP = 6; // wrap so offsets stay on-screen after many opens

  // Improved bringToFront function
  const bringWindowToFront = (windowId) => {
    zCounterRef.current += 10;
    const newZIndex = zCounterRef.current;
    setWindowZIndexes(prev => ({
      ...prev,
      [windowId]: newZIndex
    }));
  };

  const assignCascadeSlot = (windowId) => {
    setCascadeSlots(prev => {
      if (prev[windowId] !== undefined) return prev; // keep existing slot
      const slot = nextCascadeStepRef.current % CASCADE_WRAP;
      nextCascadeStepRef.current += 1;
      return { ...prev, [windowId]: slot };
    });
  };

  const releaseCascadeSlot = (windowId) => {
    setCascadeSlots(prev => {
      if (prev[windowId] === undefined) return prev;
      const next = { ...prev };
      delete next[windowId];
      if (Object.keys(next).length === 0) {
        nextCascadeStepRef.current = 0;
      }
      return next;
    });
  };

  const cascadeOffsetFor = (windowId) =>
    (cascadeSlots[windowId] ?? 0) * CASCADE_STEP_PX;

  // Check for mobile devices
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      if (/android|iphone|ipad|ipod/i.test(userAgent) || (window.innerWidth <= 768 && isTouchDevice)) {
        setIsMobile(true);
      } else {
        setIsMobile(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Clock functionality
  const updateClock = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    setCurrentTime(`${timeStr} · ${dateStr} ${now.getFullYear()}`);
  };

  useEffect(() => {
    if (desktopReady) {
      updateClock();
      const interval = setInterval(updateClock, 1000 * 60);
      return () => clearInterval(interval);
    }
  }, [desktopReady]);

  // NEW EFFECT: Bring website window to front when desktop is ready
  useEffect(() => {
    if (desktopReady) {
      // Small delay to ensure all windows are rendered
      setTimeout(() => {
        bringWindowToFront("website");
      }, 100);
    }
  }, [desktopReady]); // Only run when desktop becomes ready

  // Boot sequence handling
  const handleBootProgress = (isPreloading) => {
    if (isPreloading) {
      setBootSequence("preloaded");
    } else {
      setBootSequence("complete");
      setTimeout(() => {
        setDesktopReady(true);
        try {
          sessionStorage.setItem("gnf-has-booted", "1");
        } catch {}
      }, 300);
    }
  };

  // App opening with sound effects
  const handleAppOpen = (appName) => {
    const clickSound = document.getElementById("click-sound");
    if (clickSound) {
      clickSound.volume = 0.25;
      clickSound.currentTime = 0;
      clickSound.play().catch(() => {
        // Silent catch for browsers that block autoplay
      });
    }
    setOpenApp(appName);
    assignCascadeSlot(appName);
    if (!openApps.includes(appName)) {
      setOpenApps([...openApps, appName]);
    }
    // Defer bringToFront so it runs after any click-bubble bringToFront calls
    // from the triggering window (e.g. clicking a CTA inside the Navigator
    // bubbles up to WindowFrame.onClick, which would otherwise re-front the
    // Navigator and leave the new window behind it).
    queueMicrotask(() => bringWindowToFront(appName));
  };

  // Handle dock app clicks
  const handleDockAppClick = (appId) => {
    switch(appId) {
      case 'website':
        handleAppOpen('website');
        break;
      case 'submit':
        handleAppOpen('submit');
        break;
      case 'buddyMessenger':
        const buddySound = document.getElementById("buddyin-sound");
        if (buddySound) {
          buddySound.volume = 0.25;
          buddySound.currentTime = 0;
          buddySound.play().catch(() => {});
        }
        setShowMessenger(true);
        assignCascadeSlot('buddyMessenger');
        bringWindowToFront('buddyMessenger');
        break;
      case 'founderMap':
        setShowFounderMap(true);
        assignCascadeSlot('founderMap');
        bringWindowToFront('founderMap');
        break;
      case 'lpPortal':
        // Always navigate to the standalone portal page (handles its own auth)
        window.location.href = '/portal';
        break;
      default:
        break;
    }
  };

  // On mobile, don't skip the boot sequence
  if (isMobile) {
    return <MobileLanding initialBootDone={false} />;
  }
  
  // Boot screen only for desktop
  if (bootSequence !== "complete" || !desktopReady) {
    return <BootScreen onFinish={handleBootProgress} />;
  }

  // Main desktop UI
  return (
    <div className="desktop">
      {/* Sound effects */}
      <audio id="click-sound" src="/sounds/click-on.mp3" preload="auto" />
      <audio id="buddyin-sound" src="/sounds/buddyIn.mp3" preload="auto" />

      {/* Taskbar */}
      <div className="taskbar">
        <div className="taskbar-left">
          <img src="/assets/gnf-logo.png" alt="GNF logo" className="taskbar-icon" />
          <span>neighborhoodOS</span>
        </div>
        <div className="taskbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a
              href="https://www.linkedin.com/company/good-neighbor-fund"
              target="_blank"
              rel="noopener noreferrer"
              title="LinkedIn"
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#000" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a
              href="https://www.instagram.com/goodneighborfund/"
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram"
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#000" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            <a
              href="https://goodneighbors.substack.com"
              target="_blank"
              rel="noopener noreferrer"
              title="Newsletter"
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#000" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </a>
          </div>
          <span className="retro-clock">{currentTime}</span>
        </div>
      </div>

      {/* Application Windows */}
      {openApps.includes("submit") && (
        <GrantApplicationForm
          onClose={() => {
            setOpenApps(prev => prev.filter(app => app !== 'submit'));
            if (openApp === 'submit') setOpenApp(null);
            releaseCascadeSlot('submit');
          }}
          zIndex={windowZIndexes.submit}
          windowId="submit"
          bringToFront={bringWindowToFront}
          cascadeOffset={cascadeOffsetFor('submit')}
        />
      )}

      {openApps.includes("website") && (
        <WindowFrame
          title="Neighborhood Navigator"
          onClose={() => {
            setOpenApps(prev => prev.filter(app => app !== 'website'));
            if (openApp === 'website') setOpenApp(null);
            releaseCascadeSlot('website');
          }}
          width={1200}
          height={840}
          center
          noPadding
          windowId="website"
          zIndex={windowZIndexes.website}
          bringToFront={bringWindowToFront}
          cascadeOffset={cascadeOffsetFor('website')}
        >
          <BrowserWindow
            onClose={() => {
              setOpenApps(prev => prev.filter(app => app !== 'website'));
              if (openApp === 'website') setOpenApp(null);
              releaseCascadeSlot('website');
            }}
            onPitchClick={() => handleAppOpen("submit")}
            onLpApplicationClick={(chapter) => {
              setLpApplicationChapter(chapter || "");
              handleAppOpen("lpApplication");
            }}
          />
        </WindowFrame>
      )}

      {openApps.includes("lpApplication") && (
        <WindowFrame
          title="Limited Partner Application"
          onClose={() => {
            setOpenApps(prev => prev.filter(app => app !== 'lpApplication'));
            if (openApp === 'lpApplication') setOpenApp(null);
            releaseCascadeSlot('lpApplication');
          }}
          width={720}
          height={Math.min(900, window.innerHeight - 80)}
          center
          noPadding
          windowId="lpApplication"
          zIndex={windowZIndexes.lpApplication}
          bringToFront={bringWindowToFront}
          cascadeOffset={cascadeOffsetFor('lpApplication')}
        >
          <LPApplication
            onClose={() => {
              setOpenApps(prev => prev.filter(app => app !== 'lpApplication'));
              if (openApp === 'lpApplication') setOpenApp(null);
              releaseCascadeSlot('lpApplication');
            }}
            initialChapter={lpApplicationChapter}
            hideFrame
          />
        </WindowFrame>
      )}

      {openApps.includes("lpPortal") && (
        <WindowFrame
          title="LP Portal"
          onClose={() => {
            setOpenApps(prev => prev.filter(app => app !== 'lpPortal'));
            if (openApp === 'lpPortal') setOpenApp(null);
            releaseCascadeSlot('lpPortal');
          }}
          width={500}
          height={600}
          center
          isLPPortal
          windowId="lpPortal"
          zIndex={windowZIndexes.lpPortal}
          bringToFront={bringWindowToFront}
          cascadeOffset={cascadeOffsetFor('lpPortal')}
        >
          <LimitedPartnerPortal onOpenGNFWebsite={() => handleAppOpen("website")} />
        </WindowFrame>
      )}

      {showMessenger && (
        <WindowFrame
          title="Buddy Messenger"
          onClose={() => {
            setShowMessenger(false);
            releaseCascadeSlot('buddyMessenger');
          }}
          width={490}
          height={400}
          initialPosition={{ x: 40, y: window.innerHeight - 500 }}
          windowId="buddyMessenger"
          zIndex={windowZIndexes.buddyMessenger}
          bringToFront={bringWindowToFront}
          cascadeOffset={cascadeOffsetFor('buddyMessenger')}
        >
          <BuddyMessenger onClose={() => {
            setShowMessenger(false);
            releaseCascadeSlot('buddyMessenger');
          }} />
        </WindowFrame>
      )}

      {/* BlockParty component removed
      {showBlockParty && 
        <BlockParty 
          onClose={() => setShowBlockParty(false)} 
          windowId="blockParty"
          zIndex={windowZIndexes.blockParty}
          bringToFront={bringWindowToFront}
        />
      }
      */}

       
      {showFounderMap && (
        <WindowFrame
          title="Awardee Map"
          onClose={() => {
            setShowFounderMap(false);
            releaseCascadeSlot('founderMap');
          }}
          width={1200}
          height={840}
          center
          windowId="founderMap"
          zIndex={windowZIndexes.founderMap}
          bringToFront={bringWindowToFront}
          cascadeOffset={cascadeOffsetFor('founderMap')}
        >
          <FounderMap
            onClose={() => {
              setShowFounderMap(false);
              releaseCascadeSlot('founderMap');
            }}
            windowId="founderMap"
            bringToFront={bringWindowToFront}
            isEmbedded={true}
          />
        </WindowFrame>
      )}

      {/* Dock Component */}
      <Dock
        openApps={openApps}
        onAppClick={handleDockAppClick}
        showMessenger={showMessenger}
        showFounderMap={showFounderMap}
      />
    </div>
  );
}