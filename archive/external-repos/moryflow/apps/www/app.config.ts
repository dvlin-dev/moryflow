import { defineConfig } from '@tanstack/react-start/config'

export default defineConfig({
  server: {
    preset: 'node-server',
  },
  routers: {
    ssr: {
      // Disable prerendering, force all pages to use SSR
      prerender: {
        enabled: false,
      },
    },
  },
})
