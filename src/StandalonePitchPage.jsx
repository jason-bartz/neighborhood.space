// StandalonePitchPage.jsx
import React, { useState, useEffect } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";
import VideoUploader from "./VideoUploader";
import Confetti from "react-confetti";
import { useNavigate, useLocation } from "react-router-dom";


export default function StandalonePitchPage({ onClose }) {
  const [form, setForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
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
  
  // Handle close button click based on whether the component is embedded or standalone
  const handleClose = () => {
    if (isEmbedded && onClose) {
      // If embedded, call the parent's onClose function
      onClose();
    } else {
      // If standalone, navigate to home
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
    if (type === "checkbox" && name === "consent") {
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
      'founder', 'email', 'business', 'chapter', 'about',
      'valueProp', 'problem', 'solution', 'revenueModel',
      'payingCustomers', 'fundUse', 'consent'
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
      setCurrentTime(`${dateStr} ${timeStr} 2002`);
    };

    updateClock(); // Call once immediately
    const interval = setInterval(updateClock, 60000); // Then every minute
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  if (submitted) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "url('/assets/gnf-wallpaper-blue.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif',
        textAlign: "center",
        padding: "20px",
        boxSizing: "border-box"
      }}>        
        <div style={{ 
          background: "white",
          padding: "30px",
          borderRadius: "8px",
          border: "2px solid #d48fc7",
          boxShadow: "4px 4px 0 #ffbde2",
          maxWidth: "600px" 
        }}>
          <Confetti width={windowSize.width} height={windowSize.height} numberOfPieces={250} recycle={false} />
          <h1 style={{ color: "#833f7b" }}>🎉 Thank you for submitting your pitch!</h1>
          <p>Our GNF LPs review all submissions after each quarter. We'll be in touch soon!</p>
          <button
            onClick={handleClose}
            style={{
              marginTop: "20px",
              padding: "12px 24px",
              backgroundColor: "#ffd6ec",
              border: "2px solid #d48fc7",
              borderRadius: "8px",
              color: "#333",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: "pointer"
            }}
          >
            🏡 Return to Home
          </button>
        </div>

      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "url('/assets/gnf-wallpaper-blue.webp')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif',
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      padding: "10px"
    }}>
      {/* Window Frame */}
      <div style={{
        background: "#fff",
        border: "2px solid #d48fc7",
        borderRadius: "8px",
        width: "95%",
        maxWidth: "680px",
        boxShadow: "4px 4px 0 #ffbde2",
        display: "flex",
        flexDirection: "column",
        margin: "0 auto"
      }}>
        {/* Window Title Bar */}
        <div style={{
          background: "#ffeaf5",
          borderBottom: "1px solid #d48fc7",
          padding: "6px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: "bold",
          fontSize: "16px"
        }}>
          <span>📝 Micro-Grant Pitch Application</span>
          <button
            onClick={handleClose}
            style={{
              background: "#ffbde2",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              padding: "0 8px",
              height: "24px",
              lineHeight: "24px",
              fontSize: "16px"
            }}
          >
            ✖
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
            background: "#fff4fa",
            padding: "16px",
            borderLeft: "4px solid #ec71b8",
            fontSize: "14px",
            lineHeight: "1.5",
            marginBottom: "10px"
          }}>
            <h3 style={{ marginTop: 0 }}>GNF Pitch Application 📝</h3>
            👋 Please fill out this application to be considered for a Good Neighbor Fund $1,000 micro-grant.<br /><br />
            ✅ <strong>What we look for:</strong>
            <ul>
              <li>Business ideas at the ideation stage (early stage will be considered)</li>
              <li>Clear understanding of the problem you're solving</li>
              <li>Specific, high-impact plan for using the $1,000</li>
              <li>Passion in your pitch video</li>
            </ul>
            ❌ <strong>What we typically avoid:</strong>
            <ul>
              <li>Personal use or self-promotion</li>
              <li>Short-term projects or one-off events</li>
              <li>Established companies or those with major funding</li>
              <li>Unclear use of funds</li>
              <li>Missing pitch video</li>
            </ul>
            ℹ️ The above criteria is not all-inclusive and we encourage all to apply! Most chapters typically select new micro-grants each quarter.
          </div>

          {/* Inputs */}
          {[
            { label: "Founder Name *", name: "founder", type: "text" },
            { label: "Email *", name: "email", type: "email" },
            { label: "Business Name *", name: "business", type: "text" },
            { label: "Zip Code *", name: "zip", type: "text" },
            { label: "Website (optional)", name: "website", type: "text" }
          ].map(field => (
            <div key={field.name} style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontWeight: "bold", marginBottom: "4px" }}>{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={form[field.name] || ""}
                onChange={handleChange}
                required={field.label.includes("*")}
                style={{
                  padding: "8px",
                  fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif',
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px",
                  height: "20px"
                }}
              />
            </div>
          ))}

          {/* Chapter Select */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "bold", marginBottom: "4px" }}>Chapter Location *</label>
            <select
              name="chapter"
              value={form.chapter || ""}
              onChange={handleChange}
              required
              style={{
                padding: "8px",
                fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif',
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px",
                height: "40px"
              }}
            >
              <option value="">Select Chapter *</option>
              <option value="Western New York">Western New York</option>
              <option value="Denver">Denver</option>
            </select>
          </div>

          {/* Textareas */}
          {[
            { label: "Tell us a little about yourself (2-3 sentences) *", name: "about" },
            { label: "Describe your company's value proposition *", name: "valueProp" },
            { label: "Describe the problem you're solving *", name: "problem" },
            { label: "How does your business solve it? *", name: "solution" },
            { label: "How will your business make money? *", name: "revenueModel" }
          ].map(field => (
            <div key={field.name} style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontWeight: "bold", marginBottom: "4px" }}>{field.label}</label>
              <textarea
                name={field.name}
                value={form[field.name] || ""}
                onChange={handleChange}
                rows={3}
                required
                style={{
                  padding: "8px",
                  fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif',
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>
          ))}

          {/* Paying Customers */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "bold", marginBottom: "4px" }}>Do you have paying customers? *</label>
            <select
              name="payingCustomers"
              value={form.payingCustomers || ""}
              onChange={handleChange}
              required
              style={{
                padding: "8px",
                fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif',
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px",
                height: "40px"
              }}
            >
              <option value="">Select an option *</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            <small style={{ color: "#666", marginTop: "4px" }}>
              Answering 'No' does not disqualify you.
            </small>
          </div>

          {/* Fund Use */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "bold", marginBottom: "4px" }}>How will you use the $1,000 if awarded? *</label>
            <textarea
              name="fundUse"
              value={form.fundUse || ""}
              onChange={handleChange}
              rows={3}
              required
              style={{
                padding: "8px",
                fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif',
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px"
              }}
            />
            <small style={{ color: "#666", marginTop: "4px" }}>
              Please be specific. We expect funds to be used within 30 days of award.
            </small>
          </div>

          {/* VideoUploader */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <VideoUploader onVideoUploaded={handleVideoUploaded} />
          
          </div>

          {/* Video URL Input */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: "12px" }}>
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
              fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif',
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "14px",
              height: "20px"
            }}
          />
          <small style={{ color: "#666", marginTop: "4px" }}>
            If you have a hosted pitch video to share (YouTube, Vimeo, Google Drive, Dropbox), paste the URL here. Ensure sharing permissions are enabled.
          </small>
        </div>


          {/* Self Identification */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "bold", marginBottom: "4px" }}>Do any of the following apply to you? (optional)</label>
            <select
              name="selfId"
              multiple
              value={form.selfId || []}
              onChange={handleChange}
              style={{
                padding: "8px",
                fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif',
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px",
                height: "100px"
              }}
            >
              {["Veteran Owned/Led", "Women Owned/Led", "BIPOC Owned/Led", "Disabled Owned/Led", "Student Owned/Led", "Minority Owned/Led"].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Referral */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "bold", marginBottom: "4px" }}>How did you hear about us? (optional)</label>
            <input
                type="text"
                name="referral"
                value={form.referral || ""}
                onChange={handleChange}
                style={{
                padding: "8px",
                fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif',
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px",
                height: "40px"
                }}
            />
            <small style={{ color: "#666", marginTop: "4px" }}>
                Example: LinkedIn, Instagram, Facebook, SBDC, LP Referral, Prior Grant Awardee, School, Etc.
            </small>
            </div>


          {/* Consent */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontWeight: "bold" }}>
              <input
                type="checkbox"
                name="consent"
                checked={form.consent || false}
                onChange={handleChange}
                required
              />{" "}
              I consent to GNF's terms and data sharing
            </label>
            <small style={{ color: "#666", marginTop: "4px" }}>
              Good Neighbor Fund (GNF) has my consent to share certain details of my application with partner organizations and/or the public through social media, the Good Neighbor Fund website, and other platforms. Shared info may include: Name, Business Name, Value Proposition, Problem, and Solution. Pitch videos and self-identification are never shared without consent.
            </small>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: "#ff69b4",
              color: "#fff",
              border: "none",
              padding: "14px",
              fontWeight: "bold",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "18px",
              marginTop: "20px",
              boxShadow: "0px 4px 6px rgba(0,0,0,0.2)"
            }}
          >
            {isSubmitting ? "Submitting..." : "🦄 Submit Pitch"}
          </button>

        </form>
      </div>
    </div>
  );
}

