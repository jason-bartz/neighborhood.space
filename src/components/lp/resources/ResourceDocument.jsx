import React, { useEffect, useRef, useState } from 'react';
import { ACCENT_TOKENS } from './registry';

function DocumentToolbar({ resource, onBack }) {
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setErrorMsg('');
  }, [resource]);

  async function handleDownload() {
    if (generating) return;
    setErrorMsg('');
    setGenerating(true);
    try {
      const [rendererMod, docMod] = await Promise.all([
        import('@react-pdf/renderer'),
        resource.loadPDF(),
      ]);
      const PDFDoc = docMod.default;
      const blob = await rendererMod.pdf(<PDFDoc />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.pdfFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('PDF generation failed', err);
      setErrorMsg(err?.message || 'Unknown error');
    } finally {
      setGenerating(false);
    }
  }

  const label = generating
    ? 'Generating PDF…'
    : errorMsg
    ? 'Retry Download'
    : '↓ Download PDF';

  return (
    <div className="resource-doc__toolbar">
      <button type="button" className="resource-doc__back" onClick={onBack}>
        ← Back to Library
      </button>
      <button
        type="button"
        className="resource-doc__pdf"
        onClick={handleDownload}
        disabled={generating}
        aria-disabled={generating}
      >
        {label}
      </button>
      {errorMsg && (
        <div
          className="resource-doc__pdf-error"
          role="alert"
          style={{
            width: '100%',
            fontSize: 12,
            fontFamily: 'var(--font-numeral)',
            color: 'var(--mb-magenta-deep)',
            background: 'var(--mb-magenta-soft)',
            border: '2px solid var(--mb-magenta-deep)',
            padding: '6px 10px',
            marginTop: 4,
            wordBreak: 'break-word',
          }}
        >
          PDF error: {errorMsg}
        </div>
      )}
    </div>
  );
}

export default function ResourceDocument({ resource, onBack }) {
  const accent = ACCENT_TOKENS[resource.accent] || ACCENT_TOKENS.magenta;
  const BodyComponent = resource.Component;
  const rootRef = useRef(null);

  // The portal mounts this component inside a parent with overflow:auto,
  // so React preserves that parent's scrollTop when we swap from the
  // library grid to a doc. Reset the nearest scrollable ancestor (and
  // the window, for safety) whenever a new resource is opened.
  useEffect(() => {
    let el = rootRef.current?.parentElement;
    while (el) {
      const { overflowY } = window.getComputedStyle(el);
      if (overflowY === 'auto' || overflowY === 'scroll') {
        el.scrollTop = 0;
        break;
      }
      el = el.parentElement;
    }
    window.scrollTo(0, 0);
  }, [resource]);

  return (
    <div className="resource-view" ref={rootRef}>
      <article className="resource-doc">
        <DocumentToolbar resource={resource} onBack={onBack} />

        <header
          className="resource-doc__cover"
          style={{ background: accent.bg, color: accent.text }}
        >
          <span className="resource-doc__cover-number">{resource.number}</span>
          <p className="resource-doc__cover-eyebrow">
            {resource.category} · {resource.readingTime}
          </p>
          <h1 className="resource-doc__cover-title">{resource.title}</h1>
          <p className="resource-doc__cover-summary">{resource.summary}</p>
        </header>

        <div className="resource-doc__body">
          <BodyComponent />
        </div>
      </article>
    </div>
  );
}
