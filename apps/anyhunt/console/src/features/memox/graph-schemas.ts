/**
 * [PROVIDES]: graphFormSchema, graphFormDefaults, buildGraphQueryParams
 * [DEPENDS]: zod/v3, memox GraphQueryParams
 * [POS]: Memox Graph 查询表单 schema 与请求映射
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { z } from 'zod/v3';
import type { GraphQueryParams } from './types';

export const graphEntityTypes = ['user', 'agent', 'app', 'run'] as const;

export const graphFormSchema = z.object({
  entityType: z.enum(graphEntityTypes),
  entityId: z.string().trim().min(1, 'Entity ID is required'),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

export type GraphFormInput = z.input<typeof graphFormSchema>;
export type GraphFormValues = z.infer<typeof graphFormSchema>;

export const graphFormDefaults: GraphFormInput = {
  entityType: 'user',
  entityId: '',
  limit: 200,
};

export function buildGraphQueryParams(values: GraphFormValues): GraphQueryParams {
  const params: GraphQueryParams = {
    limit: values.limit,
  };

  switch (values.entityType) {
    case 'user':
      params.user_id = values.entityId;
      break;
    case 'agent':
      params.agent_id = values.entityId;
      break;
    case 'app':
      params.app_id = values.entityId;
      break;
    case 'run':
      params.run_id = values.entityId;
      break;
    default:
      break;
  }

  return params;
}
