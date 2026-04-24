// NotFoundPage.jsx — Win95 Blue Screen of Death
import { useState, useEffect } from 'react';

export default function NotFoundPage() {
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--mb-ink)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "var(--font-numeral)",
      color: "var(--mb-chalk)",
      padding: "40px 20px",
      boxSizing: "border-box"
    }}>
      <div style={{
        maxWidth: "660px",
        width: "100%",
        textAlign: "left"
      }}>

        {/* Header bar */}
        <div style={{
          background: "var(--mb-magenta)",
          color: "var(--mb-chalk)",
          padding: "4px 10px",
          fontWeight: "bold",
          fontSize: "14px",
          marginBottom: "24px",
          letterSpacing: "0.12em",
          fontFamily: "var(--font-pixel)",
          textTransform: "uppercase",
          display: "inline-block"
        }}>
          NeighborhoodOS
        </div>

        {/* Title */}
        <p style={{
          color: "#FFFFFF",
          fontSize: "14px",
          lineHeight: "1.6",
          marginBottom: "20px"
        }}>
          A fatal exception 0E has occurred at 0028:C0034404 in VXD NEIGHBORHOOD(01)<br />
          + 00010E36. The current application will be terminated.
        </p>

        <p style={{ color: "#FFFFFF", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
          *&nbsp; Press any key to terminate the current application.<br />
          *&nbsp; Press CTRL+ALT+DEL again to restart your computer. You will<br />
          &nbsp;&nbsp; lose any unsaved information in all applications.
        </p>

        {/* Error details box */}
        <div style={{
          border: "1px solid var(--mb-chalk)",
          padding: "16px",
          marginBottom: "28px",
          background: "var(--mb-ink)"
        }}>
          <p style={{ color: "#FFFFFF", fontSize: "13px", margin: "0 0 10px 0" }}>
            Error: PAGE_NOT_FOUND (0x00000404)
          </p>
          <p style={{ color: "var(--mb-chalk)", fontSize: "12px", margin: "0 0 6px 0" }}>
            NEIGHBORHOOD_KERNEL_DATA_INPAGE_ERROR
          </p>
          <p style={{ color: "var(--mb-chalk)", fontSize: "12px", margin: 0 }}>
            Address &nbsp;&nbsp;&nbsp; goodneighbor.fund/???<br />
            Cause &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; The page you requested does not exist in this<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; neighborhood. You may have wandered too far<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; from the block.
          </p>
        </div>

        {/* Blinking prompt */}
        <p style={{ color: "#FFFFFF", fontSize: "14px", marginBottom: "28px" }}>
          Press any key to continue {blink ? '_' : '\u00A0'}
        </p>

        {/* Return home button */}
        <a
          href="/"
          className="mb-btn mb-btn-butter"
          style={{
            fontFamily: "var(--font-content)",
          }}
        >
          Return to Neighborhood
          <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
        </a>

        {/* Footer */}
        <p style={{
          color: "var(--mb-chalk)",
          fontSize: "11px",
          marginTop: "48px",
          opacity: 0.7
        }}>
          NeighborhoodOS v3.1 &nbsp;|&nbsp; Good Neighbor Fund &nbsp;|&nbsp; goodneighbor.fund
        </p>

      </div>
    </div>
  );
}
