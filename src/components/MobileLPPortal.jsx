// MobileLPPortal.jsx
import React from "react";
import LimitedPartnerPortal from "./limited-partner/LimitedPartnerPortal/LimitedPartnerPortal";

// Mobile adaptation of the desktop LPPortal for full functionality
export default function MobileLPPortal({ onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "var(--gnf-bg)",
        zIndex: 2000,
        overflowY: "auto",
        fontFamily: 'var(--font-body)'
      }}
    >
      {/* Mobile-specific Title Bar — Win95 style */}
      <div className="win95-titlebar" style={{
        padding: "6px 12px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        cursor: "default"
      }}>
        <span>👨‍👩‍👧‍👦 LP Portal</span>
        <button
          onClick={onClose}
          className="win95-close-btn"
        >
          ✖
        </button>
      </div>

      {/* Full Desktop LP Portal - no simplified mobile version */}
      <div style={{
        padding: "10px",
        paddingBottom: "80px"
      }}>
        <LimitedPartnerPortal
          onOpenGNFWebsite={() => window.open("https://goodneighbor.fund", "_blank")}
        />
      </div>
    </div>
  );
}