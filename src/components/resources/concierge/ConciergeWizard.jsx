import React, { useState, useMemo } from "react";
import { zipToChapter } from "../shared/zipToChapter";

const STAGE_OPTIONS = [
  { value: "Ideation", label: "Just an idea" },
  { value: "Early", label: "Early stage" },
  { value: "Growth", label: "Growing" },
  { value: "Established", label: "Established" },
  { value: "", label: "Not sure" },
];

const NEED_CHIPS = [
  { value: "capital", label: "Capital" },
  { value: "customers", label: "Customers" },
  { value: "mentors", label: "Mentors" },
  { value: "legal", label: "Legal" },
  { value: "space", label: "Space" },
  { value: "hiring", label: "Hiring" },
];

// Self-ID is optional — used only to surface identity-targeted resources
// (e.g. women-led funds, BIPOC accelerators) when there's a real fit, and
// to demote them otherwise. Stored on the request, not on the user.
const IDENTITY_CHIPS = [
  { value: "women", label: "Women-founded" },
  { value: "bipoc", label: "BIPOC" },
  { value: "veteran", label: "Veteran" },
  { value: "immigrant", label: "Immigrant / new American" },
  { value: "lgbtq", label: "LGBTQ+" },
  { value: "disability", label: "Disability" },
];

export default function ConciergeWizard({ defaultChapter, onSubmit, modeToggle }) {
  const [zip, setZip] = useState("");
  const [chapterOverride, setChapterOverride] = useState(false);
  const [stage, setStage] = useState("");
  const [chips, setChips] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [needText, setNeedText] = useState("");

  // URL-detected chapter wins unless the user explicitly clicks "Change."
  const detectedChapter = useMemo(() => zipToChapter(zip), [zip]);
  const chapter = chapterOverride
    ? detectedChapter
    : defaultChapter || detectedChapter;
  const showZipInput = chapterOverride || !defaultChapter;

  function toggleChip(value) {
    setChips((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  }

  function toggleIdentity(value) {
    setIdentities((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  }

  function handleSubmit(e) {
    if (e) e.preventDefault();
    onSubmit({
      chapter: chapter || "",
      zip: zip.trim(),
      stage,
      chips,
      identities,
      needText: needText.trim(),
    });
  }

  const canSubmit = !!chapter && (chips.length > 0 || needText.trim().length > 5);

  return (
    <>
      <section className="rn-hero">
        <div className="rn-hero-text">
          <span className="rn-hero-eyebrow">AI Concierge</span>
          <h2 className="rn-hero-title">Let's find your matches.</h2>
          <p className="rn-hero-lede">
            Tell us where you are and what you need. We'll surface the people,
            money, and rooms that fit you right now — and explain why.
          </p>
        </div>
        {modeToggle ? <div className="rn-hero-actions">{modeToggle}</div> : null}
      </section>

      <section className="rn-action">
        <form className="rn-form mb-form-shell" onSubmit={handleSubmit}>
          <div className="rn-form-card">
            <div className="rn-form-section">
              <header className="rn-step-head">
                <span className="rn-step-num mb-numeral">01</span>
                <span className="rn-step-eyebrow">Where</span>
              </header>
              <label className="rn-field-label" htmlFor="rn-zip-input">
                {showZipInput ? "Your zip code" : "Chapter"}
              </label>
              {showZipInput ? (
                <div className="rn-zip-row">
                  <input
                    id="rn-zip-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={10}
                    placeholder="e.g. 14201"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                  />
                  {chapter ? (
                    <span className="rn-zip-chapter">
                      Looks like <strong>{chapter}</strong>
                    </span>
                  ) : zip.replace(/\D/g, "").length >= 5 ? (
                    <span className="rn-zip-chapter rn-zip-chapter-miss">
                      We don't have a chapter near that zip yet.
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="rn-chapter-row">
                  <span className="rn-chapter-pill">{chapter}</span>
                  <button
                    type="button"
                    className="rn-link-btn"
                    onClick={() => {
                      setChapterOverride(true);
                      setZip("");
                    }}
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            <div className="rn-form-divider" aria-hidden="true" />

            <div className="rn-form-section">
              <header className="rn-step-head">
                <span className="rn-step-num mb-numeral">02</span>
                <span className="rn-step-eyebrow">Stage</span>
              </header>
              <span className="rn-field-label">Where are you in the journey?</span>
              <div className="rn-pill-row">
                {STAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    className={`rn-pill rn-pill-readable${stage === opt.value ? " is-selected" : ""}`}
                    onClick={() => setStage(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rn-form-divider" aria-hidden="true" />

            <div className="rn-form-section">
              <header className="rn-step-head">
                <span className="rn-step-num mb-numeral">03</span>
                <span className="rn-step-eyebrow">Need</span>
              </header>
              <span className="rn-field-label">What do you need help with?</span>
              <div className="rn-pill-row">
                {NEED_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    className={`rn-pill${chips.includes(chip.value) ? " is-selected" : ""}`}
                    onClick={() => toggleChip(chip.value)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rn-form-card rn-form-card-optional">
            <header className="rn-optional-head">
              <span className="rn-step-eyebrow">Optional — for sharper matches</span>
              <span className="rn-optional-hint">
                Skip these and you'll still get a shortlist. Adding them helps us spot identity-specific funds and write a tighter explanation.
              </span>
            </header>

            <div className="rn-form-section">
              <span className="rn-field-label">Anything about you we should know?</span>
              <div className="rn-pill-row">
                {IDENTITY_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    className={`rn-pill rn-pill-readable${identities.includes(chip.value) ? " is-selected" : ""}`}
                    onClick={() => toggleIdentity(chip.value)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rn-form-section">
              <label htmlFor="rn-need-text" className="rn-field-label">
                In your own words
              </label>
              <textarea
                id="rn-need-text"
                rows={3}
                maxLength={500}
                placeholder="e.g. I'm pre-revenue and trying to figure out where to incorporate, or who in town funds early-stage food businesses."
                value={needText}
                onChange={(e) => setNeedText(e.target.value)}
              />
            </div>
          </div>

          <div className="rn-form-footer">
            <span className="rn-form-footer-hint">
              We'll surface up to 6 resources to start with — and tell you why each one fits.
            </span>
            <button
              type="submit"
              className="mb-btn"
              disabled={!canSubmit}
            >
              Find my matches
              <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
