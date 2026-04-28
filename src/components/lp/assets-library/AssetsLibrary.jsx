import React from 'react';
import { ACCENT_TOKENS } from '../resources/registry';
import { ASSETS, PRINT_SPECS, ORDERING_NOTES } from './assetsRegistry';
import './assets-library.css';

function AssetCard({ asset }) {
  const accent = ACCENT_TOKENS[asset.accent] || ACCENT_TOKENS.magenta;
  return (
    <div className="resource-card resource-card--static">
      <div
        className="resource-card__cover"
        style={{ background: accent.bg, color: accent.text }}
      >
        <span className="resource-card__number">{asset.number}</span>
        <span className="resource-card__category">{asset.category}</span>
      </div>
      <div className="resource-card__body">
        <h3 className="resource-card__title">{asset.title}</h3>
        <p className="resource-card__summary">{asset.summary}</p>
        <div className="assets-library__downloads">
          {asset.files.map((file) => (
            <a
              key={file.href}
              href={file.href}
              download={file.filename}
              className="forms-library__btn"
            >
              ↓ {file.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AssetsLibrary() {
  return (
    <div className="resource-view">
      <section className="forms-library__heading assets-library__heading">
        <p className="forms-library__eyebrow">Director Tools</p>
        <h2 className="forms-library__title">Assets Library</h2>
        <p className="forms-library__lede">
          Print-ready files for chapter operations. Reusable giant checks for
          award presentations, ready to download as PDF or SVG and hand off
          to your local printer.
        </p>

        <div className="resource-grid">
          {ASSETS.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>

        <div className="assets-library__notes">
          <div className="assets-library__notes-col">
            <h3 className="assets-library__notes-title">Print Specifications</h3>
            <p className="assets-library__notes-lede">
              Two sizes we&rsquo;ve had printed in the past. Send these specs
              straight to your printer.
            </p>
            <ul className="assets-library__spec-list">
              {PRINT_SPECS.map((spec) => (
                <li key={spec.size} className="assets-library__spec">
                  <span className="assets-library__spec-size">{spec.size}</span>
                  <span className="assets-library__spec-detail">{spec.detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="assets-library__notes-col">
            <h3 className="assets-library__notes-title">Ordering Notes</h3>
            <ul className="assets-library__bullets">
              {ORDERING_NOTES.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
