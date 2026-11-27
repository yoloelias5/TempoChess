import { mkdir, writeFile } from "node:fs/promises";

const version = "19.0.1";
const base = `https://cdn.jsdelivr.net/npm/stockfish@${version}/bin`;
const files = ["stockfish-19-lite-single.js", "stockfish-19-lite-single.wasm"];
const licenseUrl = `https://cdn.jsdelivr.net/npm/stockfish@${version}/Copying.txt`;

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

const license = await fetch(licenseUrl);
if (license.ok) {
  await writeFile("public/engine/Copying.txt", await license.arrayBuffer());
  console.log("Downloaded Stockfish GPL license.");
}