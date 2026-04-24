import React, { useEffect, useState } from 'react';
import { ACCENT_TOKENS } from './registry';

function DocumentToolbar({ resource, onBack }) {
  const [pdfBundle, setPdfBundle] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setPdfBundle(null);

    Promise.all([
      import('@react-pdf/renderer'),
      resource.loadPDF(),
    ])
      .then(([rendererMod, docMod]) => {
        if (cancelled) return;
        setPdfBundle({
          PDFDownloadLink: rendererMod.PDFDownloadLink,
          PDFDoc: docMod.default,
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [resource]);

  return (
    <div className="resource-doc__toolbar">
      <button type="button" className="resource-doc__back" onClick={onBack}>
        ← Back to Library
      </button>
      {failed ? (
        <span className="resource-doc__pdf" aria-disabled="true">
          PDF unavailable
        </span>
      ) : !pdfBundle ? (
        <span className="resource-doc__pdf" aria-disabled="true">
          Preparing PDF…
        </span>
      ) : (
        <pdfBundle.PDFDownloadLink
          document={<pdfBundle.PDFDoc />}
          fileName={resource.pdfFilename}
          className="resource-doc__pdf"
        >
          {({ loading }) => (loading ? 'Preparing PDF…' : '↓ Download PDF')}
        </pdfBundle.PDFDownloadLink>
      )}
    </div>
  );
}

export default function ResourceDocument({ resource, onBack }) {
  const accent = ACCENT_TOKENS[resource.accent] || ACCENT_TOKENS.magenta;
  const BodyComponent = resource.Component;

  return (
    <div className="resource-view">
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
