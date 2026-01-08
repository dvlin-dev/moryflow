/**
 * [INPUT]: IDENTITY_DATABASE_URL 环境变量
 * [OUTPUT]: Prisma 配置对象
 * [POS]: identity-db 包的 Prisma 7 配置文件
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('IDENTITY_DATABASE_URL'),
  },
});
