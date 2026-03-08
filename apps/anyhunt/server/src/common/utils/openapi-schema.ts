/**
 * [PROVIDES]: Zod -> OpenAPI schema conversion helper
 * [DEPENDS]: zod v4
 * [POS]: Public controller response schema single source bridge
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { z, type ZodType } from 'zod';

export function zodSchemaToOpenApiSchema(
  schema: ZodType,
): Record<string, unknown> {
  return z.toJSONSchema(schema) as Record<string, unknown>;
}
