import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@moryflow/channels-core': resolve(__dirname, '../channels-core/src/index.ts'),
    },
  },
});
