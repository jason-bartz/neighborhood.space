// StandalonePitchForm.jsx - Modified to work with the production VideoUploader
import React, { useState, useRef } from "react";
import { db } from "./firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import Draggable from "react-draggable";
import { notifySlack } from "./notifySlack";
import VideoUploader from "./VideoUploader"; // Import the production VideoUploader

export default function StandalonePitchForm({ onClose }) {
  const [form, setForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const nodeRef = useRef(null);

  // Standard form field handler
  const handleChange = (e) => {
    const { name, value, type, options, checked } = e.target;

    if (type === "checkbox" && name === "consent") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "checkbox") {
      const currentValues = form[name] || [];
      if (checked) {
        if (!currentValues.includes(value)) {
          setForm((prev) => ({ ...prev, [name]: [...currentValues, value] }));
        }
      } else {
        setForm((prev) => ({ ...prev, [name]: currentValues.filter(item => item !== value) }));
      }
    } else if (type === "select-multiple") {
      const selectedValues = Array.from(options)
        .filter((o) => o.selected)
        .map((o) => o.value);
      setForm((prev) => ({ ...prev, [name]: selectedValues }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handler for when video is uploaded - stores the URL but doesn't display it
  const handleVideoUploaded = (videoUrl) => {
    console.log("Video uploaded successfully");
    // Store the URL in the form state but don't display it to the user
    setForm((prev) => ({ ...prev, videoUrl }));
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmissionError(null);

    try {
      // Basic validation
      const requiredFields = [
        'founder', 'email', 'business', 'chapter', 'about', 
        'valueProp', 'problem', 'solution', 'revenueModel', 
        'payingCustomers', 'fundUse', 'consent'
      ];
      
      const missingFields = requiredFields.filter(field => !form[field]);
      
      if (missingFields.length > 0) {
        const fieldNames = missingFields.map(f => {
          const fieldMap = {
            founder: "Founder Name",
            email: "Email",
            business: "Business Name",
            chapter: "Chapter Location",
            about: "About Yourself",
            valueProp: "Value Proposition",
            problem: "Problem",
            solution: "Solution",
            revenueModel: "Revenue Model",
            payingCustomers: "Paying Customers",
            fundUse: "Fund Use Plan",
            consent: "Consent"
          };
          return fieldMap[f] || f;
        });
        
        alert(`Please fill in all required fields: ${fieldNames.join(', ')}`);
        return;
      }

      // Check if we have a video URL
      if (!form.videoUrl) {
        alert("Please upload a pitch video");
        return;
      }

      setIsSubmitting(true);

      console.log("Preparing pitch data for Firestore...");
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
        pitchVideoUrl: form.videoUrl || "", // Use the video URL from api.video
        selfIdentification: form.selfId || [],
        heardAbout: form.referral || "",
        consentToShare: form.consent || false,
        createdAt: Timestamp.now(),
        isWinner: false
      };

      console.log("Saving pitch to Firestore...");
      const docRef = await addDoc(collection(db, "pitches"), pitchData);
      console.log(`Pitch saved with ID: ${docRef.id}`);

      // Send Slack notification
      try {
        await notifySlack(pitchData);
        console.log("Slack notification sent");
      } catch (slackError) {
        console.error("Slack notification failed (but form submission succeeded):", slackError);
      }

      alert("🎉 Thank you for submitting your pitch! Our GNF LPs review all submissions after the close of each quarter. You'll hear back from us soon.");
      onClose();

    } catch (error) {
      console.error("Error submitting pitch:", error);
      setSubmissionError(`Submission Error: ${error.message || "Unknown submission error"}`);
      alert("Uh oh. Something went wrong submitting your pitch: " + (error.message || "Unknown error"));
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Draggable handle=".form-title-bar" nodeRef={nodeRef} enableUserSelectHack={false}>
        <div
          ref={nodeRef}
          style={{
            position: "fixed", top: "15%", left: "25%",
            transform: "translate(-50%, -50%)", zIndex: 99999, width: "600px",
            maxHeight: "80vh", overflow: "auto", background: "white",
            border: "2px solid #d48fc7", borderRadius: "6px", boxShadow: "4px 4px 0 #ffbde2"
          }}
        >
          <div className="form-title-bar" style={{ padding: "6px 12px", background: "#ffeaf5", borderBottom: "1px solid #d48fc7", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "move" }}>
            <span style={{ fontWeight: "bold" }}>Submit Pitch</span>
            <button onClick={onClose} style={{ background: "#ffbde2", border: "none", cursor: "pointer", fontWeight: "bold", padding: "4px 8px" }}>✖</button>
          </div>

          <div style={{ padding: "16px", overflow: "auto" }}>
            {/* Info Box */}
            <div style={{ position: "relative", background: "#fff4fa", padding: "12px", borderLeft: "4px solid #ec71b8", marginBottom: "20px", fontSize: "14px", lineHeight: "1.5" }}>
              <h3 style={{ marginTop: 0 }}>GNF Pitch Application 📝</h3>
              <img src="/assets/Clampie.webp" alt="Clampie" style={{ position: "absolute", right: "48px", bottom: "160px", width: "100px", zIndex: 2 }} />
              👋 Please fill out this application to be considered for a Good Neighbor Fund $1,000 micro-grant...
              <br /><br />
              ✅ <strong>What we look for:</strong>
              <ul style={{ paddingLeft: "20px", margin: '5px 0' }}> <li>Business ideas at the ideation stage (early stage will be considered)</li> <li>Clear understanding of the problem you're solving</li> <li>Specific, high-impact plan for using the $1,000</li> <li>Passion in your pitch video</li> </ul>
              ❌ <strong>What we typically avoid:</strong>
              <ul style={{ paddingLeft: "20px", margin: '5px 0' }}> <li>Personal use or self-promotion</li> <li>Short-term projects or one-off events</li> <li>Established companies or those with major funding</li> <li>Unclear use of funds</li> <li>Missing pitch video</li> </ul>
              ℹ️ This is not all-inclusive...
              <br /><br />
              Visit <a href="https://www.goodneighbor.fund" target="_blank" rel="noreferrer">www.goodneighbor.fund</a> for more info.
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit}>
              {[
                { label: "Founder Name", name: "founder", required: true },
                { label: "Email", name: "email", required: true, type: "email" },
                { label: "Business Name", name: "business", required: true },
                { label: "Chapter Location", name: "chapter", required: true, type: "select", options: ["Western New York", "Denver"], helper: "You must reside and operate within the chapter city you are applying to. Western NY includes all 8 counties." },
                { label: "Zip Code", name: "zip", required: true },
                { label: "Tell us a little about yourself", name: "about", required: true, type: "textarea", helper: "Two to three sentences" },
                { label: "Website (optional)", name: "website", type: "text" },
                { label: "Describe your company's value proposition", name: "valueProp", required: true, type: "textarea", helper: "One or two sentences on why customers should choose you." },
                { label: "Describe the problem you're solving", name: "problem", required: true, type: "textarea" },
                { label: "How does your business solve it?", name: "solution", required: true, type: "textarea" },
                { label: "How will your business make money?", name: "revenueModel", required: true, type: "textarea" },
                { label: "Do you have paying customers?", name: "payingCustomers", required: true, type: "select", options: ["Yes", "No"], helper: "Answering 'No' does not disqualify you." },
                { label: "How will you use the $1,000 if awarded?", name: "fundUse", required: true, type: "textarea", helper: "Please be specific. We expect funds to be used within 30 days of award." },
              ].map((field) => {
                const commonProps = {
                  name: field.name,
                  required: field.required,
                  onChange: handleChange,
                  onClick: (e) => e.stopPropagation(),
                  style: { width: "100%", padding: "8px", boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '0px', fontFamily: 'inherit', fontSize: '1em' }
                };
                
                return (
                  <div key={field.name} style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontWeight: "bold", marginBottom: '4px' }}>
                      {field.label} {field.required && "*"}
                    </label>
                    {field.helper && (
                      <small style={{ display: "block", color: "#666", marginBottom: "4px" }}>
                        {field.helper}
                      </small>
                    )}
                    {field.type === "textarea" ? (
                      <textarea {...commonProps} rows={4} />
                    ) : field.type === "select" ? (
                      <select {...commonProps} value={form[field.name] || ""}>
                        <option value="" disabled>-- Select --</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === "select-multiple" ? (
                      <select multiple {...commonProps} value={form[field.name] || []} style={{ ...commonProps.style, height: "120px" }}>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input type={field.type || "text"} {...commonProps} value={form[field.name] || ""} />
                    )}
                  </div>
                );
              })}

              {/* Video Uploader Component */}
              <VideoUploader onVideoUploaded={handleVideoUploaded} />

              {/* Alternative Video URL Field - HIDDEN */}
              {/* This input is hidden - we're not showing the URL to the user */}
              <input
                type="hidden"
                name="videoUrl"
                value={form.videoUrl || ""}
              />

              {/* Self ID Field */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontWeight: "bold", marginBottom: '4px' }}>
                  Do any of the following apply to you or your business? (optional)
                </label>
                <small style={{ display: "block", color: "#666", marginBottom: "4px" }}>
                  Use ⌘/Ctrl to select multiple.
                </small>
                <select
                  multiple
                  name="selfId"
                  onChange={handleChange}
                  onClick={(e) => e.stopPropagation()}
                  value={form.selfId || []}
                  style={{ width: "100%", padding: "8px", boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '0px', fontFamily: 'inherit', fontSize: '1em', height: "120px" }}
                >
                  {["Veteran Owned/Led", "Women Owned/Led", "BIPOC Owned/Led", "Disabled Owned/Led", "Student Owned/Led", "Minority Owned/Led"].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Referral Field */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontWeight: "bold", marginBottom: '4px' }}>
                  How did you hear about us? (optional)
                </label>
                <input
                  type="text"
                  name="referral"
                  onChange={handleChange}
                  onClick={(e) => e.stopPropagation()}
                  value={form.referral || ""}
                  style={{ width: "100%", padding: "8px", boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '0px', fontFamily: 'inherit', fontSize: '1em' }}
                />
              </div>

              {/* Consent Checkbox */}
              <div style={{ marginBottom: "16px" }}>
                <label onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    name="consent"
                    required
                    onChange={handleChange}
                    onClick={(e) => e.stopPropagation()}
                    checked={form.consent || false}
                  />{" "}
                  I consent to GNF's terms and data sharing
                </label>
                <small style={{ display: "block", color: "#666", marginTop: "4px" }}>
                  Good Neighbor Fund (GNF) has my consent to share certain details of my application with partner organizations and/or the public through social media, the Good Neighbor Fund website, and other platforms. Shared info may include: Name, Business Name, Value Proposition, Problem, and Solution. Pitch videos and self-identification are never shared without consent.
                </small>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  background: "#ffeaf5",
                  border: "1px solid #d48fc7",
                  padding: "10px 20px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  borderRadius: "4px",
                  fontSize: '1em',
                  opacity: isSubmitting ? 0.7 : 1
                }}
                onClick={(e) => e.stopPropagation()}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </div>
        </div>
      </Draggable>
    </>
  );
}