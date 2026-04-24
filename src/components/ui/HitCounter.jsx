import React, { useState, useEffect } from "react";

// Baseline offset so the counter starts in the several hundreds.
// Real visits still increment the stored count on top of this.
const BASE_OFFSET = 547;

export default function HitCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem("gnf-hit-count") || "0", 10);
    const newCount = stored + 1;
    localStorage.setItem("gnf-hit-count", String(newCount));
    setCount(newCount + BASE_OFFSET);
  }, []);

  return (
    <div className="win95-hit-counter" style={{ textAlign: "center", margin: "10px auto" }}>
      You are visitor #{String(count).padStart(6, "0")}
    </div>
  );
}
