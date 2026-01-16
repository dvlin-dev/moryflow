/**
 * Vitest 全局 setup
 * 环境变量配置、超时设置
 */
import { vi, afterEach } from 'vitest';

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // 减少测试输出噪音

// 超时配置
vi.setConfig({
  testTimeout: 30000,
  hookTimeout: 30000,
});

afterEach(() => {
  vi.clearAllMocks();
});
