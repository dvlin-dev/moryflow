import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';

const rootDir = resolve(__dirname, '../../..');

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    deps: {
      inline: ['react-i18next'],
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': resolve(__dirname, './src/renderer'),
      '@shared': resolve(__dirname, './src/shared'),
      react: resolve(rootDir, 'node_modules/react'),
      'react-dom': resolve(rootDir, 'node_modules/react-dom'),
    },
  },
});
