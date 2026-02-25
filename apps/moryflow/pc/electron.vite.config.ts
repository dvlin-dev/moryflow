import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { visualizer } from 'rollup-plugin-visualizer';

const copyBuiltinSkillsPlugin = () => ({
  name: 'copy-builtin-skills',
  closeBundle() {
    const sourceDir = resolve(__dirname, 'src/main/skills/builtin');
    if (!existsSync(sourceDir)) {
      return;
    }

    const targetDir = resolve(__dirname, 'dist/main/builtin');
    rmSync(targetDir, { recursive: true, force: true });
    cpSync(sourceDir, targetDir, { recursive: true });
  },
});

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyBuiltinSkillsPlugin()],
    build: {
      outDir: 'dist/main',
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
        },
      },
    },
  },
  renderer: {
    plugins: [
      react(),
      // 生成 bundle 分析报告（仅开发时使用）
      ...(process.env.ANALYZE
        ? [
            visualizer({
              filename: 'dist/stats.html',
              open: true,
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],
    resolve: {
      alias: [
        { find: '@pc', replacement: resolve(__dirname, 'src/renderer') },
        { find: '@', replacement: resolve(__dirname, 'src/renderer') },
        { find: '@shared', replacement: resolve(__dirname, 'src/shared') },
        {
          find: '@moryflow/ui/styles',
          replacement: resolve(__dirname, '../../../packages/ui/styles/index.css'),
        },
        {
          find: /^@moryflow\/ui\/styles\/(.*)$/,
          replacement: resolve(__dirname, '../../../packages/ui/styles/$1'),
        },
        {
          find: /^@moryflow\/ui\/(.*)$/,
          replacement: resolve(__dirname, '../../../packages/ui/src/$1'),
        },
        // styles 目录在包根目录，需单独处理
        {
          find: /^@moryflow\/tiptap\/styles\/(.*)$/,
          replacement: resolve(__dirname, '../../../packages/tiptap/styles/$1'),
        },
        {
          find: /^@moryflow\/tiptap\/(.*)$/,
          replacement: resolve(__dirname, '../../../packages/tiptap/src/$1'),
        },
        { find: '@moryflow/ui', replacement: resolve(__dirname, '../../../packages/ui/src') },
        {
          find: '@moryflow/tiptap',
          replacement: resolve(__dirname, '../../../packages/tiptap/src'),
        },
      ],
      dedupe: ['react', 'react-dom'],
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
        sass: {
          api: 'modern-compiler',
        },
      },
    },
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Mermaid 图表库（~3 MB）- 只有渲染 mermaid 代码块时才加载
            if (id.includes('/mermaid/')) {
              return 'mermaid';
            }
            // Cytoscape 图形库（~1.5 MB）- mermaid 的依赖
            if (id.includes('/cytoscape')) {
              return 'cytoscape';
            }
            // Shiki 代码高亮（~1 MB 核心）
            if (id.includes('/shiki/')) {
              return 'shiki';
            }
            // KaTeX 数学公式（~300 kB）- 聊天和编辑器公式渲染
            if (id.includes('/katex/')) {
              return 'katex';
            }
            // floating-ui（~770 kB）- tooltip 定位
            if (id.includes('@floating-ui')) {
              return 'floating-ui';
            }
            // Radix UI 组件库
            if (id.includes('@radix-ui')) {
              return 'radix-ui';
            }
            // Emoji 选择器（~400 kB）
            if (id.includes('@emoji-mart') || id.includes('emoji-mart')) {
              return 'emoji-mart';
            }
            // ProseMirror 核心（~200 kB）- TipTap 编辑器基础
            if (id.includes('prosemirror-')) {
              return 'prosemirror';
            }
          },
        },
      },
    },
  },
});
