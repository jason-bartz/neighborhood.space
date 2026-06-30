import React, { useState, useEffect } from "react";
import "../../styles/App.css";

const bootMessages = [
  "Booting NeighborhoodOS v3.1...",
  "Reticulating splines...",
  "Raising capital...",
  "Tightening up pitch decks...",
  "Executing good-vibes.exe..."
];

export default function BootScreen({ onFinish }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [desktopPreloaded, setDesktopPreloaded] = useState(false);

  // Handle any-key bypass
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      if (onFinish) {
        onFinish(false); // Skip directly to desktop
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onFinish]);

  // Handle preloading desktop components
  useEffect(() => {
    if (progress >= 50 && !desktopPreloaded) {
      setDesktopPreloaded(true);
      if (onFinish) {
        onFinish(true); // true = preload mode
      }
    }
  }, [progress, desktopPreloaded, onFinish]);

  // Progress bar animation and boot messages
  useEffect(() => {
    if (progress >= 100) return;

    const timer = setTimeout(() => {
      const increment = Math.random() * 2.5 + 2.5; 
      const newProgress = Math.min(progress + increment, 100);
      setProgress(newProgress);

      const newIndex = Math.min(
        Math.floor((newProgress / 100) * bootMessages.length),
        bootMessages.length - 1
      );
      setMessageIndex(newIndex);

      // Signal boot completion
      if (newProgress >= 100 && onFinish) {
        onFinish(false); // false = final boot complete
      }
    }, 110); 

    return () => clearTimeout(timer);
  }, [progress, onFinish]);

  return (
    <div className="boot-screen">
      <div className="boot-box" style={{
        background: 'var(--mb-chalk)',
        border: '2px solid var(--mb-ink)',
        boxShadow: 'var(--shadow-hard-lg)',
        padding: '44px 40px 32px',
        textAlign: 'center',
        fontFamily: 'var(--font-numeral)',
        width: '440px'
      }}>
        <div className="logo-container" style={{
          width: 'auto',
          height: 'auto',
          margin: '0 auto 28px'
        }}>
          <img
            src="/assets/gnf-logo.png"
            alt="gnf"
            className="boot-logo"
            style={{
              width: '180px',
              height: 'auto',
              display: 'block'
            }}
          />
        </div>
        <div style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--mb-magenta)',
          marginBottom: '6px'
        }}>
          NeighborhoodOS v3.2
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          textTransform: 'uppercase',
          fontSize: '28px',
          letterSpacing: '-0.02em',
          margin: '0 0 24px',
          color: 'var(--mb-ink)'
        }}>
          Booting up<span className="mb-boot-dots" aria-hidden="true" />
        </h1>

        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '8px',
          gap: '12px'
        }}>
          <p className="boot-loading-text" style={{
            fontFamily: 'var(--font-numeral)',
            fontSize: '12px',
            color: 'var(--mb-ink-60)',
            margin: 0,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}>
            {bootMessages[messageIndex]}
          </p>
          <span style={{
            fontFamily: 'var(--font-numeral)',
            fontSize: '12px',
            color: 'var(--mb-ink)',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums'
          }}>
            {Math.floor(progress)}%
          </span>
        </div>

        <div className="boot-progress-container" style={{
          position: 'relative',
          width: '100%',
          height: '10px',
          background: 'var(--mb-paper)',
          border: '1.5px solid var(--mb-ink)',
          overflow: 'hidden'
        }}>
          <div
            className="boot-progress-bar"
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #f28c3b 0%, #e93a7d 25%, #6b4fbb 50%, #2bb3c4 75%, #f0c94b 100%)',
              backgroundSize: '440px 100%',
              transition: 'width 120ms linear'
            }}
          />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
            backgroundSize: '30% 100%',
            backgroundRepeat: 'no-repeat',
            animation: 'bootShimmer 1.6s linear infinite',
            pointerEvents: 'none'
          }} />
        </div>
        <p style={{
          fontSize: '10px',
          color: 'var(--mb-ink-60)',
          marginTop: '22px',
          marginBottom: '0',
          fontFamily: 'var(--font-pixel)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase'
        }}>
          Press any key to skip
        </p>
      </div>
    </div>
  );
}