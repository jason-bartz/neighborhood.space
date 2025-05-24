// StickyNote.jsx
import React, { useState, useEffect, useRef } from "react";
import WindowFrame from "./components/ui/WindowFrame/WindowFrame";

export default function StickyNote({ onClose, zIndex = 1100, windowId, bringToFront }) {
  const messages = [
    "Have a business idea? Click Submit Pitch above for your shot at a $1,000 micro-grant! 💸",
    "👩‍💻 New founder looking for guidance? Click Neighborhood Resources for an interactive map!",
    "👀 Check out and follow our past grant winners via the Awardee Map!",
    "📣 Have a business idea? Click Submit Pitch above for your shot at a $1,000 micro-grant!",
    "✍️ Leave a message, a high five, or cool tip via the Buddy Messenger app!",
    "🤠 Interested in being an LP? Learn more via the Chapters tab of Neighborhood Navigator!",
    "Am I getting annoying? Click the X t o close me! I won't be offended! 😉",
    "👉 Follow us on Instagram and LinkedIn! Click the icons to the right!"
  ];

  const [msgIndex, setMsgIndex] = useState(0);
  const [wiggle, setWiggle] = useState(false);
  const nodeRef = useRef(null);

  // Cycle through messages every 7 seconds
  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex(i => (i + 1) % messages.length);
    }, 7000);
    return () => clearInterval(msgTimer);
  }, []);

  // Trigger a quick wiggle every 15 seconds
  useEffect(() => {
    const wiggleTimer = setInterval(() => {
      setWiggle(true);
      setTimeout(() => setWiggle(false), 600);
    }, 15000);
    return () => clearInterval(wiggleTimer);
  }, []);

  const wiggleStyle = {
    transform: wiggle ? "rotate(-2deg)" : "rotate(0deg)",
    transition: "transform 0.2s ease-in-out"
  };

  const handleClick = () => {
    if (bringToFront && windowId) {
      bringToFront(windowId);
    }
  };

  return (
    <WindowFrame
      title="💡 clampie.app"
      onClose={onClose}
      width={200}
      height={200}
      center={false}
      initialPosition={{ x: 10, y: 425 }}
      style={wiggleStyle}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          backgroundColor: "#fffecb",
          fontFamily: "'Comic Sans MS', sans-serif",
          fontSize: "12px",
          padding: "12px",
          boxSizing: "border-box",
          color: "#333",
        }}
      >
        <p style={{ margin: 0, lineHeight: 1.4 }}>
          {messages[msgIndex]}
        </p>
        <img
          src="/assets/Clampie.webp"
          alt="Clampie"
          style={{
            position: "absolute",
            bottom: "-10px",
            right: "-10px",
            width: "70px",
            height: "70px",
          }}
        />
      </div>
    </WindowFrame>
  );
}
