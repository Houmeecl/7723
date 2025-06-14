import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@shared': path.resolve(__dirname, '../shared'),
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