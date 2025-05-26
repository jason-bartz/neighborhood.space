// DesktopEnvironment.jsx - Updated to fix double window issue and margin
import React, { useEffect, useState, useRef } from "react";
import BootScreen from "../../../BootScreen";
import AppIcon from "../../../components/ui/AppIcon/AppIcon";
import WindowFrame from "../../../components/ui/WindowFrame/WindowFrame";
import GrantApplicationForm from "../../../components/grant-management/GrantApplicationForm/GrantApplicationForm";
import MusicPlayer from "../../../MusicPlayer";
import LimitedPartnerPortal from "../../../components/limited-partner/LimitedPartnerPortal/LimitedPartnerPortal";
import BrowserWindow from "../../../BrowserWindow";
import BuddyMessenger from "../../../components/BuddyMessenger";
// Regular imports for map components
import FounderMap from '../../../components/FounderMap';
import NeighborhoodResources from '../../../components/NeighborhoodResources';
import MobileLanding from "../../../MobileLanding";
import StickyNote from "../../../StickyNote";
import Dock from "../../../components/Dock/Dock";
import "../../../App.css";
// import BlockParty from "../../../BlockParty"; // BlockParty component removed

export default function DesktopEnvironment() {
  // State management
  const [bootSequence, setBootSequence] = useState("booting");
  const [openApp, setOpenApp] = useState("website");
  const [currentTime, setCurrentTime] = useState("");
  const [showMusic, setShowMusic] = useState(true);
  const [desktopReady, setDesktopReady] = useState(false);
  const [showMessenger, setShowMessenger] = useState(false);
  const [showFounderMap, setShowFounderMap] = useState(false);
  const [showNeighborhoodMap, setShowNeighborhoodMap] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSticky, setShowSticky] = useState(true);
  // const [showBlockParty, setShowBlockParty] = useState(false); // BlockParty removed
  const [openApps, setOpenApps] = useState(['website']); // Track all open apps
  
  // Improved z-index management - Set website to have a higher initial z-index
  const [zCounter, setZCounter] = useState(1100);
  const [windowZIndexes, setWindowZIndexes] = useState({
    website: 1100, // Higher initial z-index for the browser window
    lpPortal: 1000,
    submit: 1000,
    buddyMessenger: 1000,
    founderMap: 1000,
    neighborhoodMap: 1000,
    musicPlayer: 1000,
    stickyNote: 1000
    // blockParty: 1000 - removed
  });

  // Refs
  const submitRef = useRef(null);

  // Improved bringToFront function
  const bringWindowToFront = (windowId) => {
    const newZIndex = zCounter + 10;
    setZCounter(newZIndex);
    setWindowZIndexes(prev => ({
      ...prev,
      [windowId]: newZIndex
    }));
  };

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
    setCurrentTime(`${timeStr} ${dateStr} 2002`);
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
      }, 300);
    }
  };

  // App opening with sound effects
  const handleAppOpen = (appName) => {
    const clickSound = document.getElementById("click-sound");
    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play().catch(() => {
        // Silent catch for browsers that block autoplay
      });
    }
    setOpenApp(appName);
    // Bring the newly opened app to front
    bringWindowToFront(appName);
    // Add to openApps if not already there
    if (!openApps.includes(appName)) {
      setOpenApps([...openApps, appName]);
    }
  };

  // Handle dock app clicks
  const handleDockAppClick = (appId) => {
    switch(appId) {
      case 'website':
        handleAppOpen('website');
        break;
      case 'musicPlayer':
        setShowMusic(true);
        bringWindowToFront('musicPlayer');
        break;
      case 'buddyMessenger':
        const buddySound = document.getElementById("buddyin-sound");
        if (buddySound) {
          buddySound.currentTime = 0;
          buddySound.play().catch(() => {});
        }
        setShowMessenger(true);
        bringWindowToFront('buddyMessenger');
        break;
      case 'founderMap':
        setShowFounderMap(true);
        bringWindowToFront('founderMap');
        break;
      case 'lpPortal':
        // Check if user is already authenticated
        const isAuthenticated = sessionStorage.getItem('lpPortalAuthenticated');
        if (isAuthenticated === 'true') {
          // User is logged in, go straight to portal
          window.location.href = '/portal';
        } else {
          // User needs to log in first
          handleAppOpen('lpPortal');
        }
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
          <img src="/favicon.png" alt="GNF icon" className="taskbar-icon" />
          <span>NeighborhoodOS</span>
        </div>
        <div className="taskbar-right">
          <span className="retro-clock">{currentTime}</span>
        </div>
      </div>

      {/* Desktop Icons */}
      <div
        className="icon-grid"
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: 20
        }}
      >
        {/* Left Side Icons */}
        <div
          className="icon-left"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20
          }}
        >
          <div style={{ height: 82 }} />

          <div ref={submitRef}>
            <AppIcon
              icon="/assets/icon-submit.webp"
              label="Submit Pitch"
              onClick={() => handleAppOpen("submit")}
            />
          </div>

          <AppIcon
            icon="/assets/icon-map.webp"
            label="Neighborhood Resources"
            onClick={() => {
              setShowNeighborhoodMap(true);
              bringWindowToFront("neighborhoodMap");
            }}
          />
        </div>

        {/* Right Side Icons */}
        <div
          className="icon-right"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20
          }}
        >
          {/* Social Media Icons */}
          <AppIcon
            icon="/assets/linkedin.webp"
            label="LinkedIn"
            onClick={() =>
              window.open(
                "https://www.linkedin.com/company/good-neighbor-fund",
                "_blank"
              )
            }
          />

          <AppIcon
            icon="/assets/instagram.webp"
            label="Instagram"
            onClick={() =>
              window.open(
                "https://www.instagram.com/goodneighborfund/",
                "_blank"
              )
            }
          />

          <AppIcon
            icon="/assets/newsletter.webp"
            label="Newsletter"
            onClick={() =>
              window.open(
                "https://goodneighbors.substack.com",
                "_blank"
              )
            }
          />
        </div>
      </div>

      {/* Sticky Note - Using new z-index system */}
      {showSticky && (
        <StickyNote 
          onClose={() => setShowSticky(false)} 
          zIndex={windowZIndexes.stickyNote}
          windowId="stickyNote"
          bringToFront={bringWindowToFront}
        />
      )}

      {/* Application Windows */}
      {openApp === "submit" && (
        <GrantApplicationForm 
          onClose={() => {
            setOpenApp(null);
            setOpenApps(openApps.filter(app => app !== 'submit'));
          }} 
          zIndex={windowZIndexes.submit}
          windowId="submit"
          bringToFront={bringWindowToFront}
        />
      )}

      {openApp === "website" && (
        <WindowFrame
          title={
            <div style={{ display: "flex", alignItems: "center" }}>
              <img
                src="/assets/icon-browser.webp"
                alt="Browser Icon"
                style={{ height: 16, marginRight: 8 }}
              />
              Neighborhood Navigator
            </div>
          }
          onClose={() => {
            setOpenApp(null);
            setOpenApps(openApps.filter(app => app !== 'website'));
          }}
          width={1000}
          height={700}
          center
          windowId="website"
          zIndex={windowZIndexes.website}
          bringToFront={bringWindowToFront}
        >
          <BrowserWindow
            onClose={() => {
              setOpenApp(null);
              setOpenApps(openApps.filter(app => app !== 'website'));
            }}
            onPitchClick={() => handleAppOpen("submit")}
          />
        </WindowFrame>
      )}

      {openApp === "lpPortal" && (
        <WindowFrame
          title="👥 LP Portal"
          onClose={() => {
            setOpenApp(null);
            setOpenApps(openApps.filter(app => app !== 'lpPortal'));
          }}
          width={500}
          height={600}
          center
          isLPPortal
          windowId="lpPortal"
          zIndex={windowZIndexes.lpPortal}
          bringToFront={bringWindowToFront}
        >
          <LimitedPartnerPortal onOpenGNFWebsite={() => handleAppOpen("website")} />
        </WindowFrame>
      )}

      {showMessenger && (
        <WindowFrame
          title="💬 Chatroom with xxNeighborhoodcrew"
          onClose={() => setShowMessenger(false)}
          width={490}
          height={400}
          initialPosition={{ x: 40, y: window.innerHeight - 500 }}
          windowId="buddyMessenger"
          zIndex={windowZIndexes.buddyMessenger}
          bringToFront={bringWindowToFront}
        >
          <BuddyMessenger onClose={() => setShowMessenger(false)} />
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
          title="🗺️ Awardee Map (based on founder zipcode)"
          onClose={() => setShowFounderMap(false)}
          width={900}
          height={600}
          center
          windowId="founderMap"
          zIndex={windowZIndexes.founderMap}
          bringToFront={bringWindowToFront}
        >
          <FounderMap 
            onClose={() => setShowFounderMap(false)} 
            windowId="founderMap"
            bringToFront={bringWindowToFront}
            isEmbedded={true}
          />
        </WindowFrame>
      )}

      {showNeighborhoodMap && (
        <WindowFrame
          title="📖 Neighborhood Resources - Western New York Edition"
          onClose={() => setShowNeighborhoodMap(false)}
          width={900}
          height={600}
          center
          windowId="neighborhoodMap"
          zIndex={windowZIndexes.neighborhoodMap}
          bringToFront={bringWindowToFront}
        >
          <NeighborhoodResources 
            onClose={() => setShowNeighborhoodMap(false)} 
            windowId="neighborhoodMap"
            bringToFront={bringWindowToFront}
            isEmbedded={true}
          />
        </WindowFrame>
      )}
      

      {showMusic && 
        <MusicPlayer 
          onClose={() => setShowMusic(false)} 
          windowId="musicPlayer"
          zIndex={windowZIndexes.musicPlayer}
          bringToFront={bringWindowToFront}
        />
      }

      {/* Dock Component */}
      <Dock 
        openApps={openApps}
        onAppClick={handleDockAppClick}
        showMessenger={showMessenger}
        showFounderMap={showFounderMap}
        showMusic={showMusic}
      />
    </div>
  );
}