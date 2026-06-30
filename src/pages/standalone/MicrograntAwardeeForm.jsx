// MicrograntAwardeeForm.jsx
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

export default function MicrograntAwardeeForm() {
  const [searchParams] = useSearchParams();
  const chapterFromQuery = FALLBACK_CHAPTER_SLUG_TO_NAME[searchParams.get("chapter")];
  const emailFromQuery = searchParams.get("email") || "";
  const defaultChapter = chapterFromQuery || "";

  const [form, setForm] = useState({
    chapter: defaultChapter,
    email: emailFromQuery,
    fullName: "",
    addressStreet: "",
    addressCity: "",
    addressState: "",
    addressZip: "",
    socialHandles: "",
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
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
        console.error("Microgrant awardee: failed to load /chapters, using fallback", e);
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
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
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
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (evt) => setPhotoPreview(evt.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.chapter
        || !form.addressStreet || !form.addressCity || !form.addressState || !form.addressZip) {
      alert("Please fill in all required fields.");
      return;
    }
    if (!photo) {
      alert("Please upload a photo for the social media announcement.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ext = (photo.name.split(".").pop() || "jpg")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";
      const storagePath = `form-uploads/microgrant-awardee/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, photo, {
        contentType: photo.type,
        cacheControl: "public, max-age=86400",
      });
      const photoUrl = await getDownloadURL(storageRef);

      const submission = {
        formType: "microgrant-awardee",
        chapter: form.chapter,
        fullName: form.fullName,
        email: form.email.trim().toLowerCase(),
        addressStreet: form.addressStreet,
        addressCity: form.addressCity,
        addressState: form.addressState,
        addressZip: form.addressZip,
        socialHandles: form.socialHandles || "",
        photoUrl,
        photoStoragePath: storagePath,
        submittedAt: Timestamp.now(),
      };

      await addDoc(collection(db, "formLibrarySubmissions"), submission);
      setSubmitted(true);
    } catch (err) {
      console.error("Microgrant awardee submission error:", err);
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
          <span className="mb-eyebrow" style={{ color: "var(--mb-magenta)" }}>Information Received</span>
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
            Congratulations, again.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: "var(--mb-ink)" }}>
            Your check is on its way and we'll be in touch about the announcement post.
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
        background: "var(--mb-aqua-soft)",
        border: "2px solid var(--mb-ink)",
        color: "var(--mb-ink)",
      }}>
        <span className="mb-eyebrow" style={{ color: "var(--mb-aqua-deep)" }}>Microgrant · Awardee Information</span>
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
          Congratulations on your grant.
        </h2>
        <p className="mb-body" style={{ margin: "0 0 12px" }}>
          A few details so we can mail your check, write your check correctly, and put together
          your social media announcement.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
          <span className="mb-badge">Est. Time · 4 Min</span>
        </div>
      </div>

      {sectionHeader("01", "Check Details")}

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Full Name *</label>
        <small style={{ marginBottom: 6 }}>
          This is exactly what we'll print on your check, so spell it the way you'd like it to appear.
        </small>
        <input
          type="text"
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          required
          placeholder="e.g., Jane Maria Smith"
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Email Address *</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="e.g., jane.smith@gmail.com"
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Chapter *</label>
        <select name="chapter" value={form.chapter || ""} onChange={handleChange} required>
          <option value="">Select Chapter *</option>
          {chapterOptions.map(c => (
            <option key={c.slug} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Mailing Address — Street *</label>
        <small style={{ marginBottom: 6 }}>This is where your check will be mailed.</small>
        <input
          type="text"
          name="addressStreet"
          value={form.addressStreet}
          onChange={handleChange}
          required
          placeholder="e.g., 123 Main St, Apt 4B"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>City *</label>
          <input
            type="text"
            name="addressCity"
            value={form.addressCity}
            onChange={handleChange}
            required
            placeholder="e.g., Buffalo"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>State *</label>
          <input
            type="text"
            name="addressState"
            value={form.addressState}
            onChange={handleChange}
            required
            placeholder="e.g., NY"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label>ZIP *</label>
          <input
            type="text"
            name="addressZip"
            value={form.addressZip}
            onChange={handleChange}
            required
            placeholder="e.g., 14202"
          />
        </div>
      </div>

      {sectionHeader("02", "Announcement")}

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Social Media Handles or Websites</label>
        <small style={{ marginBottom: 6 }}>
          Anything you'd like us to tag in our announcement post — Instagram, LinkedIn, your business site.
          List as many as you like, one per line.
        </small>
        <textarea
          name="socialHandles"
          value={form.socialHandles}
          onChange={handleChange}
          rows={3}
          placeholder="e.g., @janesmithdesigns&#10;linkedin.com/in/janesmith&#10;www.janesmithdesigns.com"
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>Announcement Photo *</label>
        <small style={{ marginBottom: 8 }}>
          Please upload a preferred photo for our social media announcement. Ideally a well-lit,
          high-resolution photo of you (or your team).
        </small>
        <input
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          required
          style={{ fontFamily: "inherit", fontSize: 13 }}
        />
        {photoPreview && (
          <div style={{ marginTop: 12 }}>
            <img
              src={photoPreview}
              alt="Photo preview"
              style={{
                maxWidth: 240,
                maxHeight: 240,
                objectFit: "cover",
                border: "2px solid var(--mb-ink)",
                boxShadow: "var(--shadow-hard-sm)",
              }}
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mb-btn"
        style={{ marginTop: "20px", padding: "16px 24px", fontSize: 14 }}
      >
        {isSubmitting ? "Submitting…" : "Submit Information"}
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
          <span>Microgrant Awardee Information</span>
          <button onClick={handleClose} className="mb-page-close" aria-label="Close">×</button>
        </div>
        {formContent}
      </div>
    </div>
  );
}
