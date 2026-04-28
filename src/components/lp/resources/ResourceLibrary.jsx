import React, { useState } from 'react';
import { RESOURCE_DOCUMENTS, ACCENT_TOKENS, getResourceById } from './registry';
import ResourceDocument from './ResourceDocument';
import './resources.css';

function ResourceCard({ resource, onSelect }) {
  const accent = ACCENT_TOKENS[resource.accent] || ACCENT_TOKENS.magenta;
  return (
    <button
      type="button"
      className="resource-card"
      onClick={() => onSelect(resource.id)}
    >
      <div
        className="resource-card__cover"
        style={{ background: accent.bg, color: accent.text }}
      >
        <span className="resource-card__number">{resource.number}</span>
        <span className="resource-card__category">{resource.category}</span>
      </div>
      <div className="resource-card__body">
        <h3 className="resource-card__title">{resource.title}</h3>
        <p className="resource-card__summary">{resource.summary}</p>
        <div className="resource-card__meta">
          <span>{resource.readingTime}</span>
          <span>Open →</span>
        </div>
      </div>
    </button>
  );
}

export default function ResourceLibrary() {
  const [selectedId, setSelectedId] = useState(null);
  const selected = selectedId ? getResourceById(selectedId) : null;

  if (selected) {
    return (
      <ResourceDocument
        resource={selected}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="resource-view">
      <header className="resource-library__hero">
        <p className="resource-library__eyebrow">Neighborhood Resources</p>
        <h1 className="resource-library__title">The Chapter Library</h1>
        <p className="resource-library__lede">
          Everything you need to run a Good Neighbor Fund chapter in one
          place — reference documents to share with LPs, partners, and
          press; forms to send to new LPs and grant winners; and
          print-ready assets like our giant ceremonial checks. All
          downloadable, all kept up to date here.
        </p>
      </header>

      <div className="resource-grid">
        {RESOURCE_DOCUMENTS.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            onSelect={setSelectedId}
          />
        ))}
      </div>
    </div>
  );
}
