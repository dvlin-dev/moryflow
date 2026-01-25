import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, 'test/react-native-mock.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/__tests__/**/*.spec.ts'],
  },
});
