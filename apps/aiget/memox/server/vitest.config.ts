/**
 * Vitest 配置文件
 * 支持单元测试、集成测试、E2E 测试，排除渲染测试（CI only）
 */
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    exclude: ['**/*.render.spec.ts'], // 渲染测试默认排除，仅 CI 运行
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.constants.ts',
        'src/**/*.types.ts',
        'generated/**',
      ],
      thresholds: {
        // 核心模块 ≥80%
        'src/screenshot/**': { statements: 80, branches: 80 },
        'src/quota/**': { statements: 80, branches: 80 },
        // 其他模块 ≥60%
        global: { statements: 60, branches: 60 },
      },
    },
    // 测试隔离：集成测试需要共享容器（Vitest 4.x）
    pool: 'forks',
    isolate: false,
  },
});
