import React from "react";
import ReactDOM from "react-dom/client";
import DesktopEnvironment from "./src/pages/desktop/DesktopEnvironment/DesktopEnvironment";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DesktopEnvironment />
  </React.StrictMode>
);
