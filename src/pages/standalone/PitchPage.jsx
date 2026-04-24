// PitchPage.jsx
import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import VideoUploader from "../../components/media/VideoUploader";
import Confetti from "react-confetti";
import { useNavigate, useLocation } from "react-router-dom";
import PageTaskbar from "../../components/ui/Taskbar/PageTaskbar";

// Fallback chapter names used while /chapters is loading or if the fetch fails.
const FALLBACK_PITCH_CHAPTERS = ["Western New York", "Denver", "Upstate New York", "Capital Region"];


export default function PitchPage({ onClose }) {
  const [form, setForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [chapterOptions, setChapterOptions] = useState(FALLBACK_PITCH_CHAPTERS);
  const navigate = useNavigate();
  const location = useLocation();
  const isEmbedded = Boolean(onClose); // If onClose prop is provided, component is embedded


  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load active chapters from Firestore; fall back to hardcoded list if empty/failed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "chapters"));
        const names = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.active !== false)
          .sort((a, b) => {
            const ao = typeof a.order === "number" ? a.order : 999;
            const bo = typeof b.order === "number" ? b.order : 999;
            if (ao !== bo) return ao - bo;
            return (a.name || "").localeCompare(b.name || "");
          })
          .map(c => c.name)
          .filter(Boolean);
        if (!cancelled && names.length > 0) setChapterOptions(names);
      } catch (e) {
        console.error("Pitch form: failed to load /chapters, using fallback", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  
  // Handle close button click based on whether the component is embedded or standalone
  const handleClose = () => {
    if (isEmbedded && onClose) {
      // If embedded, call the parent's onClose function
      onClose();
    } else {
      // If standalone, navigate to home
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
    const { name, value, type, options, checked } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "select-multiple") {
      const selectedValues = Array.from(options).filter((o) => o.selected).map((o) => o.value);
      setForm((prev) => ({ ...prev, [name]: selectedValues }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleVideoUploaded = (videoUrl) => {
    setForm((prev) => ({ ...prev, videoUrl }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiredFields = [
      'founder', 'email', 'business', 'zip', 'chapter', 'about',
      'valueProp', 'problem', 'solution', 'revenueModel',
      'payingCustomers', 'fundUse', 'consent', 'meetupConsent'
    ];
    const missingFields = requiredFields.filter(field => !form[field]);
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields.`);
      return;
    }
    if (!form.videoUrl && !form.videoUrlInput) {
      alert("Please either upload a pitch video or provide a hosted video URL.");
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
        heardAbout: form.referral || "",
        consentToShare: form.consent || false,
        consentToMeetup: form.meetupConsent || false,
        createdAt: Timestamp.now(),
        isWinner: false
      };
      await addDoc(collection(db, "pitches"), pitchData);
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting pitch:", error);
      alert("There was an error submitting your pitch. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      setCurrentTime(`${dateStr} ${timeStr} ${now.getFullYear()}`);
    };

    updateClock(); // Call once immediately
    const interval = setInterval(updateClock, 60000); // Then every minute
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  if (submitted) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        background: "var(--mb-paper)",
        fontFamily: "var(--font-content)",
        textAlign: "center",
        padding: isEmbedded ? "20px" : "60px 20px 20px",
        boxSizing: "border-box"
      }}>
        {!isEmbedded && <PageTaskbar />}
        <div style={{
          background: "var(--mb-chalk)",
          padding: "48px 40px",
          border: "2px solid var(--mb-ink)",
          boxShadow: "var(--shadow-hard-lg)",
          maxWidth: "560px"
        }}>
          <Confetti width={windowSize.width} height={windowSize.height} numberOfPieces={250} recycle={false} />
          <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Pitch Received</span>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: 44,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            color: "var(--mb-ink)",
            margin: "12px 0 16px"
          }}>
            Thank you for submitting your pitch.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: "var(--mb-ink)" }}>
            Our GNF LPs review all submissions after each quarter. We'll be in touch soon.
          </p>
          <button
            onClick={handleClose}
            type="button"
            className="mb-btn"
            style={{ marginTop: 24 }}
          >
            Return to Home
            <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
          </button>
        </div>

      </div>
    );
  }

  return (
    <div className="mb-page" style={{
      minHeight: "100vh",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      padding: "10px",
      paddingTop: isEmbedded ? "10px" : "60px"
    }}>
      {!isEmbedded && <PageTaskbar />}
      {/* Window Frame */}
      <div className="mb-page-window mb-form-shell">
        {/* Window Title Bar */}
        <div className="mb-page-titlebar">
          <span>Micro-Grant Pitch Application</span>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="mb-page-close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          {/* Intro Box */}
          <div style={{
            padding: "18px 20px",
            fontSize: "14px",
            lineHeight: "1.5",
            marginBottom: "10px",
            background: "var(--mb-paper)",
            border: "2px solid var(--mb-ink)",
            boxShadow: "var(--shadow-hard-sm)",
            color: "var(--mb-ink)"
          }}>
            <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Pitch Application</span>
            <h3 style={{ marginTop: 8, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 24, letterSpacing: "-0.01em" }}>Apply for a $1,000 micro-grant</h3>
            Please fill out this application to be considered for a Good Neighbor Fund $1,000 micro-grant.<br /><br />
            <strong>What we look for:</strong>
            <ul>
              <li>Business ideas at the ideation stage (early stage will be considered)</li>
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
            <small>The above criteria is not all-inclusive and we encourage all to apply! Most chapters typically select new micro-grants each quarter.</small>
          </div>

          {/* Inputs */}
          {[
            { label: "Founder Name *", name: "founder", type: "text", placeholder: "e.g., Jane Smith" },
            { label: "Email *", name: "email", type: "email", placeholder: "e.g., jane.smith@gmail.com" },
            { label: "Business Name *", name: "business", type: "text", placeholder: "e.g., Jane's Flower Shop" },
            { label: "Zip Code *", name: "zip", type: "text", placeholder: "e.g., 14213" },
            { label: "Website (optional)", name: "website", type: "text", placeholder: "e.g., https://janesflowers.com" }
          ].map(field => (
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

          {/* Chapter Select */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Chapter Location *</label>
            <select
              name="chapter"
              value={form.chapter || ""}
              onChange={handleChange}
              required
            >
              <option value="">Select Chapter *</option>
              {chapterOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <small>
              Businesses must be headquartered or located within the selected chapter's region to be considered.
            </small>
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
          ].map(field => (
            <div key={field.name} style={{ display: "flex", flexDirection: "column" }}>
              <label>{field.label}</label>
              <textarea
                name={field.name}
                value={form[field.name] || ""}
                onChange={handleChange}
                rows={3}
                required
                placeholder={field.placeholder}
              />
            </div>
          ))}

          {/* Paying Customers */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Do you have paying customers? *</label>
            <select
              name="payingCustomers"
              value={form.payingCustomers || ""}
              onChange={handleChange}
              required
            >
              <option value="">Select an option *</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            <small>Answering 'No' does not disqualify you.</small>
          </div>

          {/* Fund Use */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>How will you use the $1,000 if awarded? *</label>
            <textarea
              name="fundUse"
              value={form.fundUse || ""}
              onChange={handleChange}
              rows={3}
              required
              placeholder="e.g., $600 for a commercial-grade mixer, $300 for packaging supplies, $100 for launch marketing."
            />
            <small>Please be specific. We expect funds to be used within 30 days of award.</small>
          </div>

          {/* VideoUploader */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <VideoUploader onVideoUploaded={handleVideoUploaded} />
          
          </div>

          {/* Video URL Input */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: "12px" }}>
            <label>Pitch Video URL (optional)</label>
            <input
              type="text"
              name="videoUrlInput"
              value={form.videoUrlInput || ""}
              onChange={handleChange}
              placeholder="Paste hosted video URL here"
            />
            <small>
              If you have a hosted pitch video to share (YouTube, Vimeo, Google Drive, Dropbox), paste the URL here. Ensure sharing permissions are enabled.
            </small>
          </div>


          {/* Self Identification */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>Do any of the following apply to you? (optional)</label>
            <select
              name="selfId"
              multiple
              value={form.selfId || []}
              onChange={handleChange}
              style={{ height: "120px" }}
            >
              {["Veteran Owned/Led", "Women Owned/Led", "BIPOC Owned/Led", "LGBTQ+ Owned/Led", "Disabled Owned/Led", "Student Owned/Led", "Minority Owned/Led"].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <small>
              This self-identifying information is used only for GNF reporting purposes and is never shared publicly without your consent.
            </small>
          </div>

          {/* Referral */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>How did you hear about us? (optional)</label>
            <input
              type="text"
              name="referral"
              value={form.referral || ""}
              onChange={handleChange}
              placeholder="e.g., LinkedIn, Instagram, SBDC, LP Referral"
            />
            <small>
              Example: LinkedIn, Instagram, Facebook, SBDC, LP Referral, Prior Grant Awardee, School, Etc.
            </small>
          </div>


          {/* Consent */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>
              <input
                type="checkbox"
                name="consent"
                checked={form.consent || false}
                onChange={handleChange}
                required
              />{" "}
              I agree to GNF's Terms of Use & Privacy Policy *
            </label>
            <small>
              Good Neighbor Fund (GNF) has my consent to share certain details of my application with partner organizations and/or the public through social media, the Good Neighbor Fund website, and other platforms. Shared info may include: Name, Business Name, Value Proposition, Problem, and Solution. Pitch videos and self-identification are never shared without consent.
              By submitting this application, I agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--mb-magenta)", fontWeight: "bold" }}>
                Good Neighbor Fund Terms of Use & Privacy Policy
              </a>
              .
            </small>
          </div>

          {/* In-Person Meetup Consent */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label>
              <input
                type="checkbox"
                name="meetupConsent"
                checked={form.meetupConsent || false}
                onChange={handleChange}
                required
              />{" "}
              I agree to complete an in-person meetup if awarded *
            </label>
            <small>
              All grant awardees are required to complete an in-person meetup with their chapter.
              We use this time to learn about your business and business plan, and to take photos
              that may be shared on social media and the Good Neighbor Fund website.
            </small>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mb-btn"
            style={{ marginTop: "20px", padding: "16px 24px", fontSize: 14 }}
          >
            {isSubmitting ? "Submitting…" : "Submit Pitch"}
            {!isSubmitting && <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>}
          </button>

        </form>
      </div>
    </div>
  );
}

