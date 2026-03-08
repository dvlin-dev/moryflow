/**
 * [PROVIDES]: Moryflow Server E2E 测试环境变量默认值
 * [DEPENDS]: dotenv config, process.env
 * [POS]: vitest.e2e.config.ts 的全局 setup
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const ensureEnv = (key: string, value: string) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
};

const envCandidates = [
  process.env.MORYFLOW_SERVER_E2E_ENV_FILE,
  resolve(__dirname, '../.env'),
].filter((value): value is string => Boolean(value));

const envPath = envCandidates.find((candidate) => existsSync(candidate));
if (envPath) {
  config({ path: envPath });
}

// 仅用于测试默认值，避免缺失配置导致启动失败
ensureEnv('BETTER_AUTH_SECRET', 'test-secret-key-min-32-chars-123456');
ensureEnv('SYNC_ACTION_SECRET', 'test-sync-secret');
ensureEnv('ANYHUNT_API_BASE_URL', 'http://127.0.0.1:65535');
ensureEnv('ANYHUNT_API_KEY', 'test-anyhunt-key');
