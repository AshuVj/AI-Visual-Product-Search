// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';

  return {
    plugins: [react()],
    server: isDevelopment
      ? {
          proxy: {
            '/api': {
              target: 'http://127.0.0.1:5000', // Your Flask backend
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          },
        }
      : {}, // No proxy in production
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
