import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@ls": fileURLToPath(new URL("./src/editor/latex-suite", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
