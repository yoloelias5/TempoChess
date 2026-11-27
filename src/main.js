import { Chess } from "chess.js";
import { StockfishEngine } from "./engine.js";
import "./style.css";

const app = document.querySelector("#app");
const chess = new Chess();
const engine = new StockfishEngine();
const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const glyphs = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }
};
const labels = {
  best: ["Best", "mark-best"],
  excellent: ["Excellent", "mark-excellent"],
  good: ["Good", "mark-good"],
  inaccuracy: ["Inaccuracy ?!", "mark-inaccuracy"],
  mistake: ["Mistake ?", "mark-mistake"],
  blunder: ["Blunder ??", "mark-blunder"]
};

let selected = null;
let legalTargets = [];
let moveRows = [];
let lastWhiteEval = 0;
let lastBestMove = null;
let analysisBusy = false;
let engineAvailable = true;
let flipped = false;
let pgnMode = false;

app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="TempoChess home"><span class="brand-mark">T</span><span>Tempo<span class="brand-light">Chess</span></span></a>
    <div class="top-actions">
      <span class="engine-status" id="engine-status"><i></i> Engine loading</span>
      <button class="button button-quiet" id="flip-board" type="button">Flip board</button>
    </div>
  </header>
  <main class="shell">
    <section class="intro">
      <div>
        <p class="eyebrow">FREE CHESS ANALYSIS</p>
        <h1>Make every move <span>count.</span></h1>
        <p class="subtitle">Play through a game or import a PGN. Stockfish reviews your moves right in your browser.</p>
      </div>
      <div class="intro-tag">LIGHTWEIGHT BY DESIGN</div>
    </section>

    <section class="workspace">
      <div class="board-column">
        <div class="player-line"><span class="avatar black-avatar">♚</span><div><strong>Black</strong><small id="black-caption">Ready to play</small></div><span class="player-rating">—</span></div>
        <div class="board-wrap">
          <div class="eval-track"><div class="eval-black" id="eval-black"></div><div class="eval-white" id="eval-white"></div><span id="eval-label">0.0</span></div>
          <div class="board" id="board" role="grid" aria-label="Chess board"></div>
        </div>
        <div class="player-line"><span class="avatar white-avatar">♔</span><div><strong>White</strong><small id="white-caption">Your turn</small></div><span class="player-rating">—</span></div>
        <div class="board-controls">
          <button class="button button-quiet" id="undo" type="button">↶ Undo</button>
          <button class="button button-quiet" id="new-game" type="button">New game</button>
          <button class="button button-primary" id="analyse" type="button">Analyse position</button>
        </div>
      </div>

      <aside class="analysis-panel">
        <div class="panel-heading"><div><p class="eyebrow">GAME REVIEW</p><h2>Move analysis</h2></div><span class="live-pill"><i></i> LIVE</span></div>
        <div class="summary-grid">
          <div class="summary-card"><span>Position eval</span><strong id="eval-summary">0.0</strong></div>
          <div class="summary-card"><span>Engine depth</span><strong id="depth-summary">—</strong></div>
        </div>
        <div class="best-move" id="best-move"><span class="best-icon">✦</span><div><small>ENGINE'S TOP MOVE</small><strong id="best-move-text">Waiting for analysis</strong></div></div>
        <div class="move-section">
          <div class="section-title"><strong>Moves</strong><span id="move-count">0 moves</span></div>
          <div class="move-list" id="move-list"><div class="empty-state">Make a move to start your review.</div></div>
        </div>
        <div class="review-note" id="review-note">Stockfish runs locally in your browser. Analysis may take longer on older devices.</div>
      </aside>
    </section>

    <section class="import-card">
      <div class="import-copy"><span class="import-icon">PGN</span><div><h2>Import a game</h2><p>Paste a PGN from Chess.com, Lichess or another chess app.</p></div></div>
      <textarea id="pgn-input" spellcheck="false" placeholder='[Event "Casual Game"]&#10;1. e4 e5 2. Nf3 Nc6 ...'></textarea>
      <div class="import-actions"><span id="import-status">PGN stays on this device.</span><button class="button button-primary" id="import-pgn" type="button">Load PGN</button></div>
    </section>
    <footer><span>TempoChess Analysis <b>0.1.0</b></span><span>Less UI. More chess.</span></footer>
  </main>
