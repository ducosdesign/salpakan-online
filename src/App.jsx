import { useState, useEffect } from "react";
import PlayerBoard from "./PlayerBoard";

export default function App() {
  const [player, setPlayer] = useState(null);
  const [name, setName] = useState(localStorage.getItem("user_name") || "");
  const [view, setView] = useState("launcher"); // launcher or game

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = parseInt(params.get("p"));
    if (p === 1 || p === 2) {
      setPlayer(p);
      setView("game");
    }
  }, []);

  const baseUrl = window.location.origin + window.location.pathname;

  if (view === "launcher") {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", background: "#0a0a0a", color: "white", minHeight: "100vh", fontFamily: "sans-serif" }}>
        <h1 style={{ color: "gold", fontSize: "3rem", marginBottom: "10px" }}>SALPAKAN COMMAND</h1>
        <p style={{ color: "#666", marginBottom: "40px" }}>GENERATE BATTLEFRONT LINKS</p>

        <div style={{ background: "#1a1a1a", padding: "30px", borderRadius: "12px", border: "1px solid #333", display: "inline-block" }}>
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ color: "#007bff", fontSize: "12px" }}>PLAYER 1 (YOUR LINK)</h3>
            <code style={{ display: "block", background: "#000", padding: "10px", margin: "10px 0", borderRadius: "5px" }}>
              {baseUrl}?p=1
            </code>
            <button onClick={() => window.location.href = baseUrl + "?p=1"} style={{ padding: "10px 20px", background: "#004080", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
              ENTER AS P1
            </button>
          </div>

          <hr style={{ borderColor: "#333", margin: "30px 0" }} />

          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ color: "#ff4d4d", fontSize: "12px" }}>PLAYER 2 (OPPONENT LINK)</h3>
            <code style={{ display: "block", background: "#000", padding: "10px", margin: "10px 0", borderRadius: "5px" }}>
              {baseUrl}?p=2
            </code>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(baseUrl + "?p=2");
                alert("Opponent link copied to clipboard! Send it to your friend.");
              }} 
              style={{ padding: "10px 20px", background: "#444", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
            >
              COPY P2 LINK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <PlayerBoard player={player} />;
}