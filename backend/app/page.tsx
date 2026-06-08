import React from "react";

export default function Home() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      fontFamily: "sans-serif",
      backgroundColor: "#0f172a",
      color: "#ffffff"
    }}>
      <h1 style={{ color: "#38bdf8" }}>LendEasy API Server</h1>
      <p style={{ color: "#94a3b8" }}>This is the server-side API application. Endpoint routing is active under <code>/api</code>.</p>
    </div>
  );
}