`;

const boardEl = document.querySelector("#board");
const moveListEl = document.querySelector("#move-list");
const statusEl = document.querySelector("#engine-status");

function squareName(fileIndex, rankIndex) {
  const file = flipped ? 7 - fileIndex : fileIndex;
  const rank = flipped ? rankIndex + 1 : 8 - rankIndex;
  return files[file] + rank;
}

function renderBoard() {
  const board = chess.board();
  boardEl.innerHTML = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = squareName(col, row);
      const fileIndex = files.indexOf(square[0]);
      const rankIndex = 8 - Number(square[1]);
      const piece = board[rankIndex][fileIndex];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "square " + ((fileIndex + rankIndex) % 2 ? "dark-square" : "light-square");
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", square + (piece ? " " + piece.color + " " + piece.type : ""));
      if (selected === square) button.classList.add("selected");
      if (legalTargets.includes(square)) button.classList.add(piece ? "capture-target" : "legal-target");
      if (col === 0) {
        const rank = document.createElement("span");
        rank.className = "coord rank-coord";
        rank.textContent = square[1];
        button.append(rank);
      }
      if (row === 7) {
        const file = document.createElement("span");
        file.className = "coord file-coord";
        file.textContent = square[0];
        button.append(file);
      }
      if (piece) {
        const pieceEl = document.createElement("span");
        pieceEl.className = "piece " + (piece.color === "w" ? "piece-white" : "piece-black");
        pieceEl.textContent = glyphs[piece.color][piece.type];
        button.append(pieceEl);
      }
      button.addEventListener("click", () => onSquareClick(square));
      boardEl.append(button);
    }
  }
  renderBestMoveArrow();
}

function renderBestMoveArrow() {
  if (!lastBestMove || lastBestMove === "(none)" || lastBestMove.length < 4) return;
  const from = lastBestMove.slice(0, 2);
  const to = lastBestMove.slice(2, 4);
  const squarePoint = (square) => {
    const file = files.indexOf(square[0]);
    const rank = Number(square[1]);
    const col = flipped ? 7 - file : file;
    const row = flipped ? rank - 1 : 8 - rank;
    return { x: (col + 0.5) * 100, y: (row + 0.5) * 100 };
  };
  const start = squarePoint(from);
  const end = squarePoint(to);
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "best-arrow-layer");
  svg.setAttribute("viewBox", "0 0 800 800");
  svg.setAttribute("aria-hidden", "true");
  const defs = document.createElementNS(svgNS, "defs");
  const marker = document.createElementNS(svgNS, "marker");
  marker.setAttribute("id", "best-arrow-head");
  marker.setAttribute("markerWidth", "7");
  marker.setAttribute("markerHeight", "7");
  marker.setAttribute("refX", "5");
  marker.setAttribute("refY", "3");
  marker.setAttribute("orient", "auto");
  const head = document.createElementNS(svgNS, "path");
  head.setAttribute("d", "M0,0 L6,3 L0,6 Z");
  head.setAttribute("fill", "#f4d35e");
  marker.append(head);
  defs.append(marker);
  svg.append(defs);
  const line = document.createElementNS(svgNS, "line");
  line.setAttribute("x1", String(start.x));
  line.setAttribute("y1", String(start.y));
  line.setAttribute("x2", String(end.x));
  line.setAttribute("y2", String(end.y));
  line.setAttribute("stroke", "#f4d35e");
  line.setAttribute("stroke-width", "13");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("opacity", ".9");
  line.setAttribute("marker-end", "url(#best-arrow-head)");
  svg.append(line);
  boardEl.append(svg);
}

function bestMoveLabel(uci) {
  if (!uci || uci === "(none)" || uci.length < 4) return "No legal move";
  try {
    const position = new Chess(chess.fen());
    const move = position.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] || "q"
    });
    return move ? move.san : uci;
  } catch {
    return uci;
  }
}

function onSquareClick(square) {
  if (analysisBusy || chess.isGameOver()) return;
  const piece = chess.get(square);
  if (selected && legalTargets.includes(square)) {
    playMove(selected, square);
    return;
  }
  if (piece && piece.color === chess.turn()) {
    selected = square;
    legalTargets = chess.moves({ square, verbose: true }).map(move => move.to);
  } else {
    selected = null;
    legalTargets = [];
  }
  renderBoard();
}

function sanToUci(move) {
  return move.from + move.to + (move.promotion || "");
}

function addMoveRow(move, classification, detail) {
  moveRows.push({ san: move.san, color: move.color, classification, detail });
  renderMoves();
}

function classify(loss, wasBest) {
  if (wasBest) return "best";
  if (loss <= 12) return "excellent";
  if (loss <= 35) return "good";
  if (loss <= 90) return "inaccuracy";
  if (loss <= 180) return "mistake";
  return "blunder";
}

async function playMove(from, to) {
  const before = chess.fen();
  const mover = chess.turn();
  const expectedBest = lastBestMove;
  let move;
  try {
    move = chess.move({ from, to, promotion: "q" });
  } catch {
    return;
  }
  selected = null;
  legalTargets = [];
  pgnMode = false;
  renderBoard();
  addMoveRow(move, null, null);
  updatePlayerCaptions();
  if (!engineAvailable) {
    setLastMoveMark("good", "Engine unavailable — move played normally.");
    return;
  }
  analysisBusy = true;
  setNote("Checking your move with Stockfish…");
  try {
    const result = await engine.analyse(chess.fen(), 10);
    const afterWhite = scoreAsWhite(result);
    const moverSign = mover === "w" ? 1 : -1;
    const loss = Math.max(0, Math.round((lastWhiteEval - afterWhite) * moverSign));
    const wasBest = expectedBest && expectedBest.slice(0, 4) === sanToUci(move).slice(0, 4);
    const mark = classify(loss, wasBest);
    lastWhiteEval = afterWhite;
    lastBestMove = result.bestMove;
    setLastMoveMark(mark, `${loss} cp estimated loss · depth ${result.depth || 10}`);
    updateEvaluation(result);
  } catch (error) {
    setNote(error.message || "Analysis failed. You can keep playing.");
  } finally {
    analysisBusy = false;
    renderMoves();
    updatePlayerCaptions();
  }
}

function scoreAsWhite(result) {
  if (result.scoreType === "mate") {
    const mate = result.score > 0 ? 10000 - result.score : -10000 - result.score;
    return chess.turn() === "w" ? mate : -mate;
  }
  return chess.turn() === "w" ? result.score : -result.score;
}

function setLastMoveMark(mark, detail) {
  const row = moveRows[moveRows.length - 1];
  if (!row) return;
  row.classification = mark;
  row.detail = detail;
  renderMoves();
}

function renderMoves() {
  document.querySelector("#move-count").textContent = `${moveRows.length} plies`;
  if (!moveRows.length) {
    moveListEl.innerHTML = '<div class="empty-state">Make a move to start your review.</div>';
    return;
  }
  moveListEl.innerHTML = "";
  for (let i = 0; i < moveRows.length; i += 2) {
    const row = document.createElement("div");
    row.className = "move-row";
    const number = document.createElement("span");
    number.className = "move-number";
    number.textContent = `${Math.floor(i / 2) + 1}.`;
    row.append(number);
    for (const move of moveRows.slice(i, i + 2)) {
      const cell = document.createElement("div");
      cell.className = "move-cell";
      const san = document.createElement("strong");
      san.textContent = move.san;
      cell.append(san);
      if (move.classification) {
        const [label, className] = labels[move.classification];
        const mark = document.createElement("span");
        mark.className = "move-mark " + className;
        mark.textContent = label;
        mark.title = move.detail || label;
        cell.append(mark);
      } else {
        const pending = document.createElement("span");
        pending.className = "move-pending";
        pending.textContent = "…";
        cell.append(pending);
      }
      row.append(cell);
    }
    moveListEl.append(row);
  }
  moveListEl.scrollTop = moveListEl.scrollHeight;
}

function updateEvaluation(result) {
  const whiteScore = lastWhiteEval / 100;
  const display = Math.max(-9, Math.min(9, whiteScore));
  const whitePercent = 50 + display * 5.3;
  document.querySelector("#eval-white").style.height = whitePercent + "%";
  document.querySelector("#eval-black").style.height = (100 - whitePercent) + "%";
  const label = result.scoreType === "mate" ? "M" + Math.abs(result.score) : (whiteScore > 0 ? "+" : "") + whiteScore.toFixed(1);
  document.querySelector("#eval-label").textContent = label;
  document.querySelector("#eval-summary").textContent = label;
  document.querySelector("#depth-summary").textContent = result.depth || "—";
  document.querySelector("#best-move-text").textContent = bestMoveLabel(result.bestMove);
  renderBoard();
}

function updatePlayerCaptions() {
  const over = chess.isGameOver();
  document.querySelector("#white-caption").textContent = over ? "Game finished" : chess.turn() === "w" ? "To move" : "Waiting";
  document.querySelector("#black-caption").textContent = over ? "Game finished" : chess.turn() === "b" ? "To move" : "Waiting";
}

function setNote(message) {
  document.querySelector("#review-note").textContent = message;
}

async function analyseCurrent() {
  if (!engineAvailable || analysisBusy) return;
  analysisBusy = true;
  setNote("Stockfish is analysing this position…");
  try {
    const result = await engine.analyse(chess.fen(), 12);
    lastWhiteEval = scoreAsWhite(result);
    lastBestMove = result.bestMove;
    updateEvaluation(result);
    document.querySelector("#best-move-text").textContent = bestMoveLabel(result.bestMove);
    renderBoard();
    setNote(`Analysis complete at depth ${result.depth}. Engine is ready for your next move.`);
  } catch (error) {
    setNote(error.message || "Could not analyse this position.");
  } finally {
    analysisBusy = false;
  }
}

function resetGame() {
  engine.stop();
  chess.reset();
  selected = null;
  legalTargets = [];
  moveRows = [];
  lastWhiteEval = 0;
  lastBestMove = null;
  pgnMode = false;
  renderBoard();
  renderMoves();
  updatePlayerCaptions();
  document.querySelector("#eval-white").style.height = "50%";
  document.querySelector("#eval-black").style.height = "50%";
  document.querySelector("#eval-label").textContent = "0.0";
  document.querySelector("#eval-summary").textContent = "0.0";
  document.querySelector("#depth-summary").textContent = "—";
  document.querySelector("#best-move-text").textContent = "Waiting for analysis";
  setNote("New game. Stockfish will check each move as you play.");
  analyseCurrent();
}

async function importPgn() {
  const pgn = document.querySelector("#pgn-input").value.trim();
  if (!pgn) {
    document.querySelector("#import-status").textContent = "Paste a PGN first.";
    return;
  }
  try {
    const imported = new Chess();
    imported.loadPgn(pgn);
    chess.loadPgn(pgn);
    moveRows = imported.history({ verbose: true }).map(move => ({
      san: move.san,
      color: move.color,
      classification: null,
      detail: "Imported move — run analysis to classify."
    }));
    selected = null;
    legalTargets = [];
    pgnMode = true;
    renderBoard();
    renderMoves();
    updatePlayerCaptions();
    document.querySelector("#import-status").textContent = "PGN loaded. Analysing final position…";
    lastWhiteEval = 0;
    lastBestMove = null;
    await analyseCurrent();
    document.querySelector("#import-status").textContent = "PGN loaded. Select a move in a future review update to inspect it.";
  } catch (error) {
    document.querySelector("#import-status").textContent = "Invalid PGN: " + error.message;
  }
}

document.querySelector("#flip-board").addEventListener("click", () => {
  flipped = !flipped;
  renderBoard();
});
document.querySelector("#new-game").addEventListener("click", resetGame);
document.querySelector("#undo").addEventListener("click", () => {
  if (analysisBusy) return;
  chess.undo();
  moveRows.pop();
  lastWhiteEval = 0;
  lastBestMove = null;
  renderBoard();
  renderMoves();
  updatePlayerCaptions();
  analyseCurrent();
});
document.querySelector("#analyse").addEventListener("click", analyseCurrent);
document.querySelector("#import-pgn").addEventListener("click", importPgn);

renderBoard();
renderMoves();
updatePlayerCaptions();
setNote("Starting Stockfish. The engine loads only when the page opens.");
engine.start().then(() => {
  statusEl.innerHTML = "<i></i> Stockfish ready";
  setNote("Stockfish is ready. Make a move or import a PGN.");
  analyseCurrent();
}).catch((error) => {
  engineAvailable = false;
  statusEl.innerHTML = "<i class='status-error'></i> Engine unavailable";
  setNote("Could not load Stockfish. Check your connection and reload. " + error.message);
  document.querySelector("#best-move-text").textContent = "Engine unavailable";
});