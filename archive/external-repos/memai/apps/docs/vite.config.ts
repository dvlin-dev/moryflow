import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import contentCollections from '@content-collections/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    contentCollections(),
    tsconfigPaths(),
    tanstackStart({
      prerender: {
        enabled: false, // 使用运行时 SSR
      },
      sitemap: {
        enabled: true,
        host: 'https://docs.memai.dev',
      },
    }),
    nitro({
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
    viteReact(),
    tailwindcss(),
  ],
})
