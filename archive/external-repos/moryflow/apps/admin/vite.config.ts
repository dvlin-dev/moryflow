import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 代理 API 请求，避免跨站 Cookie 问题
      // 使用 API_TARGET 环境变量指定后端地址
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/v1': {
        target: process.env.API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: process.env.API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
