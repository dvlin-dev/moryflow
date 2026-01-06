/**
 * Vite 配置 - 编辑器 Bundle
 * 用于打包独立的编辑器 Web 应用，供 React Native WebView 加载
 */

import { defineConfig } from "vite"
import { resolve } from "node:path"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  root: resolve(__dirname, "src/editor-bundle"),
  base: "./",
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
      sass: {
        api: "modern-compiler",
      },
    },
  },
  plugins: [
    // 将所有资源内联到单个 HTML 文件
    viteSingleFile(),
  ],
  build: {
    outDir: resolve(__dirname, "assets/editor-bundle"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/editor-bundle/index.html"),
    },
    // 内联所有 CSS
    cssCodeSplit: false,
    // 压缩
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false, // 保留 console 用于调试
        drop_debugger: true,
      },
    },
    // 资源内联阈值（设置很大以内联所有资源）
    assetsInlineLimit: 10 * 1024 * 1024, // 10MB
  },
  // 开发服务器配置（用于调试）
  server: {
    port: 5174,
    open: true,
  },
})
