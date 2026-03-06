import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'react-native',
        replacement: path.resolve(__dirname, 'test/react-native-mock.ts'),
      },
      {
        find: /^@moryflow\/agents-runtime\/(.*)$/,
        replacement: path.resolve(__dirname, '../../../packages/agents-runtime/src/$1'),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['lib/**/__tests__/**/*.spec.ts'],
  },
});
