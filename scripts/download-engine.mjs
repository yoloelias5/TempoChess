import { mkdir, writeFile } from "node:fs/promises";

const version = "16.0.0";
const base = `https://cdn.jsdelivr.net/npm/stockfish@${version}/src`;
const files = ["stockfish.js", "stockfish.wasm"];

await mkdir("public/engine", { recursive: true });

for (const file of files) {
  const response = await fetch(`${base}/${file}`);
  if (!response.ok) {
    throw new Error(`Could not download Stockfish asset ${file}: HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  await writeFile(`public/engine/${file}`, bytes);
  console.log(`Downloaded ${file} (${bytes.byteLength} bytes)`);
}