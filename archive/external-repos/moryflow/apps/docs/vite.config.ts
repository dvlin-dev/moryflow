import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import contentCollections from '@content-collections/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    // Content collections (MDX processing)
    contentCollections(),
    // TypeScript path resolution
    tsconfigPaths(),
    // TanStack Start SSR configuration
    tanstackStart({
      // Disable prerendering - use SSR for Server Functions support
      prerender: {
        enabled: false,
      },
      sitemap: {
        enabled: true,
        host: 'https://docs.moryflow.com',
      },
    }),
    // Nitro server output
    nitro({
      // Don't bundle these modules, use from node_modules at runtime
      noExternals: false,
      rollupConfig: {
        external: [
          // React must be external to avoid bundling issues with React 19
          'react',
          'react-dom',
          'react-dom/server',
          'react/jsx-runtime',
          'react/jsx-dev-runtime',
          // fumadocs-core i18n middleware depends on Next.js
          'fumadocs-core/i18n/middleware',
          'next/server',
        ],
      },
    }),
    // React support
    viteReact(),
  ],
})
