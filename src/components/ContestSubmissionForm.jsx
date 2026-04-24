import React, { useState, useRef, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import Draggable from "react-draggable";
import VideoUploader from "../VideoUploader";
import Confetti from "react-confetti";

export default function ContestSubmissionForm({ onClose }) {
  const [form, setForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const nodeRef = useRef(null);

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
  };

  const handleVideoUploaded = (videoUrl) => {
    setForm((prev) => ({ ...prev, videoUrl }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check submission deadline
    const SUBMISSION_END_DATE = new Date('2025-07-12T23:59:59-04:00');
    const now = new Date();
    if (now > SUBMISSION_END_DATE) {
      alert('Submissions have closed. The contest ended on July 12th at 11:59 PM ET.');
      onClose();
      return;
    }
    
    const requiredFields = [
      'founder', 'email', 'business', 'zip', 'about',
      'valueProp', 'problem', 'solution', 'revenueModel',
      'fundUse', 'industry', 'consent', 'meetupConsent'
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
        // Standard grant application fields
        founderName: form.founder || "",
        email: form.email || "",
        businessName: form.business || "",
        chapter: "Western New York",
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
        isWinner: false,
        
        // Contest-specific additions
        industry: form.industry || "",
        isContest: true,
        contest: "business-idea-challenge-2025",
        votes: 0,
        status: "pending" // Will need admin approval
      };
      
      const docRef = await addDoc(collection(db, "pitches"), pitchData);
      
      // Also submit to Google Sheets if the service is available
      try {
        const { submitToGoogleSheets } = await import('../services/googleSheets');
        await submitToGoogleSheets({ ...pitchData, id: docRef.id });
        console.log('Also saved to Google Sheets');
      } catch (sheetsError) {
        console.error('Failed to save to Google Sheets:', sheetsError);
        // Don't fail the submission if Sheets fails
      }
      
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting contest entry:", error);
      alert("There was an error submitting your entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        minHeight: "100vh",
        background: "var(--mb-paper)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: "var(--font-content)",
        textAlign: "center",
        padding: "20px",
        boxSizing: "border-box",
        zIndex: 9999
      }}>
        <Confetti width={windowSize.width} height={windowSize.height} numberOfPieces={250} recycle={false} />
        <div style={{
          background: "var(--mb-chalk)",
          padding: "48px 40px",
          border: "2px solid var(--mb-ink)",
          boxShadow: "var(--shadow-hard-lg)",
          maxWidth: 560,
          textAlign: "center"
        }}>
          <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Submission Received</span>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: 40,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            color: "var(--mb-ink)",
            margin: "12px 0 16px"
          }}>
            Your idea has been submitted.
          </h1>
          <p style={{ fontSize: 16, marginTop: 0, color: "var(--mb-ink)" }}>
            Thank you for entering The $1,000 Business Idea Challenge. Your submission will be
            reviewed and posted to the showcase soon &mdash; share with your network to get votes.
          </p>
          <button
            onClick={onClose}
            type="button"
            className="mb-btn"
            style={{ marginTop: 24 }}
          >
            Return to Showcase
            <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>
    );
  }

  const industries = [
    'Technology & Software',
    'E-commerce & Retail',
    'Food & Beverage',
    'Health & Wellness',
    'Education & Training',
    'Financial Services',
    'Real Estate & Construction',
    'Marketing & Advertising',
    'Consulting & Professional Services',
    'Manufacturing & Hardware',
    'Entertainment & Media',
    'Transportation & Logistics',
    'Energy & Environment',
    'Agriculture & Farming',
    'Other'
  ];

  return (
    <Draggable handle=".form-title-bar" nodeRef={nodeRef} enableUserSelectHack={false}>
      <div ref={nodeRef} className="mb-form-shell" style={{
        position: "fixed", top: "15%", left: "25%",
        transform: "translate(-50%, -50%)", zIndex: 99999, width: "600px",
        maxHeight: "80vh", overflow: "auto",
        background: "var(--mb-chalk)",
        border: "2px solid var(--mb-ink)",
        boxShadow: "var(--shadow-hard-lg)"
      }}>
        <div className="form-title-bar" style={{
          padding: "10px 16px",
          background: "var(--mb-ink)",
          color: "var(--mb-chalk)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "move",
          fontFamily: "var(--font-pixel)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 700
        }}>
          <span>$1,000 Business Idea Challenge</span>
          <button onClick={onClose} style={{
            background: "var(--mb-magenta)",
            color: "var(--mb-chalk)",
            border: "1px solid var(--mb-chalk)",
            cursor: "pointer",
            fontWeight: "bold",
            padding: "2px 8px",
            fontSize: 14,
            fontFamily: "var(--font-content)"
          }}>×</button>
        </div>

        <div style={{ padding: "24px" }}>
          <div style={{
            background: "var(--mb-magenta-soft)",
            padding: "18px 20px",
            borderLeft: "4px solid var(--mb-magenta)",
            border: "2px solid var(--mb-ink)",
            fontSize: "14px",
            lineHeight: "1.5",
            marginBottom: "20px"
          }}>
            <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Challenge</span>
            <h3 style={{ marginTop: 8, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 22, letterSpacing: "-0.01em" }}>$1,000 Business Idea Challenge</h3>
            👋 Have an idea? Share it here to compete for $1,000 and get community support!<br /><br />
            ✅ <strong>What we love to see:</strong>
            <ul>
              <li>ANY business idea - from napkin sketches to working prototypes!</li>
              <li>Your passion for solving a problem (even if you're still figuring it out)</li>
              <li>How $1,000 could help you take the next step</li>
              <li>Your excitement in the pitch video</li>
            </ul>
            ❌ <strong>What we typically avoid:</strong>
            <ul>
              <li>Joke or meme submissions</li>
              <li>Personal use or self-promotion</li>
              <li>Unclear use of funds</li>
              <li>Missing pitch video</li>
            </ul>
            ℹ️ Winners selected based on community votes and judge review. This is IN ADDITION to our standard quarterly micro-grants!
          </div>

          <form onSubmit={handleSubmit}>
            {/* Inputs */}
            {[
              { label: "Founder Name *", name: "founder", type: "text", placeholder: "e.g., Jane Smith" },
              { label: "Email *", name: "email", type: "email", placeholder: "e.g., jane.smith@gmail.com" },
              { label: "Business Name *", name: "business", type: "text", placeholder: "e.g., Jane's Flower Shop" },
              { label: "Zip Code *", name: "zip", type: "text", placeholder: "e.g., 14213" },
              { label: "Website (optional)", name: "website", type: "text", placeholder: "e.g., https://janesflowers.com" }
            ].map(field => (
              <div key={field.name} style={{ display: "flex", flexDirection: "column", marginBottom: "12px" }}>
                <label style={{ fontWeight: "bold", marginBottom: "4px" }}>{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name] || ""}
                  onChange={handleChange}
                  required={field.label.includes("*")}
                  placeholder={field.placeholder}
                  style={{
                    padding: "8px",
                    fontFamily: '"MS Sans Serif", "Segoe UI", Tahoma, Verdana, sans-serif',
                    border: "1px solid #ccc",
                    fontSize: "14px",
                    height: "20px"
                  }}
                />
              </div>
            ))}


            {/* Industry Select - Required */}
            <div style={{ display: "flex", flexDirection: "column", marginBottom: "12px" }}>
              <label style={{ fontWeight: "bold", marginBottom: "4px" }}>Industry *</label>
              <select
                name="industry"
                value={form.industry || ""}
                onChange={handleChange}
                required
                style={{
                  padding: "8px",
                  fontFamily: '"MS Sans Serif", "Segoe UI", Tahoma, Verdana, sans-serif',
                  border: "1px solid #ccc",
                  fontSize: "14px",
                  height: "40px"
                }}
              >
                <option value="">Select Industry *</option>
                {industries.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
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
              <div key={field.name} style={{ display: "flex", flexDirection: "column", marginBottom: "12px" }}>
                <label style={{ fontWeight: "bold", marginBottom: "4px" }}>{field.label}</label>
                <textarea
                  name={field.name}
                  value={form[field.name] || ""}
                  onChange={handleChange}
                  rows={3}
                  required
                  placeholder={field.placeholder}
                  style={{
                    padding: "8px",
                    fontFamily: '"MS Sans Serif", "Segoe UI", Tahoma, Verdana, sans-serif',
                    border: "1px solid #ccc",
                    fontSize: "14px"
                  }}
                />
              </div>
            ))}


            {/* Fund Use */}
            <div style={{ display: "flex", flexDirection: "column", marginBottom: "12px" }}>
              <label style={{ fontWeight: "bold", marginBottom: "4px" }}>How will you use the $1,000 if awarded? *</label>
              <textarea
                name="fundUse"
                value={form.fundUse || ""}
                onChange={handleChange}
                rows={3}
                required
                placeholder="e.g., $600 for a commercial-grade mixer, $300 for packaging supplies, $100 for launch marketing."
                style={{
                  padding: "8px",
                  fontFamily: '"MS Sans Serif", "Segoe UI", Tahoma, Verdana, sans-serif',
                  border: "1px solid #ccc",
                  fontSize: "14px"
                }}
              />
              <small style={{ color: "#666", marginTop: "4px" }}>
                Please be specific. We expect funds to be used within 30 days of award.
              </small>
            </div>

            {/* VideoUploader */}
            <div style={{ display: "flex", flexDirection: "column", marginBottom: "12px" }}>
              <VideoUploader onVideoUploaded={handleVideoUploaded} />
            </div>

            {/* Video URL Input */}
            <div style={{ display: "flex", flexDirection: "column", marginTop: "12px", marginBottom: "12px" }}>
              <label style={{ fontWeight: "bold", marginBottom: "4px" }}>
                Pitch Video URL (optional)
              </label>
              <input
                type="text"
                name="videoUrlInput"
                value={form.videoUrlInput || ""}
                onChange={handleChange}
                placeholder="Paste hosted video URL here"
                style={{
                  padding: "8px",
                  fontFamily: '"MS Sans Serif", "Segoe UI", Tahoma, Verdana, sans-serif',
                  border: "1px solid #ccc",
                  fontSize: "14px",
                  height: "20px"
                }}
              />
              <small style={{ color: "#666", marginTop: "4px" }}>
                If you have a hosted pitch video to share (YouTube, Vimeo, Google Drive, Dropbox), paste the URL here. Ensure sharing permissions are enabled.
              </small>
            </div>

            {/* Self Identification */}
            <div style={{ display: "flex", flexDirection: "column", marginBottom: "12px" }}>
              <label style={{ fontWeight: "bold", marginBottom: "4px" }}>Do any of the following apply to you? (optional)</label>
              <select
                name="selfId"
                multiple
                value={form.selfId || []}
                onChange={handleChange}
                style={{
                  padding: "8px",
                  fontFamily: '"MS Sans Serif", "Segoe UI", Tahoma, Verdana, sans-serif',
                  border: "1px solid #ccc",
                  fontSize: "14px",
                  height: "120px"
                }}
              >
                {["Veteran Owned/Led", "Women Owned/Led", "BIPOC Owned/Led", "LGBTQ+ Owned/Led", "Disabled Owned/Led", "Student Owned/Led", "Minority Owned/Led"].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <small style={{ color: "#666", marginTop: "4px" }}>
                This self-identifying information is used only for GNF reporting purposes and is never shared publicly without your consent.
              </small>
            </div>

            {/* Referral */}
            <div style={{ display: "flex", flexDirection: "column", marginBottom: "12px" }}>
              <label style={{ fontWeight: "bold", marginBottom: "4px" }}>How did you hear about us? (optional)</label>
              <input
                type="text"
                name="referral"
                value={form.referral || ""}
                onChange={handleChange}
                placeholder="e.g., LinkedIn, Instagram, SBDC, LP Referral"
                style={{
                  padding: "8px",
                  fontFamily: '"MS Sans Serif", "Segoe UI", Tahoma, Verdana, sans-serif',
                  border: "1px solid #ccc",
                  fontSize: "14px",
                  height: "20px"
                }}
              />
              <small style={{ color: "#666", marginTop: "4px" }}>
                Example: LinkedIn, Instagram, Facebook, SBDC, LP Referral, Prior Grant Awardee, School, Etc.
              </small>
            </div>

            {/* Consent */}
            <div style={{ display: "flex", flexDirection: "column", marginBottom: "16px" }}>
              <label style={{ fontWeight: "bold", display: "flex", alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="consent"
                  checked={form.consent || false}
                  onChange={handleChange}
                  required
                  style={{ marginRight: "8px", marginTop: "3px" }}
                />
                <span>I agree to GNF's Terms of Use & Privacy Policy *</span>
              </label>
              <small style={{ color: "#666", marginTop: "4px" }}>
                Good Neighbor Fund (GNF) has my consent to share certain details of my application with partner organizations and/or the public through social media, the Good Neighbor Fund website, and other platforms. Shared info may include: Name, Business Name, Value Proposition, Problem, and Solution. Pitch videos and self-identification are never shared without consent.
                By submitting this application, I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--mb-magenta)", fontWeight: "bold" }}>
                  Good Neighbor Fund Terms of Use & Privacy Policy
                </a>
                .
              </small>
            </div>

            {/* In-Person Meetup Consent */}
            <div style={{ display: "flex", flexDirection: "column", marginBottom: "16px" }}>
              <label style={{ fontWeight: "bold", display: "flex", alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="meetupConsent"
                  checked={form.meetupConsent || false}
                  onChange={handleChange}
                  required
                  style={{ marginRight: "8px", marginTop: "3px" }}
                />
                <span>I agree to complete an in-person meetup if awarded *</span>
              </label>
              <small style={{ color: "#666", marginTop: "4px" }}>
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
              style={{
                width: "100%",
                padding: "16px 20px",
                fontSize: 14,
                marginTop: "20px",
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? "Submitting…" : "Submit Contest Entry"}
              {!isSubmitting && <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>}
            </button>
          </form>
        </div>
      </div>
    </Draggable>
  );
}