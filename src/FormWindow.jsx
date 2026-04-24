// FormWindow.jsx
import React from "react";

export default function FormWindow({ title, children, onClose }) {
  return (
    <div
      className="simple-form-window win95-window"
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9999,
        width: "500px",
        maxHeight: "80vh",
        overflow: "auto"
      }}
    >
      <div className="win95-titlebar">
        <span>{title}</span>
        <button
          className="win95-close-btn"
          onClick={onClose}
          aria-label="Close"
        >✖</button>
      </div>
      <div style={{ padding: "16px" }}>
        {children}
      </div>
    </div>
  );
}
