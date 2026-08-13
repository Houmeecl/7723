
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const rootDir = process.cwd();

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "client", "src"),
      "@shared": path.resolve(rootDir, "shared"),
    },
  },
  root: path.resolve(rootDir, "client"),
  build: {
    outDir: path.resolve(rootDir, "dist/public"),
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
});
