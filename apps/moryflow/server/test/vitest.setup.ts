/**
 * [PROVIDES]: Moryflow Server E2E 测试环境变量默认值
 * [DEPENDS]: dotenv config, process.env
 * [POS]: vitest.e2e.config.ts 的全局 setup
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { config } from 'dotenv';
import { resolve } from 'path';

const ensureEnv = (key: string, value: string) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
};

// 加载 .env 文件
config({ path: resolve(__dirname, '../.env') });

// 仅用于测试默认值，避免缺失配置导致启动失败
ensureEnv('BETTER_AUTH_SECRET', 'test-secret-key-min-32-chars-123456');
ensureEnv('VECTORIZE_API_URL', 'http://localhost:8787');
