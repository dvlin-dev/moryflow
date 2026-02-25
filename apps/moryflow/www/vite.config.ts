import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';

export default defineConfig({
  nitro: {
    /**
     * 生产构建必须允许 external：避免 Nitro 产物在不同 SSR chunks 中重复实例化 React，导致 hooks dispatcher 异常。
     */
    noExternals: false,
  },
  plugins: [
    tanstackStart({
      prerender: {
        enabled: false,
      },
      sitemap: {
        enabled: true,
        host: 'https://www.moryflow.com',
      },
    }),
    nitro(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  ssr: {
    noExternal: ['@moryflow/ui'],
  },
  build: {
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Minification option
    minify: 'esbuild',
    // Chunk size warning threshold (500KB)
    chunkSizeWarningLimit: 500,
  },
});
