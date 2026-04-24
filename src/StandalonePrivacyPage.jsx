// StandalonePrivacyPage.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageTaskbar from "./components/ui/Taskbar/PageTaskbar";

export default function StandalonePrivacyPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleClose = () => {
    try {
      sessionStorage.setItem("gnf-has-booted", "1");
    } catch {}
    try {
      navigate("/");
    } catch (error) {
      window.location.href = "/";
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--mb-paper)",
      fontFamily: "var(--font-content)",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      padding: "50px 10px 10px"
    }}>
      <PageTaskbar />
      <div style={{
        background: "var(--mb-chalk)",
        border: "2px solid var(--mb-ink)",
        width: "95%",
        maxWidth: "820px",
        boxShadow: "var(--shadow-hard-lg)",
        display: "flex",
        flexDirection: "column",
        margin: "0 auto"
      }}>
        {/* Title Bar */}
        <div style={{
          background: "var(--mb-ink)",
          color: "var(--mb-chalk)",
          borderBottom: "2px solid var(--mb-ink)",
          padding: "10px 16px",
          minHeight: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: "bold",
          fontSize: "12px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "var(--font-pixel)",
          userSelect: "none"
        }}>
          <span>Privacy Policy</span>
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              width: "22px",
              height: "22px",
              background: "var(--mb-magenta)",
              border: "1px solid var(--mb-chalk)",
              color: "var(--mb-chalk)",
              fontWeight: "bold",
              cursor: "pointer",
              padding: "0",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          padding: "40px 40px 32px",
          fontSize: "15px",
          lineHeight: "1.6",
          color: "var(--mb-ink)"
        }}>
          <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Last Updated · April 2026</span>
          <div style={{
            background: "var(--mb-magenta-soft)",
            padding: "16px 20px",
            borderLeft: "4px solid var(--mb-magenta)",
            margin: "12px 0 32px",
            fontSize: "14px",
            color: "var(--mb-ink)"
          }}>
            <strong style={{ fontWeight: 700 }}>Good Neighbor Fund (GNF)</strong> respects your privacy. This policy
            describes what information we collect, how we use it, and the choices you have. By using our
            services, you agree to the practices described below.
          </div>

          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "36px", letterSpacing: "-0.015em", color: "var(--mb-ink)", marginTop: "0", marginBottom: "16px" }}>Privacy Policy</h2>

          <h3 style={{ marginBottom: "4px" }}>1. What We Collect</h3>
          <p style={{ marginTop: "4px" }}>
            When you submit a pitch application, we collect information you voluntarily provide,
            including: your name, email, business name, website, zip code, chapter selection,
            responses to our application questions, pitch video (or video URL), optional
            self-identifying demographic information, and how you heard about us. We also record
            the date and time of your submission.
          </p>
          <p style={{ marginTop: "4px" }}>
            When you sign in to our Limited Partner portal or admin tools using Google Sign-In, we
            receive your Google account's email address, name, and profile image. We do not access
            any other data from your Google account.
          </p>

          <h3 style={{ marginBottom: "4px" }}>2. How We Use Your Information</h3>
          <p style={{ marginTop: "4px" }}>
            We use your information to review your application, communicate with you about your
            submission, administer the grant program, authenticate your access to LP and admin
            tools, and produce aggregate reporting about the founders and businesses GNF serves.
            Self-identifying demographic information is used only for internal reporting and is
            never shared publicly without your specific consent.
          </p>

          <h3 style={{ marginBottom: "4px" }}>3. Who Sees Your Application</h3>
          <p style={{ marginTop: "4px" }}>
            Your application is reviewed by the Limited Partners and administrators of the chapter
            you selected. Basic application details (name, business name, value proposition,
            problem, and solution) may be shared with partner organizations, or publicly through
            social media, the Good Neighbor Fund website, and similar platforms to highlight
            applicants and awardees. Pitch videos and self-identifying demographic information are
            never shared publicly without your explicit consent.
          </p>

          <h3 style={{ marginBottom: "4px" }}>4. Service Providers</h3>
          <p style={{ marginTop: "4px" }}>
            We use trusted third-party services to operate our program, including Google Firebase
            (application database and authentication), Google Sheets (application archiving), Slack
            (internal chapter notifications), Resend (transactional email), and api.video (pitch
            video hosting). These providers process your data on our behalf and are contractually
            obligated to protect it.
          </p>

          <h3 style={{ marginBottom: "4px" }}>5. Retention</h3>
          <p style={{ marginTop: "4px" }}>
            We retain application information for as long as needed to administer the grant program
            and for reasonable reporting and historical recordkeeping. You may request deletion of
            your application at any time by contacting us.
          </p>

          <h3 style={{ marginBottom: "4px" }}>6. Your Choices</h3>
          <p style={{ marginTop: "4px" }}>
            You may request a copy of your application data, ask us to correct inaccurate
            information, or ask us to delete your data. To make a request or ask questions about
            this policy, email us at{" "}
            <a href="mailto:hello@goodneighbor.fund" style={{ color: "var(--mb-magenta)" }}>
              hello@goodneighbor.fund
            </a>
            .
          </p>

          <h3 style={{ marginBottom: "4px" }}>7. Children</h3>
          <p style={{ marginTop: "4px" }}>
            GNF's micro-grant program is not intended for children under 13. We do not knowingly
            collect personal information from children.
          </p>

          <h3 style={{ marginBottom: "4px" }}>8. Contact</h3>
          <p style={{ marginTop: "4px" }}>
            Questions about our privacy practices?{" "}
            <a href="mailto:hello@goodneighbor.fund" style={{ color: "var(--mb-magenta)" }}>
              hello@goodneighbor.fund
            </a>
          </p>

          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <button
              onClick={handleClose}
              type="button"
              className="mb-btn"
            >
              Return to Home
              <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
