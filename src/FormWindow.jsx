// FormWindow.jsx
import React from "react";

export default function FormWindow({ title, children, onClose }) {
  return (
    <div 
      className="simple-form-window"
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9999,
        width: "500px",
        maxHeight: "80vh",
        overflow: "auto",
        background: "white",
        border: "2px solid #d48fc7",
        borderRadius: "6px",
        boxShadow: "4px 4px 0 #ffbde2"
      }}
    >
      <div 
        style={{
          padding: "6px 12px",
          background: "#ffeaf5",
          borderBottom: "1px solid #d48fc7",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <span style={{ fontWeight: "bold" }}>{title}</span>
        <button 
          onClick={onClose}
          style={{
            background: "#ffbde2",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
            padding: "4px 8px"
          }}
        >✖</button>
      </div>
      <div style={{ padding: "16px" }}>
        {children}
      </div>
    </div>
  );
}