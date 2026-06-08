import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['tesseract.js'],
  },
  server: {
    // Dev: forward /api to the local FastAPI backend (uvicorn on :8001).
    proxy: {
      '/api': 'http://localhost:8001',
    },
  },
});
