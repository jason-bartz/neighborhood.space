import React, { useState } from "react";

// Stage tone drives only the left accent strip — the card itself is
// always paper/chalk (mb-card). Maps to mb palette accents.
const STAGE_TONE = {
  Ideation: "pink",
  Early: "yellow",
  "Early Stage": "yellow",
  Growth: "green",
  Established: "blue",
  All: "purple",
};

function stageTone(stage) {
  return STAGE_TONE[stage] || "pink";
}

// Type tone drives the colored fill on the category chip. Loose keyword
// match — Firestore types are free-form strings.
function typeTone(type) {
  if (!type) return null;
  const t = type.toLowerCase();
  if (/(venture|capital|fund|angel|investment)/.test(t)) return "capital";
  if (/(incubator|accelerator|studio|program)/.test(t)) return "program";
  if (/(education|university|school|training)/.test(t)) return "education";
  if (/(community|coalition|network|association)/.test(t)) return "community";
  if (/(mentor|advisor|coach)/.test(t)) return "mentor";
  if (/(government|public|civic|state|county|city|federal)/.test(t)) return "gov";
  return "other";
}

function safeUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `https://${url}`;
}

export default function ResourceCard({ resource, reason, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (!resource) return null;

  const stage = resource["Business Stage"];
  const focus = resource["Focus Area"];
  const details = resource["Expanded Details"];
  const checkSize = resource["Average Check Size"];
  const counties = resource["Counties Served"];
  const relocation = resource["Relocation Required?"];
  const url = safeUrl(resource.URL);

  return (
    <article className="mb-card rn-card" data-tone={stageTone(stage)}>
      <header className="rn-card-head">
        <h3 className="rn-card-title">{resource.Resource}</h3>
        <div className="rn-card-tags">
          {resource.Type ? (
            <span className="mb-tag rn-card-type" data-type-tone={typeTone(resource.Type)}>
              {resource.Type}
            </span>
          ) : null}
          {stage ? <span className="mb-badge">{stage}</span> : null}
        </div>
      </header>

      {reason ? <p className="rn-card-reason">{reason}</p> : null}

      {focus && !reason ? <p className="rn-card-focus">{focus}</p> : null}

      <div className="rn-card-actions">
        {url ? (
          <a
            className="mb-btn mb-btn-ink rn-btn-compact"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View website
            <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
          </a>
        ) : null}
        {details || checkSize || counties || relocation ? (
          <button
            type="button"
            className="mb-btn mb-btn-chalk rn-btn-compact"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Less" : "More details"}
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="rn-card-detail">
          {details ? <p className="rn-card-detail-text">{details}</p> : null}
          <dl className="rn-card-meta">
            {focus ? (
              <>
                <dt>Focus</dt>
                <dd>{focus}</dd>
              </>
            ) : null}
            {checkSize && checkSize !== "NA" ? (
              <>
                <dt>Check size</dt>
                <dd>{checkSize}</dd>
              </>
            ) : null}
            {counties ? (
              <>
                <dt>Counties</dt>
                <dd>{counties}</dd>
              </>
            ) : null}
            {relocation ? (
              <>
                <dt>Relocation</dt>
                <dd>{relocation}</dd>
              </>
            ) : null}
          </dl>
        </div>
      ) : null}
    </article>
  );
}
