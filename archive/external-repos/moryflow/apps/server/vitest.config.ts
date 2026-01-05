import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/.git/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.module.ts', 'src/main.ts'],
    },
    setupFiles: ['./test/vitest.setup.ts'],
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
