import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getOptionalReplitPlugins() {
  if (process.env.NODE_ENV === "production" || !process.env.REPL_ID) {
    return [];
  }

  try {
    const runtimeErrorOverlay = (
      await import("@replit/vite-plugin-runtime-error-modal")
    ).default;
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    return [runtimeErrorOverlay(), cartographer()];
  } catch {
    console.warn("Replit Vite plugins not installed; continuing without them.");
    return [];
  }
}

export default defineConfig(async () => ({
  plugins: [react(), ...(await getOptionalReplitPlugins())],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      qrcode: path.resolve(__dirname, "client/node_modules/qrcode"),
      nanoid: path.resolve(__dirname, "client/node_modules/nanoid"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      external: ["puppeteer", "ws", "bufferutil"],
    },
  },
  optimizeDeps: {
    exclude: ["@puppeteer/browsers", "puppeteer", "ws", "bufferutil"],
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname)],
      strict: false,
    },
  },
}));
