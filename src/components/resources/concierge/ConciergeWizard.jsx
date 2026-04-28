import React, { useState, useMemo } from "react";

const STAGE_OPTIONS = [
  { value: "Ideation", label: "Just an idea", hint: "exploring, validating, no traction yet" },
  { value: "Early", label: "Early stage", hint: "early customers or first revenue" },
  { value: "Growth", label: "Growing", hint: "repeatable revenue, ready to scale" },
  { value: "Established", label: "Established", hint: "profitable or seeking expansion capital" },
  { value: "", label: "Not sure yet", hint: "show me a mix" },
];

const NEED_CHIPS = [
  { value: "capital", label: "Capital" },
  { value: "customers", label: "Customers" },
  { value: "mentors", label: "Mentors" },
  { value: "legal", label: "Legal" },
  { value: "space", label: "Space" },
  { value: "hiring", label: "Hiring" },
];

const STEP_LABELS = ["Chapter", "Stage", "Need"];

export default function ConciergeWizard({ chapters, defaultChapter, onSubmit, modeToggle }) {
  const [step, setStep] = useState(defaultChapter ? 1 : 0);
  const [chapter, setChapter] = useState(defaultChapter || "");
  const [stage, setStage] = useState("");
  const [chips, setChips] = useState([]);
  const [needText, setNeedText] = useState("");

  const chapterOptions = useMemo(() => {
    return Array.from(new Set(chapters.filter(Boolean))).sort();
  }, [chapters]);

  function toggleChip(value) {
    setChips((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  }

  function next() { setStep((s) => Math.min(s + 1, 2)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  function handleSubmit() {
    onSubmit({ chapter, stage, chips, needText: needText.trim() });
  }

  const canAdvance0 = !!chapter;
  const canAdvance1 = stage !== null && stage !== undefined;
  const canSubmit = chips.length > 0 || needText.trim().length > 0;

  return (
    <>
      <section className="rn-hero">
        <div className="rn-hero-text">
          <span className="rn-hero-eyebrow">Step {step + 1} of 3</span>
          <h2 className="rn-hero-title">
            {step === 0 ? "Let's find your matches." : null}
            {step === 1 ? "Where are you in the journey?" : null}
            {step === 2 ? "What are you trying to figure out?" : null}
          </h2>
          <p className="rn-hero-lede">
            {step === 0 ? "Three quick questions and we'll surface the people, money, and rooms that fit you right now." : null}
            {step === 1 ? "Pick the description that fits today — you can change it later." : null}
            {step === 2 ? "Pick any that apply, or describe it in your own words." : null}
          </p>
        </div>
        {modeToggle ? <div className="rn-hero-actions">{modeToggle}</div> : null}
      </section>

      <section className="rn-action">
        <div className="rn-wizard mb-form-shell">
          <div className="rn-wizard-progress" aria-hidden="true">
            {STEP_LABELS.map((label, idx) => (
              <div
                key={label}
                className={`rn-wizard-progress-step${idx <= step ? " is-on" : ""}`}
              >
                <span className="rn-wizard-progress-bar" />
                <span className="rn-wizard-progress-label">{idx + 1}. {label}</span>
              </div>
            ))}
          </div>

          <div className="rn-wizard-card">
            {step === 0 ? (
              <div className="rn-wizard-step-body">
                <label htmlFor="rn-chapter-select" className="rn-field-label">
                  Chapter
                </label>
                <select
                  id="rn-chapter-select"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                >
                  <option value="">— Choose a chapter —</option>
                  {chapterOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="rn-wizard-step-body">
                <div className="rn-stage-grid">
                  {STAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      className={`rn-stage-btn${stage === opt.value ? " is-selected" : ""}`}
                      onClick={() => setStage(opt.value)}
                    >
                      <span className="rn-stage-btn-label">{opt.label}</span>
                      <span className="rn-stage-btn-hint">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="rn-wizard-step-body">
                <span className="rn-field-label">Categories</span>
                <div className="rn-chip-row">
                  {NEED_CHIPS.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      className={`rn-chip${chips.includes(chip.value) ? " is-selected" : ""}`}
                      onClick={() => toggleChip(chip.value)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

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
            ) : null}

            <div className="rn-wizard-footer">
              <button
                type="button"
                className="mb-btn mb-btn-chalk rn-btn-compact"
                onClick={back}
                disabled={step === 0}
              >
                Back
              </button>
              {step < 2 ? (
                <button
                  type="button"
                  className="mb-btn"
                  onClick={next}
                  disabled={(step === 0 && !canAdvance0) || (step === 1 && !canAdvance1)}
                >
                  Next
                  <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="mb-btn"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  Find my matches
                  <span className="mb-btn-arrow" aria-hidden="true">&rarr;</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
