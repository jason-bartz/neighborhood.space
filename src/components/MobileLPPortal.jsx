// MobileLPPortal.jsx
import React from "react";
import LPPortal from "../LPPortal";

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
        backgroundColor: "white",
        zIndex: 2000,
        overflowY: "auto",
        fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif'
      }}
    >
      {/* Mobile-specific Title Bar */}
      <div style={{
        background: "#ffeaf5",
        borderBottom: "1px solid #d48fc7",
        padding: "10px 15px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontWeight: "bold",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <span>👨‍👩‍👧‍👦 LP Portal</span>
        <button
          onClick={onClose}
          style={{
            background: "#ffbde2",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
            padding: "0 8px",
            height: "24px",
            lineHeight: "24px",
            fontSize: "16px"
          }}
        >
          ✖
        </button>
      </div>
      
      {/* Full Desktop LP Portal - no simplified mobile version */}
      <div style={{ 
        padding: "10px",
        paddingBottom: "80px" // Add padding at bottom for mobile scrolling
      }}>
        <LPPortal 
          /* Pass any necessary props */
          onOpenGNFWebsite={() => window.open("https://goodneighbor.fund", "_blank")}
        />
      </div>
    </div>
  );
}