// index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DesktopEnvironment from "./pages/desktop/DesktopEnvironment/DesktopEnvironment";
import StandalonePitchPage from "./StandalonePitchPage";
import PitchDetailPage from "./PitchDetailPage";
import StandaloneLPApplication from "./StandaloneLPApplication";
import StandaloneTermsPage from "./StandaloneTermsPage";
import StandalonePrivacyPage from "./StandalonePrivacyPage";
import NotFoundPage from "./NotFoundPage";
import StandaloneLPPortal from "./StandaloneLPPortal";
import ChapterPage from "./ChapterPage";
import "./mock-fs"; // Import mock filesystem
import "./styles/win95-tokens.css"; // Design tokens (CSS custom properties) — must load first
import "./styles/win95-base.css";   // Global resets + utility classes — must load before App.css
import "./styles/theme-tokens.css"; // "Millennium Bug" retro-modern content theme (overrides/extends)
import "./styles/App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DesktopEnvironment />} />
        <Route path="/pitch" element={<StandalonePitchPage />} />
        <Route path="/pitch/:pitchId" element={<PitchDetailPage />} />
        <Route path="/lp-application" element={<StandaloneLPApplication />} />
        <Route path="/terms" element={<StandaloneTermsPage />} />
        <Route path="/privacy" element={<StandalonePrivacyPage />} />
        <Route path="/portal" element={<StandaloneLPPortal />} />
        {/* Dynamic chapter page. For slugs matching a /chapters doc with no
            hand-built static HTML file at public/<slug>.html. The static file
            wins in Firebase Hosting before the SPA fallback routes here. */}
        <Route path="/:chapterSlug" element={<ChapterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
