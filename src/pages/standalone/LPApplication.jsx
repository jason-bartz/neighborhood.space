// LPApplication.jsx
import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Confetti from "react-confetti";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTaskbar from "../../components/ui/Taskbar/PageTaskbar";

// Fallback chapter list used while the /chapters collection is loading or
// unavailable. Keeps the form functional for the four legacy chapters.
const FALLBACK_CHAPTERS = [
  { slug: "wny",            name: "Western New York" },
  { slug: "denver",         name: "Denver" },
  { slug: "upstate",        name: "Upstate New York" },
  { slug: "capital-region", name: "Capital Region" },
];
// Quick lookup used to pre-populate the chapter select from a ?chapter=slug query param.
const FALLBACK_CHAPTER_SLUG_TO_NAME = Object.fromEntries(FALLBACK_CHAPTERS.map(c => [c.slug, c.name]));

export default function LPApplication({ onClose, initialChapter, hideFrame = false }) {
  const [searchParams] = useSearchParams();
  const chapterFromQuery = FALLBACK_CHAPTER_SLUG_TO_NAME[searchParams.get("chapter")];
  const defaultChapter = initialChapter || chapterFromQuery || "";

  const [form, setForm] = useState({ chapter: defaultChapter });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [chapterOptions, setChapterOptions] = useState(FALLBACK_CHAPTERS);
  const navigate = useNavigate();
  const hasOnClose = Boolean(onClose);
  // hideFrame: desktop WindowFrame already renders titlebar + chrome, so skip ours there.
  // Otherwise (mobile embedded or standalone route) show the mb-page-window frame.
  const isEmbedded = hideFrame;

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load active chapters from Firestore. If the fetch succeeds and there's at
  // least one active chapter, replace the fallback list. Also honor a ?chapter=
  // query param against the freshly-loaded slugs (covers brand-new chapters).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "chapters"));
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.active !== false)
          .sort((a, b) => {
            const ao = typeof a.order === "number" ? a.order : 999;
            const bo = typeof b.order === "number" ? b.order : 999;
            if (ao !== bo) return ao - bo;
            return (a.name || "").localeCompare(b.name || "");
          })
          .map(c => ({ slug: c.pageSlug || c.id, name: c.name }));
        if (cancelled || list.length === 0) return;
        setChapterOptions(list);
        // If the form hasn't been primed from an initialChapter/query match,
        // try again against the newly loaded list.
        if (!defaultChapter) {
          const querySlug = searchParams.get("chapter");
          const matched = list.find(c => c.slug === querySlug);
          if (matched) setForm(prev => ({ ...prev, chapter: matched.name }));
        }
      } catch (e) {
        console.error("LP application: failed to load /chapters, using fallback", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleClose = () => {
    if (hasOnClose && onClose) {
      onClose();
    } else {
      try {
        sessionStorage.setItem("gnf-has-booted", "1");
      } catch {}
      try {
        navigate("/");
      } catch (error) {
        console.error("Navigation error:", error);
        window.location.href = "/";
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiredFields = [
      "name", "email", "phone", "chapter",
      "hasPriorExperience", "whyJoin",
      "meetupCommitment", "donationCommitment",
      "termsConsent",
    ];
    const missingFields = requiredFields.filter((field) => !form[field]);
    if (missingFields.length > 0) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const lpData = {
        name: form.name || "",
        email: form.email || "",
        phone: form.phone || "",
        linkedinUrl: form.linkedinUrl || "",
        chapter: form.chapter || "",
        hasPriorExperience: form.hasPriorExperience || "",
        experienceDetails: form.experienceDetails || "",
        whyJoin: form.whyJoin || "",
        meetupCommitment: form.meetupCommitment || "",
        donationCommitment: form.donationCommitment || "",
        consentToTerms: form.termsConsent || false,
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, "lpApplications"), lpData);
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting LP application:", error);
      alert("There was an error submitting your application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    const successInner = (
      <div style={{
        background: "var(--mb-chalk)",
        padding: "48px 40px",
        border: "2px solid var(--mb-ink)",
        boxShadow: "var(--shadow-hard-lg)",
        maxWidth: "560px",
        margin: isEmbedded ? "20px auto" : undefined,
        textAlign: "center",
      }}>
        <Confetti width={windowSize.width} height={windowSize.height} numberOfPieces={250} recycle={false} />
        <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Application Received</span>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          fontSize: 40,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          color: "var(--mb-ink)",
          margin: "12px 0 16px",
        }}>
          Thanks for applying to be an LP.
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.5, color: "var(--mb-ink)" }}>
          A chapter representative will be in touch soon. Check your inbox for a confirmation from us.
        </p>
        <button
          onClick={handleClose}
          type="button"
          className="mb-btn"
          style={{ marginTop: "24px" }}
        >
          Return to Home
          <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
        </button>
      </div>
    );

    if (isEmbedded) {
      return successInner;
    }

    return (
      <div className="mb-page" style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        textAlign: "center",
        padding: hasOnClose ? "20px" : "60px 20px 20px",
        boxSizing: "border-box",
      }}>
        {!hasOnClose && <PageTaskbar />}
        {successInner}
      </div>
    );
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="mb-form-shell" style={{
      padding: "28px 28px 32px",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      overflowY: "auto",
      flex: isEmbedded ? "1 1 auto" : undefined,
      minHeight: 0,
      boxSizing: "border-box",
    }}>
          <div style={{
            padding: "22px 24px",
            fontSize: "14px",
            lineHeight: "1.55",
            background: "var(--mb-magenta-soft)",
            border: "2px solid var(--mb-ink)",
            boxShadow: "none",
            color: "var(--mb-ink)",
          }}>
            <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Limited Partner · Application</span>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: 28,
              letterSpacing: "-0.015em",
              lineHeight: 1.1,
              margin: "10px 0 14px",
              color: "var(--mb-ink)",
            }}>
              Back the next generation of founders.
            </h2>
            <p className="mb-body" style={{ margin: "0 0 12px" }}>
              Good Neighbor Fund supports early-stage entrepreneurs &mdash; particularly women, BIPOC,
              and founders from under-resourced communities &mdash; through $1,000 micro-grants.
            </p>
            <p className="mb-body" style={{ margin: "0 0 12px" }}>
              As a Limited Partner, you'll help select grant recipients, support founders with your
              knowledge and network, and be part of a chapter of value-aligned individuals. This isn't
              venture capital; we expect <em style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>no</em> financial return &mdash;
              just community impact. It's <strong style={{ fontWeight: 700 }}>belief capital</strong>.
            </p>
            <p className="mb-body" style={{ margin: "0 0 14px" }}>
              After submitting, a chapter representative will be in touch to answer any questions.
              Each chapter has a limited number of seats; if yours is full, your form becomes a waitlist submission.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
              <span className="mb-badge">Est. Time · 10 Min</span>
            </div>
          </div>

          {/* Personal Details */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 8,
            marginBottom: -4,
            paddingBottom: 6,
            borderBottom: "1px solid var(--mb-ink)",
          }}>
            <span className="mb-numeral" style={{ fontSize: 12, color: "var(--mb-magenta)", fontWeight: 700 }}>01 /</span>
            <span className="mb-eyebrow" style={{ color: "var(--mb-ink)", margin: 0 }}>Personal Details</span>
          </div>

          {[
            { label: "Name *", name: "name", type: "text", placeholder: "e.g., Jane Smith" },
            { label: "Email Address *", name: "email", type: "email", placeholder: "e.g., jane.smith@gmail.com" },
            { label: "Phone Number *", name: "phone", type: "tel", placeholder: "e.g., (555) 123-4567" },
            { label: "LinkedIn Profile URL", name: "linkedinUrl", type: "text", placeholder: "e.g., https://linkedin.com/in/janesmith" },
          ].map((field) => (
            <div key={field.name} style={{ display: "flex", flexDirection: "column" }}>
              <label>{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={form[field.name] || ""}
                onChange={handleChange}
                required={field.label.includes("*")}
                placeholder={field.placeholder}
              />
            </div>
          ))}

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Chapter *</label>
            <select
              name="chapter"
              value={form.chapter || ""}
              onChange={handleChange}
              required
            >
              <option value="">Select Chapter *</option>
              {chapterOptions.map(c => (
                <option key={c.slug} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* About */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
            marginBottom: -4,
            paddingBottom: 6,
            borderBottom: "1px solid var(--mb-ink)",
          }}>
            <span className="mb-numeral" style={{ fontSize: 12, color: "var(--mb-magenta)", fontWeight: 700 }}>02 /</span>
            <span className="mb-eyebrow" style={{ color: "var(--mb-ink)", margin: 0 }}>About You</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>
              Do you have previous founder, startup, executive, creative, non-profit, or connector experience? *
            </label>
            <small style={{ marginBottom: "6px" }}>Not required but helpful to know.</small>
            <div style={{ display: "flex", gap: "16px" }}>
              <label>
                <input
                  type="radio"
                  name="hasPriorExperience"
                  value="Yes"
                  checked={form.hasPriorExperience === "Yes"}
                  onChange={handleChange}
                  required
                />{" "}
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name="hasPriorExperience"
                  value="No"
                  checked={form.hasPriorExperience === "No"}
                  onChange={handleChange}
                />{" "}
                No
              </label>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>If yes, please briefly share your experience.</label>
            <textarea
              name="experienceDetails"
              value={form.experienceDetails || ""}
              onChange={handleChange}
              rows={3}
              placeholder="e.g., Founded an SMB SaaS company, five years as a design director, board member at a local non-profit..."
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Why do you want to join a GNF chapter? *</label>
            <textarea
              name="whyJoin"
              value={form.whyJoin || ""}
              onChange={handleChange}
              rows={4}
              required
              placeholder="Share what draws you to GNF and how you'd like to contribute."
            />
          </div>

          {/* LP Commitments */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
            marginBottom: -4,
            paddingBottom: 6,
            borderBottom: "1px solid var(--mb-ink)",
          }}>
            <span className="mb-numeral" style={{ fontSize: 12, color: "var(--mb-magenta)", fontWeight: 700 }}>03 /</span>
            <span className="mb-eyebrow" style={{ color: "var(--mb-ink)", margin: 0 }}>LP Commitments</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>
              Meet-Ups: Each chapter typically hosts four grant selection dinners per year. We ask that you commit to attending at least two. Are you able to commit to this? *
            </label>
            <select
              name="meetupCommitment"
              value={form.meetupCommitment || ""}
              onChange={handleChange}
              required
            >
              <option value="">Select an option *</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>
              Membership Dues *
            </label>
            <small style={{ marginBottom: "6px" }}>
              Limited Partners are required to maintain an LP membership. Most GNF chapter LP memberships cost $500 annually, paid upfront. 100% of your LP Membership dues fund your chapter's micro-grant program. (Tax deductible via our 501c3 fiscal sponsor.) If accepted, are you able to commit and make the payment?
            </small>
            <select
              name="donationCommitment"
              value={form.donationCommitment || ""}
              onChange={handleChange}
              required
            >
              <option value="">Select an option *</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* Consent */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>
              <input
                type="checkbox"
                name="termsConsent"
                checked={form.termsConsent || false}
                onChange={handleChange}
                required
              />{" "}
              I agree to GNF's Terms of Use & Privacy Policy *
            </label>
            <small>
              By submitting this application, I agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--mb-magenta)", fontWeight: "bold" }}>
                Good Neighbor Fund Terms of Use & Privacy Policy
              </a>
              .
            </small>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mb-btn"
            style={{ marginTop: "20px", padding: "16px 24px", fontSize: 14 }}
          >
            {isSubmitting ? "Submitting…" : "Submit Application"}
            {!isSubmitting && <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>}
          </button>
    </form>
  );

  if (hideFrame) {
    return formContent;
  }

  return (
    <div className="mb-page" style={{
      minHeight: "100vh",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      display: "flex",
      flexDirection: "column",
      padding: "10px",
      paddingTop: hasOnClose ? "10px" : "60px",
      paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
      boxSizing: "border-box",
    }}>
      {!hasOnClose && <PageTaskbar />}
      <div className="mb-page-window mb-form-shell">
        <div className="mb-page-titlebar">
          <span>Limited Partner Application</span>
          <button onClick={handleClose} className="mb-page-close" aria-label="Close">×</button>
        </div>
        {formContent}
      </div>
    </div>
  );
}
