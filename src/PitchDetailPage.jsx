// PitchDetailPage.jsx
// Auth-gated view of a single pitch by its Firestore document ID.
// Routed at /pitch/:pitchId. Only authenticated users with a portal role
// (lp, chapter_director, superAdmin) can view — this is the page the
// "Review Application" Slack button links to.
//
// Unauthenticated visitors are bounced to /portal with a sessionStorage
// breadcrumb (PENDING_PITCH_URL_KEY) that the LP portal's auth handler
// reads after successful login to return them here automatically.
import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "./firebaseConfig";
import NotFoundPage from "./NotFoundPage";
import PageTaskbar from "./components/ui/Taskbar/PageTaskbar";

export const PENDING_PITCH_URL_KEY = "pendingPitchUrl";
const VALID_ROLES = ["lp", "chapter_director", "superAdmin"];

export default function PitchDetailPage() {
  const { pitchId } = useParams();
  const navigate = useNavigate();
  // auth-loading | unauthenticated | forbidden | loading | found | not-found
  const [status, setStatus] = useState("auth-loading");
  const [pitch, setPitch] = useState(null);

  // Auth check: only valid portal roles can view. Unauthed → stash pitch URL
  // and redirect to /portal so they can land back here after logging in.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        setStatus("unauthenticated");
        return;
      }
      try {
        const userSnap = await getDoc(doc(db, "users", authUser.uid));
        const role = userSnap.exists() ? userSnap.data().role : null;
        if (role && VALID_ROLES.includes(role)) {
          setStatus("loading");
        } else {
          setStatus("forbidden");
        }
      } catch (e) {
        console.error("PitchDetailPage: role lookup failed", e);
        setStatus("forbidden");
      }
    });
    return unsubscribe;
  }, []);

  // Pitch fetch runs only after the auth gate passes.
  useEffect(() => {
    if (status !== "loading") return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "pitches", pitchId));
        if (cancelled) return;
        if (snap.exists()) {
          setPitch({ id: snap.id, ...snap.data() });
          setStatus("found");
        } else {
          setStatus("not-found");
        }
      } catch (e) {
        console.error("PitchDetailPage: failed to load pitch", e);
        if (!cancelled) setStatus("not-found");
      }
    })();
    return () => { cancelled = true; };
  }, [status, pitchId]);

  if (status === "auth-loading" || status === "loading") {
    return (
      <div className="mb-page" style={pageStyle}>
        <PageTaskbar />
        <p style={{ textAlign: "center", color: "#666", fontSize: 14, marginTop: 80 }}>
          {status === "auth-loading" ? "Checking access…" : "Loading pitch…"}
        </p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <GateScreen
        title="Sign in required"
        body="This pitch is only viewable by Good Neighbor Fund Limited Partners. Sign in to continue."
        cta="Sign In to LP Portal"
        onCta={() => {
          try {
            sessionStorage.setItem(PENDING_PITCH_URL_KEY, `/pitch/${pitchId}`);
          } catch {}
          navigate("/portal");
        }}
      />
    );
  }

  if (status === "forbidden") {
    return (
      <GateScreen
        title="Access denied"
        body="Your account doesn't have permission to view pitch applications. If you think this is a mistake, contact your chapter director."
        cta="Return to Home"
        onCta={() => navigate("/")}
      />
    );
  }

  if (status === "not-found") {
    return <NotFoundPage />;
  }

  const submittedAt = formatTimestamp(pitch.createdAt);

  return (
    <div className="mb-page" style={pageStyle}>
      <PageTaskbar />
      <div className="mb-page-window mb-form-shell">
        <div className="mb-page-titlebar">
          <span>Pitch Application</span>
          <button
            onClick={() => navigate("/portal")}
            aria-label="Close"
            className="mb-page-close"
          >
            ×
          </button>
        </div>

        <div style={bodyStyle}>
          <div style={headerStyle}>
            <div style={eyebrowStyle}>
              {pitch.chapter || "Good Neighbor Fund"}
              {submittedAt ? ` · Submitted ${submittedAt}` : ""}
              {pitch.isWinner ? " · Grant Recipient" : ""}
            </div>
            <h1 style={titleStyle}>{pitch.businessName || "Untitled Pitch"}</h1>
            {pitch.founderName && (
              <p style={subtitleStyle}>by {pitch.founderName}</p>
            )}
            {pitch.email && (
              <p style={{ ...subtitleStyle, fontSize: 14, marginTop: 4 }}>
                <a href={`mailto:${pitch.email}`} style={linkStyle}>{pitch.email}</a>
              </p>
            )}
          </div>

          {(pitch.pitchVideoUrl || pitch.pitchVideoFile) && (
            <Section title="Pitch Video">
              <div style={videoWrapperStyle}>
                <iframe
                  src={pitch.pitchVideoUrl || pitch.pitchVideoFile}
                  title={`${pitch.businessName || "Pitch"} video`}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: 0 }}
                />
              </div>
              <a
                href={pitch.pitchVideoUrl || pitch.pitchVideoFile}
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
              >
                Open video in new tab ↗
              </a>
            </Section>
          )}

          {pitch.bio && (
            <Section title="About the Founder">
              <p style={paragraphStyle}>{pitch.bio}</p>
            </Section>
          )}

          {pitch.aiSummary && (
            <Section title="AI Summary">
              <p style={{ ...paragraphStyle, fontStyle: "italic", background: "var(--gnf-pink-100, #fde9f3)", padding: 12, borderRadius: 4 }}>
                {pitch.aiSummary}
              </p>
            </Section>
          )}

          {pitch.valueProp && (
            <Section title="Value Proposition">
              <p style={paragraphStyle}>{pitch.valueProp}</p>
            </Section>
          )}

          {pitch.problem && (
            <Section title="Problem">
              <p style={paragraphStyle}>{pitch.problem}</p>
            </Section>
          )}

          {pitch.solution && (
            <Section title="Solution">
              <p style={paragraphStyle}>{pitch.solution}</p>
            </Section>
          )}

          {pitch.businessModel && (
            <Section title="Business Model">
              <p style={paragraphStyle}>{pitch.businessModel}</p>
            </Section>
          )}

          {pitch.grantUsePlan && (
            <Section title="Plan for $1,000 Grant">
              <p style={paragraphStyle}>{pitch.grantUsePlan}</p>
            </Section>
          )}

          <Section title="Details">
            <dl style={detailsGridStyle}>
              {pitch.chapter && <DetailRow label="Chapter" value={pitch.chapter} />}
              {pitch.zipCode && <DetailRow label="Zip Code" value={pitch.zipCode} />}
              {pitch.website && (
                <DetailRow
                  label="Website"
                  value={
                    <a
                      href={pitch.website.startsWith("http") ? pitch.website : `https://${pitch.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={linkStyle}
                    >
                      {pitch.website}
                    </a>
                  }
                />
              )}
              {pitch.hasPayingCustomers && (
                <DetailRow label="Has Paying Customers" value={pitch.hasPayingCustomers} />
              )}
              {pitch.heardAbout && <DetailRow label="Heard About Us Via" value={pitch.heardAbout} />}
              {Array.isArray(pitch.selfIdentification) && pitch.selfIdentification.length > 0 && (
                <DetailRow label="Self Identification" value={pitch.selfIdentification.join(", ")} />
              )}
            </dl>
          </Section>

          <div style={footerStyle}>
            <span style={{ fontSize: 12, color: "#666" }}>Pitch ID: {pitch.id}</span>
            <button
              onClick={() => navigate("/portal")}
              type="button"
              className="mb-btn"
            >
              Back to Portal
              <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GateScreen({ title, body, cta, onCta }) {
  return (
    <div className="mb-page" style={pageStyle}>
      <PageTaskbar />
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "calc(100vh - 60px)",
      }}>
        <div style={{
          background: "var(--mb-chalk)",
          padding: "40px",
          border: "2px solid var(--mb-ink)",
          boxShadow: "var(--shadow-hard-lg)",
          maxWidth: 480,
          textAlign: "center",
        }}>
          <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Limited Partner Access</span>
          <h1 style={{ ...titleStyle, fontSize: 32 }}>{title}</h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>{body}</p>
          <button onClick={onCta} type="button" className="mb-btn">
            {cta}
            <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      {children}
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <>
      <dt style={dtStyle}>{label}</dt>
      <dd style={ddStyle}>{value}</dd>
    </>
  );
}

function formatTimestamp(createdAt) {
  if (!createdAt) return "";
  try {
    const d = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

const pageStyle = {
  minHeight: "100vh",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  padding: "10px",
  paddingTop: "60px",
  background: "var(--mb-paper)",
  fontFamily: "var(--font-content)",
  color: "var(--mb-ink)",
};

const bodyStyle = {
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const headerStyle = {
  borderBottom: "2px solid var(--mb-ink)",
  paddingBottom: "16px",
};

const eyebrowStyle = {
  fontSize: "11px",
  fontFamily: "var(--font-pixel)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--mb-magenta)",
  marginBottom: "8px",
};

const titleStyle = {
  fontFamily: "var(--font-display)",
  fontWeight: 400,
  fontSize: 40,
  letterSpacing: "-0.02em",
  lineHeight: 1.05,
  margin: "4px 0 8px",
};

const subtitleStyle = {
  fontSize: 16,
  margin: 0,
  color: "var(--mb-ink)",
};

const sectionStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const sectionTitleStyle = {
  fontFamily: "var(--font-display)",
  fontSize: 20,
  fontWeight: 400,
  margin: 0,
  color: "var(--mb-ink)",
};

const paragraphStyle = {
  fontSize: 15,
  lineHeight: 1.55,
  margin: 0,
  whiteSpace: "pre-wrap",
};

const videoWrapperStyle = {
  position: "relative",
  width: "100%",
  aspectRatio: "16 / 9",
  border: "2px solid var(--mb-ink)",
  background: "#000",
  overflow: "hidden",
};

const linkStyle = {
  color: "var(--mb-magenta)",
  fontWeight: "bold",
  textDecoration: "underline",
};

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns: "max-content 1fr",
  columnGap: "16px",
  rowGap: "6px",
  margin: 0,
  fontSize: 14,
};

const dtStyle = { fontWeight: "bold" };
const ddStyle = { margin: 0 };

const footerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "12px",
  paddingTop: "16px",
  borderTop: "1px solid #ccc",
};
