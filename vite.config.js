import { defineConfig } from "vite";

export default defineConfig({
  base: "/TempoChess/",
  build: {
    target: "es2020",
    sourcemap: false
  }
});