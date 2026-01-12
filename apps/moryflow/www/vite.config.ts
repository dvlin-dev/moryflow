import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';

export default defineConfig({
  plugins: [
    tanstackStart({
      prerender: {
        enabled: false,
      },
      sitemap: {
        enabled: true,
        host: 'https://moryflow.com',
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
    noExternal: ['@aiget/ui'],
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
