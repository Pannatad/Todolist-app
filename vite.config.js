import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleAIRequest } from './server/aiGateway.js';

const aiProxyPlugin = (env) => ({
  name: 'local-ai-proxy',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      try {
        if (!await handleAIRequest(env, req, res)) next();
      } catch (error) {
        next(error);
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), aiProxyPlugin(env)],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('pdfjs-dist')) return 'pdfjs';
            return 'vendor-misc';
          },
        },
      },
    },
    server: {
      // The production LAN server has token protection. Keep Vite loopback-only
      // unless an unauthenticated development LAN session is explicitly enabled.
      host: env.APP_DEV_LAN_ACCESS === 'true' ? '0.0.0.0' : '127.0.0.1',
    },
  };
});
