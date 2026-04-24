// WindowFrame.jsx
import React, { useEffect, useState, useRef } from "react";
import Draggable from "react-draggable";

export default function WindowFrame({
  title,
  children,
  onClose,
  width = 600,
  height = 600,
  center = false,
  initialPosition,
  isLPPortal = false,
  noPadding = false,
  windowId,
  zIndex = 1000,
  bringToFront,
  cascadeOffset = 0
}) {
  const nodeRef = useRef(null);
  const [mountState, setMountState] = useState(undefined);

  // Reserved chrome: top taskbar + bottom dock. Windows clamp to the space
  // between these so they don't slide behind the dock on shorter viewports.
  const TASKBAR_RESERVE = 36;
  const DOCK_RESERVE = 96;
  const SIDE_PAD = 16;

  // Calculate size + position once on mount. cascadeOffset is intentionally
  // read at mount-time only — the window shouldn't jump if the slot later changes.
  useEffect(() => {
    const maxW = Math.max(320, window.innerWidth - SIDE_PAD * 2);
    const maxH = Math.max(320, window.innerHeight - TASKBAR_RESERVE - DOCK_RESERVE);
    const effW = Math.min(width, maxW);
    const effH = Math.min(height, maxH);

    const maxX = Math.max(0, window.innerWidth - effW - SIDE_PAD);
    const maxY = Math.max(TASKBAR_RESERVE, window.innerHeight - effH - DOCK_RESERVE);

    let pos;
    if (initialPosition) {
      pos = {
        x: Math.min(maxX, Math.max(SIDE_PAD, initialPosition.x + cascadeOffset)),
        y: Math.min(maxY, Math.max(TASKBAR_RESERVE, initialPosition.y + cascadeOffset))
      };
    } else if (center) {
      const availableH = window.innerHeight - TASKBAR_RESERVE - DOCK_RESERVE;
      const baseX = Math.max(SIDE_PAD, Math.round((window.innerWidth - effW) / 2));
      const baseY = TASKBAR_RESERVE + Math.max(0, Math.round((availableH - effH) / 2));
      pos = {
        x: Math.min(maxX, baseX + cascadeOffset),
        y: Math.min(maxY, baseY + cascadeOffset)
      };
    } else {
      pos = {
        x: Math.min(maxX, 100 + cascadeOffset),
        y: Math.min(maxY, Math.max(TASKBAR_RESERVE, 100 + cascadeOffset))
      };
    }

    setMountState({ w: effW, h: effH, pos });
  }, [initialPosition, center, width, height]);

  // Handler for window click to bring it to front
  const handleWindowClick = () => {
    if (bringToFront && windowId) {
      bringToFront(windowId);
    }
  };

  // Focus trap — cycles Tab / Shift+Tab within the window when focus is inside it.
  // Multiple open windows each run their own trap; only the one containing
  // the active element intercepts keystrokes, so windows don't fight each other.
  const handleKeyDown = (e) => {
    if (e.key !== "Tab") return;
    const root = nodeRef.current;
    if (!root || !root.contains(document.activeElement)) return;

    const focusables = root.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Position/layout-only styles; visual chrome lives in .win95-window / .win95-titlebar / .win95-close-btn
  const windowStyle = {
    width: mountState ? mountState.w : width,
    height: mountState ? mountState.h : height,
    position: "absolute",
    top: 0,
    left: 0,
    display: "flex",
    flexDirection: "column",
    zIndex: zIndex,
    overflow: "hidden"
  };

  const titleBarStyle = {
    flexShrink: 0
  };

  // Base body style for content area
  const baseBodyStyle = {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    position: "relative",
    minHeight: 0
  };

  // Special styles for LP Portal
  const lpPortalBodyOverrides = {
    padding: 0,
    overflowY: "hidden",
    display: "flex",
    minHeight: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%"
  };

  // Flush-body override (e.g., browser window) — the child manages its own
  // padding and scroll, so the body must be padding-free and flex to let
  // the child's flex:1 fill the height.
  const noPaddingBodyOverrides = {
    padding: 0,
    overflowY: "hidden",
    display: "flex",
    flexDirection: "column"
  };

  // Determine which body style to use
  let bodyStyle = baseBodyStyle;
  if (isLPPortal) {
    bodyStyle = { ...baseBodyStyle, ...lpPortalBodyOverrides };
  } else if (noPadding) {
    bodyStyle = { ...baseBodyStyle, ...noPaddingBodyOverrides };
  }

  // Determine body class name
  const bodyClassName = `retro-window-body no-drag ${isLPPortal ? "lpportal-body-styling" : ""}`;

  // Wait until size + position are calculated to avoid render jump
  if (mountState === undefined) {
    return null;
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".retro-title-bar"
      cancel=".no-drag, .leaflet-container"
      defaultPosition={mountState.pos}
    >
      <div
        ref={nodeRef}
        className="retro-window win95-window"
        style={windowStyle}
        onClick={handleWindowClick}
        onKeyDown={handleKeyDown}
      >
        <div className="retro-title-bar win95-titlebar" style={titleBarStyle}>
          <span>{title}</span>
          <button
            className="no-drag win95-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✖
          </button>
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