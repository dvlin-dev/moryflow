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
  build: {
    rollupOptions: {
      output: {
        /**
         * 降低 `main` chunk 体积告警：把大依赖拆到更稳定的 vendor chunks，提高缓存命中。
         *
         * 注意：TanStack Start 会在一次 `vite build` 内执行 client + SSR 两次构建；
         * SSR build 中部分依赖会被 external；对应依赖见下方 `ssr.noExternal`。
         */
        manualChunks: {
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
        },
      },
    },
  },
  ssr: {
    /**
     * 保证 SSR build 中这些依赖不被 external，否则 Rollup 会拒绝把 external 依赖放入 manualChunks。
     * 这里只列出手动拆分的 vendor 入口依赖，避免扩大 SSR bundle 范围。
     */
    noExternal: [
      'react',
      'react-dom',
      '@tanstack/react-router',
      '@tanstack/router-core',
      '@tanstack/react-query',
      '@tanstack/query-core',
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
      'framer-motion',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      '@hugeicons/core-free-icons',
    ],
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
