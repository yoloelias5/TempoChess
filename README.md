# TempoChess Analysis

A lightweight, browser-based chess analysis project. The goal is a fast, mobile- and console-browser-friendly alternative for reviewing games without accounts or a backend.

## Current features

- Interactive legal chessboard powered by `chess.js`
- Local Stockfish WebAssembly engine (loaded on demand)
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

The development and production scripts download the Stockfish 16 single-threaded browser assets into `public/engine/`. The engine files are generated locally/inside CI and are not committed to the repository.

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
- The engine is deliberately single-threaded and starts at a modest depth to reduce CPU and memory use on older devices.
- Move labels are estimates from engine evaluation, not official Chess.com classifications. The initial PGN importer loads the game and analyses the final position; full move-by-move PGN review is planned.
- Stockfish is distributed under the GNU General Public License (GPL). See the upstream Stockfish project for its license and source.
