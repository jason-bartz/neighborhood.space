// NotFoundPage.jsx
import React from 'react';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: 'url("/assets/gnf-wallpaper.webp") no-repeat center center fixed',
      backgroundSize: "cover",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
      fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif',
      color: "#2d2d2d",
      padding: "20px",
      textAlign: "center",
      boxSizing: "border-box"
    }}>
      <h1 style={{ fontSize: "48px", marginBottom: "20px" }}>😵 404</h1>
      <h2 style={{ fontSize: "24px", marginBottom: "20px" }}>Page Not Found</h2>
      <p style={{ fontSize: "16px", marginBottom: "30px" }}>
        Oops! Looks like you wandered into the wrong neighborhood.
      </p>
      <a 
        href="/"
        style={{
          background: "#ffd6ec",
          padding: "10px 20px",
          borderRadius: "8px",
          border: "2px solid #d48fc7",
          color: "#333",
          textDecoration: "none",
          fontWeight: "bold",
          boxShadow: "2px 2px 6px rgba(0,0,0,0.2)"
        }}
      >
        🏡 Return Home
      </a>
    </div>
  );
}
