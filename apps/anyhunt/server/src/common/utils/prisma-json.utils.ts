import { Prisma } from '../../../generated/prisma-vector/client';

function normalizeJson(
  value: Prisma.InputJsonValue | Prisma.JsonValue,
): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function toSqlJsonb(
  value: Prisma.InputJsonValue | Prisma.JsonValue | null | undefined,
): Prisma.Sql {
  if (value === undefined || value === null) {
    return Prisma.sql`NULL`;
  }

  return Prisma.sql`${JSON.stringify(normalizeJson(value))}::jsonb`;
}
