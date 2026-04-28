import React, { useEffect, useRef, useState } from "react";

// Animated numeric counter. Eases from 0 to `value` over `duration` ms using
// requestAnimationFrame on first mount and on value changes.
//
// `format` receives the in-flight numeric value so callers can render dollars,
// percentages, etc. without reimplementing the easing. `prefersReduced` short-
// circuits the animation for users with prefers-reduced-motion — they see the
// final value instantly.
//
// Non-numeric `value` (strings like "—" for the min-N gate) is passed through
// unchanged, so the hook only engages when there's actually a number to count.
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export default function AnimatedNumber({
  value,
  duration = 800,
  format,
  decimals = 0,
}) {
  const isNumeric = typeof value === "number" && Number.isFinite(value);
  const prefersReduced = useRef(
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [display, setDisplay] = useState(
    isNumeric && !prefersReduced.current ? 0 : value
  );
  const displayRef = useRef(0);
  displayRef.current = typeof display === "number" ? display : 0;
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!isNumeric) {
      setDisplay(value);
      return undefined;
    }
    if (prefersReduced.current) {
      setDisplay(value);
      return undefined;
    }

    // Read via ref to avoid re-triggering the effect on every frame when
    // `display` state advances. We need the *previous* display value as the
    // animation's starting point so consecutive value changes ease smoothly
    // instead of snapping back to 0.
    fromRef.current = displayRef.current;
    startRef.current = null;

    const tick = (now) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const next = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, isNumeric]);

  if (!isNumeric) {
    return <>{value}</>;
  }
  if (format) {
    return <>{format(display)}</>;
  }
  return <>{display.toFixed(decimals)}</>;
}
