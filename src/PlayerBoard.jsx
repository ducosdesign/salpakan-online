import { useState, useEffect, useCallback } from "react";
import { arbiter, PIECES } from "./Arbiter";
import { ref, onValue } from "firebase/database";
import { db } from "./firebase";

export default function PlayerBoard({ player }) {
  const [board, setBoard] = useState(arbiter.getBoardForPlayer(player));
  const [phase, setPhase] = useState("setup");
  const [selectedTrayPiece, setSelectedTrayPiece] = useState(null);
  const [selectedBoardSquare, setSelectedBoardSquare] = useState(null);
  const [battleFlash, setBattleFlash] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [activitySeconds, setActivitySeconds] = useState(0);

  const updateUI = useCallback(() => {
    setBoard(arbiter.getBoardForPlayer(player));
    setActivitySeconds(Math.floor((Date.now() - arbiter.lastActivity) / 1000));
    
    if (arbiter.playerReady[1] && arbiter.playerReady[2]) {
      setPhase("play");
      const elapsed = Math.floor((Date.now() - arbiter.lastTurnTime) / 1000);
      setTimeLeft(Math.max(0, 60 - elapsed));
    } else {
      setPhase("setup");
    }

    if (arbiter.lastBattle && (!battleFlash || arbiter.lastBattle.time !== battleFlash.time)) {
      setBattleFlash(arbiter.lastBattle);
      setTimeout(() => setBattleFlash(null), 4000);
    }
  }, [player, battleFlash]);

  useEffect(() => {
    arbiter.subscribe(updateUI);
    
    // Listen for Force Reset
    const resetRef = ref(db, `reset_trigger/main_room`);
    onValue(resetRef, () => {
       if (window.location.search.includes("player")) {
         window.location.href = window.location.origin + window.location.pathname;
       }
    });

    const timer = setInterval(() => {
      arbiter.updatePresence(player);
      updateUI();
    }, 1000);

    return () => { arbiter.unsubscribe(updateUI); clearInterval(timer); };
  }, [player, updateUI]);

  const handleCellClick = (r, c) => {
    if (arbiter.gameOver) return;
    const isMyZone = player === 1 ? r >= 5 : r <= 2;
    if (phase === "setup" && !arbiter.playerReady[player]) {
      if (!isMyZone) return;
      if (selectedTrayPiece) {
        arbiter.setPiece(r, c, selectedTrayPiece, player);
        setSelectedTrayPiece(null);
      } else if (arbiter.board[r][c]?.player === player) {
        arbiter.setPiece(r, c, null, player);
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
    if (battleFlash.isWarning) return battleFlash.targetPlayer === player ? { msg: battleFlash.msg, color: "#2c3e50" } : null;
    const { attackerRank, attackerPlayer, defenderRank, defenderPlayer, result } = battleFlash;
    const amAttacker = attackerPlayer === player;
    const amDefender = defenderPlayer === player;
    
    if (result === "attacker") {
      return amAttacker ? { msg: `SUCCESS! Your ${attackerRank} captured a unit.`, color: "#004d00" } : { msg: `DEFEAT! Your ${defenderRank} was captured.`, color: "#800000" };
    }
    if (result === "defender") {
      return amAttacker ? { msg: `DEFEAT! Your ${attackerRank} was lost.`, color: "#800000" } : { msg: `SUCCESS! Your ${defenderRank} defended the square.`, color: "#004d00" };
    }
    return { msg: "A DRAW! Both units lost.", color: "gold" };
  };

  const flash = getFlashContent();
  const timeoutRem = 900 - activitySeconds;

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px", background: "#0a0a0a", minHeight: "100vh", color: "white", fontFamily: "sans-serif" }}>
      {/* SIDEBAR */}
      <div style={{ width: "260px", background: "#1a1a1a", padding: "15px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <h4 style={{ color: "gold", fontSize: "11px", margin: 0 }}>BATTLE PROCEDURES</h4>
        <div style={{ textAlign: "center", padding: "12px", borderRadius: "8px", background: "#222", border: timeoutRem < 60 ? "2px solid red" : "1px solid #444" }}>
          <div style={{ fontSize: "28px", fontWeight: "bold" }}>{arbiter.gameOver ? "FIN" : timeLeft + "s"}</div>
          <div style={{ fontSize: "10px", color: "gold" }}>{arbiter.turn === player ? "YOUR TURN" : "WAITING"}</div>
        </div>

        <div>
          <h4 style={{ fontSize: "10px", color: "#ff4d4d", margin: "5px 0" }}>GRAVEYARD: DEFEATED</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
            {arbiter.graveyard[player].map((p, i) => <div key={i} style={{ fontSize: "9px", background: "#311", padding: "3px" }}>{p.rank}</div>)}
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: "10px", color: "#4CAF50", margin: "5px 0" }}>GRAVEYARD: CAPTURES</h4>
          <div style={{ display: "grid", gridTemplateColumns: arbiter.gameOver ? "1fr 1fr" : "repeat(5, 1fr)", gap: "4px" }}>
            {arbiter.graveyard[player === 1 ? 2 : 1].map((p, i) => <div key={i} style={{ fontSize: "9px", background: "#131", textAlign: "center" }}>{arbiter.gameOver ? p.rank : "?"}</div>)}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #333", paddingTop: "10px", marginTop: "auto" }}>
          <p style={{ fontSize: "9px", color: "#888", margin: 0 }}>Lead Prompt Engineer: <b>Emelizaducos</b><br/>AI Architect: <b>Gemini 3.0 Flash</b></p>
        </div>
        <button onClick={() => arbiter.reset()} style={{ width: "100%", padding: "10px", background: "#d9534f", border: "none", color: "white", fontWeight: "bold", borderRadius: "5px", cursor: "pointer" }}>RESET ALL</button>
      </div>

      {/* BOARD */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ height: "65px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "15px" }}>
          {flash && <div style={{ background: flash.color, padding: "10px 20px", borderRadius: "5px", fontWeight: "bold" }}>{flash.msg}</div>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 65px)", gap: "5px", background: "#222", padding: "12px", borderRadius: "10px" }}>
          {board.map((row, r) => row.map((cell, c) => (
            <div key={`${r}-${c}`} onClick={() => handleCellClick(r, c)} 
              style={{ 
                width: 65, height: 65, border: selectedBoardSquare?.r === r && selectedBoardSquare?.c === c ? "2px solid gold" : "1px solid #333", 
                background: !cell ? "#1a1a1a" : cell.player === player ? "#800000" : "#1a2a3a",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", cursor: "pointer", borderRadius: "4px" 
              }}>
              {(cell?.player === player || arbiter.gameOver) ? cell?.rank : (cell ? "?" : "")}
            </div>
          )))}
        </div>

        {phase === "setup" && !arbiter.playerReady[player] && (
          <div style={{ marginTop: "15px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", background: "#1a1a1a", padding: "10px", borderRadius: "8px" }}>
              {PIECES.filter(p => !arbiter.board.flat().some(bc => bc?.rank === p.rank && bc?.player === player)).map((p, i) => (
                <div key={i} onClick={() => setSelectedTrayPiece(p)} style={{ fontSize: "9px", padding: "5px", background: selectedTrayPiece === p ? "gold" : "#333", color: selectedTrayPiece === p ? "black" : "white", cursor: "pointer" }}>{p.rank}</div>
              ))}
            </div>
            <button onClick={() => { arbiter.playerReady[player] = true; arbiter.save(); }} style={{ background: "green", color: "white", padding: "10px 30px", marginTop: "10px", border: "none", cursor: "pointer" }}>READY</button>
          </div>
        )}
      </div>
    </div>
  );
}