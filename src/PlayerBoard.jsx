import { useState, useEffect, useCallback } from "react";
import { arbiter, PIECES } from "./Arbiter";

export default function PlayerBoard({ player }) {
  const [board, setBoard] = useState(arbiter.getBoardForPlayer(player));
  const [phase, setPhase] = useState("setup");
  const [selectedTrayPiece, setSelectedTrayPiece] = useState(null);
  const [selectedBoardSquare, setSelectedBoardSquare] = useState(null);
  const [battleFlash, setBattleFlash] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);

  // Calculates which pieces are still in your tray (not yet on the board)
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

  useEffect(() => {
    const update = () => {
      arbiter.load(); // Pull fresh data from Firebase via the Arbiter
      setBoard(arbiter.getBoardForPlayer(player));
      setTray(calculateTray());

      // Phase Logic: If both players are ready, move to play phase
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
    };

    arbiter.subscribe(update);
    const timer = setInterval(() => {
      arbiter.updatePresence(player);
      update();
    }, 1000);

    return () => { arbiter.unsubscribe(update); clearInterval(timer); };
  }, [player, battleFlash, calculateTray]);

  const handleCellClick = (r, c) => {
    if (arbiter.gameOver) return;
    const isMyZone = player === 1 ? r >= 5 : r <= 2;

    if (phase === "setup" && !arbiter.playerReady[player]) {
      if (!isMyZone) return; // Can only place in your 3 rows
      const cell = arbiter.board[r][c];
      
      if (cell?.player === player) {
        arbiter.setPiece(r, c, null, player); // Remove piece
      } else if (selectedTrayPiece) {
        arbiter.setPiece(r, c, selectedTrayPiece, player); // Place piece
        setSelectedTrayPiece(null);
      }
    } else if (phase === "play" && arbiter.turn === player) {
      if (!selectedBoardSquare) {
        if (board[r][c]?.player === player) setSelectedBoardSquare({ r, c });
      } else {
        arbiter.movePiece(selectedBoardSquare, { r, c }, player);
        setSelectedBoardSquare(null);
      }
    }
  };

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px", background: "#0a0a0a", minHeight: "100vh", color: "white", fontFamily: "sans-serif" }}>
      
      {/* LEFT SIDEBAR: Instructions, Timer, Graveyard */}
      <div style={{ width: "280px", background: "#111", padding: "20px", borderRadius: "10px", border: "1px solid #222", display: "flex", flexDirection: "column" }}>
        <div style={{ borderBottom: "1px solid #333", paddingBottom: "15px", marginBottom: "15px" }}>
          <h4 style={{ color: "gold", margin: "0 0 10px 0", fontSize: "12px", textAlign: "center" }}>BATTLE PROCEDURES</h4>
          <ul style={{ fontSize: "11px", color: "#aaa", paddingLeft: "15px", lineHeight: "1.6" }}>
            <li><b>Movement:</b> One square (Up, Down, L, R).</li>
            <li><b>Spy:</b> Kills officers, loses to <b>Private</b>.</li>
            <li><b>Victory:</b> Take Flag or reach back row.</li>
          </ul>
        </div>

        <div style={{ background: "#050505", border: "1px solid #333", borderRadius: "10px", padding: "20px", textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#fff" }}>{arbiter.gameOver ? "FIN" : timeLeft + "s"}</div>
          <div style={{ fontSize: "10px", color: "gold", marginTop: "5px" }}>{arbiter.turn === player ? "YOUR TURN" : "OPPONENT'S TURN"}</div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: "bold" }}>{arbiter.playerNames[player]}</div>
          <div style={{ fontSize: "10px", color: "#555" }}>● ONLINE</div>
        </div>

        <div style={{ flexGrow: 1 }}>
          <h5 style={{ color: "#ff4d4d", fontSize: "10px", margin: "0 0 10px 0" }}>GRAVEYARD: DEFEATED</h5>
          <h5 style={{ color: "#4CAF50", fontSize: "10px", margin: "20px 0 10px 0" }}>GRAVEYARD: CAPTURES</h5>
        </div>

        <div style={{ borderTop: "1px solid #333", paddingTop: "15px", fontSize: "10px", color: "#444", textAlign: "center" }}>
          Lead Prompt Engineer: <b>Emelizaducos</b><br/>AI Architect: <b>Gemini 3.0 Flash</b>
        </div>
        
        <button onClick={() => arbiter.reset()} style={{ width: "100%", padding: "12px", background: "#d9534f", border: "none", color: "white", borderRadius: "5px", fontWeight: "bold", marginTop: "15px", cursor: "pointer" }}>RESET ALL</button>
      </div>

      {/* MAIN CENTER: Board and Setup Controls */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        
        <div style={{ height: "60px", marginBottom: "10px" }}>
          {battleFlash && <div style={{ background: "#1a2a3a", padding: "10px 30px", borderRadius: "5px", border: "1px solid #333" }}>{battleFlash.msg}</div>}
        </div>

        {/* THE BOARD */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 68px)", gap: "6px", background: "#151515", padding: "15px", borderRadius: "12px", border: "1px solid #222" }}>
          {board.map((row, r) => row.map((cell, c) => (
            <div key={`${r}-${c}`} onClick={() => handleCellClick(r, c)} 
              style={{ 
                width: 68, height: 68, borderRadius: "6px", cursor: "pointer",
                border: selectedBoardSquare?.r === r && selectedBoardSquare?.c === c ? "2px solid gold" : "1px solid #222", 
                background: !cell ? (phase === "setup" && (player === 1 ? r >= 5 : r <= 2) ? "#0d140d" : "#080808")
                  : cell.player === player ? "#800000" : "#1a2a3a",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", textAlign: "center"
              }}>
              {(cell?.player === player || arbiter.gameOver) ? cell?.rank : (cell ? "?" : "")}
            </div>
          )))}
        </div>

        {/* BATTLE LOG */}
        <div style={{ width: "100%", maxWidth: "660px", background: "#050505", border: "1px solid #222", padding: "10px", marginTop: "15px", borderRadius: "5px", height: "40px", textAlign: "center", color: "#444", fontSize: "11px" }}>
          BATTLE LOG
        </div>

        {/* SETUP CONTROLS (Your Image Reference) */}
        {phase === "setup" && !arbiter.playerReady[player] && (
          <div style={{ marginTop: "20px", width: "100%", maxWidth: "660px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", background: "#111", padding: "15px", borderRadius: "10px", border: "1px solid #222" }}>
              {tray.map((p, i) => (
                <div key={i} onClick={() => setSelectedTrayPiece(p)} 
                  style={{ fontSize: "9px", padding: "6px 10px", background: selectedTrayPiece === p ? "gold" : "#222", color: selectedTrayPiece === p ? "black" : "#ccc", borderRadius: "4px", cursor: "pointer", border: "1px solid #333" }}>
                  {p.rank}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "15px", justifyContent: "center", marginTop: "15px" }}>
              <button onClick={() => arbiter.autoDeploy(player)} style={{ padding: "10px 25px", background: "#fff", color: "#000", border: "none", fontWeight: "bold", borderRadius: "4px", cursor: "pointer" }}>AUTO-DEPLOY</button>
              <button onClick={() => arbiter.clearPlayerBoard(player)} style={{ padding: "10px 25px", background: "#fff", color: "#000", border: "none", fontWeight: "bold", borderRadius: "4px", cursor: "pointer" }}>CLEAR</button>
              {tray.length === 0 && (
                <button onClick={() => { arbiter.playerReady[player] = true; arbiter.save(); }} style={{ padding: "10px 40px", background: "#28a745", color: "white", border: "none", fontWeight: "bold", borderRadius: "4px", cursor: "pointer" }}>START BATTLE</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}