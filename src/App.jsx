import { useState, useEffect } from "react";
import PlayerBoard from "./PlayerBoard";

export default function App() {
  const [player, setPlayer] = useState(null);
  const [view, setView] = useState("launcher");

  useEffect(() => {
    // Check URL for ?p=1 or ?p=2
    const params = new URLSearchParams(window.location.search);
    const p = parseInt(params.get("p"));
    
    if (p === 1 || p === 2) {
      setPlayer(p);
      setView("game");
    } else {
      setView("launcher");
      setPlayer(null);
    }
  }, [window.location.search]); // Listen for URL changes

  const baseUrl = window.location.origin + window.location.pathname;

  if (view === "launcher") {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", background: "#0a0a0a", color: "white", minHeight: "100vh", fontFamily: "sans-serif" }}>
        <h1 style={{ color: "gold", fontSize: "3rem", letterSpacing: "5px" }}>SALPAKAN</h1>
        <p style={{ color: "#666", marginBottom: "40px" }}>COMMAND CENTER</p>

        <div style={{ background: "#111", padding: "40px", borderRadius: "15px", border: "1px solid #333", display: "inline-block" }}>
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ color: "#007bff", fontSize: "12px" }}>YOUR ACCESS (PLAYER 1)</h3>
            <button 
              onClick={() => window.location.href = baseUrl + "?p=1"} 
              style={{ padding: "15px 40px", background: "#004080", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
            >
              LAUNCH AS P1
            </button>
          </div>

          <div style={{ borderTop: "1px solid #222", paddingTop: "30px" }}>
            <h3 style={{ color: "#ff4d4d", fontSize: "12px" }}>OPPONENT ACCESS (PLAYER 2)</h3>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(baseUrl + "?p=2");
                alert("Invite link copied! Send this to your opponent.");
              }} 
              style={{ padding: "10px 20px", background: "#333", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "12px" }}
            >
              COPY INVITE LINK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <PlayerBoard player={player} />;
}