import path from "path";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:9999/.netlify/functions',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});