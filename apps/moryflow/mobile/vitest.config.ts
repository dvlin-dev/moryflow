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
        find: /^@\//,
        replacement: `${path.resolve(__dirname)}/`,
      },
      {
        find: /^react$/,
        replacement: path.resolve(__dirname, '../../../node_modules/react'),
      },
      {
        find: /^react\/(.*)$/,
        replacement: path.resolve(__dirname, '../../../node_modules/react/$1'),
      },
      {
        find: /^react-dom$/,
        replacement: path.resolve(__dirname, '../../../node_modules/react-dom'),
      },
      {
        find: /^react-dom\/(.*)$/,
        replacement: path.resolve(__dirname, '../../../node_modules/react-dom/$1'),
      },
      {
        find: /^@moryflow\/agents-tools$/,
        replacement: path.resolve(__dirname, '../../../packages/agents-tools/src/index.react-native.ts'),
      },
      {
        find: /^@moryflow\/agents-runtime$/,
        replacement: path.resolve(__dirname, '../../../packages/agents-runtime/src/index.ts'),
      },
      {
        find: /^@moryflow\/agents-runtime\/(.*)$/,
        replacement: path.resolve(__dirname, '../../../packages/agents-runtime/src/$1'),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.spec.ts'],
  },
});
