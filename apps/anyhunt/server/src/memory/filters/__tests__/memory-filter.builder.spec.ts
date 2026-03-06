/**
 * MemoryFilterBuilder 单元测试
 * 覆盖过期过滤默认约束与 DSL 边界
 */

import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { Prisma } from '../../../../generated/prisma-vector/client';
import { MemoryFilterBuilder } from '../memory-filter.builder';

function toSqlText(whereSql: Prisma.Sql): string {
  const query = Prisma.sql`SELECT * FROM "MemoryFact" WHERE ${whereSql}`;
  const raw = query as unknown as {
    sql?: string;
    text?: string;
    strings?: string[];
  };

  if (typeof raw.sql === 'string') {
    return raw.sql;
  }
  if (typeof raw.text === 'string') {
    return raw.text;
  }
  if (Array.isArray(raw.strings)) {
    return raw.strings.join('?');
  }

  return '';
}

describe('MemoryFilterBuilder', () => {
  const builder = new MemoryFilterBuilder();

  it('should always append expiration guard', () => {
    const whereSql = builder.buildWhereSql('api-key-1', {
      userId: 'user-1',
    });

    const sqlText = toSqlText(whereSql);
    expect(sqlText).toContain(
      '"expirationDate" IS NULL OR "expirationDate" > NOW()',
    );
  });

  it('should parse DSL filters and include field conditions', () => {
    const whereSql = builder.buildWhereSql('api-key-1', {
      filters: {
        AND: [{ user_id: 'user-1' }, { categories: { contains: 'coffee' } }],
      },
    });

    const sqlText = toSqlText(whereSql);
    expect(sqlText).toContain('"apiKeyId"');
    expect(sqlText).toContain('"userId"');
    expect(sqlText).toContain('unnest');
  });

  it('should throw for invalid filters JSON string', () => {
    expect(() =>
      builder.buildWhereSql('api-key-1', {
        filters: '{invalid-json',
      }),
    ).toThrow(BadRequestException);
  });
});
