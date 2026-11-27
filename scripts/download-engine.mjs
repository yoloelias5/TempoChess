import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(fileURLToPath(import.meta.resolve("stockfish")));
const files = ["stockfish-19-lite-single.js", "stockfish-19-lite-single.wasm"];

await mkdir("public/engine", { recursive: true });

for (const file of files) {
  const source = join(packageRoot, "bin", file);
  const destination = join("public/engine", file);
  await copyFile(source, destination);
  console.log(`Copied ${file} from Stockfish npm package.`);
}

await copyFile(join(packageRoot, "Copying.txt"), "public/engine/Copying.txt");
console.log("Copied Stockfish GPL license.");