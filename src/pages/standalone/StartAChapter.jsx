// StartAChapter.jsx
import React, { useState, useEffect } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Confetti from "react-confetti";
import { useNavigate } from "react-router-dom";
import PageTaskbar from "../../components/ui/Taskbar/PageTaskbar";

export default function StartAChapter({ onClose, hideFrame = false }) {
  const [form, setForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const navigate = useNavigate();
  const hasOnClose = Boolean(onClose);
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
      "name", "email",
      "city", "whyBenefit", "hasLocalOrgs",
      "willingChapterDirector",
    ];
    const missingFields = requiredFields.filter((field) => !form[field]);
    if (missingFields.length > 0) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        name: form.name || "",
        email: form.email || "",
        phone: form.phone || "",
        linkedinOrWebsite: form.linkedinOrWebsite || "",
        city: form.city || "",
        whyBenefit: form.whyBenefit || "",
        hasLocalOrgs: form.hasLocalOrgs || "",
        localOrgsDetails: form.localOrgsDetails || "",
        willingChapterDirector: form.willingChapterDirector || "",
        hasSupporters: form.hasSupporters || "",
        anythingElse: form.anythingElse || "",
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, "chapterApplications"), data);
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting chapter application:", error);
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
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          textTransform: "none",
          fontSize: 40,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          color: "var(--mb-ink)",
          margin: "12px 0 16px",
        }}>
          Thanks for raising your hand.
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.5, color: "var(--mb-ink)" }}>
          We'll review your interest and follow up from hello@goodneighbor.fund with next steps.
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
        background: "transparent",
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
        <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>New Chapter · Interest Form</span>
        <h2 style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          textTransform: "none",
          fontSize: 28,
          letterSpacing: "-0.015em",
          lineHeight: 1.1,
          margin: "10px 0 14px",
          color: "var(--mb-ink)",
        }}>
          Bring Good Neighbor Fund to your city.
        </h2>
        <p className="mb-body" style={{ margin: "0 0 12px" }}>
          Interested in launching a GNF chapter in your city or region? We're always looking
          for community-minded leaders who believe in supporting first-time founders and
          building grassroots entrepreneurship from the ground up.
        </p>
        <p className="mb-body" style={{ margin: "0 0 14px" }}>
          This short form helps us get to know you, your city, and your vision. From there
          we'll follow up with next steps.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
          <span className="mb-badge">Est. Time · 5 Min</span>
        </div>
      </div>

      {/* Section 01 - About You */}
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
        <span className="mb-eyebrow" style={{ color: "var(--mb-ink)", margin: 0 }}>About You</span>
      </div>

      {[
        { label: "Full Name *", name: "name", type: "text", placeholder: "e.g., Jane Smith" },
        { label: "Email Address *", name: "email", type: "email", placeholder: "e.g., jane@gmail.com" },
        { label: "Phone Number", name: "phone", type: "tel", placeholder: "e.g., (555) 123-4567" },
        { label: "LinkedIn or Website", name: "linkedinOrWebsite", type: "text", placeholder: "e.g., linkedin.com/in/janesmith" },
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

      {/* Section 02 - Your City */}
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
        <span className="mb-eyebrow" style={{ color: "var(--mb-ink)", margin: 0 }}>Your City</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>City/Region You're Interested In *</label>
        <small style={{ marginBottom: "6px" }}>e.g., Pittsburgh, South LA, Rural Appalachia</small>
        <input
          type="text"
          name="city"
          value={form.city || ""}
          onChange={handleChange}
          required
          placeholder="e.g., Pittsburgh, PA"
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Why do you think your city/community would benefit from a GNF chapter? *</label>
        <small style={{ marginBottom: "6px" }}>A few sentences is great. No pressure.</small>
        <textarea
          name="whyBenefit"
          value={form.whyBenefit || ""}
          onChange={handleChange}
          rows={4}
          required
          placeholder="What's the local entrepreneurship scene like? Who's underserved?"
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Are you connected to any local entrepreneurial or community orgs? *</label>
        <select
          name="hasLocalOrgs"
          value={form.hasLocalOrgs || ""}
          onChange={handleChange}
          required
        >
          <option value="">Select an option *</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>If yes, tell us more</label>
        <textarea
          name="localOrgsDetails"
          value={form.localOrgsDetails || ""}
          onChange={handleChange}
          rows={3}
          placeholder="Which orgs? What's your involvement?"
        />
      </div>

      {/* Section 03 - Your Role */}
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
        <span className="mb-eyebrow" style={{ color: "var(--mb-ink)", margin: 0 }}>Your Role</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Would you be willing to serve as a Chapter Director (i.e., lead organizer)? *</label>
        <select
          name="willingChapterDirector"
          value={form.willingChapterDirector || ""}
          onChange={handleChange}
          required
        >
          <option value="">Select an option *</option>
          <option value="Yes">Yes</option>
          <option value="Maybe">Maybe</option>
          <option value="No">No, but I want to help</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Do you have 2-3 others who might want to support this effort?</label>
        <select
          name="hasSupporters"
          value={form.hasSupporters || ""}
          onChange={handleChange}
        >
          <option value="">Select an option</option>
          <option value="Yes">Yes</option>
          <option value="Maybe">Maybe</option>
          <option value="No">Not yet</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Anything Else?</label>
        <small style={{ marginBottom: "6px" }}>Anything you want to share, ask, or dream out loud.</small>
        <textarea
          name="anythingElse"
          value={form.anythingElse || ""}
          onChange={handleChange}
          rows={4}
          placeholder="Optional"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mb-btn"
        style={{ marginTop: "20px", padding: "16px 24px", fontSize: 14 }}
      >
        {isSubmitting ? "Submitting…" : "Submit Interest Form"}
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
      background: "transparent",
    }}>
      {!hasOnClose && <PageTaskbar />}
      <div className="mb-page-window mb-form-shell">
        <div className="mb-page-titlebar">
          <span>Start a New Chapter</span>
          <button onClick={handleClose} className="mb-page-close" aria-label="Close">×</button>
        </div>
        {formContent}
      </div>
    </div>
  );
}
