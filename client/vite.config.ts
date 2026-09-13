import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@shared': path.resolve(__dirname, '../shared'),
      // shared/ imports these; resolve from client node_modules
      qrcode: path.resolve(__dirname, 'node_modules/qrcode'),
      nanoid: path.resolve(__dirname, 'node_modules/nanoid'),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  build: {
    rollupOptions: {
      external: ['puppeteer', '@puppeteer/browsers', 'ws', 'bufferutil']
    }
  },
  optimizeDeps: {
    exclude: ['@puppeteer/browsers', 'puppeteer', 'ws', 'bufferutil']
  }
});