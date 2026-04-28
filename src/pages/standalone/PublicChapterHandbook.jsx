// PublicChapterHandbook.jsx — public-facing version of the LP-portal Chapter
// Handbook resource. The body content is the same component the portal renders
// (src/components/lp/resources/documents/ChapterHandbook.jsx); this page wraps
// it with public-page chrome (PageTaskbar + page-window) so it can be linked
// from the landing pages without requiring auth.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTaskbar from "../../components/ui/Taskbar/PageTaskbar";
import ChapterHandbookBody from "../../components/lp/resources/documents/ChapterHandbook";
import { ACCENT_TOKENS } from "../../components/lp/resources/registry";
import "../../components/lp/resources/resources.css";

const RESOURCE_META = {
  number: "02",
  category: "Operations",
  readingTime: "12 min read",
  title: "New Chapter Handbook",
  summary:
    "Everything you need to launch a Good Neighbor Fund neighborhood. Mission, structure, timeline, operations, and the answers to common questions.",
  accent: "grape",
  pdfFilename: "GNF-Chapter-Handbook.pdf",
};

export default function PublicChapterHandbook() {
  const navigate = useNavigate();
  const accent = ACCENT_TOKENS[RESOURCE_META.accent] || ACCENT_TOKENS.magenta;
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
      console.error("Navigation error:", error);
      window.location.href = "/";
    }
  };

  async function handleDownload() {
    if (generating) return;
    setErrorMsg("");
    setGenerating(true);
    try {
      const [rendererMod, docMod] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../../components/lp/resources/pdf/ChapterHandbookPDF"),
      ]);
      const PDFDoc = docMod.default;
      const blob = await rendererMod.pdf(<PDFDoc />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = RESOURCE_META.pdfFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("PDF generation failed", err);
      setErrorMsg(err?.message || "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  const downloadLabel = generating
    ? "Generating PDF…"
    : errorMsg
    ? "Retry Download"
    : "↓ Download PDF";

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
    }}>
      <PageTaskbar />
      <div className="mb-page-window">
        <div className="mb-page-titlebar">
          <span>Chapter Handbook</span>
          <button onClick={handleClose} className="mb-page-close" aria-label="Close">×</button>
        </div>

        <div className="resource-view" style={{ overflowY: "auto" }}>
          <article className="resource-doc">
            <div className="resource-doc__toolbar">
              <button
                type="button"
                className="resource-doc__back"
                onClick={handleClose}
              >
                ← Back to Home
              </button>
              <button
                type="button"
                className="resource-doc__pdf"
                onClick={handleDownload}
                disabled={generating}
                aria-disabled={generating}
              >
                {downloadLabel}
              </button>
              {errorMsg && (
                <div
                  className="resource-doc__pdf-error"
                  role="alert"
                  style={{
                    width: "100%",
                    fontSize: 12,
                    fontFamily: "var(--font-numeral)",
                    color: "var(--mb-magenta-deep)",
                    background: "var(--mb-magenta-soft)",
                    border: "2px solid var(--mb-magenta-deep)",
                    padding: "6px 10px",
                    marginTop: 4,
                    wordBreak: "break-word",
                  }}
                >
                  PDF error: {errorMsg}
                </div>
              )}
            </div>

            <header
              className="resource-doc__cover"
              style={{ background: accent.bg, color: accent.text }}
            >
              <span className="resource-doc__cover-number">{RESOURCE_META.number}</span>
              <p className="resource-doc__cover-eyebrow">
                {RESOURCE_META.category} · {RESOURCE_META.readingTime}
              </p>
              <h1 className="resource-doc__cover-title">{RESOURCE_META.title}</h1>
              <p className="resource-doc__cover-summary">{RESOURCE_META.summary}</p>
            </header>

            <div className="resource-doc__body">
              <ChapterHandbookBody />
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
