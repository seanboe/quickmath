import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // Relative base so the build works under a GitHub Pages project subpath
  // (https://<user>.github.io/<repo>/) without hardcoding the repo name.
  base: "./",
  resolve: {
    alias: {
      "@ls": fileURLToPath(new URL("./src/editor/latex-suite", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
