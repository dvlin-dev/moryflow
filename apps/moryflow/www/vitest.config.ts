import path from 'node:path';
import { defineConfig } from 'vitest/config';
import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';

export default defineConfig({
  plugins: [mdx({ remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter] })],
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
