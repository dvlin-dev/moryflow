import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: [
      {
        find: '@moryflow/agents-runtime',
        replacement: resolve(__dirname, '../agents-runtime/src/index.ts'),
      },
    ],
  },
});
