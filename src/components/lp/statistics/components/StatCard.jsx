import React, { useEffect, useState } from "react";
import AnimatedNumber from "./AnimatedNumber";

// KPI tile. Win95 beveled border + hard offset shadow, no border-radius.
//
// `value` renders with AnimatedNumber when given a `numeric` + `format` combo;
// otherwise the string is shown as-is (used for "—" min-N gate states).
// A fade-in-up transition on mount avoids the whole dashboard popping in.
export default function StatCard({ label, value, numeric, format, caption, tone = "paper" }) {
  const bg = tone === "chalk" ? "var(--mb-chalk)" : "var(--mb-paper)";
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const displayValue =
    typeof numeric === "number" && format
      ? <AnimatedNumber value={numeric} format={format} />
      : value;

  return (
    <div
      style={{
        border: "2px solid var(--mb-ink)",
        boxShadow: "var(--shadow-hard-sm)",
        background: bg,
        padding: "12px 14px",
        minWidth: 0,
        opacity: entered ? 1 : 0,
        transform: entered ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 360ms ease-out, transform 360ms ease-out",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-pixel)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--mb-ink-60, #555)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-numeral, inherit)",
          fontSize: 26,
          fontWeight: 700,
          lineHeight: 1.1,
          color: "var(--mb-ink)",
        }}
      >
        {displayValue}
      </div>
      {caption && (
        <div
          style={{
            fontSize: 11,
            color: "var(--mb-ink-60, #666)",
            marginTop: 4,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
