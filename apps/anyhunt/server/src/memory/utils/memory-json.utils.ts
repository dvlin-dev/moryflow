/**
 * [PROVIDES]: Prisma JSON 转换工具
 * [DEPENDS]: Prisma JSON types
 * [POS]: Memory JSON 字段写入与历史记录
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Prisma } from '../../../generated/prisma-vector/client';

function normalizeJson(value: unknown): Prisma.JsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.JsonValue;
}

export function toJsonValue(value: unknown): Prisma.JsonValue {
  return normalizeJson(value);
}

export function toInputJson(value: unknown): Prisma.InputJsonValue {
  return normalizeJson(value) as Prisma.InputJsonValue;
}

export function toNullableInputJson(
  value: Prisma.InputJsonValue | Prisma.JsonValue | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === undefined || value === null) {
    return Prisma.DbNull;
  }
  return normalizeJson(value) as Prisma.InputJsonValue;
}

export function toSqlJson(
  value: Prisma.InputJsonValue | Prisma.JsonValue | null | undefined,
): Prisma.Sql {
  if (value === undefined || value === null) {
    return Prisma.sql`NULL`;
  }

  return Prisma.sql`${JSON.stringify(normalizeJson(value))}::json`;
}
