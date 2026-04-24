// index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DesktopEnvironment from "./pages/DesktopEnvironment";
import PitchPage from "./pages/standalone/PitchPage";
import PitchDetailPage from "./pages/PitchDetailPage";
import LPApplication from "./pages/standalone/LPApplication";
import TermsPage from "./pages/standalone/TermsPage";
import PrivacyPage from "./pages/standalone/PrivacyPage";
import NotFoundPage from "./pages/NotFoundPage";
import LPPortal from "./pages/standalone/LPPortal";
import ChapterPage from "./pages/ChapterPage";
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
        <Route path="/pitch" element={<PitchPage />} />
        <Route path="/pitch/:pitchId" element={<PitchDetailPage />} />
        <Route path="/lp-application" element={<LPApplication />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/portal" element={<LPPortal />} />
        {/* Dynamic chapter page. For slugs matching a /chapters doc with no
            hand-built static HTML file at public/<slug>.html. The static file
            wins in Firebase Hosting before the SPA fallback routes here. */}
        <Route path="/:chapterSlug" element={<ChapterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
