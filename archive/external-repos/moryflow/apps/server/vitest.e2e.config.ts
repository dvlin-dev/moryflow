import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    exclude: ['**/node_modules/**', '**/.git/**'],
    setupFiles: ['./test/vitest.setup.ts'],
    testTimeout: 30000,
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
