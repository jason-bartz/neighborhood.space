import React, { useState, useMemo } from "react";
import "./ResourceNavigator.css";
import useResources from "./shared/useResources";
import ConciergeWizard from "./concierge/ConciergeWizard";
import ConciergeResults from "./concierge/ConciergeResults";
import ResourceDirectory from "./directory/ResourceDirectory";

const MODES = [
  { value: "directory", label: "Directory" },
  { value: "concierge", label: "AI Concierge" },
];

// Detects a chapter from the URL path so chapter pages (/wny, /denver, ...)
// auto-prefill the wizard. The path-to-chapter mapping mirrors what the
// chapters config in Cloud Functions uses.
const SLUG_TO_CHAPTER = {
  wny: "Western New York",
  denver: "Denver",
  upstate: "Central New York",
  "capital-region": "Capital Region",
};

function detectChapterFromPath() {
  if (typeof window === "undefined") return "";
  const slug = window.location.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
  return SLUG_TO_CHAPTER[slug] || "";
}

export default function ResourceNavigator({ isEmbedded = false }) {
  const { resources, loading, error } = useResources();
  const [mode, setMode] = useState("directory");
  const [answers, setAnswers] = useState(null);
  const [directoryDefaults, setDirectoryDefaults] = useState({ chapter: "", stage: "" });
  const detectedChapter = useMemo(() => detectChapterFromPath(), []);

  const chapters = useMemo(() => {
    return Array.from(new Set(resources.map((r) => r.Chapter).filter(Boolean)));
  }, [resources]);

  function handleConciergeSubmit(next) {
    setAnswers(next);
  }

  function handleResetWizard() {
    setAnswers(null);
  }

  function handleBrowseAll() {
    setDirectoryDefaults({ chapter: answers?.chapter || "", stage: answers?.stage || "" });
    setMode("directory");
  }

  const modeToggle = (
    <div className="rn-mode-tabs" role="tablist" aria-label="View mode">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          role="tab"
          aria-selected={mode === m.value}
          className={`rn-mode-tab${mode === m.value ? " is-active" : ""}`}
          onClick={() => setMode(m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`rn-root${isEmbedded ? " rn-embedded" : ""}`}>
      {loading ? (
        <div className="rn-results-loading">
          <div className="rn-spinner" aria-hidden="true" />
          <p className="mb-body">Loading resources…</p>
        </div>
      ) : null}

      {error ? (
        <div className="rn-action">
          <div className="rn-results-empty">
            <p className="mb-body">Could not load resources. Please refresh and try again.</p>
          </div>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="rn-body">
          {mode === "concierge" ? (
            answers ? (
              <ConciergeResults
                answers={answers}
                resources={resources}
                onReset={handleResetWizard}
                onBrowseAll={handleBrowseAll}
                modeToggle={modeToggle}
              />
            ) : (
              <ConciergeWizard
                defaultChapter={detectedChapter}
                onSubmit={handleConciergeSubmit}
                modeToggle={modeToggle}
              />
            )
          ) : null}

          {mode === "directory" ? (
            <ResourceDirectory
              resources={resources}
              chapters={chapters}
              initialChapter={directoryDefaults.chapter}
              initialStage={directoryDefaults.stage}
              modeToggle={modeToggle}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
