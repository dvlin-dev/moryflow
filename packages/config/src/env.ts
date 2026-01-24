/**
 * [DEFINES]: 环境变量验证和类型安全配置
 * [USED_BY]: 所有产品服务端
 * [POS]: 统一环境变量管理
 * [NOTE]: Zod v4 flatten 类型补正，确保错误信息可读性
 */

import { z } from 'zod';

// ============ 通用环境变量 ============

export const CommonEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // 数据库
  DATABASE_URL: z.string().url(),
  // Redis
  REDIS_URL: z.string().url().optional(),
  // 认证
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url().optional(),
});

export type CommonEnv = z.infer<typeof CommonEnvSchema>;

// ============ 验证函数 ============

export function validateEnv<T extends z.ZodTypeAny>(
  schema: T,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): z.infer<T> {
  const result = schema.safeParse(env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    const errorMessages = Object.entries(errors)
      .map(([key, msgs]) => {
        const messages = Array.isArray(msgs) ? msgs : [];
        return '  ' + key + ': ' + messages.join(', ');
      })
      .join('\n');

    throw new Error('Environment validation failed:\n' + errorMessages);
  }

  return result.data;
}
