import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths({
      ignoreConfigErrors: true,
      skip: (dir) => dir.includes('archive/external-repos'),
    }),
    tailwindcss(),
    tanstackStart({
      // 禁用预渲染（SSR 会在运行时渲染）
      prerender: {
        enabled: false,
      },
      sitemap: {
        enabled: true,
        host: 'https://aiget.dev',
      },
    }),
    nitro(),
    viteReact(),
  ],
  server: {
    port: 3001,
  },
});
