import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Consumir el paquete compartido desde su fuente TypeScript: esbuild lo
      // trata como ESM (named exports reales) y evita el problema de interop
      // de Rollup con los enums compilados a CommonJS.
      '@agrogood/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    // Proxy hacia la API para compartir origen y que la cookie de refresh
    // (HttpOnly, SameSite=Strict) viaje sin fricción en desarrollo.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // WebSocket de tiempo real (socket.io) por el mismo origen.
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
