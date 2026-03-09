import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'src/**/__tests__/**/*.spec.ts',
      'src/**/__tests__/**/*.spec.tsx',
      'server/**/__tests__/**/*.spec.ts',
    ],
  },
});
