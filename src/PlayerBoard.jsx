import { useState, useEffect, useCallback } from "react";
import { arbiter, PIECES } from "./Arbiter";

export default function PlayerBoard({ player }) {
  const [board, setBoard] = useState(arbiter.getBoardForPlayer(player));
  const [phase, setPhase] = useState("setup");
  const [selectedTrayPiece, setSelectedTrayPiece] = useState(null);
  const [selectedBoardSquare, setSelectedBoardSquare] = useState(null);
  const [battleFlash, setBattleFlash] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);

  // Calculates which pieces are still in your tray based on the current board
  const calculateTray = useCallback(() => {
    const remaining = [...PIECES];
    arbiter.board.flat().forEach(cell => {
      if (cell?.player === player) {
        const index = remaining.findIndex(p => p.rank === cell.rank);
        if (index > -1) remaining.splice(index, 1);
      }
    });
    return remaining;
  }, [player]);

  const [tray, setTray] = useState(calculateTray());

  // Main UI update function triggered by Arbiter (Firebase)
  const updateUI = useCallback(() => {
    setBoard(arbiter.getBoardForPlayer(player));
    setTray(calculateTray());
    
    // Determine game phase based on both players' readiness
    if (arbiter.playerReady[1] && arbiter.playerReady[2]) {
      setPhase("play");
      const elapsed = Math.floor((Date.now() - (arbiter.lastTurnTime || Date.now())) / 1000);
      setTimeLeft(Math.max(0, 60 - elapsed));
    } else {
      setPhase("setup");
    }

    // Handle Battle Notification "Flash"
    if (arbiter.lastBattle && (!battleFlash || arbiter.lastBattle.time !== battleFlash.time)) {
      setBattleFlash(arbiter.lastBattle);
      setTimeout(() => setBattleFlash(null), 4000);
    }
  }, [player, battleFlash, calculateTray]);

  useEffect(() => {
    // Subscribe to Arbiter (Firebase onValue changes)
    arbiter.subscribe(updateUI);

    // Update Presence & Local Timer every second
    const timer = setInterval(() => {
      arbiter.updatePresence(player);
      updateUI();
    }, 1000);

    return () => { 
      arbiter.unsubscribe(updateUI); 
      clearInterval(timer); 
    };
  }, [player, updateUI]);

  const handleCellClick = (r, c) => {
    if (arbiter.gameOver) return;
    const isMyZone = player === 1 ? r >= 5 : r <= 2;

    if (phase === "setup" && !arbiter.playerReady[player]) {
      if (!isMyZone) return; // Cannot place outside your 3 starting rows
      
      if (selectedTrayPiece) {
        arbiter.setPiece(r, c, selectedTrayPiece, player);
        setSelectedTrayPiece(null);
      } else if (arbiter.board[r][c]?.player === player) {
        arbiter.setPiece(r, c, null, player); // Remove piece back to tray
      }
    } else if (phase === "play" && arbiter.turn === player) {
      if (!selectedBoardSquare) {
        if (arbiter.board[r][c]?.player === player) setSelectedBoardSquare({ r, c });
      } else {
        arbiter.movePiece(selectedBoardSquare, { r, c }, player);
        setSelectedBoardSquare(null);
      }
    }
  };

  const getFlashContent = () => {
    if (!battleFlash) return null;
    if (battleFlash.isWarning) return battleFlash.targetPlayer === player ? { msg: battleFlash.msg, color: "#1a2a3a" } : null;
    
    const { attackerRank, attackerPlayer, result } = battleFlash;
    const amAttacker = attackerPlayer === player;
    
    if (result === "attacker") {
      return amAttacker ? { msg: `SUCCESS! Your ${attackerRank} captured a unit.`, color: "#004d00" } : { msg: "DEFEAT! Your unit was captured.", color: "#800000" };
    }
    if (result === "defender") {
      return amAttacker ? { msg: `DEFEAT! Your ${attackerRank} was lost.`, color: "#800000" } : { msg: "SUCCESS! You defended the square.", color: "#004d00" };
    }
    return { msg: "A DRAW! Both units lost.", color: "#444" };
  };

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px", background: "#0a0a0a", minHeight: "100vh", color: "white", fontFamily: "sans-serif" }}>
      
      {/* SIDEBAR: Stats & Controls */}
      <div style={{ width: "280px", background: "#111", padding: "20px", borderRadius: "10px", border: "1px solid #222", display: "flex", flexDirection: "column" }}>
        <h4 style={{ color: "gold", fontSize: "12px", textAlign: "center", marginBottom: "15px", letterSpacing: "1px" }}>BATTLE PROCEDURES</h4>
        
        <div style={{ background: "#050505", border: "1px solid #333", borderRadius: "10px", padding: "20px", textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", fontFamily: "monospace" }}>{arbiter.gameOver ? "FIN" : timeLeft + "s"}</div>
          <div style={{ fontSize: "10px", color: "gold", marginTop: "5px" }}>{arbiter.turn === player ? "YOUR TURN" : "WAITING"}</div>
        </div>

        <div style={{ flexGrow: 1, fontSize: "11px", color: "#666" }}>
          <p style={{ color: "white" }}>● PLAYER {player} ONLINE</p>
          <p style={{ color: "#ff4d4d", marginTop: "30px", fontWeight: "bold" }}>GRAVEYARD: DEFEATED</p>
          <div style={{ height: "40px", background: "#000", borderRadius: "4px" }}></div>
          <p style={{ color: "#4CAF50", marginTop: "15px", fontWeight: "bold" }}>GRAVEYARD: CAPTURES</p>
          <div style={{ height: "40px", background: "#000", borderRadius: "4px" }}></div>
        </div>

        <div style={{ borderTop: "1px solid #333", paddingTop: "15px", fontSize: "10px", color: "#444", textAlign: "center" }}>
          Lead Prompt Engineer: <b>Emelizaducos</b><br/>AI Architect: <b>Gemini 3.0 Flash</b>
        </div>
        
        <button onClick={() => arbiter.reset()} style={{ width: "100%", padding: "12px", background: "#d9534f", border: "none", color: "white", fontWeight: "bold", borderRadius: "5px", cursor: "pointer", marginTop: "15px" }}>RESET ALL</button>
      </div>

      {/* MAIN BATTLEFIELD */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        
        {/* Battle Notification Flash Area */}
        <div style={{ height: "60px", marginBottom: "10px", display: "flex", alignItems: "center" }}>
          {getFlashContent() && (
            <div style={{ background: getFlashContent().color, padding: "10px 30px", borderRadius: "5px", border: "1px solid #333", fontSize: "13px", fontWeight: "bold", animation: "fadeIn 0.5s" }}>
              {getFlashContent().msg}
            </div>
          )}
        </div>

        {/* BOARD GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 68px)", gap: "6px", background: "#151515", padding: "15px", borderRadius: "12px", border: "1px solid #222" }}>
          {board.map((row, r) => row.map((cell, c) => (
            <div key={`${r}-${c}`} onClick={() => handleCellClick(r, c)} 
              style={{ 
                width: 68, height: 68, borderRadius: "6px", cursor: "pointer",
                border: selectedBoardSquare?.r === r && selectedBoardSquare?.c === c ? "2px solid gold" : "1px solid #222", 
                background: !cell ? (phase === "setup" && (player === 1 ? r >= 5 : r <= 2) ? "#0d140d" : "#080808")
                  : cell.player === player ? "#800000" : "#1a2a3a",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", textAlign: "center", transition: "0.2s"
              }}>
              {(cell?.player === player || arbiter.gameOver) ? cell?.rank : (cell ? "?" : "")}
            </div>
          )))}
        </div>

        {/* LOG FOOTER */}
        <div style={{ width: "100%", maxWidth: "660px", background: "#050505", border: "1px solid #222", padding: "10px", marginTop: "15px", borderRadius: "5px", textAlign: "center", color: "#444", fontSize: "11px", letterSpacing: "2px" }}>
          BATTLE LOG
        </div>

        {/* SETUP CONTROLS */}
        {phase === "setup" && !arbiter.playerReady[player] && (
          <div style={{ marginTop: "20px", width: "100%", maxWidth: "660px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", background: "#111", padding: "15px", borderRadius: "10px", border: "1px solid #222" }}>
              {tray.map((p, i) => (
                <div key={i} onClick={() => setSelectedTrayPiece(p)} 
                  style={{ 
                    fontSize: "9px", padding: "6px 10px", 
                    background: selectedTrayPiece === p ? "gold" : "#222", 
                    color: selectedTrayPiece === p ? "black" : "#ccc", 
                    borderRadius: "4px", cursor: "pointer", border: "1px solid #333", fontWeight: "bold" 
                  }}>
                  {p.rank}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "15px", justifyContent: "center", marginTop: "15px" }}>
              <button onClick={() => arbiter.autoDeploy(player)} style={{ padding: "10px 25px", background: "#fff", color: "#000", border: "none", fontWeight: "bold", borderRadius: "4px", cursor: "pointer" }}>AUTO-DEPLOY</button>
              <button onClick={() => arbiter.clearPlayerBoard(player)} style={{ padding: "10px 25px", background: "#fff", color: "#000", border: "none", fontWeight: "bold", borderRadius: "4px", cursor: "pointer" }}>CLEAR</button>
              
              {tray.length === 0 && (
                <button 
                  onClick={() => { arbiter.playerReady[player] = true; arbiter.save(); }} 
                  style={{ padding: "10px 40px", background: "#28a745", color: "white", border: "none", fontWeight: "bold", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}
                >
                  START BATTLE
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}