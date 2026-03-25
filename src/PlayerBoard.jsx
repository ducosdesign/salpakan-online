import { useState, useEffect, useCallback } from "react";
import { arbiter } from "./Arbiter";

export default function PlayerBoard({ player }) {
  const [board, setBoard] = useState(arbiter.board);
  const [selected, setSelected] = useState(null);

  const refresh = useCallback(() => {
    setBoard([...arbiter.board]);
  }, []);

  useEffect(() => {
    arbiter.subscribe(refresh);
    return () => arbiter.unsubscribe(refresh);
  }, [refresh]);

  const isPlayPhase = arbiter.playerReady[1] && arbiter.playerReady[2];

  const handleClick = (r, c) => {
    if (!isPlayPhase) return;
    if (arbiter.turn !== player) return;

    if (!selected) {
      if (board[r][c]?.player === player) setSelected({ r, c });
    } else {
      arbiter.movePiece(selected, { r, c }, player);
      setSelected(null);
    }
  };

  return (
    <div style={{ display: "flex", background: "#0a0a0a", minHeight: "100vh", color: "white", fontFamily: "'Inter', sans-serif" }}>
      
      {/* SIDEBAR */}
      <div style={{ width: "300px", padding: "40px 20px", background: "#111", borderRight: "1px solid #222", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h1 style={{ color: "gold", fontSize: "1.5rem", letterSpacing: "4px" }}>SALPAKAN</h1>
        
        <div style={{ background: "#000", width: "100%", padding: "30px 0", borderRadius: "12px", border: "1px solid #333", margin: "40px 0", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", fontWeight: "bold" }}>60s</div>
          <div style={{ fontSize: "10px", color: "gold", marginTop: "5px" }}>{arbiter.turn === player ? "YOUR TURN" : "WAITING"}</div>
        </div>

        <button onClick={() => arbiter.reset()} style={{ width: "100%", padding: "15px", background: "#ef5350", border: "none", color: "white", fontWeight: "bold", borderRadius: "8px", cursor: "pointer" }}>RESET ALL</button>
      </div>

      {/* FIELD */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        
        {/* THE GRID: 9 columns, 8 rows */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(9, 70px)", 
          gridTemplateRows: "repeat(8, 70px)", 
          gap: "8px", 
          background: "#1a1a1a", 
          padding: "15px", 
          borderRadius: "10px",
          border: "2px solid #333"
        }}>
          {board.map((row, r) => row.map((cell, c) => (
            <div 
              key={`${r}-${c}`}
              onClick={() => handleClick(r, c)}
              style={{ 
                width: "70px", 
                height: "70px", 
                background: cell?.player === player ? "#8b0000" : (cell ? "#1a2a3a" : "#0d0d0d"),
                border: selected?.r === r && selected?.c === c ? "2px solid gold" : "1px solid #222",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                textAlign: "center",
                cursor: isPlayPhase ? "pointer" : "default",
                transition: "0.2s"
              }}
            >
              {(cell?.player === player || arbiter.gameOver) ? cell.rank : (cell ? "?" : "")}
            </div>
          )))}
        </div>

        {/* SETUP BAR */}
        {!isPlayPhase && !arbiter.playerReady[player] && (
          <div style={{ marginTop: "30px", display: "flex", gap: "20px" }}>
            <button onClick={() => arbiter.autoDeploy(player)} style={{ padding: "15px 30px", background: "#fff", color: "#000", border: "none", fontWeight: "bold", borderRadius: "4px", cursor: "pointer" }}>AUTO-DEPLOY</button>
            <button 
              onClick={() => { arbiter.playerReady[player] = true; arbiter.save(); }} 
              style={{ padding: "15px 30px", background: "#4caf50", color: "#fff", border: "none", fontWeight: "bold", borderRadius: "4px", cursor: "pointer" }}
            >
              START BATTLE
            </button>
          </div>
        )}
        
        {arbiter.playerReady[player] && !isPlayPhase && <div style={{ marginTop: "20px", color: "gold" }}>Waiting for opponent to ready up...</div>}
      </div>
    </div>
  );
}