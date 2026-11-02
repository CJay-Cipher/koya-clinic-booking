import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: "web",
  // Vite looks for .env in `root` by default (web/) -- but our .env lives
  // in the project root alongside package.json, so point it there.
  envDir: __dirname,
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/slots": "http://localhost:3333",
      "/bookings": "http://localhost:3333",
      "/reset": "http://localhost:3333",
    },
  },
});
