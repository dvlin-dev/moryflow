import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@moryflow/ui/ai': path.resolve(__dirname, '../../../packages/ui/src/ai'),
      '@moryflow/agents-runtime': path.resolve(__dirname, '../../../packages/agents-runtime/src'),
      '@moryflow/i18n': path.resolve(__dirname, '../../../packages/i18n/src'),
    },
    dedupe: ['react', 'react-dom'],
  },
});
