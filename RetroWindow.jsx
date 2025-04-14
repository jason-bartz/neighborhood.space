// RetroWindow.jsx
import React, { useEffect, useState } from "react";
import Draggable from "react-draggable";

export default function RetroWindow({
  title,
  children,
  onClose,
  width = 600,
  height = 600,
  center = true,
}) {
  const [position, setPosition] = useState({ x: 100, y: 100 });

  useEffect(() => {
    if (center) {
      const x = (window.innerWidth - width) / 2;
      const y = (window.innerHeight - height) / 2;
      setPosition({ x, y });
    }
  }, [center, width, height]);

  return (
    <Draggable
      handle=".retro-title-bar"
      cancel=".no-drag"
      defaultPosition={position}
    >
      <div
        className="retro-window"
        style={{
          width,
          height,
          position: "absolute",
          backgroundColor: "#fff",
          border: "2px solid #d48fc7",
          borderRadius: "6px",
          boxShadow: "4px 4px 0 #ffbde2",
          display: "flex",
          flexDirection: "column",
          zIndex: 1000,
        }}
      >
        <div className="retro-title-bar">
          <span>{title}</span>
          <button onClick={onClose}>✖</button>
        </div>

        <div
          className="retro-window-body no-drag"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            position: "relative",
          }}
        >
          {children}
        </div>
      </div>
    </Draggable>
  );
}
