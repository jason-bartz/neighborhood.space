import React, { useState, useEffect } from "react";

export default function BootScreen({ onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    "> BOOT NeighborhoodOS",
    "Reticulating splines...",
    "Spinning up micro-grants...",
    "Loading pitch deck...",
    "Petting neighborhood cats...",
    "Installing coffee.exe...",
    "Loading...",
    "3",
    "2",
    "1",
    "0",
    "Initializing NeighborhoodOS...",
  ];

  useEffect(() => {
    let delay = 500;
    if (stepIndex === 0) delay = 1400; // ⏳ Longer delay on command prompt
    if (stepIndex === steps.length - 1) delay = 1000; // ⏳ Hold final message

    const timeout = setTimeout(() => {
      setStepIndex((prev) => prev + 1);
    }, delay);

    if (stepIndex === steps.length - 1) {
      const startupSound = new Audio("/sounds/windows-95.mp3");
      startupSound.play();
    }

    return () => clearTimeout(timeout);
  }, [stepIndex]);

  return (
    <div
      style={{
        backgroundColor: "#000",
        color: "#ffc0cb", // Pastel pink
        fontFamily: "monospace",
        fontSize: "20px",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {stepIndex === 0 ? (
        <span>
          {steps[stepIndex]}
          <span className="blinking-cursor">█</span>
        </span>
      ) : (
        steps[stepIndex]
      )}
    </div>
  );
}
