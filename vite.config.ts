import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://<user>.github.io/taiwan-weather-live/ on GitHub Pages.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/taiwan-weather-live/",
  plugins: [react()],
  // MapLibre lives in its own lazily loaded 圖資 chunk.
  build: { chunkSizeWarningLimit: 1200 },
});
