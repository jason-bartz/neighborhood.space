// RetroWindow.jsx - Optimized for FounderMap
import React, { useEffect, useState, useRef } from "react";
import Draggable from "react-draggable";

export default function RetroWindow({
  title,
  children,
  onClose,
  width = 900,
  height = 550,
  center = true,
  initialPosition, 
  isLPPortal = false,
  windowId,
  zIndex = 1000,
  bringToFront
}) {
  const nodeRef = useRef(null);
  const [initialPosState, setInitialPosState] = useState(undefined);

  // Calculate position once on mount or when relevant props change
  useEffect(() => {
    let pos;
    if (initialPosition) {
      pos = initialPosition;
    } else if (center) {
      const x = Math.max(0, Math.round((window.innerWidth - width) / 2));
      const y = Math.max(40, Math.round((window.innerHeight - height) / 2));
      pos = { x, y };
    } else {
      pos = { x: 100, y: 100 }; // Default fallback
    }
    setInitialPosState(pos);
  }, [initialPosition, center, width, height]);

  // Handler for window click to bring it to front
  const handleWindowClick = () => {
    if (bringToFront && windowId) {
      bringToFront(windowId);
    }
  };

  // --- Style Logic ---
  const baseBodyStyle = {
    flex: 1, 
    overflow: "hidden", 
    padding: "16px", 
    position: "relative",
    minHeight: 0 
  };

  const lpPortalBodyOverrides = {
    padding: 0,
    overflowY: 'hidden',
    display: 'flex',
    minHeight: 0,
    flexGrow: 1,
    flexShrink: 1, 
    flexBasis: '0%', 
  };

  // Determine body style object
  const bodyStyle = isLPPortal
    ? { ...baseBodyStyle, ...lpPortalBodyOverrides }
    : baseBodyStyle;

  // Determine body class name
  const bodyClassName = `retro-window-body no-drag ${isLPPortal ? 'lpportal-body-styling' : ''}`;

  // --- Window and Title Bar Styles  ---
  const windowStyle = {
    width,
    height,
    position: "absolute", 
    top: 0, 
    left: 0, 
    backgroundColor: "#fff",
    border: "2px solid #d48fc7",
    borderRadius: "6px",
    boxShadow: "4px 4px 0 #ffbde2",
    display: "flex", 
    flexDirection: "column",
    zIndex: zIndex, // Use the provided zIndex
    overflow: 'hidden'
  };

  const titleBarStyle = {
    background: "#ffeaf5", 
    padding: "6px 12px", 
    borderBottom: "1px solid #d48fc7",
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: 'center',
    fontWeight: "bold", 
    fontSize: "14px", 
    cursor: 'grab', 
    flexShrink: 0
  };

  const closeButtonStyle = {
    background: '#ffbde2', 
    border: 'none', 
    cursor: 'pointer',
    fontWeight: 'bold', 
    padding: '0 4px', 
    lineHeight: '1'
  };

  // Render only when initial position is calculated to avoid jump
  if (initialPosState === undefined) {
    return null; 
  }

  return (
    <Draggable 
      nodeRef={nodeRef}
      handle=".retro-title-bar"
      cancel=".no-drag, .leaflet-container"
      defaultPosition={initialPosState}
    > 
      <div 
        ref={nodeRef} 
        className="retro-window" 
        style={windowStyle}
        onClick={handleWindowClick}
      >
        <div className="retro-title-bar" style={titleBarStyle}>
          <span>{title}</span>
          <button className="no-drag" onClick={onClose} style={closeButtonStyle}>✖</button>
        </div>
        <div
          className={bodyClassName}
          style={bodyStyle}
        >
          {children}
        </div>
      </div>
    </Draggable>
  );  
}