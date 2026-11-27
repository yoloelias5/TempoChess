const BASE = import.meta.env.BASE_URL;

export class StockfishEngine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.pending = null;
    this.lastInfo = null;
    this.starting = null;
  }

  async start() {
    if (this.ready) return;
    if (this.starting) return this.starting;

    this.starting = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(`${BASE}engine/stockfish-19-lite-single.js`);
      } catch (error) {
        reject(error);
        return;
      }

      const timeout = setTimeout(() => reject(new Error("Stockfish took too long to start.")), 20000);
      this.worker.onmessage = (event) => {
        const line = String(event.data ?? "");
        if (line === "uciok") this.worker.postMessage("isready");
        if (line === "readyok") {
          clearTimeout(timeout);
          this.ready = true;
          resolve();
        }
        if (line.startsWith("info ")) this.readInfo(line);
        if (line.startsWith("bestmove ")) {
          const result = this.pending;
          this.pending = null;
          if (result) result.resolve({ ...this.lastInfo, bestMove: line.split(/\s+/)[1] });
        }
      };
      this.worker.onerror = (event) => {
        clearTimeout(timeout);
        reject(new Error(event.message || "Stockfish worker failed to load."));
      };
      this.worker.postMessage("uci");
    }).catch((error) => {
      this.starting = null;
      throw error;
    });

    return this.starting;
  }

  readInfo(line) {
    const score = line.match(/score (cp|mate) (-?\d+)/);
    const depth = line.match(/depth (\d+)/);
    if (!score) return;
    this.lastInfo = {
      scoreType: score[1],
      score: Number(score[2]),
      depth: depth ? Number(depth[1]) : 0
    };
  }

  async analyse(fen, moveTimeMs = 2000) {
    await this.start();
    if (this.pending) {
      this.worker.postMessage("stop");
      this.pending.resolve({ scoreType: "cp", score: 0, depth: 0, bestMove: null });
      this.pending = null;
    }
    this.lastInfo = null;
    return new Promise((resolve) => {
      this.pending = { resolve };
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go movetime ${Math.max(100, Math.min(30000, Number(moveTimeMs) || 2000))}`);
    });
  }

  stop() {
    if (this.worker && this.pending) {
      this.worker.postMessage("stop");
      this.pending = null;
    }
  }

  terminate() {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.starting = null;
  }
}