import { useState, useEffect } from "react";
import { arbiter } from "./Arbiter";
import PlayerBoard from "./PlayerBoard";

export default function App() {
  const [player, setPlayer] = useState(null);
  const [name, setName] = useState(localStorage.getItem("user_name") || "");

  useEffect(() => {
    // Check the URL to see if we are already Player 1 or Player 2
    const params = new URLSearchParams(window.location.search);
    const p = parseInt(params.get("player"));
    if (p === 1 || p === 2) setPlayer(p);
  }, []);

  const handleJoin = (p) => {
    if (!name.trim()) return alert("Enter your name first!");
    localStorage.setItem("user_name", name);
    // Update the URL and refresh the page to join the game
    window.location.href = window.location.pathname + `?player=${p}`;
  };

  // If no player is selected, show the Landing Page
  if (!player) {
    return (
      <div style={{ textAlign: "center", padding: "100px 20px", background: "#0a0a0a", color: "white", minHeight: "100vh", fontFamily: "sans-serif" }}>
        <h1 style={{ color: "gold", fontSize: "4rem", margin: "0 0 10px 0", letterSpacing: "5px" }}>SALPAKAN</h1>
        <p style={{ color: "#888", marginBottom: "40px", fontSize: "14px" }}>ONLINE MULTIPLAYER STRATEGY</p>
        
        <div style={{ background: "#1a1a1a", padding: "40px", borderRadius: "15px", display: "inline-block", border: "1px solid #333" }}>
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="ENTER YOUR NAME" 
            style={{ padding: "15px", borderRadius: "5px", marginBottom: "25px", textAlign: "center", width: "280px", background: "#000", border: "1px solid gold", color: "white", fontSize: "16px" }} 
          />
          
          <div style={{ display: "flex", justifyContent: "center", gap: "25px" }}>
            <button onClick={() => handleJoin(1)} style={{ padding: "15px 35px", background: "#004080", color: "white", borderRadius: "8px", cursor: "pointer", border: "none", fontWeight: "bold", fontSize: "14px", transition: "0.3s" }}>JOIN AS P1</button>
            <button onClick={() => handleJoin(2)} style={{ padding: "15px 35px", background: "#800000", color: "white", borderRadius: "8px", cursor: "pointer", border: "none", fontWeight: "bold", fontSize: "14px", transition: "0.3s" }}>JOIN AS P2</button>
          </div>
        </div>

        <div style={{ marginTop: "50px", color: "#444", fontSize: "11px" }}>
          Lead Prompt Engineer: <b>Emelizaducos</b> | AI Architect: <b>Gemini 3.0 Flash</b>
        </div>
      </div>
    );
  }

  // If a player is selected, show the Game Board
  return <PlayerBoard player={player} />;
}