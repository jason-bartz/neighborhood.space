// index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DesktopEnvironment from "./pages/desktop/DesktopEnvironment/DesktopEnvironment";
import StandalonePitchPage from "./StandalonePitchPage"; 
import NotFoundPage from "./NotFoundPage"; 
import MobileFieldGuide from "./MobileFieldGuide";
import StandaloneLPPortal from "./StandaloneLPPortal";
import "./mock-fs"; // Import mock filesystem
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DesktopEnvironment />} />
        <Route path="/pitch" element={<StandalonePitchPage />} />
        <Route path="/fieldguide" element={<MobileFieldGuide />} />
        <Route path="/portal" element={<StandaloneLPPortal />} />
        <Route path="*" element={<NotFoundPage />} /> 
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
