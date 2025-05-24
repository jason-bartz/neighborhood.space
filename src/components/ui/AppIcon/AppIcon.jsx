// AppIcon.jsx
import React from "react";
import "../../../App.css";

export default function AppIcon({ label, icon, onClick }) {
  return (
    <div className="desktop-icon" onClick={onClick}>
      <img src={icon} alt={label} />
      <span>{label}</span>
    </div>
  );
}
