/**
 * [PROVIDES]: Prisma JSON 转换工具
 * [DEPENDS]: Prisma JSON types
 * [POS]: Memory JSON 字段写入与历史记录
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Prisma } from '../../../generated/prisma-vector/client';
import { toSqlJsonb } from '../../common/utils/prisma-json.utils';

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
  return toSqlJsonb(value);
}
