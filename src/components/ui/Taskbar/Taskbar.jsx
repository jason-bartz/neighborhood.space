import React from "react";
import "./App.css";

export default function Taskbar() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="taskbar">
      <div className="taskbar-left">NeighborhoodOS</div>
      <div className="taskbar-right">{dateStr} 1999</div>
    </div>
  );
}
