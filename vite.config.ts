
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Dynamically import Replit plugins only when available
const getReplitPlugins = async () => {
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    try {
      const runtimeErrorOverlay = await import("@replit/vite-plugin-runtime-error-modal").then(m => m.default);
      const cartographer = await import("@replit/vite-plugin-cartographer").then(m => m.cartographer());
      return [runtimeErrorOverlay(), cartographer];
    } catch (e) {
      console.warn("Replit plugins not available, skipping...");
      return [];
    }
  }
  return [];
};

export default defineConfig(async () => ({
  plugins: [
    react(),
    ...await getReplitPlugins(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      external: ["puppeteer", "ws", "bufferutil"]
    }
  },
  optimizeDeps: {
    exclude: ['@puppeteer/browsers', 'puppeteer', 'ws', 'bufferutil']
  },
  server: {
    fs: {
      strict: false
    }
  }
}));
