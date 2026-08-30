import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'handle-username-routing',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url) {
              const isUsernameRoute = /^\/@[a-zA-Z0-9_.-]+$/.test(req.url) && 
                                      !req.url.startsWith('/@react-refresh') && 
                                      !req.url.startsWith('/@vite');
              if (isUsernameRoute) {
                req.url = '/index.html';
              }
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
