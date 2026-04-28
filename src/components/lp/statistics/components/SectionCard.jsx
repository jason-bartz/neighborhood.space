import React from "react";

// Chrome for a stats section — outer Win95 bevel + an ink titlebar with an
// eyebrow label and title. Children render in the padded body below.
export default function SectionCard({ eyebrow, title, note, actions, children }) {
  return (
    <section
      style={{
        border: "2px solid var(--mb-ink)",
        boxShadow: "var(--shadow-hard)",
        background: "var(--mb-paper)",
        marginBottom: 20,
      }}
    >
      <header
        style={{
          background: "var(--mb-ink)",
          color: "var(--mb-chalk)",
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <div
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                opacity: 0.75,
              }}
            >
              {eyebrow}
            </div>
          )}
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
            {title}
          </h3>
        </div>
        {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
      </header>
      {note && (
        <div
          style={{
            background: "var(--mb-chalk)",
            borderBottom: "1px solid var(--mb-ink-15, rgba(0,0,0,0.12))",
            padding: "8px 14px",
            fontSize: 12,
            color: "var(--mb-ink-60, #555)",
          }}
        >
          {note}
        </div>
      )}
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </section>
  );
}
