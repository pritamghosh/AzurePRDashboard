import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // During local development, proxy all /api calls to the Spring Boot backend.
    // This avoids CORS issues when React dev server runs on 5173 and Spring on 8080.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Output to 'dist' — Maven copies this into src/main/resources/static
    outDir: 'dist',
    emptyOutDir: true,
  },
});

