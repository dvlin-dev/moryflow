/**
 * [PROVIDES]: JsonValueSchema - 可序列化 JSON 值的 Zod 校验
 * [DEPENDS]: zod
 * [POS]: 统一 JSON 输入/输出的类型安全（用于 properties/metadata 等 JSON 字段）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { z } from 'zod';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.record(z.string(), JsonValueSchema),
    z.array(JsonValueSchema),
  ]),
);
