import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The API runs on 5000 by default. A second local API on another port can be
// reached by exporting VITE_PROXY_TARGET when the dev server starts.
const proxyTarget = process.env.VITE_PROXY_TARGET || "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    // The face detector and its TensorFlow runtime are one lazy chunk that only
    // the camera dialog downloads, so the 500 kB notice would always fire.
    chunkSizeWarningLimit: 1400,
  },

  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
