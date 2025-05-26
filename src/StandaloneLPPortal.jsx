// StandaloneLPPortal.jsx
import React, { useEffect } from 'react';
import LimitedPartnerPortal from './components/limited-partner/LimitedPartnerPortal/LimitedPartnerPortal';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseConfig";

export default function StandaloneLPPortal() {
  // Add taskbar styles and clock functionality
  useEffect(() => {
    // Create and inject taskbar dynamically for the portal route
    const createTaskbar = () => {
      const existingTaskbar = document.querySelector('.portal-taskbar');
      if (existingTaskbar) return;

      const taskbar = document.createElement('div');
      taskbar.className = 'portal-taskbar';
      taskbar.innerHTML = `
        <a href="/" class="taskbar-left">
          <img src="/favicon.png" alt="GNF icon" class="taskbar-icon" />
          <span>NeighborhoodOS</span>
        </a>
        <div class="taskbar-right">
          <span class="retro-clock" id="portal-taskbar-clock"></span>
        </div>
      `;
      document.body.insertBefore(taskbar, document.body.firstChild);

      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .portal-taskbar {
          position: fixed;
          top: 0;
          width: 100%;
          background: #fcd6e2;
          padding: 6px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: "Courier New", Courier, monospace;
          font-weight: bold;
          font-size: 14px;
          border-bottom: 2px solid #ecacc5;
          z-index: 1000;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .portal-taskbar .taskbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
        }
        
        .portal-taskbar .taskbar-left:hover {
          opacity: 0.8;
        }
        
        .portal-taskbar .taskbar-icon {
          width: 16px;
          height: 16px;
        }
        
        .portal-taskbar .taskbar-right {
          font-weight: bold;
          white-space: nowrap;
          margin-right: 30px;
        }
        
        body {
          margin: 0;
          padding: 0;
        }
      `;
      document.head.appendChild(style);

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
        const clock = document.getElementById('portal-taskbar-clock');
        if (clock) {
          clock.textContent = `${timeStr} ${dateStr} 2002`;
        }
      };
      
      updateClock();
      const interval = setInterval(updateClock, 60000);
      
      return () => clearInterval(interval);
    };

    const cleanup = createTaskbar();
    return () => {
      if (cleanup) cleanup();
      const taskbar = document.querySelector('.portal-taskbar');
      if (taskbar) taskbar.remove();
    };
  }, []);

  // Full-screen wrapper for the LP Portal
  const handleOpenGNFWebsite = () => {
    // In standalone mode, navigate to home
    window.location.href = '/';
  };

  // Store auth state for desktop navigation
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Store auth state for desktop to check
        sessionStorage.setItem('lpPortalAuthenticated', 'true');
      } else {
        sessionStorage.removeItem('lpPortalAuthenticated');
      }
    });
    return unsubscribe;
  }, []);

  return (
    <div style={{ 
      position: 'fixed',
      top: '40px', // Below taskbar
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      background: '#f0f0f0'
    }}>
      <LimitedPartnerPortal 
        onOpenGNFWebsite={handleOpenGNFWebsite}
        isStandalone={true}
      />
    </div>
  );
}