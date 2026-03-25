import { ref, set, onValue } from "firebase/database";
import { db } from "./firebase";

const ROWS = 8;
const COLS = 9;
const GAME_ID = "main_room"; 

export const PIECES = [
  { rank: "5★ General", value: 14 }, { rank: "4★ General", value: 13 },
  { rank: "3★ General", value: 12 }, { rank: "2★ General", value: 11 },
  { rank: "1★ General", value: 10 }, { rank: "Colonel", value: 9 },
  { rank: "Lt. Colonel", value: 8 }, { rank: "Major", value: 7 },
  { rank: "Captain", value: 6 }, { rank: "1st Lt.", value: 5 },
  { rank: "2nd Lt.", value: 4 }, { rank: "Sergeant", value: 3 },
  { rank: "Spy", value: 1 }, { rank: "Spy", value: 1 },
  { rank: "Private", value: 2 }, { rank: "Private", value: 2 },
  { rank: "Private", value: 2 }, { rank: "Private", value: 2 },
  { rank: "Private", value: 2 }, { rank: "Private", value: 2 },
  { rank: "Flag", value: 0 },
];

class Arbiter {
  constructor() {
    this.gameRef = ref(db, `games/${GAME_ID}`);
    this.initLocal();
    this.syncWithFirebase();
  }

  initLocal() {
    this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    this.turn = 1;
    this.graveyard = { 1: [], 2: [] };
    this.playerReady = { 1: false, 2: false };
    this.playerNames = { 1: "Player 1", 2: "Player 2" };
    this.activePlayers = { 1: false, 2: false };
    this.lastSeen = { 1: 0, 2: 0 };
    this.lastActivity = Date.now(); 
    this.lastTurnTime = Date.now();  
    this.lastBattle = null; 
    this.battleLog = []; 
    this.gameOver = false;
    this.winner = null;
    this.listeners = [];
  }

  syncWithFirebase() {
    onValue(this.gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // FIX: Force board back into a proper Array if Firebase turned it into an Object
        if (data.board && !Array.isArray(data.board)) {
          data.board = Object.values(data.board).map(row => 
            Array.isArray(row) ? row : Object.values(row)
          );
        }
        
        Object.assign(this, data);

        // Final safety check
        if (!this.board || !Array.isArray(this.board)) {
          this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
        }
        this.notify();
      }
    });
  }

  async save() {
    const state = {
      board: this.board, turn: this.turn, graveyard: this.graveyard,
      playerReady: this.playerReady, playerNames: this.playerNames,
      activePlayers: this.activePlayers, lastSeen: this.lastSeen,
      lastActivity: Date.now(), lastTurnTime: this.lastTurnTime,
      lastBattle: this.lastBattle, battleLog: this.battleLog, 
      gameOver: this.gameOver, winner: this.winner
    };
    await set(this.gameRef, state);
  }

  updatePresence(p) {
    set(ref(db, `games/${GAME_ID}/lastSeen/${p}`), Date.now());
  }

  async autoDeploy(player) {
    await this.clearPlayerBoard(player);
    const isZone = (r) => (player === 1 ? r >= 5 : r <= 2);
    const spots = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (isZone(r)) spots.push({ r, c });
      }
    }
    spots.sort(() => Math.random() - 0.5);
    PIECES.forEach((p, i) => {
      if (spots[i]) this.board[spots[i].r][spots[i].c] = { ...p, player };
    });
    await this.save();
  }

  async clearPlayerBoard(player) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c]?.player === player) this.board[r][c] = null;
      }
    }
    await this.save();
  }

  async setPiece(r, c, piece, player) {
    this.board[r][c] = piece ? { ...piece, player } : null;
    await this.save();
  }

  async movePiece(from, to, player) {
    if (this.gameOver) return;
    const attacker = this.board[from.r][from.c];
    const defender = this.board[to.r][to.c];
    
    if (Math.abs(from.r - to.r) + Math.abs(from.c - to.c) !== 1) {
      this.lastBattle = { msg: "Illegal maneuver! Cardinal moves only.", time: Date.now(), isWarning: true, targetPlayer: player };
      await this.save();
      return;
    }

    if (!defender) {
      this.board[to.r][to.c] = attacker;
      this.board[from.r][from.c] = null;
    } else {
      if (defender.player === player) return;
      const result = this.resolveBattle(attacker, defender);
      this.lastBattle = { attackerRank: attacker.rank, attackerPlayer: attacker.player, defenderRank: defender.rank, defenderPlayer: defender.player, result, time: Date.now(), isWarning: false };
      
      if (result === "attacker") {
        this.graveyard[defender.player].push(defender);
        this.board[to.r][to.c] = attacker;
        this.board[from.r][from.c] = null;
      } else if (result === "defender") {
        this.graveyard[attacker.player].push(attacker);
        this.board[from.r][from.c] = null;
      } else if (result === "both") {
        this.graveyard[1].push(attacker); this.graveyard[2].push(defender);
        this.board[from.r][from.c] = null; this.board[to.r][to.c] = null;
      } else if (result === "gameover") {
        this.gameOver = true; this.winner = player;
      }
    }
    this.turn = this.turn === 1 ? 2 : 1;
    this.lastTurnTime = Date.now();
    await this.save();
  }

  resolveBattle(att, def) {
    if (def.rank === "Flag") return "gameover";
    if (att.rank === def.rank) return "both";
    if (att.rank === "Spy" && def.rank !== "Private") return "attacker";
    if (def.rank === "Spy" && att.rank !== "Private") return "defender";
    if (att.rank === "Private" && def.rank === "Spy") return "attacker";
    if (def.rank === "Private" && att.rank === "Spy") return "defender";
    return att.value > def.value ? "attacker" : "defender";
  }

  getBoardForPlayer(p) {
    if (!this.board || !Array.isArray(this.board)) return [];
    return this.board.map(row => (row || []).map(cell => {
      if (!cell) return null;
      return (cell.player === p || this.gameOver) ? cell : { ...cell, rank: "?" };
    }));
  }

  async reset() {
    this.initLocal();
    await this.save();
  }

  load() { return; } // Dummy to satisfy legacy calls
  subscribe(f) { this.listeners.push(f); }
  unsubscribe(f) { this.listeners = this.listeners.filter(l => l !== f); }
  notify() { this.listeners.forEach(f => f()); }
}

export const arbiter = new Arbiter();