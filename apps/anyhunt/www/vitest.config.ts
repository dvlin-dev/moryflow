import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@moryflow/api/client': path.resolve(__dirname, '../../../packages/api/src/client/index.ts'),
      '@moryflow/types': path.resolve(__dirname, '../../../packages/types/src/index.ts'),
      '@moryflow/types/common': path.resolve(__dirname, '../../../packages/types/src/common/index.ts'),
    },
  },
});
