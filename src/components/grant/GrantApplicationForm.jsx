// GrantApplicationForm.jsx
import React, { useState, useRef, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import VideoUploader from "../media/VideoUploader";
import Confetti from "react-confetti";
import WindowFrame from "../ui/WindowFrame/WindowFrame";
import {
  PITCH_REFERRAL_OPTIONS,
  PITCH_REFERRAL_OTHER,
  resolvePitchReferral,
} from "../../data/pitchReferralOptions";

const REQUIRED_FIELDS = [
  { name: "founder", label: "Founder Name" },
  { name: "email", label: "Email" },
  { name: "business", label: "Business Name" },
  { name: "zip", label: "Zip Code" },
  { name: "chapter", label: "Chapter Location" },
  { name: "about", label: "About you" },
  { name: "valueProp", label: "Value Proposition" },
  { name: "problem", label: "Problem" },
  { name: "solution", label: "Solution" },
  { name: "revenueModel", label: "Revenue Model" },
  { name: "payingCustomers", label: "Paying Customers" },
  { name: "fundUse", label: "Fund Use" },
  { name: "consent", label: "Consent" },
  { name: "meetupConsent", label: "In-Person Meetup Agreement" }
];

export default function GrantApplicationForm({ onClose, zIndex, windowId, bringToFront, cascadeOffset = 0 }) {
  const [form, setForm] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const firstErrorRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, options, checked } = e.target;

    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "select-multiple") {
      const selectedValues = Array.from(options).filter((o) => o.selected).map((o) => o.value);
      setForm((prev) => ({ ...prev, [name]: selectedValues }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    // Clear the per-field error once the user starts fixing it
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleVideoUploaded = (videoUrl) => {
    setForm((prev) => ({ ...prev, videoUrl }));
    if (fieldErrors.video) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.video;
        return next;
      });
    }
  };

  const validate = () => {
    const errors = {};
    for (const { name, label } of REQUIRED_FIELDS) {
      const value = form[name];
      if (name === "consent") {
        if (!value) errors[name] = "You must agree to GNF's Terms of Use & Privacy Policy to submit.";
      } else if (name === "meetupConsent") {
        if (!value) errors[name] = "You must agree to complete an in-person meetup if awarded.";
      } else if (!value || (typeof value === "string" && !value.trim())) {
        errors[name] = `${label} is required.`;
      }
    }
    if (!form.videoUrl && !form.videoUrlInput) {
      errors.video = "Please either upload a pitch video or paste a hosted video URL.";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Please enter a valid email address.";
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll to first error
      requestAnimationFrame(() => {
        const firstError = document.querySelector("[data-pitch-error='true']");
        if (firstError && typeof firstError.scrollIntoView === "function") {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
          const focusable = firstError.querySelector("input, textarea, select");
          if (focusable) focusable.focus();
        }
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const pitchData = {
        founderName: form.founder || "",
        email: form.email || "",
        businessName: form.business || "",
        chapter: form.chapter || "",
        zipCode: form.zip || "",
        bio: form.about || "",
        website: form.website || "",
        valueProp: form.valueProp || "",
        problem: form.problem || "",
        solution: form.solution || "",
        businessModel: form.revenueModel || "",
        hasPayingCustomers: form.payingCustomers || "",
        grantUsePlan: form.fundUse || "",
        pitchVideoUrl: form.videoUrl || form.videoUrlInput || "",
        selfIdentification: form.selfId || [],
        heardAbout: resolvePitchReferral(form.referral, form.referralOther),
        consentToShare: form.consent || false,
        consentToMeetup: form.meetupConsent || false,
        createdAt: Timestamp.now(),
        isWinner: false
      };
      const docRef = await addDoc(collection(db, "pitches"), pitchData);

      // Also submit to Google Sheets (non-blocking)
      try {
        const { submitToGoogleSheets } = await import('../../services/googleSheets');
        await submitToGoogleSheets({ ...pitchData, id: docRef.id });
      } catch (sheetsError) {
        console.error('Failed to save to Google Sheets:', sheetsError);
      }

      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting pitch:", error);
      setSubmitError("There was an error submitting your pitch. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldRowStyle = { display: "flex", flexDirection: "column", marginBottom: "12px" };
  const labelStyle = { fontWeight: "bold", marginBottom: "4px", fontSize: "13px" };
  const errorMsgStyle = { color: "#c0392b", fontSize: "12px", marginTop: "4px", fontWeight: "bold" };
  const helpStyle = { color: "var(--gnf-text-secondary)", marginTop: "4px" };

  const renderError = (fieldName) =>
    fieldErrors[fieldName] ? (
      <span style={errorMsgStyle} role="alert">
        {fieldErrors[fieldName]}
      </span>
    ) : null;

  if (submitted) {
    return (
      <WindowFrame
        title="Pitch Submitted!"
        onClose={onClose}
        width={520}
        height={320}
        center
        windowId={windowId}
        zIndex={zIndex}
        bringToFront={bringToFront}
        cascadeOffset={cascadeOffset}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            textAlign: "center",
            padding: "20px 16px"
          }}
        >
          <Confetti width={windowSize.width} height={windowSize.height} numberOfPieces={250} recycle={false} />
          <h2 style={{ margin: 0, fontSize: "20px" }}>Thank you for submitting your pitch!</h2>
          <p style={{ margin: "12px 0 0" }}>Our GNF LPs review all submissions after each quarter. We'll be in touch soon!</p>
          <button
            className="win95-btn win95-btn-primary"
            onClick={onClose}
            style={{ marginTop: "20px", padding: "10px 24px", fontSize: "14px" }}
            autoFocus
          >
            Return to Desktop
          </button>
        </div>
      </WindowFrame>
    );
  }

  return (
    <WindowFrame
      title="Micro-Grant Pitch Application"
      onClose={onClose}
      width={600}
      height={Math.min(900, window.innerHeight - 80)}
      initialPosition={{
        x: Math.max(0, Math.round((window.innerWidth - 600) / 2)),
        y: 50
      }}
      windowId={windowId}
      zIndex={zIndex}
      bringToFront={bringToFront}
      cascadeOffset={cascadeOffset}
    >
      <div className="mb-form-shell" style={{ display: "contents" }} />
      <div className="win95-inset mb-form-shell" style={{
        padding: "18px 20px",
        fontSize: "14px",
        lineHeight: "1.5",
        marginBottom: "20px",
        background: "var(--mb-magenta-soft)",
        border: "2px solid var(--mb-ink)",
        boxShadow: "none"
      }}>
        <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Pitch Application</span>
        <h3 style={{ marginTop: 8, fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 24, letterSpacing: "-0.01em" }}>Apply for a <span style={{ color: "var(--mb-magenta-deep)" }}>$1,000</span> micro-grant</h3>
        Please fill out this application to be considered for a Good Neighbor Fund $1,000 micro-grant.<br /><br />
        <strong>What we look for:</strong>
        <ul>
          <li>Businesses at the early or ideation stage</li>
          <li>Clear understanding of the problem you're solving</li>
          <li>Specific, high-impact plan for using the $1,000</li>
          <li>Passion in your pitch video</li>
        </ul>
        <strong>What we typically avoid:</strong>
        <ul>
          <li>Personal use or self-promotion</li>
          <li>Short-term projects or one-off events</li>
          <li>Established companies or those with major funding</li>
          <li>Unclear use of funds</li>
          <li>Missing pitch video</li>
        </ul>
        <small style={{ color: "var(--gnf-text-secondary)" }}>The above criteria is not all-inclusive and we encourage all to apply! Most chapters typically select new micro-grants each quarter.</small>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mb-form-shell">
        {[
          { label: "Founder Name *", name: "founder", type: "text", placeholder: "e.g., Jane Smith" },
          { label: "Email *", name: "email", type: "email", placeholder: "e.g., jane.smith@gmail.com" },
          { label: "Business Name *", name: "business", type: "text", placeholder: "e.g., Jane's Flower Shop" },
          { label: "Zip Code *", name: "zip", type: "text", placeholder: "e.g., 14213" },
          { label: "Website (optional)", name: "website", type: "text", placeholder: "e.g., https://janesflowers.com" }
        ].map(field => {
          const hasErr = Boolean(fieldErrors[field.name]);
          return (
            <div key={field.name} style={fieldRowStyle} data-pitch-error={hasErr || undefined}>
              <label style={labelStyle} htmlFor={`pitch-${field.name}`}>{field.label}</label>
              <input
                id={`pitch-${field.name}`}
                type={field.type}
                name={field.name}
                value={form[field.name] || ""}
                onChange={handleChange}
                placeholder={field.placeholder}
                aria-invalid={hasErr || undefined}
                aria-describedby={hasErr ? `pitch-${field.name}-err` : undefined}
                style={{
                  padding: "6px",
                  fontSize: "14px",
                  ...(hasErr ? { borderColor: "#c0392b" } : {})
                }}
              />
              {hasErr && (
                <span id={`pitch-${field.name}-err`} style={errorMsgStyle} role="alert">
                  {fieldErrors[field.name]}
                </span>
              )}
            </div>
          );
        })}

        {/* Chapter Select */}
        <div style={fieldRowStyle} data-pitch-error={fieldErrors.chapter ? "true" : undefined}>
          <label style={labelStyle} htmlFor="pitch-chapter">Chapter Location *</label>
          <select
            id="pitch-chapter"
            name="chapter"
            value={form.chapter || ""}
            onChange={handleChange}
            aria-invalid={fieldErrors.chapter ? true : undefined}
            style={{ padding: "6px", fontSize: "14px" }}
          >
            <option value="">Select Chapter *</option>
            <option value="Western New York">Western New York</option>
            <option value="Denver">Denver</option>
            <option value="Central New York">Central New York</option>
            <option value="Capital Region">Capital Region</option>
          </select>
          <small style={helpStyle}>
            Businesses must be headquartered or located within the selected chapter's region to be considered.
          </small>
          {renderError("chapter")}
        </div>

        {/* Textareas */}
        {[
          {
            label: "Tell us a little about yourself (2-3 sentences) *",
            name: "about",
            placeholder: "e.g., I'm a Buffalo-based baker with 5 years of pastry experience, launching a small neighborhood bakery focused on locally-sourced ingredients."
          },
          {
            label: "Describe your company's value proposition *",
            name: "valueProp",
            placeholder: "e.g., Fresh, locally-sourced baked goods delivered weekly to your door."
          },
          {
            label: "Describe the problem you're solving *",
            name: "problem",
            placeholder: "e.g., Busy families in my neighborhood lack access to affordable, high-quality baked goods made with local ingredients."
          },
          {
            label: "How does your business solve it? *",
            name: "solution",
            placeholder: "e.g., A weekly subscription box of fresh pastries and breads delivered every Saturday morning."
          },
          {
            label: "How will your business make money? *",
            name: "revenueModel",
            placeholder: "e.g., Weekly subscription boxes starting at $25/month, plus one-off orders and pop-up events."
          }
        ].map(field => {
          const hasErr = Boolean(fieldErrors[field.name]);
          return (
            <div key={field.name} style={fieldRowStyle} data-pitch-error={hasErr || undefined}>
              <label style={labelStyle} htmlFor={`pitch-${field.name}`}>{field.label}</label>
              <textarea
                id={`pitch-${field.name}`}
                name={field.name}
                value={form[field.name] || ""}
                onChange={handleChange}
                rows={3}
                placeholder={field.placeholder}
                aria-invalid={hasErr || undefined}
                style={{ padding: "6px", fontSize: "14px" }}
              />
              {renderError(field.name)}
            </div>
          );
        })}

        {/* Paying Customers */}
        <div style={fieldRowStyle} data-pitch-error={fieldErrors.payingCustomers ? "true" : undefined}>
          <label style={labelStyle} htmlFor="pitch-payingCustomers">Do you have paying customers? *</label>
          <select
            id="pitch-payingCustomers"
            name="payingCustomers"
            value={form.payingCustomers || ""}
            onChange={handleChange}
            aria-invalid={fieldErrors.payingCustomers ? true : undefined}
            style={{ padding: "6px", fontSize: "14px" }}
          >
            <option value="">Select an option *</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
          <small style={helpStyle}>Answering 'No' does not disqualify you.</small>
          {renderError("payingCustomers")}
        </div>

        {/* Fund Use */}
        <div style={fieldRowStyle} data-pitch-error={fieldErrors.fundUse ? "true" : undefined}>
          <label style={labelStyle} htmlFor="pitch-fundUse">How will you use the $1,000 if awarded? *</label>
          <textarea
            id="pitch-fundUse"
            name="fundUse"
            value={form.fundUse || ""}
            onChange={handleChange}
            rows={3}
            placeholder="e.g., $600 for a commercial-grade mixer, $300 for packaging supplies, $100 for launch marketing."
            aria-invalid={fieldErrors.fundUse ? true : undefined}
            style={{ padding: "6px", fontSize: "14px" }}
          />
          <small style={helpStyle}>Please be specific. We expect funds to be used within 30 days of award.</small>
          {renderError("fundUse")}
        </div>

        {/* VideoUploader */}
        <div style={fieldRowStyle} data-pitch-error={fieldErrors.video ? "true" : undefined}>
          <VideoUploader onVideoUploaded={handleVideoUploaded} />
        </div>

        {/* Video URL Input */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "12px", marginBottom: "12px" }}>
          <label style={labelStyle} htmlFor="pitch-videoUrlInput">Pitch Video URL (optional)</label>
          <input
            id="pitch-videoUrlInput"
            type="text"
            name="videoUrlInput"
            value={form.videoUrlInput || ""}
            onChange={handleChange}
            placeholder="Paste hosted video URL here"
            style={{ padding: "6px", fontSize: "14px" }}
          />
          <small style={helpStyle}>
            Instead of uploading, you can paste a link to a pitch video you've already hosted (YouTube, Vimeo, Google Drive, Dropbox). <strong>Make sure sharing permissions are enabled</strong> so reviewers can view it.
          </small>
          {fieldErrors.video && (
            <span style={errorMsgStyle} role="alert">{fieldErrors.video}</span>
          )}
        </div>

        {/* Self Identification */}
        <div style={fieldRowStyle} role="group" aria-labelledby="pitch-selfId-label">
          <span id="pitch-selfId-label" style={labelStyle}>Do any of the following apply to you? (optional)</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
            {["Veteran Owned/Led", "Women Owned/Led", "BIPOC Owned/Led", "LGBTQ+ Owned/Led", "Disabled Owned/Led", "Student Owned/Led", "Minority Owned/Led"].map(opt => {
              const selected = (form.selfId || []).includes(opt);
              return (
                <label key={opt} style={{ fontSize: "13px", display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name="selfId"
                    value={opt}
                    checked={selected}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...(form.selfId || []), opt]
                        : (form.selfId || []).filter((v) => v !== opt);
                      setForm((prev) => ({ ...prev, selfId: next }));
                    }}
                    style={{ marginRight: "8px" }}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
          <small style={helpStyle}>
            This self-identifying information is used only for GNF reporting purposes and is never shared publicly without your consent.
          </small>
        </div>

        {/* Referral */}
        <div style={fieldRowStyle}>
          <label style={labelStyle} htmlFor="pitch-referral">How did you hear about us? (optional)</label>
          <select
            id="pitch-referral"
            name="referral"
            value={form.referral || ""}
            onChange={handleChange}
            style={{ padding: "6px", fontSize: "14px" }}
          >
            <option value="">Select one…</option>
            {PITCH_REFERRAL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {form.referral === PITCH_REFERRAL_OTHER && (
            <input
              id="pitch-referral-other"
              type="text"
              name="referralOther"
              value={form.referralOther || ""}
              onChange={handleChange}
              placeholder="Please specify"
              style={{ padding: "6px", fontSize: "14px", marginTop: "8px" }}
            />
          )}
        </div>

        {/* Consent */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: "16px" }} data-pitch-error={fieldErrors.consent ? "true" : undefined}>
          <label style={{ fontWeight: "bold", fontSize: "13px", display: "flex", alignItems: "flex-start", cursor: "pointer" }}>
            <input
              type="checkbox"
              name="consent"
              checked={form.consent || false}
              onChange={handleChange}
              aria-invalid={fieldErrors.consent ? true : undefined}
              style={{ marginRight: "8px", marginTop: "3px" }}
            />
            <span>I agree to GNF's Terms of Use & Privacy Policy *</span>
          </label>
          <small style={helpStyle}>
            Good Neighbor Fund (GNF) has my consent to share certain details of my application with partner organizations and/or the public through social media, the Good Neighbor Fund website, and other platforms. Shared info may include: Name, Business Name, Value Proposition, Problem, and Solution. Pitch videos and self-identification are never shared without consent.
            By submitting this application, I agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#833f7b", fontWeight: "bold" }}>
              Good Neighbor Fund Terms of Use & Privacy Policy
            </a>
            .
          </small>
          {renderError("consent")}
        </div>

        {/* In-Person Meetup Consent */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: "16px" }} data-pitch-error={fieldErrors.meetupConsent ? "true" : undefined}>
          <label style={{ fontWeight: "bold", fontSize: "13px", display: "flex", alignItems: "flex-start", cursor: "pointer" }}>
            <input
              type="checkbox"
              name="meetupConsent"
              checked={form.meetupConsent || false}
              onChange={handleChange}
              aria-invalid={fieldErrors.meetupConsent ? true : undefined}
              style={{ marginRight: "8px", marginTop: "3px" }}
            />
            <span>I agree to complete an in-person meetup if awarded *</span>
          </label>
          <small style={helpStyle}>
            All grant awardees are required to complete an in-person meetup with their chapter.
            We use this time to learn about your business and business plan, and to take photos
            that may be shared on social media and the Good Neighbor Fund website.
          </small>
          {renderError("meetupConsent")}
        </div>

        {/* Submission error banner */}
        {submitError && (
          <div
            role="alert"
            className="win95-inset"
            style={{
              padding: "12px",
              marginBottom: "12px",
              background: "#ffe0e0",
              color: "#c0392b",
              fontWeight: "bold"
            }}
          >
            {submitError}
          </div>
        )}

        {/* Error summary */}
        {Object.keys(fieldErrors).length > 0 && (
          <div
            role="alert"
            className="win95-inset"
            style={{
              padding: "12px",
              marginBottom: "12px",
              background: "#fff0f0",
              color: "#c0392b"
            }}
          >
            <strong>Please fix {Object.keys(fieldErrors).length} {Object.keys(fieldErrors).length === 1 ? "issue" : "issues"} before submitting.</strong>
          </div>
        )}

        {/* Submit */}
        <button
          className="mb-btn"
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting || undefined}
          style={{
            width: "100%",
            padding: "16px 20px",
            fontSize: 14,
            marginTop: "20px"
          }}
        >
          {isSubmitting ? "Submitting…" : "Submit Pitch"}
          {!isSubmitting && <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>}
        </button>
        <style>{`
          @keyframes pitchSpin {
            0%   { content: "|"; }
            25%  { transform: rotate(90deg); }
            50%  { transform: rotate(180deg); }
            75%  { transform: rotate(270deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </form>
    </WindowFrame>
  );
}
