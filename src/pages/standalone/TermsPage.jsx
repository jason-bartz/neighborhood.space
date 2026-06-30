// TermsPage.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageTaskbar from "../../components/ui/Taskbar/PageTaskbar";

export default function TermsPage() {
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
          <span>Terms of Use</span>
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
          <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Last Updated · April 24, 2026</span>
          <div style={{
            background: "var(--mb-magenta-soft)",
            padding: "16px 20px",
            borderLeft: "4px solid var(--mb-magenta)",
            margin: "12px 0 32px",
            fontSize: "14px",
            color: "var(--mb-ink)"
          }}>
            <strong style={{ fontWeight: 700 }}>Good Neighbor Fund (GNF)</strong> is a community-driven micro-grant program. By submitting a pitch
            application, you agree to the terms below. Please read carefully.
          </div>

          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, textTransform: "uppercase", fontSize: "36px", letterSpacing: "-0.015em", color: "var(--mb-ink)", marginTop: "0", marginBottom: "16px" }}>Terms of Use</h2>

          <h3 style={{ marginBottom: "4px" }}>1. About the Micro-Grant Program</h3>
          <p style={{ marginTop: "4px" }}>
            Good Neighbor Fund awards $1,000 micro-grants to early-stage founders and small
            businesses in the communities served by our chapters. Grants are funded by voluntary
            contributions from our Limited Partners (LPs) and are awarded at the discretion of each
            chapter's review committee. Submission of an application does not guarantee selection or
            funding. Eligibility, review cadence, and selection criteria may vary by chapter.
          </p>

          <h3 style={{ marginBottom: "4px" }}>2. Eligibility</h3>
          <p style={{ marginTop: "4px" }}>
            To be considered, your business must be headquartered in, or primarily operating within,
            the geographic region of the chapter you select on your application. You must be of
            legal age to enter into a contract in your jurisdiction, and all information you provide
            must be truthful and accurate to the best of your knowledge.
          </p>

          <h3 style={{ marginBottom: "4px" }}>3. Applicant Responsibilities</h3>
          <p style={{ marginTop: "4px" }}>
            You are responsible for ensuring that any materials you submit — including your pitch
            video, written responses, images, and website links — are your own original work or that
            you have the rights to share them. You agree not to submit content that is unlawful,
            defamatory, misleading, infringing on third-party rights, or that contains sensitive
            personal information about individuals other than yourself without their consent.
          </p>

          <h3 style={{ marginBottom: "4px" }}>4. In-Person Meetup Requirement</h3>
          <p style={{ marginTop: "4px" }}>
            All grant awardees are required to participate in an in-person meetup with members of
            their chapter. These meetups typically include a brief conversation about your business
            and business plan, a walk-through of your space (where applicable), and photographs that
            GNF may share on social media, our website, and in other communications. By submitting
            your application, you agree to participate in this meetup if you are selected. If
            attending in person is not possible for documented reasons (e.g., medical, travel
            restrictions), please contact your chapter director to discuss alternatives prior to
            award.
          </p>

          <h3 style={{ marginBottom: "4px" }}>5. Use of Grant Funds</h3>
          <p style={{ marginTop: "4px" }}>
            We hope awardees will put their grant to work within 30 days of receiving it, but this
            is an aspiration, not a requirement. GNF micro-grants are given in good faith and come
            with no strings attached — we do not ask for proof of how funds were spent, and we do
            not require any follow-up reporting.
          </p>
          <p style={{ marginTop: "4px" }}>
            <strong style={{ fontWeight: 700 }}>These are grants, not investments.</strong> GNF, our
            chapters, and our Limited Partners expect no financial return, no equity, no revenue
            share, and no repayment of any kind. If anyone ever approaches you claiming to be
            entitled to a return, repayment, or ownership interest as a result of a Good Neighbor
            Fund micro-grant, please contact us directly at{" "}
            <a href="mailto:hello@goodneighbor.fund" style={{ color: "var(--mb-magenta)" }}>
              hello@goodneighbor.fund
            </a>
            .
          </p>

          <h3 style={{ marginBottom: "4px" }}>6. No Obligation; Right to Decline</h3>
          <p style={{ marginTop: "4px" }}>
            GNF may decline any application for any reason and may pause, change, or end the
            micro-grant program at any time. LPs and chapter directors act in a volunteer capacity
            and owe no fiduciary duty to applicants.
          </p>

          <h3 style={{ marginBottom: "4px" }}>7. Changes to These Terms</h3>
          <p style={{ marginTop: "4px" }}>
            We may update these terms from time to time. The version in effect at the time you
            submit your application governs that application.
          </p>

          <h3 style={{ marginBottom: "4px" }}>8. Privacy</h3>
          <p style={{ marginTop: "4px" }}>
            Our handling of personal information is described in our{" "}
            <a href="/privacy" style={{ color: "var(--mb-magenta)" }}>
              Privacy Policy
            </a>
            .
          </p>

          <h3 style={{ marginBottom: "4px" }}>9. Contact</h3>
          <p style={{ marginTop: "4px" }}>
            Questions about these terms?{" "}
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
