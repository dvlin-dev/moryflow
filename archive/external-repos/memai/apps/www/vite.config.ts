import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: false, // 运行时 SSR
      },
      sitemap: {
        enabled: true,
        host: 'https://memai.dev',
      },
    }),
    nitro(),
    viteReact(),
  ],
  server: {
    port: 3001,
  },
})
