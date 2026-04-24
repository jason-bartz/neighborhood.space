import React, { useState, useEffect } from "react";
import "./App.css";

const bootMessages = [
  "Booting NeighborhoodOS v3.1...",
  "Reticulating splines...",
  "Raising capital...",
  "Tightening up pitch decks...",
  "Executing good-vibes.exe..."
];

export default function MobileBootScreen({ onFinish }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [desktopPreloaded, setDesktopPreloaded] = useState(false);

  // Handle click/touch bypass
  const handleBypass = () => {
    if (onFinish) {
      onFinish(false); // Skip directly to mobile landing
    }
  };

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
    <div 
      className="boot-screen" 
      onClick={handleBypass}
      onTouchStart={handleBypass}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        cursor: 'default'
      }}>
      <div className="boot-box" style={{
        background: 'var(--mb-chalk)',
        border: '2px solid var(--mb-ink)',
        boxShadow: 'var(--shadow-hard-lg)',
        padding: '32px 24px 24px',
        width: '85%',
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        <div className="logo-container" style={{ margin: '0 auto 20px' }}>
          <img
            src="/assets/gnf-logo.png"
            alt="gnf"
            className="boot-logo"
            style={{
              width: '140px',
              height: 'auto',
              display: 'block'
            }}
          />
        </div>
        <div style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: '10px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--mb-magenta)',
          marginBottom: '4px'
        }}>NeighborhoodOS v3.1</div>
        <h1 style={{
          fontSize: '28px',
          margin: '0 0 20px 0',
          fontFamily: 'var(--font-display)',
          fontWeight: 400,
          fontStyle: 'italic',
          letterSpacing: '-0.02em',
          color: 'var(--mb-ink)'
        }}>Booting up&hellip;</h1>

        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: '8px',
          gap: '10px'
        }}>
          <p className="boot-loading-text" style={{
            fontSize: '11px',
            margin: 0,
            fontFamily: 'var(--font-numeral)',
            color: 'var(--mb-ink-60)',
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}>{bootMessages[messageIndex]}</p>
          <span style={{
            fontFamily: 'var(--font-numeral)',
            fontSize: '11px',
            color: 'var(--mb-ink)',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums'
          }}>{Math.floor(progress)}%</span>
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
              backgroundSize: '360px 100%',
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
          marginTop: '18px',
          marginBottom: '0',
          fontFamily: 'var(--font-pixel)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase'
        }}>Tap anywhere to skip</p>
      </div>
    </div>
  );
}