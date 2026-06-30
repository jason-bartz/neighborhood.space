// LPOnboardingForm.jsx
import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebaseConfig";
import Confetti from "react-confetti";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTaskbar from "../../components/ui/Taskbar/PageTaskbar";

const FALLBACK_CHAPTERS = [
  { slug: "wny",            name: "Western New York" },
  { slug: "denver",         name: "Denver" },
  { slug: "upstate",        name: "Central New York" },
  { slug: "capital-region", name: "Capital Region" },
];
const FALLBACK_CHAPTER_SLUG_TO_NAME = Object.fromEntries(
  FALLBACK_CHAPTERS.map(c => [c.slug, c.name])
);

const COMMITTEES = [
  { value: "events",          label: "Events Committee" },
  { value: "selection",       label: "Selection Committee" },
  { value: "founders-support",label: "Founders Support Committee" },
  { value: "governance",      label: "Governance Committee" },
  { value: "none",            label: "None at this time" },
];

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

const VOLUNTEER_AGREEMENT_VERSION = "v1-2026-04";
const NDA_VERSION = "v1-2026-04";

export default function LPOnboardingForm() {
  const [searchParams] = useSearchParams();
  const chapterFromQuery = FALLBACK_CHAPTER_SLUG_TO_NAME[searchParams.get("chapter")];
  const emailFromQuery = searchParams.get("email") || "";
  const defaultChapter = chapterFromQuery || "";

  const [form, setForm] = useState({
    chapter: defaultChapter,
    email: emailFromQuery,
    committees: [],
    addressStreet: "",
    addressCity: "",
    addressState: "",
    addressZip: "",
    shirtSize: "",
  });
  const [headshot, setHeadshot] = useState(null);
  const [headshotPreview, setHeadshotPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });
  const [chapterOptions, setChapterOptions] = useState(FALLBACK_CHAPTERS);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, []);

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
        if (!defaultChapter) {
          const querySlug = searchParams.get("chapter");
          const matched = list.find(c => c.slug === querySlug);
          if (matched) setForm(prev => ({ ...prev, chapter: matched.name }));
        }
      } catch (e) {
        console.error("LP onboarding: failed to load /chapters, using fallback", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleClose = () => {
    try { sessionStorage.setItem("gnf-has-booted", "1"); } catch {}
    try { navigate("/"); } catch (err) {
      console.error("Navigation error:", err);
      window.location.href = "/";
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleCommittee = (value) => {
    setForm(prev => {
      const current = prev.committees || [];
      // "none" is exclusive — selecting it clears the others, and vice versa.
      if (value === "none") {
        return { ...prev, committees: current.includes("none") ? [] : ["none"] };
      }
      const filtered = current.filter(c => c !== "none");
      const next = filtered.includes(value)
        ? filtered.filter(c => c !== value)
        : [...filtered, value];
      return { ...prev, committees: next };
    });
  };

  const handleHeadshotChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10MB.");
      e.target.value = "";
      return;
    }
    setHeadshot(file);
    const reader = new FileReader();
    reader.onload = (evt) => setHeadshotPreview(evt.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.chapter || !form.bio) {
      alert("Please fill in all required fields.");
      return;
    }
    if (!headshot) {
      alert("Please upload a headshot.");
      return;
    }
    if (!form.committees || form.committees.length === 0) {
      alert("Please select at least one committee preference (or 'None at this time').");
      return;
    }
    if (!form.volunteerAgreement || !form.ndaAgreement) {
      alert("Please agree to both the Volunteer Agreement and the Non-Disclosure Agreement.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ext = (headshot.name.split(".").pop() || "jpg")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";
      const storagePath = `form-uploads/lp-onboarding/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, headshot, {
        contentType: headshot.type,
        cacheControl: "public, max-age=86400",
      });
      const headshotUrl = await getDownloadURL(storageRef);

      const submission = {
        formType: "lp-onboarding",
        chapter: form.chapter,
        name: form.name,
        email: form.email.trim().toLowerCase(),
        bio: form.bio,
        headshotUrl,
        headshotStoragePath: storagePath,
        committees: form.committees,
        addressStreet: form.addressStreet || "",
        addressCity: form.addressCity || "",
        addressState: form.addressState || "",
        addressZip: form.addressZip || "",
        shirtSize: form.shirtSize || "",
        volunteerAgreement: {
          accepted: true,
          version: VOLUNTEER_AGREEMENT_VERSION,
          acceptedAt: Timestamp.now(),
        },
        nda: {
          accepted: true,
          version: NDA_VERSION,
          acceptedAt: Timestamp.now(),
        },
        submittedAt: Timestamp.now(),
      };

      await addDoc(collection(db, "formLibrarySubmissions"), submission);
      setSubmitted(true);
    } catch (err) {
      console.error("LP onboarding submission error:", err);
      alert("There was an error submitting your form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mb-page" style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        textAlign: "center",
        padding: "60px 20px 20px",
        boxSizing: "border-box",
        background: "transparent",
      }}>
        <PageTaskbar />
        <div style={{
          background: "var(--mb-chalk)",
          padding: "48px 40px",
          border: "2px solid var(--mb-ink)",
          boxShadow: "var(--shadow-hard-lg)",
          maxWidth: "560px",
          textAlign: "center",
        }}>
          <Confetti width={windowSize.width} height={windowSize.height} numberOfPieces={250} recycle={false} />
          <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Onboarding Received</span>
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
            Welcome to the neighborhood.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: "var(--mb-ink)" }}>
            Your onboarding details are with your chapter team. They'll be in touch with next steps.
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
      </div>
    );
  }

  const sectionHeader = (number, label) => (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginTop: 16,
      marginBottom: -4,
      paddingBottom: 6,
      borderBottom: "1px solid var(--mb-ink)",
    }}>
      <span className="mb-numeral" style={{ fontSize: 12, color: "var(--mb-magenta)", fontWeight: 700 }}>{number} /</span>
      <span className="mb-eyebrow" style={{ color: "var(--mb-ink)", margin: 0 }}>{label}</span>
    </div>
  );

  const agreementBoxStyle = {
    border: "2px solid var(--mb-ink)",
    background: "var(--mb-paper)",
    padding: "16px 18px",
    maxHeight: 220,
    overflowY: "auto",
    fontSize: 13,
    lineHeight: 1.55,
    color: "var(--mb-ink)",
    boxShadow: "var(--shadow-hard-sm)",
    marginBottom: 10,
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="mb-form-shell" style={{
      padding: "28px 28px 32px",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      overflowY: "auto",
      minHeight: 0,
      boxSizing: "border-box",
    }}>
      <div style={{
        padding: "22px 24px",
        fontSize: "14px",
        lineHeight: "1.55",
        background: "var(--mb-magenta-soft)",
        border: "2px solid var(--mb-ink)",
        color: "var(--mb-ink)",
      }}>
        <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Limited Partner · Onboarding</span>
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
          Welcome to your chapter.
        </h2>
        <p className="mb-body" style={{ margin: "0 0 12px" }}>
          A few quick details so your chapter team can introduce you to the rest of the neighborhood,
          line you up with the right committees, and get the paperwork on file.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
          <span className="mb-badge">Est. Time · 8 Min</span>
        </div>
      </div>

      {sectionHeader("01", "Personal Details")}

      {[
        { label: "Name *", name: "name", type: "text", placeholder: "e.g., Jane Smith" },
        { label: "Email Address *", name: "email", type: "email", placeholder: "e.g., jane.smith@gmail.com" },
      ].map(field => (
        <div key={field.name} style={{ display: "flex", flexDirection: "column" }}>
          <label>{field.label}</label>
          <input
            type={field.type}
            name={field.name}
            value={form[field.name] || ""}
            onChange={handleChange}
            required
            placeholder={field.placeholder}
          />
        </div>
      ))}

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Chapter *</label>
        <select name="chapter" value={form.chapter || ""} onChange={handleChange} required>
          <option value="">Select Chapter *</option>
          {chapterOptions.map(c => (
            <option key={c.slug} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {sectionHeader("02", "Social")}

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Headshot *</label>
        <small style={{ marginBottom: 8 }}>
          Please upload a high-resolution headshot to be included in social media and on our website.
        </small>
        <input
          type="file"
          accept="image/*"
          onChange={handleHeadshotChange}
          required
          style={{ fontFamily: "inherit", fontSize: 13 }}
        />
        {headshotPreview && (
          <div style={{ marginTop: 12 }}>
            <img
              src={headshotPreview}
              alt="Headshot preview"
              style={{
                width: 120,
                height: 120,
                objectFit: "cover",
                border: "2px solid var(--mb-ink)",
                boxShadow: "var(--shadow-hard-sm)",
              }}
            />
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Bio *</label>
        <small style={{ marginBottom: 6 }}>
          Please share a brief bio about your professional and/or personal background. Two to four sentences is plenty.
        </small>
        <textarea
          name="bio"
          value={form.bio || ""}
          onChange={handleChange}
          rows={4}
          required
          placeholder="e.g., Operations lead at a regional non-profit, recovering teacher, lives in the South Wedge with a beagle named Pepper..."
        />
      </div>

      {sectionHeader("03", "LP Committees")}

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Which committees are you interested in joining? *</label>
        <small style={{ marginBottom: 8 }}>
          Pick as many as you like, or "None at this time" if you'd rather pass for now.
        </small>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {COMMITTEES.map(c => (
            <label key={c.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={(form.committees || []).includes(c.value)}
                onChange={() => toggleCommittee(c.value)}
              />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      </div>

      {sectionHeader("04", "Surprises (Optional)")}

      <p style={{ margin: 0, fontSize: 14, color: "var(--mb-ink)" }}>
        On occasion, we may send you a surprise. If you'd like to be on that list, share a mailing address and shirt size below.
      </p>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Street Address</label>
        <input
          type="text"
          name="addressStreet"
          value={form.addressStreet}
          onChange={handleChange}
          placeholder="e.g., 123 Main St, Apt 4B"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>City</label>
          <input
            type="text"
            name="addressCity"
            value={form.addressCity}
            onChange={handleChange}
            placeholder="e.g., Buffalo"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>State</label>
          <input
            type="text"
            name="addressState"
            value={form.addressState}
            onChange={handleChange}
            placeholder="e.g., NY"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>ZIP</label>
          <input
            type="text"
            name="addressZip"
            value={form.addressZip}
            onChange={handleChange}
            placeholder="e.g., 14202"
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Shirt Size</label>
        <select name="shirtSize" value={form.shirtSize} onChange={handleChange}>
          <option value="">Select a size</option>
          {SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {sectionHeader("05", "Volunteer Agreement")}

      <div style={agreementBoxStyle}>
        <p style={{ marginTop: 0 }}>
          By submitting this form I acknowledge and agree to the following:
        </p>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 10 }}>
            <strong>Volunteer Status.</strong> I agree to volunteer my time and services for Good Neighbor Fund ("GNF").
            I understand that this agreement does not establish an employment, independent contractor, partnership,
            agency, or any other similar relationship between myself and GNF.
          </li>
          <li style={{ marginBottom: 10 }}>
            <strong>Term.</strong> I acknowledge that my volunteer status is subject to a one-year term, beginning
            on the date this agreement is accepted. Continued participation beyond that term is at the discretion of GNF.
          </li>
          <li style={{ marginBottom: 10 }}>
            <strong>Right to Revoke.</strong> GNF's chapter director or board of directors reserves the right to revoke
            my volunteer status at any time, for any reason or no reason, with or without notice.
          </li>
          <li style={{ marginBottom: 10 }}>
            <strong>Policies and Procedures.</strong> I agree to abide by all current and future policies, procedures,
            and guidelines of GNF, and I have reviewed and accept GNF's{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
          </li>
          <li style={{ marginBottom: 10 }}>
            <strong>No Compensation.</strong> I understand that I am not entitled to any compensation, wages, benefits,
            or reimbursements for my volunteer services, except as expressly provided in writing by GNF.
          </li>
          <li>
            <strong>Use of Likeness.</strong> I grant GNF permission to use my name, photograph, and bio in connection
            with promotional and organizational materials.
          </li>
        </ol>
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          name="volunteerAgreement"
          checked={form.volunteerAgreement || false}
          onChange={handleChange}
          required
          style={{ marginTop: 4 }}
        />
        <span>I have read and agree to the Volunteer Agreement above. *</span>
      </label>

      {sectionHeader("06", "Non-Disclosure Agreement")}

      <div style={agreementBoxStyle}>
        <p style={{ marginTop: 0 }}>
          This Non-Disclosure Agreement is made and entered into between Good Neighbor Fund ("GNF") and the
          undersigned Limited Partner ("Recipient").
        </p>
        <p><strong>1. Purpose.</strong> GNF is engaged in the process of evaluating grant applications submitted by
          third parties ("Applicants"), which may contain confidential and proprietary information. In connection
          with Recipient's evaluation of these applications, GNF will disclose Confidential Information to Recipient.</p>
        <p><strong>2. Definition of Confidential Information.</strong> "Confidential Information" means any non-public
          information disclosed by GNF or any Applicant, in any form, including but not limited to: applicant
          identities and personal information; business plans, financial data, and projections; products, services,
          intellectual property, and trade secrets; the substance of internal evaluations, deliberations, scores,
          and decisions; and any other information a reasonable person would treat as confidential.</p>
        <p><strong>3. Exclusions.</strong> Confidential Information does not include information that (a) is or
          becomes publicly available through no fault of Recipient; (b) was already known to Recipient at the time
          of disclosure free of any obligation of confidentiality; (c) is independently developed by Recipient
          without use of Confidential Information; or (d) is rightfully received from a third party without an
          obligation of confidentiality.</p>
        <p><strong>4. Obligations.</strong> Recipient agrees to (a) hold Confidential Information in strict
          confidence; (b) use Confidential Information solely for the purpose of evaluating grant applications on
          behalf of GNF; (c) not disclose Confidential Information to any third party without GNF's prior written
          consent; and (d) protect Confidential Information with at least the same degree of care Recipient uses
          for their own confidential information, and in no event less than reasonable care.</p>
        <p><strong>5. Term.</strong> Recipient's obligations under this Agreement begin upon execution and continue
          for the duration of Recipient's involvement with GNF and for a period of three (3) years thereafter.</p>
        <p><strong>6. Relationship of the Parties.</strong> This Agreement does not create any agency, partnership,
          joint venture, employment, or similar relationship. Recipient is acting solely as a volunteer Limited
          Partner.</p>
        <p><strong>7. Conflicts of Interest.</strong> Recipient agrees to disclose to GNF any actual or potential
          conflict of interest with respect to any Applicant — including personal, professional, financial, or
          familial relationships — and to recuse themselves from any evaluation or decision-making process in
          which such a conflict exists.</p>
        <p><strong>8. Return or Destruction.</strong> Upon GNF's request or upon termination of Recipient's
          involvement with GNF, Recipient shall promptly return or destroy all Confidential Information in their
          possession.</p>
        <p><strong>9. No License.</strong> Nothing in this Agreement grants Recipient any license, right, or
          interest in any Confidential Information or intellectual property of GNF or any Applicant.</p>
        <p style={{ marginBottom: 0 }}><strong>10. Acknowledgment.</strong> Recipient acknowledges that breach of
          this Agreement may cause irreparable harm to GNF and Applicants, and that GNF shall be entitled to seek
          injunctive relief in addition to any other remedies available at law or in equity.</p>
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          name="ndaAgreement"
          checked={form.ndaAgreement || false}
          onChange={handleChange}
          required
          style={{ marginTop: 4 }}
        />
        <span>I have read and agree to the Non-Disclosure Agreement above. *</span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mb-btn"
        style={{ marginTop: "20px", padding: "16px 24px", fontSize: 14 }}
      >
        {isSubmitting ? "Submitting…" : "Submit Onboarding"}
        {!isSubmitting && <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>}
      </button>
    </form>
  );

  return (
    <div className="mb-page" style={{
      minHeight: "100vh",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      display: "flex",
      flexDirection: "column",
      padding: "10px",
      paddingTop: "60px",
      paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
      boxSizing: "border-box",
      background: "transparent",
    }}>
      <PageTaskbar />
      <div className="mb-page-window mb-form-shell">
        <div className="mb-page-titlebar">
          <span>LP Onboarding</span>
          <button onClick={handleClose} className="mb-page-close" aria-label="Close">×</button>
        </div>
        {formContent}
      </div>
    </div>
  );
}
