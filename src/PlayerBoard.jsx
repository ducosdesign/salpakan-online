import { useState, useEffect, useCallback } from "react";
import { arbiter, PIECES } from "./Arbiter";

export default function PlayerBoard({ player }) {
  const [board, setBoard] = useState(arbiter.board);
  const [tray, setTray] = useState([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setBoard([...arbiter.board]);
    setReady(arbiter.playerReady[player]);
    
    // Calculate pieces not on board
    const onBoard = arbiter.board.flat().filter(c => c?.player === player);
    const remaining = [...PIECES];
    onBoard.forEach(p => {
      const idx = remaining.findIndex(r => r.rank === p.rank);
      if (idx > -1) remaining.splice(idx, 1);
    });
    setTray(remaining);
  }, [player]);

  useEffect(() => {
    arbiter.subscribe(refresh);
    refresh();
    return () => arbiter.unsubscribe(refresh);
  }, [refresh]);

  const handleStart = async () => {
    arbiter.playerReady[player] = true;
    await arbiter.save();
  };

  const isPlayPhase = arbiter.playerReady[1] && arbiter.playerReady[2];

  return (
    <div style={{ display: "flex", background: "#0a0a0a", minHeight: "100vh", color: "white", fontFamily: "sans-serif", padding: "20px" }}>
      
      {/* SIDEBAR */}
      <div style={{ width: "260px", background: "#111", padding: "20px", borderRadius: "10px", border: "1px solid #222" }}>
        <h2 style={{ color: "gold", fontSize: "1.2rem", textAlign: "center" }}>SALPAKAN</h2>
        <div style={{ background: "#000", padding: "20px", borderRadius: "8px", textAlign: "center", margin: "20px 0" }}>
          <div style={{ fontSize: "2rem" }}>60s</div>
          <div style={{ color: "gold", fontSize: "10px" }}>{arbiter.turn === player ? "YOUR TURN" : "WAITING"}</div>
        </div>
        <button onClick={() => arbiter.reset()} style={{ width: "100%", padding: "10px", background: "#ff4d4d", border: "none", borderRadius: "5px", cursor: "pointer", color: "white" }}>RESET ALL</button>
      </div>

      {/* BOARD AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 65px)", gap: "5px", background: "#151515", padding: "10px", borderRadius: "8px" }}>
          {board.map((row, r) => row.map((cell, c) => (
            <div key={`${r}-${c}`} 
                 onClick={() => !isPlayPhase && !ready && arbiter.autoDeploy(player)}
                 style={{ 
                   width: 65, height: 65, background: cell?.player === player ? "#800000" : (cell ? "#1a2a3a" : "#080808"),
                   border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", cursor: "pointer" 
                 }}>
              { (cell?.player === player || arbiter.gameOver) ? cell.rank : (cell ? "?" : "") }
            </div>
          )))}
        </div>

        {/* SETUP CONTROLS */}
        {!isPlayPhase && !ready && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "15px", maxWidth: "600px" }}>
              {tray.map((p, i) => (
                <div key={i} style={{ background: "#222", padding: "5px 10px", fontSize: "9px", borderRadius: "3px" }}>{p.rank}</div>
              ))}
            </div>
            <button onClick={() => arbiter.autoDeploy(player)} style={{ padding: "10px 20px", background: "white", color: "black", border: "none", marginRight: "10px", cursor: "pointer" }}>AUTO-DEPLOY</button>
            <button onClick={handleStart} style={{ padding: "10px 20px", background: "#28a745", color: "white", border: "none", cursor: "pointer" }}>START BATTLE</button>
          </div>
        )}

        {ready && !isPlayPhase && <div style={{ marginTop: "20px", color: "gold" }}>Waiting for opponent...</div>}
      </div>
    </div>
  );
}