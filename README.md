# TempoChess Analysis

A lightweight, browser-based chess analysis project. The goal is a fast, mobile- and console-browser-friendly alternative for reviewing games without accounts or a backend.

## Current features

- Interactive legal chessboard powered by `chess.js`
- Stockfish 19 Lite single-threaded WebAssembly engine (loaded on demand)
- Move classifications based on estimated centipawn loss
- Evaluation bar and best-move display
- PGN import
- Responsive, low-dependency interface
- GitHub Pages deployment workflow

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

The development and production scripts download the Stockfish 19 Lite single-threaded browser assets into `public/engine/`. The engine files are generated locally/inside CI and are not committed to the repository.

## Build

```bash
npm run build
npm run preview
```

## GitHub Pages

In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The workflow in `.github/workflows/pages.yml` builds and deploys the site.

The repository is private. GitHub Pages availability for private repositories depends on the account/organization plan and repository settings. If Pages cannot publish a private repository on the current plan, make the repository public or use another free static host.

## Notes

- Stockfish analysis is performed in the visitor's browser; no application server is needed.
- The Lite single-threaded engine is approximately 1.7 MB and does not require cross-origin isolation, making it a better fit for lower-powered browsers than the full engine.
- Move labels are estimates from engine evaluation, not official Chess.com classifications. The initial PGN importer loads the game and analyses the final position; full move-by-move PGN review is planned.
- Stockfish is distributed under GPL-3.0. The engine's license is included with its downloaded assets in `public/engine/Copying.txt`.
