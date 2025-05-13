// BuddyMessengerIcon.jsx
import React from "react";
import buddyIcon from "./assets/BuddyMessenger-icon.webp"; 

export default function BuddyMessengerIcon({ onClick }) {
  return (
    <div
      className="desktop-icon"
      onClick={onClick}
      style={{ cursor: "pointer", textAlign: "center", width: "80px" }}
    >
      <img
        src={buddyIcon}
        alt="Buddy Messenger"
        style={{ width: "48px", height: "48px" }}
      />
      <div style={{ fontSize: "12px", marginTop: "5px" }}>Buddy Messenger</div>
    </div>
  );
}
