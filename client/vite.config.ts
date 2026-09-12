import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const SERVER = 'http://localhost:5174';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxying keeps assets same-origin with the app, which is what stops the
    // Konva canvas from being tainted at export time.
    proxy: {
      '/api': { target: SERVER, changeOrigin: true },
      '/assets': { target: SERVER, changeOrigin: true },
    },
  },
});
