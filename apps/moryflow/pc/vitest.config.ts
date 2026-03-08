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
    alias: [
      { find: '@', replacement: resolve(__dirname, './src/renderer') },
      { find: '@shared', replacement: resolve(__dirname, './src/shared') },
      {
        find: /^@moryflow\/ui\/(.*)$/,
        replacement: resolve(__dirname, '../../../packages/ui/src/$1'),
      },
      {
        find: /^@moryflow\/tiptap\/(.*)$/,
        replacement: resolve(__dirname, '../../../packages/tiptap/src/$1'),
      },
      {
        find: /^@moryflow\/agents-runtime\/(.*)$/,
        replacement: resolve(__dirname, '../../../packages/agents-runtime/src/$1'),
      },
      {
        find: /^@moryflow\/agents-adapter\/(.*)$/,
        replacement: resolve(__dirname, '../../../packages/agents-adapter/src/$1'),
      },
      {
        find: /^@moryflow\/agents-tools\/(.*)$/,
        replacement: resolve(__dirname, '../../../packages/agents-tools/src/$1'),
      },
      {
        find: /^@moryflow\/agents-mcp\/(.*)$/,
        replacement: resolve(__dirname, '../../../packages/agents-mcp/src/$1'),
      },
      {
        find: /^@moryflow\/agents-sandbox\/(.*)$/,
        replacement: resolve(__dirname, '../../../packages/agents-sandbox/src/$1'),
      },
      {
        find: /^@moryflow\/channels-core\/(.*)$/,
        replacement: resolve(__dirname, '../../../packages/channels-core/src/$1'),
      },
      {
        find: /^@moryflow\/channels-telegram\/(.*)$/,
        replacement: resolve(__dirname, '../../../packages/channels-telegram/src/$1'),
      },
      { find: '@moryflow/ui', replacement: resolve(__dirname, '../../../packages/ui/src') },
      {
        find: '@moryflow/tiptap',
        replacement: resolve(__dirname, '../../../packages/tiptap/src'),
      },
      {
        find: '@moryflow/agents-adapter',
        replacement: resolve(__dirname, '../../../packages/agents-adapter/src/index.ts'),
      },
      {
        find: '@moryflow/agents-runtime',
        replacement: resolve(__dirname, '../../../packages/agents-runtime/src'),
      },
      {
        find: '@moryflow/agents-tools',
        replacement: resolve(__dirname, '../../../packages/agents-tools/src/index.ts'),
      },
      {
        find: '@moryflow/agents-mcp',
        replacement: resolve(__dirname, '../../../packages/agents-mcp/src/index.ts'),
      },
      {
        find: '@moryflow/agents-sandbox',
        replacement: resolve(__dirname, '../../../packages/agents-sandbox/src/index.ts'),
      },
      {
        find: '@moryflow/channels-core',
        replacement: resolve(__dirname, '../../../packages/channels-core/src/index.ts'),
      },
      {
        find: '@moryflow/channels-telegram',
        replacement: resolve(__dirname, '../../../packages/channels-telegram/src/index.ts'),
      },
      { find: 'react', replacement: resolve(rootDir, 'node_modules/react') },
      { find: 'react-dom', replacement: resolve(rootDir, 'node_modules/react-dom') },
    ],
  },
});
