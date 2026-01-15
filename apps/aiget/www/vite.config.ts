import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const VENDOR_CHUNKS: Record<string, string[]> = {
  'vendor-react': ['react', 'react-dom'],
  'vendor-tanstack': [
    '@tanstack/react-router',
    '@tanstack/router-core',
    '@tanstack/react-query',
    '@tanstack/query-core',
  ],
  'vendor-radix': [
    '@radix-ui/react-accordion',
    '@radix-ui/react-context-menu',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-menubar',
    '@radix-ui/react-menu',
    '@radix-ui/react-navigation-menu',
    '@radix-ui/react-popper',
    '@radix-ui/react-popover',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-select',
    '@radix-ui/react-slider',
    '@radix-ui/react-tooltip',
  ],
  'vendor-ui': ['framer-motion', 'react-hook-form', '@hookform/resolvers', 'zod'],
  'vendor-icons': ['@hugeicons/core-free-icons'],
};

const SSR_NO_EXTERNAL = Array.from(new Set(Object.values(VENDOR_CHUNKS).flat()));

function manualChunks(id: string) {
  if (!id.includes('node_modules')) return undefined;

  const normalized = id.replaceAll('\\', '/');
  for (const [chunkName, packages] of Object.entries(VENDOR_CHUNKS)) {
    for (const pkg of packages) {
      if (normalized.includes(`/node_modules/${pkg}/`)) return chunkName;
    }
  }

  return undefined;
}

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
  build: {
    rollupOptions: {
      output: {
        /**
         * 降低 `main` chunk 体积告警：把大依赖拆到更稳定的 vendor chunks，提高缓存命中。
         *
         * 注意：TanStack Start 会在一次 `vite build` 内执行 client + SSR 两次构建；
         * SSR build 中部分依赖可能被 external，所以不能使用「对象形式」强行把包塞进 chunk。
         * 这里使用基于 `id` 的函数形式，让 SSR external 的模块自然跳过。
         */
        manualChunks,
      },
    },
  },
  ssr: {
    /**
     * SSR build 若需要 bundling 特定依赖（CJS/转译等），再把依赖加入这里。
     */
    noExternal: SSR_NO_EXTERNAL,
  },
  server: {
    port: 3001,
    proxy: {
      // 代理 API 请求到后端（本地开发）
      '/api/': {
        target: process.env.API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
