/**
 * 测试全局配置
 * 在所有测试运行前执行
 */

import { vi } from 'vitest';

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-unit-tests-32chars';
process.env.BETTER_AUTH_URL = 'http://localhost:3001/api/auth';
process.env.IDENTITY_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5433/aiget_test?schema=identity';

// 全局 mock
vi.mock('@aiget/identity-db', async () => {
  const actual = await vi.importActual('@aiget/identity-db');
  return {
    ...actual,
    // 保留类型导出
  };
});
