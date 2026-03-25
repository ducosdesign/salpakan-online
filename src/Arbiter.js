import { ref, set, onValue } from "firebase/database";
import { db } from "./firebase";

const ROWS = 8;
const COLS = 9;
const GAME_ID = "main_battle_room"; // Changed ID to force a fresh data node

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
    this.sync();
  }

  initLocal() {
    this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    this.turn = 1;
    this.playerReady = { 1: false, 2: false };
    this.gameOver = false;
    this.winner = null;
    this.lastBattle = null;
    this.lastTurnTime = Date.now();
    this.listeners = [];
  }

  sync() {
    onValue(this.gameRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        this.save(); // Initialize cloud if empty
        return;
      }

      // CRITICAL FIX: Convert Firebase objects back into Arrays
      if (data.board && !Array.isArray(data.board)) {
        data.board = Object.values(data.board).map(row => 
          Array.isArray(row) ? row : Object.values(row)
        );
      }
      
      Object.assign(this, data);
      this.notify();
    });
  }

  async save() {
    await set(this.gameRef, {
      board: this.board,
      turn: this.turn,
      playerReady: this.playerReady,
      gameOver: this.gameOver,
      winner: this.winner,
      lastBattle: this.lastBattle,
      lastTurnTime: this.lastTurnTime
    });
  }

  async autoDeploy(p) {
    const isMyZone = (r) => (p === 1 ? r >= 5 : r <= 2);
    const spots = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (isMyZone(r)) {
          this.board[r][c] = null; // Clear first
          spots.push({ r, c });
        }
      }
    }
    spots.sort(() => Math.random() - 0.5);
    PIECES.forEach((piece, i) => {
      if (spots[i]) this.board[spots[i].r][spots[i].c] = { ...piece, player: p };
    });
    await this.save();
  }

  async movePiece(from, to, p) {
    if (this.turn !== p || this.gameOver) return;
    const att = this.board[from.r][from.c];
    const def = this.board[to.r][to.c];

    if (!def) {
      this.board[to.r][to.c] = att;
      this.board[from.r][from.c] = null;
    } else {
      if (def.player === p) return;
      const res = this.resolve(att, def);
      if (res === "win") {
        this.board[to.r][to.c] = att;
        this.board[from.r][from.c] = null;
      } else if (res === "loss") {
        this.board[from.r][from.c] = null;
      } else if (res === "draw") {
        this.board[from.r][from.c] = null;
        this.board[to.r][to.c] = null;
      } else if (res === "flag") {
        this.gameOver = true;
        this.winner = p;
      }
      this.lastBattle = { msg: `Battle: ${att.rank} vs ${def.rank}`, time: Date.now() };
    }
    this.turn = this.turn === 1 ? 2 : 1;
    this.lastTurnTime = Date.now();
    await this.save();
  }

  resolve(att, def) {
    if (def.rank === "Flag") return "flag";
    if (att.rank === def.rank) return "draw";
    if (att.rank === "Spy" && def.rank !== "Private") return "win";
    if (def.rank === "Spy" && att.rank !== "Private") return "loss";
    if (att.rank === "Private" && def.rank === "Spy") return "win";
    return att.value > def.value ? "win" : "loss";
  }

  async reset() {
    this.initLocal();
    await this.save();
  }

  subscribe(f) { this.listeners.push(f); }
  unsubscribe(f) { this.listeners = this.listeners.filter(l => l !== f); }
  notify() { this.listeners.forEach(f => f()); }
}

export const arbiter = new Arbiter();